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

    try {
        console.log('⚠️  ATENÇÃO: Este script apagará TODOS os dados do banco, exceto o admin.');
        console.log('⏳ Iniciando limpeza...');

        await client.query('BEGIN');

        // Limpar tabelas mantendo a estrutura
        // A ordem importa por causa das chaves estrangeiras
        await client.query('TRUNCATE TABLE itens_carga CASCADE;');
        await client.query('TRUNCATE TABLE cargas CASCADE;');
        await client.query('TRUNCATE TABLE tabela_precos CASCADE;');
        await client.query('TRUNCATE TABLE produtores CASCADE;');
        await client.query('TRUNCATE TABLE fabricas CASCADE;');
        await client.query('TRUNCATE TABLE racoes CASCADE;');
        await client.query('TRUNCATE TABLE historico_comissoes CASCADE;');

        // Limpar usuários exceto admin e atualizar senha
        const senhaAdmin = bcrypt.hashSync('7Gh62g', 10);

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
            console.log('✅ Usuário admin atualizado.');
        } else {
            await client.query(`
                INSERT INTO usuarios (nome, username, senha, tipo, ativo)
                VALUES ('Administrador', 'admin', $1, 'admin', 1)
            `, [senhaAdmin]);
            console.log('✅ Usuário admin criado.');
        }

        // Reinicializar configurações básicas de comissão
        await client.query("DELETE FROM configuracoes WHERE chave = 'comissao_motorista'");
        await client.query("INSERT INTO configuracoes (chave, valor) VALUES ('comissao_motorista', '12')");
        await client.query(`
            INSERT INTO historico_comissoes (valor_percentual, vigencia_inicio)
            VALUES (12, CURRENT_DATE)
        `);
        console.log('✅ Configuração inicial de comissão restaurada (12%).');

        await client.query('COMMIT');
        console.log('🚀 Banco de dados limpo com sucesso!');
        console.log('🔓 Novo acesso Admin:');
        console.log('   Usuário: admin');
        console.log('   Senha:   7Gh62g');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao limpar banco:', error);
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
