// Versão do servidor otimizada para PostgreSQL (produção)
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
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

// ============ ROTAS DE AUTENTICAÇÃO ============

app.post('/api/login', async (req, res) => {
    const { username, senha } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE username = $1 AND ativo = 1',
            [username]
        );

        const usuario = result.rows[0];

        if (!usuario) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        const senhaValida = bcrypt.compareSync(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: 'Usuário ou senha inválidos' });
        }

        const token = jwt.sign(
            { id: usuario.id, username: usuario.username, tipo: usuario.tipo, nome: usuario.nome },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                username: usuario.username,
                tipo: usuario.tipo
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
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
        (SELECT valor FROM configuracoes WHERE chave = 'comissao_motorista') as percentual_comissao
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

app.get('/api/dashboard/resumo', authMiddleware, adminMiddleware, async (req, res) => {
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

app.get('/api/relatorios/conferencia', authMiddleware, adminMiddleware, async (req, res) => {
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
        const result = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'comissao_motorista'");
        res.json({ valor: parseFloat(result.rows[0]?.valor || 12) });
    } catch (error) {
        console.error('Erro ao buscar comissão:', error);
        res.status(500).json({ error: 'Erro ao buscar comissão' });
    }
});

app.post('/api/configuracoes/comissao', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { valor } = req.body;
        if (valor === undefined) {
            return res.status(400).json({ error: 'Valor é obrigatório' });
        }

        await pool.query("UPDATE configuracoes SET valor = $1 WHERE chave = 'comissao_motorista'", [valor.toString()]);
        res.json({ message: 'Comissão atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar comissão:', error);
        res.status(500).json({ error: 'Erro ao atualizar comissão' });
    }
});

// ============ SERVIR FRONTEND EM PRODUÇÃO ============
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Usando PostgreSQL`);
    console.log(`\n👤 Login Admin:`);
    console.log(`   Username: admin`);
    console.log(`   Senha: admin123`);
    console.log(`\n🚛 Login Motoristas:`);
    console.log(`   Username: motorista1, motorista2, etc`);
    console.log(`   Senha: 123456\n`);
});
