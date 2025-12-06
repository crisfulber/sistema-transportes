import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function adicionarUsuarioConsulta() {
    const client = await pool.connect();

    try {
        console.log('🔄 Adicionando usuário de consulta...');

        // Verificar se já existe
        const { rows } = await client.query(
            "SELECT * FROM usuarios WHERE username = 'consulta'"
        );

        if (rows.length > 0) {
            console.log('⚠️  Usuário "consulta" já existe!');
            console.log('   Se quiser resetar a senha, delete o usuário primeiro:');
            console.log('   DELETE FROM usuarios WHERE username = \'consulta\';');
            return;
        }

        // Criar usuário consulta
        const senhaConsulta = bcrypt.hashSync('consulta123', 10);

        await client.query(
            "INSERT INTO usuarios (nome, username, senha, tipo) VALUES ($1, $2, $3, $4)",
            ['Consulta', 'consulta', senhaConsulta, 'consulta']
        );

        console.log('✅ Usuário de consulta criado com sucesso!');
        console.log('\n📊 Login Consulta:');
        console.log('   Username: consulta');
        console.log('   Senha: consulta123\n');

    } catch (error) {
        console.error('❌ Erro ao adicionar usuário:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Executar
adicionarUsuarioConsulta()
    .then(() => {
        console.log('✅ Concluído!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Falha:', error);
        process.exit(1);
    });
