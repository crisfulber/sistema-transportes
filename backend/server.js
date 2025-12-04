import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './database.js';
import { authMiddleware, adminMiddleware } from './middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============ ROTAS DE AUTENTICAÇÃO ============

app.post('/api/login', (req, res) => {
    const { username, senha } = req.body;

    try {
        const usuario = db.prepare('SELECT * FROM usuarios WHERE username = ? AND ativo = 1').get(username);

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

app.get('/api/cargas', authMiddleware, (req, res) => {
    try {
        const { mes, ano, motorista_id } = req.query;
        let query = `
      SELECT 
        c.*,
        u.nome as motorista_nome,
        COUNT(ic.id) as total_itens,
        SUM(ic.quantidade_kg) as total_kg,
        SUM(ic.quantidade_kg) as total_kg,
        SUM(ic.valor_calculado) as valor_total,
        (SELECT valor FROM configuracoes WHERE chave = 'comissao_motorista') as percentual_comissao
      FROM cargas c
      LEFT JOIN usuarios u ON c.motorista_id = u.id
      LEFT JOIN itens_carga ic ON c.id = ic.carga_id
      WHERE 1=1
    `;

        const params = [];

        if (req.user.tipo === 'motorista') {
            query += ' AND c.motorista_id = ?';
            params.push(req.user.id);
        } else if (motorista_id) {
            query += ' AND c.motorista_id = ?';
            params.push(motorista_id);
        }

        if (mes && ano) {
            query += ` AND strftime('%m', c.data) = ? AND strftime('%Y', c.data) = ?`;
            params.push(mes.toString().padStart(2, '0'), ano.toString());
        }

        query += ' GROUP BY c.id ORDER BY c.data DESC, c.id DESC';

        const cargas = db.prepare(query).all(...params);
        res.json(cargas);
    } catch (error) {
        console.error('Erro ao buscar cargas:', error);
        res.status(500).json({ error: 'Erro ao buscar cargas' });
    }
});

app.get('/api/cargas/:id', authMiddleware, (req, res) => {
    try {
        const carga = db.prepare(`
      SELECT c.*, u.nome as motorista_nome
      FROM cargas c
      LEFT JOIN usuarios u ON c.motorista_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

        if (!carga) {
            return res.status(404).json({ error: 'Carga não encontrada' });
        }

        // Verificar permissão
        if (req.user.tipo === 'motorista' && carga.motorista_id !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const itens = db.prepare(`
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
      WHERE ic.carga_id = ?
    `).all(req.params.id);

        res.json({ ...carga, itens });
    } catch (error) {
        console.error('Erro ao buscar carga:', error);
        res.status(500).json({ error: 'Erro ao buscar carga' });
    }
});

// Função para calcular valor do item
function calcularValorItem(quantidade_kg, tipo_produtor_id, data) {
    const preco = db.prepare(`
    SELECT * FROM tabela_precos
    WHERE tipo_produtor_id = ?
    AND vigencia_inicio <= ?
    AND (vigencia_fim IS NULL OR vigencia_fim >= ?)
    AND ativo = 1
    ORDER BY vigencia_inicio DESC
    LIMIT 1
  `).get(tipo_produtor_id, data, data);

    if (!preco) return 0;

    const toneladas = quantidade_kg / 1000;

    // UPD e Recria: sempre por tonelada
    if (preco.tonelagem_minima === null) {
        return toneladas * preco.valor_por_tonelada;
    }

    // Creche e Terminação: valor fixo se abaixo da tonelagem mínima
    if (toneladas < preco.tonelagem_minima) {
        return preco.valor_fixo;
    }

    return toneladas * preco.valor_por_tonelada;
}

app.post('/api/cargas', authMiddleware, (req, res) => {
    try {
        const { data, km_inicial, km_final, itens } = req.body;
        const motorista_id = req.user.tipo === 'motorista' ? req.user.id : req.body.motorista_id;

        if (!motorista_id || !data || !km_inicial || !itens || itens.length === 0) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        // Iniciar transação
        const insertCarga = db.prepare('INSERT INTO cargas (motorista_id, data, km_inicial, km_final) VALUES (?, ?, ?, ?)');
        const insertItem = db.prepare(`
      INSERT INTO itens_carga (carga_id, fabrica_id, produtor_id, racao_id, nota_fiscal, quantidade_kg, valor_calculado)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        const transaction = db.transaction((motorista_id, data, km_inicial, km_final, itens) => {
            const result = insertCarga.run(motorista_id, data, km_inicial, km_final);
            const cargaId = result.lastInsertRowid;

            // Calcular total de kg da carga
            const totalKg = itens.reduce((sum, item) => sum + parseFloat(item.quantidade_kg), 0);

            itens.forEach(item => {
                const produtor = db.prepare('SELECT tipo_id FROM produtores WHERE id = ?').get(item.produtor_id);

                // Calcular valor proporcional se houver múltiplos produtores
                let valorItem = calcularValorItem(totalKg, produtor.tipo_id, data);

                if (itens.length > 1) {
                    // Ratear proporcionalmente
                    const proporcao = parseFloat(item.quantidade_kg) / totalKg;
                    valorItem = valorItem * proporcao;
                } else {
                    // Recalcular com a quantidade específica do item
                    valorItem = calcularValorItem(parseFloat(item.quantidade_kg), produtor.tipo_id, data);
                }

                insertItem.run(
                    cargaId,
                    item.fabrica_id,
                    item.produtor_id,
                    item.racao_id,
                    item.nota_fiscal,
                    item.quantidade_kg,
                    valorItem
                );
            });

            return cargaId;
        });

        const cargaId = transaction(motorista_id, data, km_inicial, km_final, itens);

        res.status(201).json({ id: cargaId, message: 'Carga cadastrada com sucesso' });
    } catch (error) {
        console.error('Erro ao criar carga:', error);
        res.status(500).json({ error: 'Erro ao criar carga' });
    }
});

app.put('/api/cargas/:id', authMiddleware, (req, res) => {
    try {
        const { km_final } = req.body;
        const cargaId = req.params.id;

        const carga = db.prepare('SELECT * FROM cargas WHERE id = ?').get(cargaId);

        if (!carga) {
            return res.status(404).json({ error: 'Carga não encontrada' });
        }

        if (req.user.tipo === 'motorista' && carga.motorista_id !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        if (km_final !== undefined) {
            db.prepare('UPDATE cargas SET km_final = ? WHERE id = ?').run(km_final, cargaId);
        }

        res.json({ message: 'Carga atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar carga:', error);
        res.status(500).json({ error: 'Erro ao atualizar carga' });
    }
});

// ============ ROTAS DE DASHBOARD ============

app.get('/api/dashboard/resumo', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        const resumo = db.prepare(`
      SELECT 
        COUNT(DISTINCT c.id) as total_cargas,
        COUNT(DISTINCT c.motorista_id) as motoristas_ativos,
        SUM(ic.quantidade_kg) as total_kg,
        SUM(ic.valor_calculado) as valor_total,
        AVG(c.km_final - c.km_inicial) as km_medio
      FROM cargas c
      LEFT JOIN itens_carga ic ON c.id = ic.carga_id
      WHERE strftime('%m', c.data) = ? AND strftime('%Y', c.data) = ?
    `).get(mesAtual.toString().padStart(2, '0'), anoAtual.toString());

        const porMotorista = db.prepare(`
      SELECT 
        u.id,
        u.nome,
        COUNT(DISTINCT c.id) as total_cargas,
        SUM(ic.quantidade_kg) as total_kg,
        SUM(ic.valor_calculado) as valor_total,
        SUM(c.km_final - c.km_inicial) as total_km
      FROM usuarios u
      LEFT JOIN cargas c ON u.id = c.motorista_id 
        AND strftime('%m', c.data) = ? 
        AND strftime('%Y', c.data) = ?
      LEFT JOIN itens_carga ic ON c.id = ic.carga_id
      WHERE u.tipo = 'motorista' AND u.ativo = 1
      GROUP BY u.id
      ORDER BY valor_total DESC
    `).all(mesAtual.toString().padStart(2, '0'), anoAtual.toString());

        res.json({
            resumo: {
                ...resumo,
                total_kg: resumo.total_kg || 0,
                valor_total: resumo.valor_total || 0,
                km_medio: resumo.km_medio || 0
            },
            porMotorista
        });
    } catch (error) {
        console.error('Erro ao buscar resumo:', error);
        res.status(500).json({ error: 'Erro ao buscar resumo' });
    }
});

app.get('/api/relatorios/conferencia', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { mes, ano } = req.query;
        const mesAtual = mes || new Date().getMonth() + 1;
        const anoAtual = ano || new Date().getFullYear();

        const relatorio = db.prepare(`
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
      WHERE strftime('%m', c.data) = ? AND strftime('%Y', c.data) = ?
      ORDER BY c.data DESC, u.nome
    `).all(mesAtual.toString().padStart(2, '0'), anoAtual.toString());

        res.json(relatorio);
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório' });
    }
});

// ============ ROTAS ADMINISTRATIVAS ============

// Motoristas
app.get('/api/motoristas', authMiddleware, (req, res) => {
    try {
        const motoristas = db.prepare('SELECT id, nome, username, ativo FROM usuarios WHERE tipo = ? ORDER BY nome').all('motorista');
        res.json(motoristas);
    } catch (error) {
        console.error('Erro ao buscar motoristas:', error);
        res.status(500).json({ error: 'Erro ao buscar motoristas' });
    }
});

app.post('/api/motoristas', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { nome, username, senha } = req.body;

        if (!nome || !username || !senha) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        const senhaHash = bcrypt.hashSync(senha, 10);
        const result = db.prepare('INSERT INTO usuarios (nome, username, senha, tipo) VALUES (?, ?, ?, ?)').run(
            nome,
            username,
            senhaHash,
            'motorista'
        );

        res.status(201).json({ id: result.lastInsertRowid, message: 'Motorista cadastrado com sucesso' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username já existe' });
        }
        console.error('Erro ao criar motorista:', error);
        res.status(500).json({ error: 'Erro ao criar motorista' });
    }
});

// Fábricas
app.get('/api/fabricas', authMiddleware, (req, res) => {
    try {
        const fabricas = db.prepare('SELECT * FROM fabricas WHERE ativo = 1 ORDER BY nome').all();
        res.json(fabricas);
    } catch (error) {
        console.error('Erro ao buscar fábricas:', error);
        res.status(500).json({ error: 'Erro ao buscar fábricas' });
    }
});

app.post('/api/fabricas', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const result = db.prepare('INSERT INTO fabricas (nome) VALUES (?)').run(nome);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Fábrica cadastrada com sucesso' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Fábrica já existe' });
        }
        console.error('Erro ao criar fábrica:', error);
        res.status(500).json({ error: 'Erro ao criar fábrica' });
    }
});

// Rações
app.get('/api/racoes', authMiddleware, (req, res) => {
    try {
        const racoes = db.prepare('SELECT * FROM racoes WHERE ativo = 1 ORDER BY nome').all();
        res.json(racoes);
    } catch (error) {
        console.error('Erro ao buscar rações:', error);
        res.status(500).json({ error: 'Erro ao buscar rações' });
    }
});

app.post('/api/racoes', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const result = db.prepare('INSERT INTO racoes (nome) VALUES (?)').run(nome);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Ração cadastrada com sucesso' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Ração já existe' });
        }
        console.error('Erro ao criar ração:', error);
        res.status(500).json({ error: 'Erro ao criar ração' });
    }
});

// Tipos de Produtor
app.get('/api/tipos-produtor', authMiddleware, (req, res) => {
    try {
        const tipos = db.prepare('SELECT * FROM tipos_produtor WHERE ativo = 1 ORDER BY nome').all();
        res.json(tipos);
    } catch (error) {
        console.error('Erro ao buscar tipos de produtor:', error);
        res.status(500).json({ error: 'Erro ao buscar tipos de produtor' });
    }
});

app.post('/api/tipos-produtor', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome) {
            return res.status(400).json({ error: 'Nome é obrigatório' });
        }

        const result = db.prepare('INSERT INTO tipos_produtor (nome) VALUES (?)').run(nome);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Tipo de produtor cadastrado com sucesso' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Tipo de produtor já existe' });
        }
        console.error('Erro ao criar tipo de produtor:', error);
        res.status(500).json({ error: 'Erro ao criar tipo de produtor' });
    }
});

// Produtores
app.get('/api/produtores', authMiddleware, (req, res) => {
    try {
        const produtores = db.prepare(`
      SELECT p.*, tp.nome as tipo_nome
      FROM produtores p
      LEFT JOIN tipos_produtor tp ON p.tipo_id = tp.id
      WHERE p.ativo = 1
      ORDER BY p.nome
    `).all();
        res.json(produtores);
    } catch (error) {
        console.error('Erro ao buscar produtores:', error);
        res.status(500).json({ error: 'Erro ao buscar produtores' });
    }
});

app.post('/api/produtores', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { nome, localizacao, tipo_id } = req.body;
        if (!nome || !tipo_id) {
            return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        }

        const result = db.prepare('INSERT INTO produtores (nome, localizacao, tipo_id) VALUES (?, ?, ?)').run(
            nome,
            localizacao || null,
            tipo_id
        );
        res.status(201).json({ id: result.lastInsertRowid, message: 'Produtor cadastrado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar produtor:', error);
        res.status(500).json({ error: 'Erro ao criar produtor' });
    }
});

// Tabela de Preços
app.get('/api/precos', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const precos = db.prepare(`
      SELECT tp.*, t.nome as tipo_nome
      FROM tabela_precos tp
      LEFT JOIN tipos_produtor t ON tp.tipo_produtor_id = t.id
      WHERE tp.ativo = 1
      ORDER BY tp.vigencia_inicio DESC
    `).all();
        res.json(precos);
    } catch (error) {
        console.error('Erro ao buscar preços:', error);
        res.status(500).json({ error: 'Erro ao buscar preços' });
    }
});

app.post('/api/precos', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { tipo_produtor_id, valor_por_tonelada, valor_fixo, tonelagem_minima, vigencia_inicio } = req.body;

        if (!tipo_produtor_id || !valor_por_tonelada || !vigencia_inicio) {
            return res.status(400).json({ error: 'Dados incompletos' });
        }

        const result = db.prepare(`
      INSERT INTO tabela_precos (tipo_produtor_id, valor_por_tonelada, valor_fixo, tonelagem_minima, vigencia_inicio)
      VALUES (?, ?, ?, ?, ?)
    `).run(tipo_produtor_id, valor_por_tonelada, valor_fixo || null, tonelagem_minima || null, vigencia_inicio);

        res.status(201).json({ id: result.lastInsertRowid, message: 'Preço cadastrado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar preço:', error);
        res.status(500).json({ error: 'Erro ao criar preço' });
    }
});

// Configurações (Comissões)
app.get('/api/configuracoes/comissao', authMiddleware, (req, res) => {
    try {
        const config = db.prepare("SELECT valor FROM configuracoes WHERE chave = 'comissao_motorista'").get();
        res.json({ valor: parseFloat(config?.valor || 12) });
    } catch (error) {
        console.error('Erro ao buscar comissão:', error);
        res.status(500).json({ error: 'Erro ao buscar comissão' });
    }
});

app.post('/api/configuracoes/comissao', authMiddleware, adminMiddleware, (req, res) => {
    try {
        const { valor } = req.body;
        if (valor === undefined) {
            return res.status(400).json({ error: 'Valor é obrigatório' });
        }

        db.prepare("UPDATE configuracoes SET valor = ? WHERE chave = 'comissao_motorista'").run(valor.toString());
        res.json({ message: 'Comissão atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar comissão:', error);
        res.status(500).json({ error: 'Erro ao atualizar comissão' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 API disponível em http://localhost:${PORT}/api`);
    console.log(`\n👤 Login Admin:`);
    console.log(`   Username: admin`);
    console.log(`   Senha: admin123`);
    console.log(`\n🚛 Login Motoristas:`);
    console.log(`   Username: [nome.sobrenome] (ex: adalberto.lunkes)`);
    console.log(`   Senha: 123456\n`);
});
