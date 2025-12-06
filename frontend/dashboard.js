if (!checkAuth()) {
    throw new Error('Não autenticado');
}

const usuario = getUsuario();
if (usuario.tipo !== 'admin' && usuario.tipo !== 'consulta') {
    window.location.href = 'motorista.html';
}

// Esconder botões de cadastro para usuários de consulta
if (usuario.tipo === 'consulta') {
    const cadastrosCard = document.getElementById('cadastrosCard');
    if (cadastrosCard) {
        cadastrosCard.style.display = 'none';
    }
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
