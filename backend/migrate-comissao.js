import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
    const client = await pool.connect();

    try {
        console.log('🔄 Iniciando migração de histórico de comissões...');

        await client.query('BEGIN');

        // 1. Criar tabela historico_comissoes
        await client.query(`
            CREATE TABLE IF NOT EXISTS historico_comissoes (
                id SERIAL PRIMARY KEY,
                valor_percentual REAL NOT NULL,
                vigencia_inicio DATE NOT NULL,
                vigencia_fim DATE,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabela historico_comissoes criada.');

        // 2. Criar tabela configuracoes se não existir (apenas para garantir)
        await client.query(`
            CREATE TABLE IF NOT EXISTS configuracoes (
                chave TEXT PRIMARY KEY,
                valor TEXT
            );
        `);

        // 3. Pegar valor atual da comissão
        const { rows } = await client.query("SELECT valor FROM configuracoes WHERE chave = 'comissao_motorista'");

        let valorAtual = 0;
        if (rows.length > 0) {
            valorAtual = parseFloat(rows[0].valor);
        } else {
            // Se não existir, define um padrão (ex: 10%) e insere em configurações
            valorAtual = 10;
            await client.query("INSERT INTO configuracoes (chave, valor) VALUES ('comissao_motorista', '10')");
        }

        console.log(`📊 Valor atual da comissão: ${valorAtual}%`);

        // 4. Verificar se já existe histórico
        const histRows = await client.query('SELECT COUNT(*) FROM historico_comissoes');

        if (parseInt(histRows.rows[0].count) === 0) {
            // Inserir registro inicial válido desde o início dos tempos (ou uma data antiga)
            await client.query(`
                INSERT INTO historico_comissoes (valor_percentual, vigencia_inicio)
                VALUES ($1, '2023-01-01')
            `, [valorAtual]);
            console.log('✅ Histórico inicial criado.');
        } else {
            console.log('ℹ️ Histórico já existe, pulando inserção inicial.');
        }

        await client.query('COMMIT');
        console.log('🚀 Migração concluída com sucesso!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro na migração:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
