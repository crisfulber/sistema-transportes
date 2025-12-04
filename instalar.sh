#!/bin/bash

echo "🚀 Instalador do Sistema de Transportes"
echo "========================================"
echo ""

# Verificar se o Node.js está instalado
if [ -d "/usr/local/opt/node@22/bin" ]; then
    export PATH="/usr/local/opt/node@22/bin:$PATH"
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    echo ""
    echo "Por favor, instale o Node.js 22 (LTS):"
    echo "  brew install node@22"
    echo ""
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"
echo "✅ npm encontrado: $(npm --version)"
echo ""

# Instalar dependências do backend
echo "📦 Instalando dependências do backend..."
cd backend
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependências instaladas com sucesso!"
    echo ""
    echo "🎉 Instalação concluída!"
    echo ""
    echo "Para iniciar o sistema:"
    echo "  1. Em um terminal, execute:"
    echo "     export PATH=\"/usr/local/opt/node@22/bin:\$PATH\""
    echo "     cd backend && npm start"
    echo ""
    echo "  2. Em outro terminal, execute:"
    echo "     cd frontend && python3 -m http.server 8080"
    echo ""
    echo "  3. Acesse no navegador:"
    echo "     http://localhost:8080"
    echo ""
    echo "Credenciais:"
    echo "  Admin: username=admin, senha=admin123"
    echo "  Motoristas: username=[nome.sobrenome], senha=123456"
else
    echo "❌ Erro ao instalar dependências"
    exit 1
fi
