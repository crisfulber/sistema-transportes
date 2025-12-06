import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Conectar ao PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando criação do banco de dados PostgreSQL...');

    // Criar tabelas
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('admin', 'motorista', 'consulta')),
        ativo INTEGER DEFAULT 1,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fabricas (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        ativo INTEGER DEFAULT 1
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS racoes (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        ativo INTEGER DEFAULT 1
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tipos_produtor (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        ativo INTEGER DEFAULT 1
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS produtores (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        localizacao TEXT,
        tipo_id INTEGER NOT NULL,
        ativo INTEGER DEFAULT 1,
        FOREIGN KEY (tipo_id) REFERENCES tipos_produtor(id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tabela_precos (
        id SERIAL PRIMARY KEY,
        tipo_produtor_id INTEGER NOT NULL,
        valor_por_tonelada REAL,
        valor_fixo REAL,
        tonelagem_minima REAL,
        vigencia_inicio DATE NOT NULL,
        vigencia_fim DATE,
        ativo INTEGER DEFAULT 1,
        FOREIGN KEY (tipo_produtor_id) REFERENCES tipos_produtor(id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS cargas (
        id SERIAL PRIMARY KEY,
        motorista_id INTEGER NOT NULL,
        data DATE NOT NULL,
        km_inicial REAL NOT NULL,
        km_final REAL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (motorista_id) REFERENCES usuarios(id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS itens_carga (
        id SERIAL PRIMARY KEY,
        carga_id INTEGER NOT NULL,
        fabrica_id INTEGER NOT NULL,
        produtor_id INTEGER NOT NULL,
        racao_id INTEGER NOT NULL,
        nota_fiscal TEXT NOT NULL,
        quantidade_kg REAL NOT NULL,
        valor_calculado REAL,
        FOREIGN KEY (carga_id) REFERENCES cargas(id) ON DELETE CASCADE,
        FOREIGN KEY (fabrica_id) REFERENCES fabricas(id),
        FOREIGN KEY (produtor_id) REFERENCES produtores(id),
        FOREIGN KEY (racao_id) REFERENCES racoes(id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        id SERIAL PRIMARY KEY,
        chave TEXT NOT NULL UNIQUE,
        valor TEXT NOT NULL,
        descricao TEXT
      );
    `);

    // Criar índices
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cargas_motorista ON cargas(motorista_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cargas_data ON cargas(data);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_itens_carga ON itens_carga(carga_id);`);

    console.log('✅ Tabelas criadas com sucesso!');

    // Verificar se já existem dados
    const { rows } = await client.query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(rows[0].count) > 0) {
      console.log('✅ Banco de dados já possui dados. Pulando inserção inicial.');
      return;
    }

    console.log('📝 Inserindo dados iniciais...');

    // Inserir usuários
    const senhaAdmin = bcrypt.hashSync('admin123', 10);
    const senhaMotorista = bcrypt.hashSync('123456', 10);
    const senhaConsulta = bcrypt.hashSync('consulta123', 10);

    await client.query(`
      INSERT INTO usuarios (nome, username, senha, tipo) VALUES
      ('Administrador', 'admin', $1, 'admin'),
      ('Consulta', 'consulta', $3, 'consulta'),
      ('Motorista 1', 'motorista1', $2, 'motorista'),
      ('Motorista 2', 'motorista2', $2, 'motorista'),
      ('Motorista 3', 'motorista3', $2, 'motorista'),
      ('Motorista 4', 'motorista4', $2, 'motorista'),
      ('Motorista 5', 'motorista5', $2, 'motorista')
    `, [senhaAdmin, senhaMotorista, senhaConsulta]);

    // Inserir fábricas
    await client.query(`
      INSERT INTO fabricas (nome) VALUES
      ('Fábrica A'), ('Fábrica B'), ('Fábrica C')
    `);

    // Inserir rações
    await client.query(`
      INSERT INTO racoes (nome) VALUES
      ('Ração Tipo 1'), ('Ração Tipo 2'), ('Ração Tipo 3'),
      ('Ração Tipo 4'), ('Ração Tipo 5'), ('Ração Tipo 6'),
      ('Ração Tipo 7'), ('Ração Tipo 8'), ('Ração Tipo 9'), ('Ração Tipo 10')
    `);

    // Inserir tipos de produtor
    await client.query(`
      INSERT INTO tipos_produtor (nome) VALUES
      ('Tipo A'), ('Tipo B'), ('Tipo C'), ('Tipo D')
    `);

    // Inserir produtores
    await client.query(`
      INSERT INTO produtores (nome, localizacao, tipo_id) VALUES
      ('Produtor 1', 'Localização A', 1),
      ('Produtor 2', 'Localização B', 4),
      ('Produtor 3', 'Localização C', 3),
      ('Produtor 4', 'Localização D', 2)
    `);

    // Inserir tabela de preços
    await client.query(`
      INSERT INTO tabela_precos (tipo_produtor_id, valor_por_tonelada, valor_fixo, tonelagem_minima, vigencia_inicio) VALUES
      (1, 10.00, NULL, NULL, '2024-01-01'),
      (2, 10.00, NULL, NULL, '2024-01-01'),
      (3, 10.00, 150.00, 17, '2024-01-01'),
      (4, 10.00, 150.00, 17, '2024-01-01')
    `);

    // Inserir configuração de comissão
    await client.query(`
      INSERT INTO configuracoes (chave, valor, descricao) VALUES
      ('comissao_motorista', '12', 'Percentual de comissão do motorista (%)')
    `);

    console.log('✅ Dados iniciais inseridos com sucesso!');
    console.log('\n👤 Login Admin:');
    console.log('   Username: admin');
    console.log('   Senha: admin123');
    console.log('\n📊 Login Consulta:');
    console.log('   Username: consulta');
    console.log('   Senha: consulta123');
    console.log('\n🚛 Login Motoristas:');
    console.log('   Username: motorista1, motorista2, etc');
    console.log('   Senha: 123456\n');

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase()
    .then(() => {
      console.log('✅ Inicialização concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na inicialização:', error);
      process.exit(1);
    });
}

export default initDatabase;
