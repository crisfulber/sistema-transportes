import Database from 'better-sqlite3';

const db = new Database('database.db');

console.log('\n📊 DADOS DO BANCO DE DADOS\n');
console.log('='.repeat(80));

// Usuários
console.log('\n👤 USUÁRIOS:');
const usuarios = db.prepare('SELECT id, nome, username, tipo, ativo FROM usuarios').all();
console.table(usuarios);

// Cargas
console.log('\n🚛 CARGAS:');
const cargas = db.prepare(`
  SELECT 
    c.id,
    u.nome as motorista,
    c.data,
    c.km_inicial,
    c.km_final,
    COUNT(ic.id) as itens,
    SUM(ic.quantidade_kg) as total_kg,
    SUM(ic.valor_calculado) as valor_total
  FROM cargas c
  JOIN usuarios u ON c.motorista_id = u.id
  LEFT JOIN itens_carga ic ON c.id = ic.carga_id
  GROUP BY c.id
  ORDER BY c.data DESC
`).all();
console.table(cargas);

// Itens de carga
console.log('\n📦 ITENS DE CARGA:');
const itens = db.prepare(`
  SELECT 
    ic.id,
    ic.carga_id,
    f.nome as fabrica,
    p.nome as produtor,
    r.nome as racao,
    ic.nota_fiscal,
    ic.quantidade_kg,
    ic.valor_calculado
  FROM itens_carga ic
  JOIN fabricas f ON ic.fabrica_id = f.id
  JOIN produtores p ON ic.produtor_id = p.id
  JOIN racoes r ON ic.racao_id = r.id
  ORDER BY ic.carga_id DESC
`).all();
console.table(itens);

// Configurações
console.log('\n⚙️ CONFIGURAÇÕES:');
const config = db.prepare('SELECT * FROM configuracoes').all();
console.table(config);

console.log('\n' + '='.repeat(80));
console.log('✅ Dados exibidos com sucesso!\n');
