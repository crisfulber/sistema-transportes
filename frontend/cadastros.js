if (!checkAuth()) throw new Error('Não autenticado');

const usuario = getUsuario();
if (usuario.tipo !== 'admin') window.location.href = 'motorista.html';

document.getElementById('userName').textContent = usuario.nome;

let tiposProdutor = [];

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
async function carregarMotoristas() {
    const container = document.getElementById('motoristasContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        const motoristas = await apiRequest('/motoristas');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th><th>Username</th><th>Status</th></tr></thead>
                    <tbody>
                        ${motoristas.map(m => `
                            <tr>
                                <td><strong>${m.nome}</strong></td>
                                <td>${m.username}</td>
                                <td><span class="badge badge-${m.ativo ? 'success' : 'warning'}">${m.ativo ? 'Ativo' : 'Inativo'}</span></td>
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
    document.getElementById('modalMotorista').classList.add('show');
    document.getElementById('formMotorista').reset();
}

document.getElementById('formMotorista').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        await apiRequest('/motoristas', { method: 'POST', body: JSON.stringify(data) });
        showSuccess('Motorista cadastrado com sucesso!', 'successMotorista');
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
        const usuarios = await apiRequest('/usuarios?tipo=consulta');

        if (usuarios.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <h3>Nenhum usuário de consulta cadastrado</h3>
                    <p>Clique em "Novo Usuário de Consulta" para adicionar</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th><th>Username</th><th>Status</th></tr></thead>
                    <tbody>
                        ${usuarios.map(u => `
                            <tr>
                                <td><strong>${u.nome}</strong></td>
                                <td>${u.username}</td>
                                <td><span class="badge badge-${u.ativo ? 'success' : 'warning'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
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
    document.getElementById('modalConsulta').classList.add('show');
    document.getElementById('formConsulta').reset();
}

document.getElementById('formConsulta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.tipo = 'consulta'; // Força o tipo como consulta

    try {
        await apiRequest('/usuarios', { method: 'POST', body: JSON.stringify(data) });
        showSuccess('Usuário de consulta cadastrado com sucesso!', 'successConsulta');
        setTimeout(() => {
            fecharModal('modalConsulta');
            carregarConsultas();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorConsulta');
    }
});

// PRODUTORES
async function carregarProdutores() {
    const container = document.getElementById('produtoresContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        const produtores = await apiRequest('/produtores');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th><th>Localização</th><th>Tipo</th></tr></thead>
                    <tbody>
                        ${produtores.map(p => `
                            <tr>
                                <td><strong>${p.nome}</strong></td>
                                <td>${p.localizacao || '-'}</td>
                                <td><span class="badge badge-primary">${p.tipo_nome}</span></td>
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
    tiposProdutor = await apiRequest('/tipos-produtor');
    const select = document.getElementById('selectTipoProdutor');
    select.innerHTML = '<option value="">Selecione...</option>' +
        tiposProdutor.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');

    document.getElementById('modalProdutor').classList.add('show');
    document.getElementById('formProdutor').reset();
}

document.getElementById('formProdutor').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    data.tipo_id = parseInt(data.tipo_id);

    try {
        await apiRequest('/produtores', { method: 'POST', body: JSON.stringify(data) });
        showSuccess('Produtor cadastrado com sucesso!', 'successProdutor');
        setTimeout(() => {
            fecharModal('modalProdutor');
            carregarProdutores();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorProdutor');
    }
});

// FÁBRICAS
async function carregarFabricas() {
    const container = document.getElementById('fabricasContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        const fabricas = await apiRequest('/fabricas');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th></tr></thead>
                    <tbody>
                        ${fabricas.map(f => `<tr><td><strong>${f.nome}</strong></td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message show">Erro: ${error.message}</div>`;
    }
}

function abrirModalFabrica() {
    document.getElementById('modalFabrica').classList.add('show');
    document.getElementById('formFabrica').reset();
}

document.getElementById('formFabrica').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        await apiRequest('/fabricas', { method: 'POST', body: JSON.stringify(data) });
        showSuccess('Fábrica cadastrada com sucesso!', 'successFabrica');
        setTimeout(() => {
            fecharModal('modalFabrica');
            carregarFabricas();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorFabrica');
    }
});

// RAÇÕES
async function carregarRacoes() {
    const container = document.getElementById('racoesContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        const racoes = await apiRequest('/racoes');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th></tr></thead>
                    <tbody>
                        ${racoes.map(r => `<tr><td><strong>${r.nome}</strong></td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message show">Erro: ${error.message}</div>`;
    }
}

function abrirModalRacao() {
    document.getElementById('modalRacao').classList.add('show');
    document.getElementById('formRacao').reset();
}

document.getElementById('formRacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        await apiRequest('/racoes', { method: 'POST', body: JSON.stringify(data) });
        showSuccess('Ração cadastrada com sucesso!', 'successRacao');
        setTimeout(() => {
            fecharModal('modalRacao');
            carregarRacoes();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorRacao');
    }
});

// TIPOS DE PRODUTOR
async function carregarTipos() {
    const container = document.getElementById('tiposContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        const tipos = await apiRequest('/tipos-produtor');
        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Nome</th></tr></thead>
                    <tbody>
                        ${tipos.map(t => `<tr><td><strong>${t.nome}</strong></td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="error-message show">Erro: ${error.message}</div>`;
    }
}

function abrirModalTipo() {
    document.getElementById('modalTipo').classList.add('show');
    document.getElementById('formTipo').reset();
}

document.getElementById('formTipo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        await apiRequest('/tipos-produtor', { method: 'POST', body: JSON.stringify(data) });
        showSuccess('Tipo cadastrado com sucesso!', 'successTipo');
        setTimeout(() => {
            fecharModal('modalTipo');
            carregarTipos();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorTipo');
    }
});

// PREÇOS
async function carregarPrecos() {
    const container = document.getElementById('precosContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando...</p></div>';

    try {
        const precos = await apiRequest('/precos');
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
                        </tr>
                    </thead>
                    <tbody>
                        ${precos.map(p => `
                            <tr>
                                <td><span class="badge badge-primary">${p.tipo_nome}</span></td>
                                <td>${formatCurrency(p.valor_por_tonelada)}</td>
                                <td>${p.valor_fixo ? formatCurrency(p.valor_fixo) : '-'}</td>
                                <td>${p.tonelagem_minima ? formatNumber(p.tonelagem_minima, 2) + ' ton' : '-'}</td>
                                <td>${formatDate(p.vigencia_inicio)}</td>
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
    tiposProdutor = await apiRequest('/tipos-produtor');
    const select = document.getElementById('selectTipoPreco');
    select.innerHTML = '<option value="">Selecione...</option>' +
        tiposProdutor.map(t => `<option value="${t.id}">${t.nome}</option>`).join('');

    document.getElementById('modalPreco').classList.add('show');
    document.getElementById('formPreco').reset();
    document.querySelector('input[name="vigencia_inicio"]').valueAsDate = new Date();
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
        await apiRequest('/precos', { method: 'POST', body: JSON.stringify(data) });
        showSuccess('Preço cadastrado com sucesso!', 'successPreco');
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
        document.getElementById('comissaoMotorista').value = config.valor;
    } catch (error) {
        showError('Erro ao carregar configurações: ' + error.message, 'errorConfig');
    }
}

document.getElementById('formConfiguracoes').addEventListener('submit', async (e) => {
    e.preventDefault();
    const valor = parseFloat(document.getElementById('comissaoMotorista').value);

    try {
        await apiRequest('/configuracoes/comissao', {
            method: 'POST',
            body: JSON.stringify({ valor })
        });
        showSuccess('Configurações salvas com sucesso!', 'successConfig');
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
