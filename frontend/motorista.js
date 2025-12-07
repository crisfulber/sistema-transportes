if (!checkAuth()) {
    throw new Error('Não autenticado');
}

const usuario = getUsuario();
document.getElementById('userName').textContent = usuario.nome;

let fabricas = [];
let racoes = [];
let produtores = [];
let itemIndex = 1;

// Definir data de hoje como padrão
document.getElementById('data').valueAsDate = new Date();

// Inicializar filtros
const hoje = new Date();
document.getElementById('filtroMes').value = hoje.getMonth() + 1;
document.getElementById('filtroAno').value = hoje.getFullYear();

// Carregar dados iniciais
async function carregarDados() {
    try {
        [fabricas, racoes, produtores] = await Promise.all([
            apiRequest('/fabricas'),
            apiRequest('/racoes'),
            apiRequest('/produtores')
        ]);

        popularSelects();
        await carregarCargas();
        await carregarEstatisticas();
    } catch (error) {
        showError('Erro ao carregar dados: ' + error.message);
    }
}

function popularSelects() {
    const selectsFabrica = document.querySelectorAll('select[name="fabrica_id"]');
    const selectsRacao = document.querySelectorAll('select[name="racao_id"]');
    const selectsProdutor = document.querySelectorAll('select[name="produtor_id"]');

    selectsFabrica.forEach(select => {
        const valorAtual = select.value;
        select.innerHTML = '<option value="">Selecione...</option>';
        fabricas.forEach(f => {
            select.innerHTML += `<option value="${f.id}">${f.nome}</option>`;
        });
        if (valorAtual) select.value = valorAtual;
    });

    selectsRacao.forEach(select => {
        const valorAtual = select.value;
        select.innerHTML = '<option value="">Selecione...</option>';
        racoes.forEach(r => {
            select.innerHTML += `<option value="${r.id}">${r.nome}</option>`;
        });
        if (valorAtual) select.value = valorAtual;
    });

    selectsProdutor.forEach(select => {
        const valorAtual = select.value;
        select.innerHTML = '<option value="">Selecione...</option>';
        produtores.forEach(p => {
            const localizacao = p.localizacao ? ` (${p.localizacao})` : '';
            select.innerHTML += `<option value="${p.id}">${p.nome}${localizacao} - ${p.tipo_nome}</option>`;
        });
        if (valorAtual) select.value = valorAtual;
    });
}

async function carregarCargas() {
    const container = document.getElementById('cargasContainer');

    try {
        const mes = document.getElementById('filtroMes').value;
        const ano = document.getElementById('filtroAno').value;

        const cargas = await apiRequest(`/cargas?mes=${mes}&ano=${ano}`);

        if (cargas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 7h-9M14 3v4M6 21V3M3 21h18"></path>
                    </svg>
                    <h3>Nenhuma carga cadastrada</h3>
                    <p>Clique em "Nova Carga" para começar</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Itens</th>
                            <th>Total (kg)</th>
                            <th>KM Rodados</th>
                            <th>Valor</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cargas.map(c => `
                            <tr>
                                <td>${formatDate(c.data)}</td>
                                <td><span class="badge badge-primary">${c.total_itens} ${c.total_itens === 1 ? 'item' : 'itens'}</span></td>
                                <td>${formatNumber(c.total_kg / 1000, 2)} ton</td>
                                <td>${c.km_final ? formatNumber(c.km_final - c.km_inicial, 1) + ' km' : '<span class="badge badge-warning">Em andamento</span>'}</td>
                                <td><strong>${formatCurrency(c.valor_total * (c.percentual_comissao / 100))}</strong> <small>(${c.percentual_comissao}%)</small></td>
                                <td>
                                    <button class="btn-sm btn-primary" onclick="verDetalhes(${c.id})">Ver Detalhes</button>
                                    ${!c.km_final ? `<button class="btn-sm btn-secondary" onclick="abrirModalFinalizar(${c.id})" style="margin: 5px 0">Finalizar</button>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `
            <div class="error-message show">
                Erro ao carregar cargas: ${error.message}
            </div>
        `;
    }
}

async function carregarEstatisticas() {
    try {
        const mes = document.getElementById('filtroMes').value;
        const ano = document.getElementById('filtroAno').value;

        const cargas = await apiRequest(`/cargas?mes=${mes}&ano=${ano}`);

        const totalCargas = cargas.length;
        const totalKg = cargas.reduce((sum, c) => sum + (parseFloat(c.total_kg) || 0), 0);
        const valorTotal = cargas.reduce((sum, c) => sum + ((parseFloat(c.valor_total) || 0) * (c.percentual_comissao / 100)), 0);
        const totalKm = cargas.reduce((sum, c) => sum + (c.km_final ? (parseFloat(c.km_final) - parseFloat(c.km_inicial)) : 0), 0);

        document.getElementById('totalCargas').textContent = totalCargas;
        document.getElementById('totalKg').textContent = formatNumber(totalKg / 1000, 2);
        document.getElementById('valorTotal').textContent = formatCurrency(valorTotal);
        document.getElementById('totalKm').textContent = formatNumber(totalKm, 1);
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

function abrirModalNovaCarga() {
    document.getElementById('modalNovaCarga').classList.add('show');
    document.getElementById('formNovaCarga').reset();
    document.getElementById('data').valueAsDate = new Date();

    // Resetar itens
    const container = document.getElementById('itensContainer');
    container.innerHTML = `
        <h3 style="margin: 24px 0 16px;">Itens da Carga</h3>
        <div class="item-carga" data-index="0">
            <div class="form-row">
                <div class="form-group">
                    <label>Fábrica *</label>
                    <select name="fabrica_id" required>
                        <option value="">Selecione...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Ração *</label>
                    <select name="racao_id" required>
                        <option value="">Selecione...</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Produtor *</label>
                    <select name="produtor_id" required>
                        <option value="">Selecione...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nota Fiscal *</label>
                    <input type="text" name="nota_fiscal" required>
                </div>
                <div class="form-group">
                    <label>Quantidade (kg) *</label>
                    <input type="number" name="quantidade_kg" step="0.01" required>
                </div>
            </div>
        </div>
    `;
    itemIndex = 1;
    popularSelects();
}

function fecharModalNovaCarga() {
    document.getElementById('modalNovaCarga').classList.remove('show');
}

function adicionarItem() {
    const container = document.getElementById('itensContainer');
    const novoItem = document.createElement('div');
    novoItem.className = 'item-carga';
    novoItem.dataset.index = itemIndex;
    novoItem.style.marginTop = '24px';
    novoItem.style.paddingTop = '24px';
    novoItem.style.borderTop = '2px solid var(--gray-lighter)';

    novoItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h4>Produtor ${itemIndex + 1}</h4>
            <button type="button" class="btn-danger btn-sm" onclick="removerItem(${itemIndex})">Remover</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Fábrica *</label>
                <select name="fabrica_id" required>
                    <option value="">Selecione...</option>
                </select>
            </div>
            <div class="form-group">
                <label>Ração *</label>
                <select name="racao_id" required>
                    <option value="">Selecione...</option>
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Produtor *</label>
                <select name="produtor_id" required>
                    <option value="">Selecione...</option>
                </select>
            </div>
            <div class="form-group">
                <label>Nota Fiscal *</label>
                <input type="text" name="nota_fiscal" required>
            </div>
            <div class="form-group">
                <label>Quantidade (kg) *</label>
                <input type="number" name="quantidade_kg" step="0.01" required>
            </div>
        </div>
    `;

    container.appendChild(novoItem);
    itemIndex++;
    popularSelects();
}

function removerItem(index) {
    const item = document.querySelector(`.item-carga[data-index="${index}"]`);
    if (item) {
        item.remove();
    }
}

document.getElementById('formNovaCarga').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = document.getElementById('data').value;
    const km_inicial = parseFloat(document.getElementById('km_inicial').value);
    const km_final = document.getElementById('km_final').value ? parseFloat(document.getElementById('km_final').value) : null;

    if (km_final !== null && km_final <= km_inicial) {
        showError('KM final deve ser maior que KM inicial');
        return;
    }

    const itensElements = document.querySelectorAll('.item-carga');
    const itens = [];

    itensElements.forEach(itemEl => {
        const fabrica_id = itemEl.querySelector('select[name="fabrica_id"]').value;
        const racao_id = itemEl.querySelector('select[name="racao_id"]').value;
        const produtor_id = itemEl.querySelector('select[name="produtor_id"]').value;
        const nota_fiscal = itemEl.querySelector('input[name="nota_fiscal"]').value;
        const quantidade_kg = parseFloat(itemEl.querySelector('input[name="quantidade_kg"]').value);

        if (fabrica_id && racao_id && produtor_id && nota_fiscal && quantidade_kg) {
            itens.push({
                fabrica_id: parseInt(fabrica_id),
                racao_id: parseInt(racao_id),
                produtor_id: parseInt(produtor_id),
                nota_fiscal,
                quantidade_kg
            });
        }
    });

    if (itens.length === 0) {
        showError('Adicione pelo menos um item à carga');
        return;
    }

    try {
        await apiRequest('/cargas', {
            method: 'POST',
            body: JSON.stringify({
                data,
                km_inicial,
                km_final,
                itens
            })
        });

        showSuccess('Carga cadastrada com sucesso!', 'successMessage');

        setTimeout(() => {
            fecharModalNovaCarga();
            carregarCargas();
            carregarEstatisticas();
        }, 1500);
    } catch (error) {
        showError('Erro ao cadastrar carga: ' + error.message);
    }
});

async function verDetalhes(id) {
    const modal = document.getElementById('modalDetalhes');
    const content = document.getElementById('detalhesContent');

    modal.classList.add('show');
    content.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Carregando...</p>
        </div>
    `;

    try {
        const carga = await apiRequest(`/cargas/${id}`);

        const totalKg = carga.itens.reduce((sum, i) => sum + parseFloat(i.quantidade_kg), 0);
        const valorComissaoTotal = carga.itens.reduce((sum, i) => sum + (parseFloat(i.valor_calculado) * (carga.percentual_comissao / 100)), 0);

        content.innerHTML = `
            <div style="margin-bottom: 24px;">
                <h3 style="margin-bottom: 16px;">Informações da Carga</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label>Data</label>
                        <p style="font-size: 16px; font-weight: 600;">${formatDate(carga.data)}</p>
                    </div>
                    <div class="form-group">
                        <label>KM Inicial</label>
                        <p style="font-size: 16px; font-weight: 600;">${formatNumber(carga.km_inicial, 1)} km</p>
                    </div>
                    <div class="form-group">
                        <label>KM Final</label>
                        <p style="font-size: 16px; font-weight: 600;">${formatNumber(carga.km_final, 1)} km</p>
                    </div>
                    <div class="form-group">
                        <label>KM Rodados</label>
                        <p style="font-size: 16px; font-weight: 600; color: var(--primary);">${formatNumber(carga.km_final - carga.km_inicial, 1)} km</p>
                    </div>
                </div>
            </div>
            
            <h3 style="margin-bottom: 16px;">Itens da Carga</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fábrica</th>
                            <th>Ração</th>
                            <th>Produtor</th>
                            <th>Nota Fiscal</th>
                            <th>Quantidade</th>
                            <th>Sua Comissão (${carga.percentual_comissao}%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${carga.itens.map(item => `
                            <tr>
                                <td>${item.fabrica_nome}</td>
                                <td>${item.racao_nome}</td>
                                <td>
                                    ${item.produtor_nome}
                                    ${item.produtor_localizacao ? `<br><small style="color: var(--gray);">${item.produtor_localizacao}</small>` : ''}
                                    <br><span class="badge badge-primary">${item.tipo_produtor}</span>
                                </td>
                                <td>${item.nota_fiscal}</td>
                                <td>${formatNumber(item.quantidade_kg / 1000, 2)} ton</td>
                                <td><strong>${formatCurrency(item.valor_calculado * (carga.percentual_comissao / 100))}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot style="background: var(--gray-lighter); font-weight: 700;">
                        <tr>
                            <td colspan="4" style="text-align: right;">TOTAL:</td>
                            <td>${formatNumber(totalKg / 1000, 2)} ton</td>
                            <td><strong style="color: var(--primary); font-size: 16px;">${formatCurrency(valorComissaoTotal)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `
            <div class="error-message show">
                Erro ao carregar detalhes: ${error.message}
            </div>
        `;
    }
}

function fecharModalDetalhes() {
    document.getElementById('modalDetalhes').classList.remove('show');
}

function abrirModalFinalizar(id) {
    document.getElementById('modalFinalizarCarga').classList.add('show');
    document.getElementById('finalizarCargaId').value = id;
    document.getElementById('formFinalizarCarga').reset();
}

function fecharModalFinalizar() {
    document.getElementById('modalFinalizarCarga').classList.remove('show');
}

document.getElementById('formFinalizarCarga').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('finalizarCargaId').value;
    const km_final = parseFloat(document.getElementById('finalizarKmFinal').value);

    try {
        await apiRequest(`/cargas/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ km_final })
        });

        showSuccess('Carga finalizada com sucesso!', 'successFinalizar');

        setTimeout(() => {
            fecharModalFinalizar();
            carregarCargas();
            carregarEstatisticas();
        }, 1500);
    } catch (error) {
        showError(error.message, 'errorFinalizar');
    }
});

// Carregar dados ao iniciar
carregarDados();
