
// Funções para alterar senha (Modal)
function abrirModalSenha() {
    const modal = document.getElementById('modalSenha');
    if (modal) {
        modal.classList.add('show');
        document.getElementById('formSenha').reset();
        const errorEl = document.getElementById('errorSenha');
        const successEl = document.getElementById('successSenha');
        if (errorEl) errorEl.classList.remove('show');
        if (successEl) successEl.classList.remove('show');
    }
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// Handler do formulário de senha
const formSenha = document.getElementById('formSenha');
if (formSenha) {
    formSenha.addEventListener('submit', async (e) => {
        e.preventDefault();
        const novaSenha = document.getElementById('novaSenha').value;
        const errorEl = document.getElementById('errorSenha');
        const successEl = document.getElementById('successSenha');

        try {
            await apiRequest('/minha-senha', {
                method: 'PUT',
                body: JSON.stringify({ novaSenha })
            });

            if (successEl) {
                successEl.textContent = 'Senha alterada com sucesso! Redirecionando...';
                successEl.classList.add('show');
            }
            if (errorEl) errorEl.classList.remove('show');

            setTimeout(() => {
                logout();
            }, 2000);
        } catch (error) {
            if (errorEl) {
                errorEl.textContent = error.message;
                errorEl.classList.add('show');
            }
            if (successEl) successEl.classList.remove('show');
        }
    });
}

// Expor funções globalmente
window.abrirModalSenha = abrirModalSenha;
window.fecharModal = fecharModal;
