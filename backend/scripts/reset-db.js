import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar dotenv para ler o .env do diretório pai
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function resetDatabase() {
    const client = await pool.connect();
    const logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        log('⚠️  ATENÇÃO: Iniciando limpeza...');

        await client.query('BEGIN');

        // Garantir que a tabela historico_comissoes existe para não falhar o truncate
        await client.query(`
            CREATE TABLE IF NOT EXISTS historico_comissoes (
                id SERIAL PRIMARY KEY,
                valor_percentual REAL NOT NULL,
                vigencia_inicio DATE NOT NULL,
                vigencia_fim DATE,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        log('✅ Estrutura de comissões verificada.');

        // Limpar tabelas mantendo a estrutura
        log('🧹 Limpando itens_carga...');
        await client.query('TRUNCATE TABLE itens_carga CASCADE;');

        log('🧹 Limpando cargas...');
        await client.query('TRUNCATE TABLE cargas CASCADE;');

        log('🧹 Limpando tabela_precos...');
        await client.query('TRUNCATE TABLE tabela_precos CASCADE;');

        log('🧹 Limpando produtores...');
        await client.query('TRUNCATE TABLE produtores CASCADE;');

        log('🧹 Limpando fabricas...');
        await client.query('TRUNCATE TABLE fabricas CASCADE;');

        log('🧹 Limpando racoes...');
        await client.query('TRUNCATE TABLE racoes CASCADE;');

        log('🧹 Limpando tipos_produtor...');
        await client.query('TRUNCATE TABLE tipos_produtor CASCADE;');

        log('🧹 Limpando historico_comissoes...');
        await client.query('TRUNCATE TABLE historico_comissoes CASCADE;');

        // Limpar usuários exceto admin e atualizar senha
        log('👤 Resetando usuários...');
        const senhaAdmin = bcrypt.hashSync('admin123', 10);

        // Remove todos exceto admin
        await client.query("DELETE FROM usuarios WHERE username != 'admin'");

        // Atualiza ou insere admin
        const res = await client.query("SELECT id FROM usuarios WHERE username = 'admin'");
        if (res.rows.length > 0) {
            await client.query(`
                UPDATE usuarios 
                SET senha = $1, nome = 'Administrador', tipo = 'admin', ativo = 1 
                WHERE username = 'admin'
            `, [senhaAdmin]);
            log('✅ Usuário admin atualizado.');
        } else {
            await client.query(`
                INSERT INTO usuarios (nome, username, senha, tipo, ativo)
                VALUES ('Administrador', 'admin', $1, 'admin', 1)
            `, [senhaAdmin]);
            log('✅ Usuário admin criado.');
        }

        // Reinicializar configurações básicas de comissão
        log('⚙️ Resetando configurações...');
        await client.query("DELETE FROM configuracoes WHERE chave = 'comissao_motorista'");
        await client.query("INSERT INTO configuracoes (chave, valor) VALUES ('comissao_motorista', '12')");
        // Inserir histórico com data retroativa para cobrir cargas antigas
        await client.query(`
            INSERT INTO historico_comissoes (valor_percentual, vigencia_inicio)
            VALUES (12, '2020-01-01')
        `);
        log('✅ Configuração inicial restaurada (Vigência desde 2020).');

        await client.query('COMMIT');
        log('🚀 Banco de dados limpo com sucesso!');
        log('🔓 Novo acesso Admin: admin / admin123');

        return logs;

    } catch (error) {
        await client.query('ROLLBACK');
        log('❌ Erro ao limpar banco: ' + error.message);
        console.error('❌ Erro ao limpar banco:', error);
        throw error; // Propaga erro
    } finally {
        client.release();
        // Não fechar o pool se for chamado via módulo, apenas se for script standalone
        if (process.argv[1] === fileURLToPath(import.meta.url)) {
            await pool.end();
        }
    }
}

// Se executado diretamente: node reset-db.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    resetDatabase();
}

export { resetDatabase };
