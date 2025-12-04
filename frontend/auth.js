// Detecta automaticamente a URL da API baseado no ambiente
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const senha = document.getElementById('senha').value;
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.classList.remove('show');

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, senha })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login');
        }

        // Salvar token e dados do usuário
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));

        // Redirecionar baseado no tipo de usuário
        if (data.usuario.tipo === 'admin') {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'motorista.html';
        }
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.classList.add('show');
    }
});
