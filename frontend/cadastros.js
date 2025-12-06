if (!checkAuth()) throw new Error('Não autenticado');

const usuario = getUsuario();
if (usuario.tipo !== 'admin') window.location.href = 'motorista.html';

document.getElementById('userName').textContent = usuario.nome;

let tiposProdutor = [];
let editandoId = null;
let cache = {
    motoristas: [],
    consultas: [],
    produtores: [],
    fabricas: [],
    racoes: [],
    tipos: [],
    precos: []
};

function mudarTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');

    carregarDados(tabName);
}

function fecharModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function showError(message, elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 5000);
    }
}

function showSuccess(message, elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
    }
}

// MOTORISTAS
// MOTORISTAS
async function carregarMotoristas() {
    const container = document.getElementById('motoristasContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        cache.motoristas = await apiRequest('/motoristas');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th><th>Username</th><th>Status</th><th>Ações</th></tr></thead>
                    <tbody>
                        ${cache.motoristas.map(m => `
                            <tr>
                                <td><strong>${m.nome}</strong></td>
                                <td>${m.username}</td>
                                <td><span class="badge badge-${m.ativo ? 'success' : 'warning'}">${m.ativo ? 'Ativo' : 'Inativo'}</span></td>
                                <td>
                                    <button class="btn-sm btn-view" onclick="editarMotorista(${m.id})">Editar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message show">Erro: ${error.message}</div>`;
    }
}

function abrirModalMotorista() {
    editandoId = null;
    document.getElementById('modalMotorista').querySelector('.modal-title').textContent = 'Novo Motorista';
    document.getElementById('modalMotorista').classList.add('show');
    document.getElementById('formMotorista').reset();
    document.getElementById('formMotorista').querySelector('input[name="senha"]').required = true;
    document.getElementById('formMotorista').querySelector('input[name="senha"]').placeholder = 'Senha de acesso';
}

function editarMotorista(id) {
    const motorista = cache.motoristas.find(m => m.id === id);
    if (!motorista) return;

    editandoId = id;
    const form = document.getElementById('formMotorista');
    document.getElementById('modalMotorista').querySelector('.modal-title').textContent = 'Editar Motorista';

    // Preencher campos
    form.querySelector('input[name="nome"]').value = motorista.nome;
    form.querySelector('input[name="username"]').value = motorista.username;

    const senhaInput = form.querySelector('input[name="senha"]');
    senhaInput.required = false;
    senhaInput.placeholder = '(Deixe em branco para manter)';

    document.getElementById('modalMotorista').classList.add('show');
}

document.getElementById('formMotorista').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        if (editandoId) {
            if (!data.senha) delete data.senha;
            await apiRequest(`/motoristas/${editandoId}`, { method: 'PUT', body: JSON.stringify(data) });
            showSuccess('Motorista atualizado com sucesso!', 'successMotorista');
        } else {
            await apiRequest('/motoristas', { method: 'POST', body: JSON.stringify(data) });
            showSuccess('Motorista cadastrado com sucesso!', 'successMotorista');
        }

        setTimeout(() => {
            fecharModal('modalMotorista');
            carregarMotoristas();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorMotorista');
    }
});

// USUÁRIOS DE CONSULTA
async function carregarConsultas() {
    const container = document.getElementById('consultasContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        cache.consultas = await apiRequest('/usuarios?tipo=consulta');

        if (cache.consultas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <h3>Nenhum usuário cadastrado</h3>
                    <p>Clique em "Novo" para adicionar</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th><th>Username</th><th>Status</th><th>Ações</th></tr></thead>
                    <tbody>
                        ${cache.consultas.map(u => `
                            <tr>
                                <td><strong>${u.nome}</strong></td>
                                <td>${u.username}</td>
                                <td><span class="badge badge-${u.ativo ? 'success' : 'warning'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                                <td>
                                    <button class="btn-sm btn-view" onclick="editarConsulta(${u.id})">Editar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message show">Erro: ${error.message}</div>`;
    }
}

function abrirModalConsulta() {
    editandoId = null;
    document.getElementById('modalConsulta').querySelector('.modal-title').textContent = 'Novo Usuário';
    document.getElementById('modalConsulta').classList.add('show');
    document.getElementById('formConsulta').reset();
    document.getElementById('formConsulta').querySelector('input[name="senha"]').required = true;
    document.getElementById('formConsulta').querySelector('input[name="senha"]').placeholder = 'Senha';
}

function editarConsulta(id) {
    const usuario = cache.consultas.find(u => u.id === id);
    if (!usuario) return;

    editandoId = id;
    const form = document.getElementById('formConsulta');
    document.getElementById('modalConsulta').querySelector('.modal-title').textContent = 'Editar Usuário';

    form.querySelector('input[name="nome"]').value = usuario.nome;
    form.querySelector('input[name="username"]').value = usuario.username;

    const senhaInput = form.querySelector('input[name="senha"]');
    senhaInput.required = false;
    senhaInput.placeholder = '(Deixe em branco para manter)';

    document.getElementById('modalConsulta').classList.add('show');
}

document.getElementById('formConsulta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.tipo = 'consulta';

    try {
        if (editandoId) {
            if (!data.senha) delete data.senha;
            await apiRequest(`/usuarios/${editandoId}`, { method: 'PUT', body: JSON.stringify(data) });
            showSuccess('Usuário atualizado com sucesso!', 'successConsulta');
        } else {
            await apiRequest('/usuarios', { method: 'POST', body: JSON.stringify(data) });
            showSuccess('Usuário cadastrado com sucesso!', 'successConsulta');
        }

        setTimeout(() => {
            fecharModal('modalConsulta');
            carregarConsultas();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorConsulta');
    }
});

// PRODUTORES
// PRODUTORES
async function carregarProdutores() {
    const container = document.getElementById('produtoresContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        cache.produtores = await apiRequest('/produtores');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th><th>Localização</th><th>Tipo</th><th>Ações</th></tr></thead>
                    <tbody>
                        ${cache.produtores.map(p => `
                            <tr>
                                <td><strong>${p.nome}</strong></td>
                                <td>${p.localizacao || '-'}</td>
                                <td><span class="badge badge-primary">${p.tipo_nome}</span></td>
                                <td>
                                    <button class="btn-sm btn-view" onclick="editarProdutor(${p.id})">Editar</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message show">Erro: ${error.message}</div>`;
    }
}

async function abrirModalProdutor() {
    editandoId = null;
    tiposProdutor = await apiRequest('/tipos-produtor');
    const select = document.getElementById('selectTipoProdutor');
    select.innerHTML = '<option value="">Selecione...</option>' +
        tiposProdutor.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');

    document.getElementById('modalProdutor').querySelector('.modal-title').textContent = 'Novo Produtor';
    document.getElementById('modalProdutor').classList.add('show');
    document.getElementById('formProdutor').reset();
}

async function editarProdutor(id) {
    const produtor = cache.produtores.find(p => p.id === id);
    if (!produtor) return;

    editandoId = id;

    // Carregar tipos se necessário
    if (tiposProdutor.length === 0) {
        tiposProdutor = await apiRequest('/tipos-produtor');
    }

    const select = document.getElementById('selectTipoProdutor');
    select.innerHTML = '<option value="">Selecione...</option>' +
        tiposProdutor.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');

    const form = document.getElementById('formProdutor');
    document.getElementById('modalProdutor').querySelector('.modal-title').textContent = 'Editar Produtor';

    form.querySelector('input[name="nome"]').value = produtor.nome;
    form.querySelector('input[name="localizacao"]').value = produtor.localizacao || '';
    form.querySelector('select[name="tipo_id"]').value = produtor.tipo_id;

    document.getElementById('modalProdutor').classList.add('show');
}

document.getElementById('formProdutor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.tipo_id = parseInt(data.tipo_id);

    try {
        if (editandoId) {
            await apiRequest(`/produtores/${editandoId}`, { method: 'PUT', body: JSON.stringify(data) });
            showSuccess('Produtor atualizado com sucesso!', 'successProdutor');
        } else {
            await apiRequest('/produtores', { method: 'POST', body: JSON.stringify(data) });
            showSuccess('Produtor cadastrado com sucesso!', 'successProdutor');
        }

        setTimeout(() => {
            fecharModal('modalProdutor');
            carregarProdutores();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorProdutor');
    }
});

// FÁBRICAS
// FÁBRICAS
async function carregarFabricas() {
    const container = document.getElementById('fabricasContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        cache.fabricas = await apiRequest('/fabricas');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th><th>Ações</th></tr></thead>
                    <tbody>
                        ${cache.fabricas.map(f => `
                            <tr>
                                <td><strong>${f.nome}</strong></td>
                                <td><button class="btn-sm btn-view" onclick="editarFabrica(${f.id})">Editar</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message show">Erro: ${error.message}</div>`;
    }
}

function abrirModalFabrica() {
    editandoId = null;
    document.getElementById('modalFabrica').querySelector('.modal-title').textContent = 'Nova Fábrica';
    document.getElementById('modalFabrica').classList.add('show');
    document.getElementById('formFabrica').reset();
}

function editarFabrica(id) {
    const fabrica = cache.fabricas.find(f => f.id === id);
    if (!fabrica) return;

    editandoId = id;
    document.getElementById('modalFabrica').querySelector('.modal-title').textContent = 'Editar Fábrica';
    const form = document.getElementById('formFabrica');
    form.querySelector('input[name="nome"]').value = fabrica.nome;

    document.getElementById('modalFabrica').classList.add('show');
}

document.getElementById('formFabrica').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        if (editandoId) {
            await apiRequest(`/fabricas/${editandoId}`, { method: 'PUT', body: JSON.stringify(data) });
            showSuccess('Fábrica atualizada com sucesso!', 'successFabrica');
        } else {
            await apiRequest('/fabricas', { method: 'POST', body: JSON.stringify(data) });
            showSuccess('Fábrica cadastrada com sucesso!', 'successFabrica');
        }

        setTimeout(() => {
            fecharModal('modalFabrica');
            carregarFabricas();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorFabrica');
    }
});

// RAÇÕES
// RAÇÕES
async function carregarRacoes() {
    const container = document.getElementById('racoesContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        cache.racoes = await apiRequest('/racoes');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th><th>Ações</th></tr></thead>
                    <tbody>
                        ${cache.racoes.map(r => `
                            <tr>
                                <td><strong>${r.nome}</strong></td>
                                <td><button class="btn-sm btn-view" onclick="editarRacao(${r.id})">Editar</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message show">Erro: ${error.message}</div>`;
    }
}

function abrirModalRacao() {
    editandoId = null;
    document.getElementById('modalRacao').querySelector('.modal-title').textContent = 'Nova Ração';
    document.getElementById('modalRacao').classList.add('show');
    document.getElementById('formRacao').reset();
}

function editarRacao(id) {
    const racao = cache.racoes.find(r => r.id === id);
    if (!racao) return;

    editandoId = id;
    document.getElementById('modalRacao').querySelector('.modal-title').textContent = 'Editar Ração';
    const form = document.getElementById('formRacao');
    form.querySelector('input[name="nome"]').value = racao.nome;

    document.getElementById('modalRacao').classList.add('show');
}

document.getElementById('formRacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        if (editandoId) {
            await apiRequest(`/racoes/${editandoId}`, { method: 'PUT', body: JSON.stringify(data) });
            showSuccess('Ração atualizada com sucesso!', 'successRacao');
        } else {
            await apiRequest('/racoes', { method: 'POST', body: JSON.stringify(data) });
            showSuccess('Ração cadastrada com sucesso!', 'successRacao');
        }

        setTimeout(() => {
            fecharModal('modalRacao');
            carregarRacoes();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorRacao');
    }
});

// TIPOS DE PRODUTOR
// TIPOS DE PRODUTOR
async function carregarTipos() {
    const container = document.getElementById('tiposContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        cache.tipos = await apiRequest('/tipos-produtor');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th><th>Ações</th></tr></thead>
                    <tbody>
                        ${cache.tipos.map(t => `
                            <tr>
                                <td><strong>${t.nome}</strong></td>
                                <td><button class="btn-sm btn-view" onclick="editarTipo(${t.id})">Editar</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message show">Erro: ${error.message}</div>`;
    }
}

function abrirModalTipo() {
    editandoId = null;
    document.getElementById('modalTipo').querySelector('.modal-title').textContent = 'Novo Tipo';
    document.getElementById('modalTipo').classList.add('show');
    document.getElementById('formTipo').reset();
}

function editarTipo(id) {
    const tipo = cache.tipos.find(t => t.id === id);
    if (!tipo) return;

    editandoId = id;
    document.getElementById('modalTipo').querySelector('.modal-title').textContent = 'Editar Tipo';
    const form = document.getElementById('formTipo');
    form.querySelector('input[name="nome"]').value = tipo.nome;

    document.getElementById('modalTipo').classList.add('show');
}

document.getElementById('formTipo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        if (editandoId) {
            await apiRequest(`/tipos-produtor/${editandoId}`, { method: 'PUT', body: JSON.stringify(data) });
            showSuccess('Tipo atualizado com sucesso!', 'successTipo');
        } else {
            await apiRequest('/tipos-produtor', { method: 'POST', body: JSON.stringify(data) });
            showSuccess('Tipo cadastrado com sucesso!', 'successTipo');
        }

        setTimeout(() => {
            fecharModal('modalTipo');
            carregarTipos();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorTipo');
    }
});

// PREÇOS
// PREÇOS
async function carregarPrecos() {
    const container = document.getElementById('precosContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        cache.precos = await apiRequest('/precos');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Valor/Ton</th>
                            <th>Valor Fixo</th>
                            <th>Ton. Mínima</th>
                            <th>Vigência</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cache.precos.map(p => `
                            <tr>
                                <td><span class="badge badge-primary">${p.tipo_nome}</span></td>
                                <td>${formatCurrency(p.valor_por_tonelada)}</td>
                                <td>${p.valor_fixo ? formatCurrency(p.valor_fixo) : '-'}</td>
                                <td>${p.tonelagem_minima ? formatNumber(p.tonelagem_minima, 2) + ' ton' : '-'}</td>
                                <td>${formatDate(p.vigencia_inicio)}</td>
                                <td><button class="btn-sm btn-view" onclick="editarPreco(${p.id})">Editar</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message show">Erro: ${error.message}</div>`;
    }
}

async function abrirModalPreco() {
    editandoId = null;
    tiposProdutor = await apiRequest('/tipos-produtor');
    const select = document.getElementById('selectTipoPreco');
    select.innerHTML = '<option value="">Selecione...</option>' +
        tiposProdutor.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');

    document.getElementById('modalPreco').querySelector('.modal-title').textContent = 'Novo Preço';
    document.getElementById('modalPreco').classList.add('show');
    document.getElementById('formPreco').reset();
    document.querySelector('input[name="vigencia_inicio"]').valueAsDate = new Date();
}

async function editarPreco(id) {
    const preco = cache.precos.find(p => p.id === id);
    if (!preco) return;

    editandoId = id;

    // Carregar tipos se necessário
    if (tiposProdutor.length === 0) {
        tiposProdutor = await apiRequest('/tipos-produtor');
    }

    const select = document.getElementById('selectTipoPreco');
    select.innerHTML = '<option value="">Selecione...</option>' +
        tiposProdutor.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');

    document.getElementById('modalPreco').querySelector('.modal-title').textContent = 'Editar Preço';
    const form = document.getElementById('formPreco');

    form.querySelector('select[name="tipo_produtor_id"]').value = preco.tipo_produtor_id;
    form.querySelector('input[name="valor_por_tonelada"]').value = preco.valor_por_tonelada;
    form.querySelector('input[name="valor_fixo"]').value = preco.valor_fixo || '';
    form.querySelector('input[name="tonelagem_minima"]').value = preco.tonelagem_minima || '';

    if (preco.vigencia_inicio) {
        form.querySelector('input[name="vigencia_inicio"]').value = preco.vigencia_inicio.split('T')[0];
    }

    document.getElementById('modalPreco').classList.add('show');
}

document.getElementById('formPreco').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    data.tipo_produtor_id = parseInt(data.tipo_produtor_id);
    data.valor_por_tonelada = parseFloat(data.valor_por_tonelada);
    if (data.valor_fixo) data.valor_fixo = parseFloat(data.valor_fixo);
    if (data.tonelagem_minima) data.tonelagem_minima = parseFloat(data.tonelagem_minima);

    try {
        if (editandoId) {
            await apiRequest(`/precos/${editandoId}`, { method: 'PUT', body: JSON.stringify(data) });
            showSuccess('Preço atualizado com sucesso!', 'successPreco');
        } else {
            await apiRequest('/precos', { method: 'POST', body: JSON.stringify(data) });
            showSuccess('Preço cadastrado com sucesso!', 'successPreco');
        }

        setTimeout(() => {
            fecharModal('modalPreco');
            carregarPrecos();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorPreco');
    }
});

// CONFIGURAÇÕES
async function carregarConfiguracoes() {
    try {
        const config = await apiRequest('/configuracoes/comissao');

        // Configura data padrão como hoje
        document.getElementById('dataInicioComissao').valueAsDate = new Date();

        // Preencher Histórico
        const tbody = document.getElementById('historicoComissoesBody');
        if (config.historico && config.historico.length > 0) {
            tbody.innerHTML = config.historico.map(h => {
                // Ajuste de data devido ao timezone
                const dataInicioParts = h.vigencia_inicio.split('T')[0].split('-');
                const dataInicio = `${dataInicioParts[2]}/${dataInicioParts[1]}/${dataInicioParts[0]}`;

                let dataFim = 'Atual';
                let statusClass = 'badge-success';
                let statusTexto = 'VIGENTE';

                if (h.vigencia_fim) {
                    const dataFimParts = h.vigencia_fim.split('T')[0].split('-');
                    dataFim = `${dataFimParts[2]}/${dataFimParts[1]}/${dataFimParts[0]}`;
                    statusClass = 'badge-warning'; // ou style cinza
                    statusTexto = 'ENCERRADO';
                }

                return `
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid var(--gray-lighter);">
                            <div style="font-weight: 500; font-size: 14px;">Início: ${dataInicio}</div>
                            <div style="font-size: 12px; color: var(--gray);">Fim: ${dataFim}</div>
                        </td>
                        <td style="padding: 12px; text-align: right; border-bottom: 1px solid var(--gray-lighter); font-weight: 600;">
                            ${h.valor}%
                        </td>
                        <td style="padding: 12px; text-align: center; border-bottom: 1px solid var(--gray-lighter);">
                            <span class="badge ${statusClass}" style="font-size: 10px;">${statusTexto}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--gray);">Nenhum histórico encontrado</td></tr>';
        }

    } catch (error) {
        showError('Erro ao carregar configurações: ' + error.message, 'errorConfig');
    }
}

document.getElementById('formConfiguracoes').addEventListener('submit', async (e) => {
    e.preventDefault();
    const valor = parseFloat(document.getElementById('comissaoMotorista').value);
    const dataInicio = document.getElementById('dataInicioComissao').value;

    try {
        await apiRequest('/configuracoes/comissao', {
            method: 'POST',
            body: JSON.stringify({ valor, data_inicio: dataInicio })
        });
        showSuccess('Nova vigência configurada com sucesso!', 'successConfig');
        document.getElementById('formConfiguracoes').reset();
        setTimeout(() => carregarConfiguracoes(), 1000);
    } catch (error) {
        showError(error.message, 'errorConfig');
    }
});

function carregarDados(tipo) {
    switch (tipo) {
        case 'motoristas': carregarMotoristas(); break;
        case 'consultas': carregarConsultas(); break;
        case 'produtores': carregarProdutores(); break;
        case 'fabricas': carregarFabricas(); break;
        case 'racoes': carregarRacoes(); break;
        case 'tipos': carregarTipos(); break;
        case 'precos': carregarPrecos(); break;
        case 'configuracoes': carregarConfiguracoes(); break;
    }
}

// Verificar hash na URL
const hash = window.location.hash.substring(1);
if (hash) {
    const tab = document.querySelector(`.tab[onclick*="${hash}"]`);
    if (tab) tab.click();
} else {
    carregarMotoristas();
}
