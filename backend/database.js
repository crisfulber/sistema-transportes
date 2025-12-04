import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('database.db');

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('admin', 'motorista')),
    ativo INTEGER DEFAULT 1,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS fabricas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    ativo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS racoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    ativo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS tipos_produtor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    ativo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS produtores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    localizacao TEXT,
    tipo_id INTEGER NOT NULL,
    ativo INTEGER DEFAULT 1,
    FOREIGN KEY (tipo_id) REFERENCES tipos_produtor(id)
  );

  CREATE TABLE IF NOT EXISTS tabela_precos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_produtor_id INTEGER NOT NULL,
    valor_por_tonelada REAL,
    valor_fixo REAL,
    tonelagem_minima REAL,
    vigencia_inicio DATE NOT NULL,
    vigencia_fim DATE,
    ativo INTEGER DEFAULT 1,
    FOREIGN KEY (tipo_produtor_id) REFERENCES tipos_produtor(id)
  );

  CREATE TABLE IF NOT EXISTS cargas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    motorista_id INTEGER NOT NULL,
    data DATE NOT NULL,
    km_inicial REAL NOT NULL,
    km_final REAL NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (motorista_id) REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS itens_carga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  CREATE INDEX IF NOT EXISTS idx_cargas_motorista ON cargas(motorista_id);
  CREATE INDEX IF NOT EXISTS idx_cargas_data ON cargas(data);
  CREATE INDEX IF NOT EXISTS idx_itens_carga ON itens_carga(carga_id);
`);

// Inserir dados iniciais
const inserirDadosIniciais = () => {
    // Verificar se já existem dados
    const count = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    if (count.count > 0) {
        console.log('Dados iniciais já existem, pulando inserção...');
        return;
    }

    console.log('Inserindo dados iniciais...');

    // Criar usuário admin
    const senhaAdmin = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO usuarios (nome, username, senha, tipo) VALUES (?, ?, ?, ?)').run(
        'Administrador',
        'admin',
        senhaAdmin,
        'admin'
    );

    // Inserir motoristas
    const motoristas = [
        'Adalberto Lunkes',
        'Anderson Menezes',
        'Danrley Amaral',
        'Maureci Schulz',
        'Tiago Silva'
    ];

    const insertMotorista = db.prepare('INSERT INTO usuarios (nome, username, senha, tipo) VALUES (?, ?, ?, ?)');
    motoristas.forEach(nome => {
        const username = nome.toLowerCase().replace(/\s+/g, '.');
        const senha = bcrypt.hashSync('123456', 10); // Senha padrão
        insertMotorista.run(nome, username, senha, 'motorista');
    });

    // Inserir fábricas
    const fabricas = ['SS Rações', 'Vaccinar', 'Exnor'];
    const insertFabrica = db.prepare('INSERT INTO fabricas (nome) VALUES (?)');
    fabricas.forEach(nome => insertFabrica.run(nome));

    // Inserir rações
    const racoes = [
        'Lactação',
        'Gestação',
        'Recria',
        'Reposição',
        'Alojamento',
        'Crescimento 1',
        'Crescimento 2',
        'Terminação 1',
        'Terminação 2',
        'Terminação 3'
    ];
    const insertRacao = db.prepare('INSERT INTO racoes (nome) VALUES (?)');
    racoes.forEach(nome => insertRacao.run(nome));

    // Inserir tipos de produtor
    const tiposProdutor = ['UPD', 'Recria', 'Creche', 'Terminação'];
    const insertTipoProdutor = db.prepare('INSERT INTO tipos_produtor (nome) VALUES (?)');
    tiposProdutor.forEach(nome => insertTipoProdutor.run(nome));

    // Inserir produtores
    const produtores = [
        { nome: 'Marcio Bickel (São Roque)', tipo: 'UPD' },
        { nome: 'Adriano Alberton', tipo: 'Terminação' },
        { nome: 'Rogerio Kolling', tipo: 'Creche' },
        { nome: 'Marcelo Steffens', tipo: 'Recria' }
    ];

    const insertProdutor = db.prepare('INSERT INTO produtores (nome, localizacao, tipo_id) VALUES (?, ?, ?)');
    produtores.forEach(p => {
        const tipo = db.prepare('SELECT id FROM tipos_produtor WHERE nome = ?').get(p.tipo);
        const localizacao = p.nome.includes('(') ? p.nome.match(/\((.*?)\)/)[1] : null;
        const nome = p.nome.replace(/\s*\(.*?\)\s*/, '');
        insertProdutor.run(nome, localizacao, tipo.id);
    });

    // Inserir tabela de preços inicial
    const tiposComPreco = [
        { tipo: 'UPD', valorTonelada: 70, valorFixo: null, tonelagemMinima: null },
        { tipo: 'Recria', valorTonelada: 70, valorFixo: null, tonelagemMinima: null },
        { tipo: 'Creche', valorTonelada: 70, valorFixo: 1190, tonelagemMinima: 17 },
        { tipo: 'Terminação', valorTonelada: 70, valorFixo: 1190, tonelagemMinima: 17 }
    ];

    const insertPreco = db.prepare(`
    INSERT INTO tabela_precos (tipo_produtor_id, valor_por_tonelada, valor_fixo, tonelagem_minima, vigencia_inicio)
    VALUES (?, ?, ?, ?, date('now'))
  `);

    tiposComPreco.forEach(tp => {
        const tipo = db.prepare('SELECT id FROM tipos_produtor WHERE nome = ?').get(tp.tipo);
        insertPreco.run(tipo.id, tp.valorTonelada, tp.valorFixo, tp.tonelagemMinima);
    });

    console.log('Dados iniciais inseridos com sucesso!');
    console.log('Login admin: username=admin, senha=admin123');
    console.log('Login motoristas: username=[nome.sobrenome], senha=123456');
};

inserirDadosIniciais();

export default db;
