// Detecta automaticamente a URL da API baseado no ambiente
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

function getToken() {
    return localStorage.getItem('token');
}

function getUsuario() {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = 'index.html';
}

function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                logout();
            }
            throw new Error(data.error || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        throw error;
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

function formatNumber(value, decimals = 0) {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value || 0);
}

function formatDate(dateInput) {
    if (!dateInput) return '-';

    let date;
    // Se já for um objeto Date
    if (dateInput instanceof Date) {
        date = dateInput;
    }
    // Se for string ISO (ex: 2024-12-04T00:00:00.000Z) ou data simples (2024-12-04)
    else {
        // Tenta criar data diretamente
        date = new Date(dateInput);

        // Se der inválido e for string YYYY-MM-DD, tenta adicionar time
        if (isNaN(date.getTime()) && typeof dateInput === 'string' && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(dateInput + 'T00:00:00');
        }
    }

    // Se ainda for inválido
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('pt-BR');
}

function showError(message, elementId = 'errorMessage') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
        setTimeout(() => {
            errorElement.classList.remove('show');
        }, 5000);
    }
}

function showSuccess(message, elementId = 'successMessage') {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.add('show');
        setTimeout(() => {
            successElement.classList.remove('show');
        }, 5000);
    }
}
