if (!checkAuth()) {
    throw new Error('Não autenticado');
}

const usuario = getUsuario();
if (usuario.tipo !== 'admin' && usuario.tipo !== 'consulta') {
    window.location.href = 'motorista.html';
}

// Esconder botões restritos para Consulta
if (usuario.tipo === 'consulta') {
    const cadastrosCard = document.getElementById('cadastrosCard');
    const btnSenha = document.getElementById('btnSenhaNav');

    if (cadastrosCard) cadastrosCard.style.display = 'none';
    if (btnSenha) btnSenha.style.display = 'none';
}

document.getElementById('userName').textContent = usuario.nome;

// Definir mês e ano atuais
const hoje = new Date();
document.getElementById('filtroMes').value = hoje.getMonth() + 1;
document.getElementById('filtroAno').value = hoje.getFullYear();

async function carregarDados() {
    const mes = document.getElementById('filtroMes').value;
    const ano = document.getElementById('filtroAno').value;

    try {
        const data = await apiRequest(`/dashboard/resumo?mes=${mes}&ano=${ano}`);

        // Atualizar estatísticas gerais
        document.getElementById('totalCargas').textContent = data.resumo.total_cargas || 0;
        document.getElementById('totalKg').textContent = formatNumber((data.resumo.total_kg || 0) / 1000, 2);
        document.getElementById('valorTotal').textContent = formatCurrency(data.resumo.valor_total);
        document.getElementById('kmMedio').textContent = formatNumber(data.resumo.km_medio || 0, 1);

        // Atualizar tabela de motoristas
        const container = document.getElementById('motoristaContainer');

        if (data.porMotorista.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <h3>Nenhum dado disponível</h3>
                    <p>Não há cargas cadastradas para este período</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Motorista</th>
                            <th>Cargas</th>
                            <th>Total (kg)</th>
                            <th>KM Rodados</th>
                            <th>Valor Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.porMotorista.map(m => `
                            <tr>
                                <td><strong>${m.nome}</strong></td>
                                <td><span class="badge badge-primary">${m.total_cargas || 0}</span></td>
                                <td>${formatNumber((m.total_kg || 0) / 1000, 2)} ton</td>
                                <td>${formatNumber(m.total_km || 0, 1)} km</td>
                                <td><strong>${formatCurrency(m.valor_total)}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        showError('Erro ao carregar dados: ' + error.message);
    }
}

// Carregar dados ao iniciar
carregarDados();

async function abrirRelatorioConferencia() {
    const mes = document.getElementById('filtroMes').value;
    const ano = document.getElementById('filtroAno').value;
    const modal = document.getElementById('modalRelatorio');
    const content = document.getElementById('relatorioContent');

    modal.classList.add('show');
    content.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Carregando relatório...</p>
        </div>
    `;

    try {
        const dados = await apiRequest(`/relatorios/conferencia?mes=${mes}&ano=${ano}`);

        if (dados.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <h3>Nenhum dado encontrado</h3>
                    <p>Não há registros para o período selecionado.</p>
                </div>
            `;
            return;
        }

        content.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Nota Fiscal</th>
                            <th>Produtor</th>
                            <th>Motorista</th>
                            <th>Quantidade (kg)</th>
                            <th>Valor Frete</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dados.map(d => `
                            <tr>
                                <td>${formatDate(d.data)}</td>
                                <td><strong>${d.nota_fiscal}</strong></td>
                                <td>${d.produtor_nome}</td>
                                <td>${d.motorista_nome}</td>
                                <td>${formatNumber(d.quantidade_kg, 2)}</td>
                                <td>${formatCurrency(d.valor_calculado)}</td>
                                <td><button class="btn-sm btn-view" onclick="editarCarga(${d.carga_id})">Editar</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot style="background: var(--gray-lighter); font-weight: 700;">
                        <tr>
                            <td colspan="4" style="text-align: right;">TOTAL:</td>
                            <td>${formatNumber(dados.reduce((sum, d) => sum + d.quantidade_kg, 0), 2)}</td>
                            <td>${formatCurrency(dados.reduce((sum, d) => sum + d.valor_calculado, 0))}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div style="margin-top: 24px; text-align: right;">
                <button class="btn-primary" onclick="window.print()">Imprimir Relatório</button>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `
            <div class="error-message show">
                Erro ao carregar relatório: ${error.message}
            </div>
        `;
    }
}

function fecharModalRelatorio() {
    document.getElementById('modalRelatorio').classList.remove('show');
}

// LOGICA DE EDIÇÃO DE CARGA
let editCache = {
    fabricas: [],
    racoes: [],
    produtores: [],
    motoristas: []
};
let editItemIndex = 0;

async function carregarDadosEdicao() {
    try {
        if (editCache.fabricas.length === 0) {
            const [f, r, p, m] = await Promise.all([
                apiRequest('/fabricas'),
                apiRequest('/racoes'),
                apiRequest('/produtores'),
                apiRequest('/motoristas')
            ]);
            editCache.fabricas = f;
            editCache.racoes = r;
            editCache.produtores = p;
            editCache.motoristas = m;
        }

        // Popular select de motorista
        const selectMotorista = document.getElementById('editMotoristaId');
        selectMotorista.innerHTML = editCache.motoristas.map(m =>
            `<option value="${m.id}">${m.nome}</option>`
        ).join('');

    } catch (error) {
        console.error('Erro ao carregar dados auxiliares:', error);
        alert('Erro ao carregar dados para edição');
    }
}

function fecharModalEditarCarga() {
    document.getElementById('modalEditarCarga').classList.remove('show');
}

function getOptions(lista, selecionado) {
    return lista.map(item =>
        `<option value="${item.id}" ${item.id == selecionado ? 'selected' : ''}>${item.nome}${item.localizacao ? ' (' + item.localizacao + ')' : ''}</option>`
    ).join('');
}

function adicionarItemEdicao(item = null) {
    const container = document.getElementById('editItensContainer');
    const div = document.createElement('div');
    div.className = 'item-edicao';
    div.style.borderTop = '1px solid #ddd';
    div.style.paddingTop = '15px';
    div.style.marginTop = '15px';
    div.dataset.index = editItemIndex;

    div.innerHTML = `
        <div style="text-align: right; margin-bottom: 5px;">
            <button type="button" class="btn-danger btn-sm" onclick="this.parentElement.parentElement.remove()">Remover</button>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Fábrica</label>
                <select name="fabrica_id" required>
                    ${getOptions(editCache.fabricas, item ? item.fabrica_id : null)}
                </select>
            </div>
            <div class="form-group">
                <label>Ração</label>
                <select name="racao_id" required>
                    ${getOptions(editCache.racoes, item ? item.racao_id : null)}
                </select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Produtor</label>
                <select name="produtor_id" required>
                    ${getOptions(editCache.produtores, item ? item.produtor_id : null)}
                </select>
            </div>
            <div class="form-group">
                <label>Nota Fiscal</label>
                <input type="text" name="nota_fiscal" value="${item ? item.nota_fiscal : ''}" required>
            </div>
            <div class="form-group">
                <label>Quantidade (kg)</label>
                <input type="number" name="quantidade_kg" step="0.01" value="${item ? item.quantidade_kg : ''}" required>
            </div>
        </div>
    `;

    container.appendChild(div);
    editItemIndex++;
}

async function editarCarga(id) {
    const modal = document.getElementById('modalEditarCarga');
    document.getElementById('editItensContainer').innerHTML = '<p>Carregando...</p>';
    modal.classList.add('show');

    try {
        await carregarDadosEdicao();

        const carga = await apiRequest(`/cargas/${id}`);

        document.getElementById('editCargaId').value = carga.id;
        document.getElementById('editData').value = carga.data.split('T')[0];
        document.getElementById('editMotoristaId').value = carga.motorista_id;
        document.getElementById('editKmInicial').value = carga.km_inicial;
        document.getElementById('editKmFinal').value = carga.km_final || '';

        const container = document.getElementById('editItensContainer');
        container.innerHTML = '';
        editItemIndex = 0;

        carga.itens.forEach(item => {
            adicionarItemEdicao(item);
        });

    } catch (error) {
        alert('Erro ao carregar carga: ' + error.message);
        fecharModalEditarCarga();
    }
}

document.getElementById('formEditarCarga').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editCargaId').value;
    const cargaData = {
        data: document.getElementById('editData').value,
        motorista_id: document.getElementById('editMotoristaId').value,
        km_inicial: parseFloat(document.getElementById('editKmInicial').value),
        km_final: document.getElementById('editKmFinal').value ? parseFloat(document.getElementById('editKmFinal').value) : null,
        itens: []
    };

    document.querySelectorAll('#editItensContainer .item-edicao').forEach(div => {
        cargaData.itens.push({
            fabrica_id: parseInt(div.querySelector('select[name="fabrica_id"]').value),
            racao_id: parseInt(div.querySelector('select[name="racao_id"]').value),
            produtor_id: parseInt(div.querySelector('select[name="produtor_id"]').value),
            nota_fiscal: div.querySelector('input[name="nota_fiscal"]').value,
            quantidade_kg: parseFloat(div.querySelector('input[name="quantidade_kg"]').value)
        });
    });

    if (cargaData.itens.length === 0) {
        showError('Adicione pelo menos um item', 'errorEditarCarga');
        return;
    }

    try {
        await apiRequest(`/cargas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(cargaData)
        });
        showSuccess('Carga atualizada com sucesso!', 'successEditarCarga');

        setTimeout(() => {
            fecharModalEditarCarga();
            fecharModalRelatorio();
            carregarDados();
        }, 1500);
    } catch (error) {
        showError('Erro ao salvar: ' + error.message, 'errorEditarCarga');
    }
});
