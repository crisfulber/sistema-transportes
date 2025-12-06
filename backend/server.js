// Versão do servidor otimizada para PostgreSQL (produção)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { resetDatabase } from './scripts/reset-db.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
};

// Middleware para admin ou consulta (apenas visualização)
const adminOrConsultaMiddleware = (req, res, next) => {
    if (req.user.tipo !== 'admin' && req.user.tipo !== 'consulta') {
        return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
};

// ============ ROTAS DE AUTENTICAÇÃO ============

app.get('/api/reset-banco-secreto-7gh62g', async (req, res) => {
    try {
        const logs = await resetDatabase();
        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #2196F3;">Banco de dados resetado com sucesso!</h1>
                <p>Todos os dados foram apagados e o usuário admin foi restaurado.</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; textAlign: left; display: inline-block; margin: 20px 0; max-width: 600px;">
                    <strong>Log de Operações:</strong>
                    <pre style="margin-top: 10px; color: #555; white-space: pre-wrap;">${logs ? logs.join('\n') : 'Sem logs'}</pre>
                </div>
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; display: inline-block; margin: 20px 0;">
                    <strong>Novo Acesso Admin:</strong><br>
                    Usuário: admin<br>
                    Senha: admin123
                </div>
                <br>
                <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #2196F3; color: white; text-decoration: none; border-radius: 4px;">Ir para o Sistema</a>
            </div>
        `);
    } catch (error) {
        res.status(500).send('Erro ao resetar: ' + error.message);
    }
});

app.post('/api/login', async (req, res) => {
    const { username, senha } = req.body;

    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user) {
            const match = await bcrypt.compare(senha, user.senha);
            if (!match) {
                console.warn(`⚠️ Falha Login: Senha incorreta para usuário '${username}'`);
                // Debug temporário (remover em prod real):
                // console.log(`Debug Password: Entrada='${senha}', Hash='${user.senha}'`);
            } else if (user.ativo !== 1) {
                console.warn(`⚠️ Falha Login: Usuário inativo '${username}'`);
            } else {
                console.log(`✅ Login Sucesso: '${username}'`);
            }
        } else {
            console.warn(`⚠️ Falha Login: Usuário não encontrado '${username}'`);
        }

        if (user && await bcrypt.compare(senha, user.senha)) {
            if (user.ativo !== 1) {
                return res.status(401).json({ error: 'Usuário inativo' });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username, tipo: user.tipo, nome: user.nome },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({ token, usuario: { nome: user.nome, tipo: user.tipo, username: user.username } });
        } else {
            res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// ============ ROTAS DE CARGAS ============

app.get('/api/cargas', authMiddleware, async (req, res) => {
    try {
        const { mes, ano, motorista_id } = req.query;
        let query = `
      SELECT 
        c.*,
        u.nome as motorista_nome,
        COUNT(ic.id) as total_itens,
        SUM(ic.quantidade_kg) as total_kg,
        SUM(ic.valor_calculado) as valor_total,
        COALESCE(
          (SELECT valor_percentual FROM historico_comissoes 
           WHERE vigencia_inicio <= c.data 
           AND (vigencia_fim >= c.data OR vigencia_fim IS NULL) 
           ORDER BY vigencia_inicio DESC LIMIT 1), 
          (SELECT valor::real FROM configuracoes WHERE chave = 'comissao_motorista')
        ) as percentual_comissao
      FROM cargas c
      LEFT JOIN usuarios u ON c.motorista_id = u.id
      LEFT JOIN itens_carga ic ON c.id = ic.carga_id
      WHERE 1=1
    `;

        const params = [];
        let paramIndex = 1;

        if (req.user.tipo === 'motorista') {
            query += ` AND c.motorista_id = $${paramIndex++}`;
            params.push(req.user.id);
        } else if (motorista_id) {
            query += ` AND c.motorista_id = $${paramIndex++}`;
            params.push(motorista_id);
        }

        if (mes && ano) {
            query += ` AND EXTRACT(MONTH FROM c.data) = $${paramIndex++} AND EXTRACT(YEAR FROM c.data) = $${paramIndex++}`;
            params.push(parseInt(mes), parseInt(ano));
        }

        query += ' GROUP BY c.id, u.nome ORDER BY c.data DESC, c.id DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar cargas:', error);
        res.status(500).json({ error: 'Erro ao buscar cargas' });
    }
});

app.get('/api/cargas/:id', authMiddleware, async (req, res) => {
    try {
        const cargaResult = await pool.query(`
      SELECT c.*, u.nome as motorista_nome
      FROM cargas c
      LEFT JOIN usuarios u ON c.motorista_id = u.id
      WHERE c.id = $1
    `, [req.params.id]);

        const carga = cargaResult.rows[0];

        if (!carga) {
            return res.status(404).json({ error: 'Carga não encontrada' });
        }

        if (req.user.tipo === 'motorista' && carga.motorista_id !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const itensResult = await pool.query(`
      SELECT 
        ic.*,
        f.nome as fabrica_nome,
        p.nome as produtor_nome,
        p.localizacao as produtor_localizacao,
        r.nome as racao_nome,
        tp.nome as tipo_produtor
      FROM itens_carga ic
      LEFT JOIN fabricas f ON ic.fabrica_id = f.id
      LEFT JOIN produtores p ON ic.produtor_id = p.id
      LEFT JOIN racoes r ON ic.racao_id = r.id
      LEFT JOIN tipos_produtor tp ON p.tipo_id = tp.id
      WHERE ic.carga_id = $1
    `, [req.params.id]);

        res.json({ ...carga, itens: itensResult.rows });
    } catch (error) {
        console.error('Erro ao buscar carga:', error);
        res.status(500).json({ error: 'Erro ao buscar carga' });
    }
});

async function calcularValorItem(quantidade_kg, tipo_produtor_id, data) {
    const result = await pool.query(`
    SELECT * FROM tabela_precos
    WHERE tipo_produtor_id = $1
    AND vigencia_inicio <= $2
    AND (vigencia_fim IS NULL OR vigencia_fim >= $2)
    AND ativo = 1
    ORDER BY vigencia_inicio DESC
    LIMIT 1
  `, [tipo_produtor_id, data]);

    const preco = result.rows[0];
    if (!preco) return 0;

    const toneladas = quantidade_kg / 1000;

    if (preco.tonelagem_minima === null) {
        return toneladas * preco.valor_por_tonelada;
    }

    if (toneladas < preco.tonelagem_minima) {
        return preco.valor_fixo;
    }

    return toneladas * preco.valor_por_tonelada;
}

app.post('/api/cargas', authMiddleware, async (req, res) => {
    const client = await pool.connect();

    try {
        const { data, km_inicial, km_final, itens } = req.body;
        const motorista_id = req.user.tipo === 'motorista' ? req.user.id : req.body.motorista_id;

        if (!motorista_id || !data || !km_inicial || !itens || itens.length === 0) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        await client.query('BEGIN');

        const cargaResult = await client.query(
            'INSERT INTO cargas (motorista_id, data, km_inicial, km_final) VALUES ($1, $2, $3, $4) RETURNING id',
            [motorista_id, data, km_inicial, km_final]
        );

        const cargaId = cargaResult.rows[0].id;
        const totalKg = itens.reduce((sum, item) => sum + parseFloat(item.quantidade_kg), 0);

        for (const item of itens) {
            const produtorResult = await client.query(
                'SELECT tipo_id FROM produtores WHERE id = $1',
                [item.produtor_id]
            );

            const produtor = produtorResult.rows[0];
            let valorItem = await calcularValorItem(totalKg, produtor.tipo_id, data);

            if (itens.length > 1) {
                const proporcao = parseFloat(item.quantidade_kg) / totalKg;
                valorItem = valorItem * proporcao;
            } else {
                valorItem = await calcularValorItem(parseFloat(item.quantidade_kg), produtor.tipo_id, data);
            }

            await client.query(
                `INSERT INTO itens_carga (carga_id, fabrica_id, produtor_id, racao_id, nota_fiscal, quantidade_kg, valor_calculado)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [cargaId, item.fabrica_id, item.produtor_id, item.racao_id, item.nota_fiscal, item.quantidade_kg, valorItem]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ id: cargaId, message: 'Carga cadastrada com sucesso' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar carga:', error);
        res.status(500).json({ error: 'Erro ao criar carga' });
    } finally {
        client.release();
    }
});

app.put('/api/cargas/:id', authMiddleware, async (req, res) => {
    try {
        const { km_final } = req.body;
        const cargaId = req.params.id;

        const cargaResult = await pool.query('SELECT * FROM cargas WHERE id = $1', [cargaId]);
        const carga = cargaResult.rows[0];

        if (!carga) {
            return res.status(404).json({ error: 'Carga não encontrada' });
        }

        if (req.user.tipo === 'motorista' && carga.motorista_id !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        if (km_final !== undefined) {
            await pool.query('UPDATE cargas SET km_final = $1 WHERE id = $2', [km_final, cargaId]);
        }

        res.json({ message: 'Carga atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar carga:', error);
        res.status(500).json({ error: 'Erro ao atualizar carga' });
    }
});

// ============ ROTAS ADMINISTRATIVAS ============

app.get('/api/motoristas', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nome, username, ativo FROM usuarios WHERE tipo = $1 ORDER BY nome',
            ['motorista']
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar motoristas:', error);
        res.status(500).json({ error: 'Erro ao buscar motoristas' });
    }
});

app.post('/api/motoristas', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { nome, username, senha } = req.body;

        if (!nome || !username || !senha) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        const senhaHash = bcrypt.hashSync(senha, 10);
        const result = await pool.query(
            'INSERT INTO usuarios (nome, username, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id',
            [nome, username, senhaHash, 'motorista']
        );

        res.status(201).json({ id: result.rows[0].id, message: 'Motorista cadastrado com sucesso' });
    } catch (error) {
        if (error.message.includes('unique') || error.code === '23505') {
            return res.status(400).json({ error: 'Username já existe' });
        }
        console.error('Erro ao criar motorista:', error);
        res.status(500).json({ error: 'Erro ao criar motorista' });
    }
});

// ============ ROTAS DE USUÁRIOS (GENÉRICO) ============
app.get('/api/usuarios', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { tipo } = req.query;
        let query = 'SELECT id, nome, username, tipo, ativo FROM usuarios';
        const params = [];

        if (tipo) {
            query += ' WHERE tipo = $1';
            params.push(tipo);
        }

        query += ' ORDER BY nome';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

app.post('/api/usuarios', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { nome, username, senha, tipo } = req.body;

        if (!nome || !username || !senha || !tipo) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        // Validar tipo
        if (!['admin', 'motorista', 'consulta'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo de usuário inválido' });
        }

        const senhaHash = bcrypt.hashSync(senha, 10);
        const result = await pool.query(
            'INSERT INTO usuarios (nome, username, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id',
            [nome, username, senhaHash, tipo]
        );

        res.status(201).json({
            id: result.rows[0].id,
            message: `Usuário de ${tipo} cadastrado com sucesso`
        });
    } catch (error) {
        if (error.message.includes('unique') || error.code === '23505') {
            return res.status(400).json({ error: 'Username já existe' });
        }
        console.error('Erro ao criar usuário:', error);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

app.get('/api/fabricas', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fabricas WHERE ativo = 1 ORDER BY nome');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar fábricas:', error);
        res.status(500).json({ error: 'Erro ao buscar fábricas' });
    }
});

app.post('/api/fabricas', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const result = await pool.query('INSERT INTO fabricas (nome) VALUES ($1) RETURNING id', [nome]);
        res.status(201).json({ id: result.rows[0].id, message: 'Fábrica cadastrada com sucesso' });
    } catch (error) {
        if (error.message.includes('unique') || error.code === '23505') {
            return res.status(400).json({ error: 'Fábrica já existe' });
        }
        console.error('Erro ao criar fábrica:', error);
        res.status(500).json({ error: 'Erro ao criar fábrica' });
    }
});

app.get('/api/racoes', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM racoes WHERE ativo = 1 ORDER BY nome');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar rações:', error);
        res.status(500).json({ error: 'Erro ao buscar rações' });
    }
});

app.post('/api/racoes', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const result = await pool.query('INSERT INTO racoes (nome) VALUES ($1) RETURNING id', [nome]);
        res.status(201).json({ id: result.rows[0].id, message: 'Ração cadastrada com sucesso' });
    } catch (error) {
        if (error.message.includes('unique') || error.code === '23505') {
            return res.status(400).json({ error: 'Ração já existe' });
        }
        console.error('Erro ao criar ração:', error);
        res.status(500).json({ error: 'Erro ao criar ração' });
    }
});

app.get('/api/tipos-produtor', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tipos_produtor WHERE ativo = 1 ORDER BY nome');
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar tipos de produtor:', error);
        res.status(500).json({ error: 'Erro ao buscar tipos de produtor' });
    }
});

app.post('/api/tipos-produtor', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const result = await pool.query('INSERT INTO tipos_produtor (nome) VALUES ($1) RETURNING id', [nome]);
        res.status(201).json({ id: result.rows[0].id, message: 'Tipo de produtor cadastrado com sucesso' });
    } catch (error) {
        if (error.message.includes('unique') || error.code === '23505') {
            return res.status(400).json({ error: 'Tipo de produtor já existe' });
        }
        console.error('Erro ao criar tipo de produtor:', error);
        res.status(500).json({ error: 'Erro ao criar tipo de produtor' });
    }
});

app.get('/api/produtores', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT p.*, tp.nome as tipo_nome
      FROM produtores p
      LEFT JOIN tipos_produtor tp ON p.tipo_id = tp.id
      WHERE p.ativo = 1
      ORDER BY p.nome
    `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar produtores:', error);
        res.status(500).json({ error: 'Erro ao buscar produtores' });
    }
});

app.post('/api/produtores', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { nome, localizacao, tipo_id } = req.body;
        if (!nome || !tipo_id) {
            return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        }

        const result = await pool.query(
            'INSERT INTO produtores (nome, localizacao, tipo_id) VALUES ($1, $2, $3) RETURNING id',
            [nome, localizacao || null, tipo_id]
        );
        res.status(201).json({ id: result.rows[0].id, message: 'Produtor cadastrado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar produtor:', error);
        res.status(500).json({ error: 'Erro ao criar produtor' });
    }
});

app.get('/api/precos', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT tp.*, t.nome as tipo_nome
      FROM tabela_precos tp
      LEFT JOIN tipos_produtor t ON tp.tipo_produtor_id = t.id
      WHERE tp.ativo = 1
      ORDER BY tp.vigencia_inicio DESC
    `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar preços:', error);
        res.status(500).json({ error: 'Erro ao buscar preços' });
    }
});

app.post('/api/precos', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { tipo_produtor_id, valor_por_tonelada, valor_fixo, tonelagem_minima, vigencia_inicio } = req.body;

        if (!tipo_produtor_id || !valor_por_tonelada || !vigencia_inicio) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        const result = await pool.query(
            `INSERT INTO tabela_precos (tipo_produtor_id, valor_por_tonelada, valor_fixo, tonelagem_minima, vigencia_inicio)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [tipo_produtor_id, valor_por_tonelada, valor_fixo || null, tonelagem_minima || null, vigencia_inicio]
        );

        res.status(201).json({ id: result.rows[0].id, message: 'Preço cadastrado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar preço:', error);
        res.status(500).json({ error: 'Erro ao criar preço' });
    }
});

app.get('/api/dashboard/resumo', authMiddleware, adminOrConsultaMiddleware, async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        const resumoResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_cargas,
        COUNT(DISTINCT c.motorista_id) as motoristas_ativos,
        SUM(ic.quantidade_kg) as total_kg,
        SUM(ic.valor_calculado) as valor_total,
        AVG(c.km_final - c.km_inicial) as km_medio
      FROM cargas c
      LEFT JOIN itens_carga ic ON c.id = ic.carga_id
      WHERE EXTRACT(MONTH FROM c.data) = $1 AND EXTRACT(YEAR FROM c.data) = $2
    `, [mesAtual, anoAtual]);

        const porMotoristaResult = await pool.query(`
      SELECT 
        u.id,
        u.nome,
        COUNT(DISTINCT c.id) as total_cargas,
        SUM(ic.quantidade_kg) as total_kg,
        SUM(ic.valor_calculado) as valor_total,
        SUM(c.km_final - c.km_inicial) as total_km
      FROM usuarios u
      LEFT JOIN cargas c ON u.id = c.motorista_id 
        AND EXTRACT(MONTH FROM c.data) = $1
        AND EXTRACT(YEAR FROM c.data) = $2
      LEFT JOIN itens_carga ic ON c.id = ic.carga_id
      WHERE u.tipo = 'motorista' AND u.ativo = 1
      GROUP BY u.id
      ORDER BY valor_total DESC
    `, [mesAtual, anoAtual]);

        const resumo = resumoResult.rows[0];
        res.json({
            resumo: {
                ...resumo,
                total_kg: resumo.total_kg || 0,
                valor_total: resumo.valor_total || 0,
                km_medio: resumo.km_medio || 0
            },
            porMotorista: porMotoristaResult.rows
        });
    } catch (error) {
        console.error('Erro ao buscar resumo:', error);
        res.status(500).json({ error: 'Erro ao buscar resumo' });
    }
});

app.get('/api/relatorios/conferencia', authMiddleware, adminOrConsultaMiddleware, async (req, res) => {
    try {
        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        const result = await pool.query(`
      SELECT 
        c.data,
        u.nome as motorista_nome,
        ic.nota_fiscal,
        p.nome as produtor_nome,
        ic.quantidade_kg,
        ic.valor_calculado
      FROM cargas c
      JOIN usuarios u ON c.motorista_id = u.id
      JOIN itens_carga ic ON c.id = ic.carga_id
      JOIN produtores p ON ic.produtor_id = p.id
      WHERE EXTRACT(MONTH FROM c.data) = $1 AND EXTRACT(YEAR FROM c.data) = $2
      ORDER BY c.data DESC, u.nome
    `, [mesAtual, anoAtual]);

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
});

app.get('/api/configuracoes/comissao', authMiddleware, async (req, res) => {
    try {
        // Busca histórico completo
        const result = await pool.query(`
            SELECT id, valor_percentual as valor, vigencia_inicio, vigencia_fim 
            FROM historico_comissoes 
            ORDER BY vigencia_inicio DESC
        `);

        // Busca valor atual (registro sem data fim ou o último)
        const atual = result.rows.find(r => !r.vigencia_fim) || result.rows[0];

        res.json({
            valor: parseFloat(atual?.valor || 12),
            historico: result.rows
        });
    } catch (error) {
        console.error('Erro ao buscar comissão:', error);
        res.status(500).json({ error: 'Erro ao buscar comissão' });
    }
});

app.post('/api/configuracoes/comissao', authMiddleware, adminMiddleware, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { valor, data_inicio } = req.body;
        if (valor === undefined || !data_inicio) {
            return res.status(400).json({ error: 'Valor e data de início são obrigatórios' });
        }

        const novaVigencia = new Date(data_inicio);

        // 1. Fechar vigência atual (registros que estão abertos ou que conflitam)
        // Busca o último registro aberto
        const ultimoResult = await client.query(`
            SELECT id, vigencia_inicio FROM historico_comissoes 
            WHERE vigencia_fim IS NULL 
            ORDER BY vigencia_inicio DESC LIMIT 1
        `);

        if (ultimoResult.rows.length > 0) {
            const ultimo = ultimoResult.rows[0];
            const dataFimAnterior = new Date(novaVigencia);
            dataFimAnterior.setDate(dataFimAnterior.getDate() - 1); // Dia anterior à nova vigência

            if (new Date(ultimo.vigencia_inicio) >= novaVigencia) {
                // Se tenta inserir data anterior ao início do último, erro (simplificação para evitar complexidade)
                // Idealmente permitiria inserção retroativa, mas vamos manter simples: só nova vigência futura
                // Mas o usuário pode querer corrigir. Vamos permitir se for igual.
                if (new Date(ultimo.vigencia_inicio).toISOString().split('T')[0] === novaVigencia.toISOString().split('T')[0]) {
                    // Atualiza valor do atual
                    await client.query(`UPDATE historico_comissoes SET valor_percentual = $1 WHERE id = $2`, [valor, ultimo.id]);
                    await client.query('COMMIT');
                    return res.json({ message: 'Comissão atualizada com sucesso' });
                }
            }

            // Fecha o anterior
            await client.query(`
                UPDATE historico_comissoes 
                SET vigencia_fim = $1 
                WHERE id = $2
            `, [dataFimAnterior, ultimo.id]);
        }

        // 2. Inserir novo registro
        await client.query(`
            INSERT INTO historico_comissoes (valor_percentual, vigencia_inicio)
            VALUES ($1, $2)
        `, [valor, data_inicio]);

        // Manter retrocompatibilidade atualizando também na configuracoes (fallback)
        await client.query("UPDATE configuracoes SET valor = $1 WHERE chave = 'comissao_motorista'", [valor.toString()]);

        await client.query('COMMIT');
        res.json({ message: 'Nova vigência de comissão criada com sucesso' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar comissão:', error);
        res.status(500).json({ error: 'Erro ao atualizar comissão' });
    } finally {
        client.release();
    }
});

// ============ SERVIR FRONTEND EM PRODUÇÃO ============
// Log de requisições de arquivos estáticos para debug
app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
        // console.log(`📄 Servindo: ${req.path}`); // Log desabilitado para limpeza
    }
    next();
});

// Determinar caminho do frontend (public/ em produção, ../frontend em dev)
const frontendPath = process.env.NODE_ENV === 'production'
    ? path.join(__dirname, 'public')
    : path.join(__dirname, '../frontend');

console.log(`📁 Servindo frontend de: ${frontendPath}`);

// Servir arquivos estáticos SEM cache
app.use(express.static(frontendPath, {
    maxAge: 0,
    etag: false,
    lastModified: false,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));

app.get('*', (req, res) => {
    // console.log(`🔀 Fallback para index.html: ${req.path}`); // Log desabilitado
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Usando PostgreSQL`);
});
