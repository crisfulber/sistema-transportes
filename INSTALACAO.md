# 🚀 Guia Rápido de Instalação

## Passo 1: Instalar o Node.js

Você precisa instalar o Node.js primeiro. Escolha uma das opções:

### Opção A: Via Homebrew (Recomendado)

1. Abra o Terminal e instale o Homebrew:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. Após a instalação do Homebrew, instale o Node.js:
```bash
brew install node
```

3. Verifique a instalação:
```bash
node --version
npm --version
```

### Opção B: Download Direto

1. Acesse https://nodejs.org
2. Baixe o instalador para macOS (versão LTS recomendada)
3. Execute o instalador e siga as instruções
4. Verifique a instalação abrindo o Terminal e digitando:
```bash
node --version
npm --version
```

## Passo 2: Instalar o Sistema

Após instalar o Node.js, execute o script de instalação:

```bash
cd /Users/crisfulber/Documents/Desenvolvimento/sistema-transportes
./instalar.sh
```

Ou instale manualmente:

```bash
cd backend
npm install
```

## Passo 3: Iniciar o Sistema

### Terminal 1 - Backend:
```bash
cd backend
npm start
```

Aguarde a mensagem: "🚀 Servidor rodando na porta 3000"

### Terminal 2 - Frontend:
```bash
cd frontend
python3 -m http.server 8080
```

### Acessar o Sistema:

Abra seu navegador e acesse: **http://localhost:8080**

## 📱 Credenciais de Acesso

### Administrador
- Username: `admin`
- Senha: `admin123`

### Motoristas (senha padrão: `123456`)
- `adalberto.lunkes`
- `anderson.menezes`
- `danrley.amaral`
- `maureci.schulz`
- `tiago.silva`

## ✅ Pronto!

Agora você pode:
- ✅ Fazer login como motorista e cadastrar cargas
- ✅ Fazer login como admin e visualizar o dashboard
- ✅ Gerenciar motoristas, produtores, fábricas e preços

## 🆘 Problemas?

### Erro: "command not found: npm"
- O Node.js não está instalado. Volte ao Passo 1.

### Erro: "Address already in use"
- A porta 3000 ou 8080 já está em uso
- Feche outros programas ou use outra porta:
  - Backend: mude no arquivo `backend/.env`
  - Frontend: use `python3 -m http.server 8081`

### Erro ao acessar http://localhost:8080
- Verifique se ambos os servidores estão rodando
- Verifique se não há erros nos terminais

---

Para mais informações, consulte o arquivo **README.md**
