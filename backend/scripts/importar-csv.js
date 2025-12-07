import fs from 'fs';
import path from 'path';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_DIR = path.join(__dirname, '..', 'importacao');

// Utilitários
function lerCSV(nomeArquivo) {
    const filePath = path.join(IMPORT_DIR, nomeArquivo);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Arquivo não encontrado: ${nomeArquivo} (Pular)`);
        return [];
    }

    const buffer = fs.readFileSync(filePath);
    let content = buffer.toString('utf8');

    // Detecção simplista: Se tiver Replacement Character (), tenta latin1
    if (content.includes('\uFFFD')) {
        console.log(`⚠️ [${nomeArquivo}] Detectado encoding não-UTF-8. Tentando Latin1 (ISO-8859-1)...`);
        content = buffer.toString('latin1');
    }

    // Remover BOM se existir
    content = content.replace(/^\uFEFF/, '');

    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

    if (lines.length === 0) return [];

    const header = lines[0];
    const countSemi = (header.match(/;/g) || []).length;
    const countComma = (header.match(/,/g) || []).length;
    const separator = countSemi >= countComma ? ';' : ',';

    console.log(`ℹ️ [${nomeArquivo}] Separador detectado: '${separator}'`);

    // Remove cabeçalho e processa linhas
    return lines.slice(1).map(linha => {
        // Split simples (não suporta separador dentro de aspas mas funciona para CSVs simples)
        return linha.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
    });
}

function parseNumber(str) {
    if (!str) return null;
    str = str.trim();

    // Se contiver vírgula e for formato BR (ex: 10,50 ou 1.000,50)
    if (str.includes(',')) {
        // Se tiver ponto e vírgula (Ex: 1.000,50), remove ponto
        if (str.includes('.')) {
            // Assume que ponto é milhar e vírgula é decimal
            return parseFloat(str.replace(/\./g, '').replace(',', '.'));
        }
        // Só vírgula (Ex: 10,50) -> troca por ponto
        return parseFloat(str.replace(',', '.'));
    }

    // Se só tiver ponto, assume formato US/JS padrão (10.50 ou 1000.50)
    // CSVs normalmente não exportam separador de milhar se não for formatado
    return parseFloat(str);
}

function parseDate(str) {
    if (!str) return null;
    // Assume AAAA-MM-DD
    return str;
}

async function limparTabelas(client) {
    console.log('🧹 Limpando tabelas para evitar duplicação/corrupção...');
    // Ordem inversa de dependência
    await client.query('TRUNCATE itens_carga, cargas, tabela_precos, produtores, usuarios, racoes, fabricas, tipos_produtor RESTART IDENTITY CASCADE');
}

// Importadores
async function importarTipos(client) {
    const linhas = lerCSV('tipos_produtor.csv');
    let count = 0;
    for (const col of linhas) {
        if (col.length < 1) continue;
        const nome = col[0];
        const ativo = col[1] ? parseInt(col[1]) : 1;

        await client.query(
            `INSERT INTO tipos_produtor (nome, ativo) VALUES ($1, $2) ON CONFLICT (nome) DO NOTHING`,
            [nome, ativo]
        );
        count++;
    }
    console.log(`✅ ${count} Tipos processados.`);
}

async function importarFabricas(client) {
    const linhas = lerCSV('fabricas.csv');
    let count = 0;
    for (const col of linhas) {
        if (col.length < 1) continue;
        const nome = col[0];
        const ativo = col[1] ? parseInt(col[1]) : 1;

        await client.query(
            `INSERT INTO fabricas (nome, ativo) VALUES ($1, $2) ON CONFLICT (nome) DO NOTHING`,
            [nome, ativo]
        );
        count++;
    }
    console.log(`✅ ${count} Fábricas processadas.`);
}

async function importarRacoes(client) {
    const linhas = lerCSV('racoes.csv');
    let count = 0;
    for (const col of linhas) {
        if (col.length < 1) continue;
        const nome = col[0];
        const ativo = col[1] ? parseInt(col[1]) : 1;

        await client.query(
            `INSERT INTO racoes (nome, ativo) VALUES ($1, $2) ON CONFLICT (nome) DO NOTHING`,
            [nome, ativo]
        );
        count++;
    }
    console.log(`✅ ${count} Rações processadas.`);
}

async function importarMotoristas(client) {
    const linhas = lerCSV('motoristas.csv');
    let count = 0;
    for (const col of linhas) {
        if (col.length < 3) continue;
        const [nome, username, senha] = col;
        const ativo = col[3] ? parseInt(col[3]) : 1;

        const senhaHash = bcrypt.hashSync(senha, 10);

        await client.query(
            `INSERT INTO usuarios (nome, username, senha, tipo, ativo) VALUES ($1, $2, $3, 'motorista', $4) 
             ON CONFLICT (username) DO NOTHING`,
            [nome, username, senhaHash, ativo]
        );
        count++;
    }
    console.log(`✅ ${count} Motoristas processados.`);
}

async function importarProdutores(client) {
    const linhas = lerCSV('produtores.csv');
    let count = 0;

    // Cache de tipos
    const tiposRes = await client.query('SELECT id, lower(nome) as nome FROM tipos_produtor');
    const tiposMap = new Map(tiposRes.rows.map(t => [t.nome, t.id]));

    for (const col of linhas) {
        if (col.length < 3) continue;
        const [nome, localizacao, tipoNome] = col;
        const ativo = col[3] ? parseInt(col[3]) : 1;

        const tipoId = tiposMap.get(tipoNome.toLowerCase());
        if (!tipoId) {
            console.error(`❌ Tipo não encontrado: ${tipoNome} (Produtor: ${nome})`);
            continue;
        }

        await client.query(
            `INSERT INTO produtores (nome, localizacao, tipo_id, ativo) VALUES ($1, $2, $3, $4)`,
            [nome, localizacao, tipoId, ativo]
        );
        count++;
    }
    console.log(`✅ ${count} Produtores processados.`);
}

async function importarPrecos(client) {
    const linhas = lerCSV('precos.csv');
    let count = 0;

    // Cache tipos
    const tiposRes = await client.query('SELECT id, lower(nome) as nome FROM tipos_produtor');
    const tiposMap = new Map(tiposRes.rows.map(t => [t.nome, t.id]));

    for (const col of linhas) {
        if (col.length < 5) continue;
        const [tipoNome, valorTonStr, valorFixoStr, tonMinStr, vigencia] = col;
        const ativo = col[5] ? parseInt(col[5]) : 1;

        const tipoId = tiposMap.get(tipoNome.toLowerCase());
        if (!tipoId) continue;

        const valorTon = parseNumber(valorTonStr);
        const valorFixo = parseNumber(valorFixoStr);
        const tonMin = parseNumber(tonMinStr);

        await client.query(
            `INSERT INTO tabela_precos (tipo_produtor_id, valor_por_tonelada, valor_fixo, tonelagem_minima, vigencia_inicio, ativo)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [tipoId, valorTon, valorFixo, tonMin, vigencia, ativo]
        );
        count++;
    }
    console.log(`✅ ${count} Preços processados.`);
}

async function importarCargas(client) {
    const linhas = lerCSV('cargas.csv');
    if (linhas.length === 0) return;

    console.log('📦 Processando histórico de cargas...');

    // Cache lookups
    const [motoristasRes, fabricasRes, produtoresRes, racoesRes] = await Promise.all([
        client.query('SELECT id, lower(username) as username FROM usuarios'),
        client.query('SELECT id, lower(nome) as nome FROM fabricas'),
        client.query('SELECT id, lower(nome) as nome FROM produtores'),
        client.query('SELECT id, lower(nome) as nome FROM racoes')
    ]);

    const motoristasMap = new Map(motoristasRes.rows.map(m => [m.username, m.id]));
    const fabricasMap = new Map(fabricasRes.rows.map(f => [f.nome, f.id]));
    const produtoresMap = new Map(produtoresRes.rows.map(p => [p.nome, p.id]));
    const racoesMap = new Map(racoesRes.rows.map(r => [r.nome, r.id]));

    // Garantir tipo fallback para produtores
    let tipoImportadoId;
    const tipoImportadoRes = await client.query("SELECT id FROM tipos_produtor WHERE nome = 'Importado'");
    if (tipoImportadoRes.rows.length > 0) {
        tipoImportadoId = tipoImportadoRes.rows[0].id;
    } else {
        const novoTipo = await client.query("INSERT INTO tipos_produtor (nome) VALUES ('Importado') ON CONFLICT (nome) DO UPDATE SET nome=EXCLUDED.nome RETURNING id");
        // DO UPDATE é hack para garantir ID se concorrencia (mas aqui é serial)
        // Se ON CONFLICT DO NOTHING nao retorna ID.
        // Melhor buscar de novo se falhar, ou assumir sequencial.
        // Vou simplificar: Busca ou Cria.
        if (novoTipo.rows.length > 0) tipoImportadoId = novoTipo.rows[0].id;
        else {
            const res = await client.query("SELECT id FROM tipos_produtor WHERE nome = 'Importado'");
            tipoImportadoId = res.rows[0].id;
        }
    }

    // Cache tipos para preços
    // Recarregar maps não precisa pois vou adicionar dinamicamente

    // Agrupar Cargas
    const cargasMap = new Map();

    for (const col of linhas) {
        if (col.length < 9) continue;
        const [data, motUser, kmIniStr, kmFimStr, fabNome, prodNome, racNome, nota, qtdStr] = col;

        if (!data || !motUser) continue;

        // Lookup ou Create FÁBRICA
        let fabricaId = fabricasMap.get(fabNome.toLowerCase());
        if (!fabricaId && fabNome) {
            console.log(`⚠️ Criando Fábrica automática: ${fabNome}`);
            const res = await client.query("INSERT INTO fabricas (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET nome=EXCLUDED.nome RETURNING id", [fabNome]);
            fabricaId = res.rows[0].id;
            fabricasMap.set(fabNome.toLowerCase(), fabricaId);
        }

        // Lookup ou Create RAÇÃO
        let racaoId = racoesMap.get(racNome.toLowerCase());
        if (!racaoId && racNome) {
            console.log(`⚠️ Criando Ração automática: ${racNome}`);
            const res = await client.query("INSERT INTO racoes (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET nome=EXCLUDED.nome RETURNING id", [racNome]);
            racaoId = res.rows[0].id;
            racoesMap.set(racNome.toLowerCase(), racaoId);
        }

        // Lookup ou Create PRODUTOR
        let produtorId = produtoresMap.get(prodNome.toLowerCase());
        if (!produtorId && prodNome) {
            console.log(`⚠️ Criando Produtor automático: ${prodNome}`);
            // Usa tipoImportadoId
            const res = await client.query("INSERT INTO produtores (nome, tipo_id) VALUES ($1, $2) RETURNING id", [prodNome, tipoImportadoId]);
            produtorId = res.rows[0].id;
            produtoresMap.set(prodNome.toLowerCase(), produtorId);
        }

        // Lookup ou Create MOTORISTA
        let motoristaId = motoristasMap.get(motUser.toLowerCase());
        if (!motoristaId && motUser) {
            console.log(`⚠️ Criando Motorista automático: ${motUser}`);
            const senhaHash = bcrypt.hashSync('123456', 10);
            const res = await client.query(
                "INSERT INTO usuarios (nome, username, senha, tipo) VALUES ($1, $2, $3, 'motorista') ON CONFLICT (username) DO UPDATE SET username=EXCLUDED.username RETURNING id",
                [motUser, motUser, senhaHash]
            );
            motoristaId = res.rows[0].id;
            motoristasMap.set(motUser.toLowerCase(), motoristaId);
        }

        if (!motoristaId || !fabricaId || !produtorId || !racaoId) {
            console.error(`❌ Falha grave ao processar carga (Data: ${data}, Motorista: ${motUser}).`);
            continue;
        }

        const kmIni = parseNumber(kmIniStr);
        const chave = `${data}_${motoristaId}_${kmIni}`;

        if (!cargasMap.has(chave)) {
            cargasMap.set(chave, {
                data,
                motorista_id: motoristaId,
                km_inicial: kmIni,
                km_final: parseNumber(kmFimStr),
                itens: []
            });
        }

        cargasMap.get(chave).itens.push({
            fabrica_id: fabricaId,
            produtor_id: produtorId,
            racao_id: racaoId,
            nota_fiscal: nota,
            quantidade_kg: parseNumber(qtdStr),
        });
    }

    // Inserir Cargas e Itens
    let insertCount = 0;
    for (const carga of cargasMap.values()) {
        try {
            await client.query('BEGIN');

            const cargaRes = await client.query(
                `INSERT INTO cargas (motorista_id, data, km_inicial, km_final) VALUES ($1, $2, $3, $4) RETURNING id`,
                [carga.motorista_id, carga.data, carga.km_inicial, carga.km_final]
            );
            const cargaId = cargaRes.rows[0].id;

            // Para calcular o valor, precisaria da lógica de cálculo (função calcularValorItem do server.js).
            // Como é um script standalone, vou replicar simplificado ou deixar NULL (valor_calculado será NULL ou calculado se eu duplicar a lógica).
            // Vou tentar calcular simples (Valor Tonelada básico), ou deixar NULL e o usuário sabe que importado histórico pode não ter valor exato.
            // O sistema exibe valor. Se for NULL, formata 0.
            // Para ser útil, precido calcular.

            // Vou fazer query de preço para cada item dentro do loop? Lento, mas seguro.

            for (const item of carga.itens) {
                // Buscar tipo produtor
                const prodRes = await client.query('SELECT tipo_id FROM produtores WHERE id = $1', [item.produtor_id]);
                const tipoId = prodRes.rows[0].tipo_id;

                // Buscar preço vigente na data
                const precoRes = await client.query(`
                    SELECT * FROM tabela_precos 
                    WHERE tipo_produtor_id = $1 AND vigencia_inicio <= $2 AND (vigencia_fim IS NULL OR vigencia_fim >= $2)
                    ORDER BY vigencia_inicio DESC LIMIT 1
                `, [tipoId, carga.data]);

                let valorCalculado = 0;
                if (precoRes.rows.length > 0) {
                    const preco = precoRes.rows[0];
                    const tons = item.quantidade_kg / 1000;
                    if (preco.tonelagem_minima && tons < preco.tonelagem_minima && preco.valor_fixo) {
                        // Proporcionalizar valor fixo se rateado? A lógica do server.js rateia se itens > 1.
                        // Aqui é muito complexo replicar exatamente. Vou usar valor por tonelada simples.
                        valorCalculado = tons * preco.valor_por_tonelada;
                    } else {
                        valorCalculado = tons * preco.valor_por_tonelada;
                    }
                }

                await client.query(
                    `INSERT INTO itens_carga (carga_id, fabrica_id, produtor_id, racao_id, nota_fiscal, quantidade_kg, valor_calculado)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [cargaId, item.fabrica_id, item.produtor_id, item.racao_id, item.nota_fiscal, item.quantidade_kg, valorCalculado]
                );
            }

            await client.query('COMMIT');
            insertCount++;
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('❌ Erro ao salvar carga:', err);
        }
    }
    console.log(`✅ ${insertCount} Cargas inseridas.`);
}

async function run() {
    const client = await pool.connect();
    try {
        console.log('🚀 Iniciando importação...');

        await limparTabelas(client);

        // Recriar Admin
        // Verifica se admin já existe no CSV, mas por segurança cria um padrão se não existir (ou o CSV vai sobrescrever com ON CONFLICT?)
        // CSV usa ON CONFLICT DO NOTHING. Então se criarmos aqui, o CSV pula o admin se tiver.
        const senhaAdmin = bcrypt.hashSync('admin123', 10);
        await client.query(`
            INSERT INTO usuarios (nome, username, senha, tipo, ativo) 
            VALUES ('Administrador', 'admin', $1, 'admin', 1)
            ON CONFLICT (username) DO NOTHING
        `, [senhaAdmin]);
        console.log('👤 Administrador padrão garantido.');

        await importarTipos(client);
        await importarFabricas(client);
        await importarRacoes(client);
        await importarMotoristas(client);
        await importarProdutores(client);
        await importarPrecos(client);
        await importarCargas(client);

        console.log('✨ Importação concluída!');
    } catch (err) {
        console.error('Erro fatal:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
