# Sistema de Gestão de Transportes de Ração

Sistema web completo para gerenciar cargas de transporte de ração de suínos, com controle de motoristas, produtores, fábricas e cálculo automático de fretes.

## 🚀 Tecnologias Utilizadas

### Backend
- **Node.js** com **Express** - Framework web leve e rápido
- **SQLite** com **better-sqlite3** - Banco de dados embutido, sem necessidade de servidor
- **JWT** - Autenticação segura
- **bcryptjs** - Criptografia de senhas

### Frontend
- **HTML5, CSS3, JavaScript** puro - Sem frameworks pesados, fácil manutenção
- Design moderno com gradientes e animações
- Totalmente responsivo

## 📋 Pré-requisitos

Você precisa ter o **Node.js** instalado no seu computador.

### Instalando o Node.js no macOS

1. Instale o Homebrew (se ainda não tiver):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. Instale o Node.js:
```bash
brew install node
```

3. Verifique a instalação:
```bash
node --version
npm --version
```

## 🔧 Instalação

### 1. Instalar dependências do backend

```bash
cd backend
npm install
```

### 2. Iniciar o servidor backend

```bash
npm start
```

O servidor estará rodando em `http://localhost:3000`

### 3. Abrir o frontend

Em outro terminal, navegue até a pasta frontend e abra com um servidor HTTP simples:

```bash
cd frontend
python3 -m http.server 8080
```

Ou use qualquer outro servidor HTTP de sua preferência.

Acesse no navegador: `http://localhost:8080`

## 👤 Credenciais de Acesso

### Administrador
- **Username:** admin
- **Senha:** admin123

### Motoristas (senha padrão: 123456)
- **adalberto.lunkes**
- **anderson.menezes**
- **danrley.amaral**
- **maureci.schulz**
- **tiago.silva**

## 📱 Funcionalidades

### Para Motoristas
- ✅ Login individual
- ✅ Cadastro de cargas com múltiplos produtores
- ✅ Visualização de cargas do mês
- ✅ Dashboard com estatísticas pessoais
- ✅ Detalhamento de cada carga

### Para Administradores
- ✅ Dashboard geral com desempenho de todos os motoristas
- ✅ Cadastro de motoristas
- ✅ Cadastro de produtores e tipos
- ✅ Cadastro de fábricas
- ✅ Cadastro de rações
- ✅ Tabela de preços configurável
- ✅ Visualização de todas as cargas

## 💰 Regras de Cálculo de Frete

O sistema calcula automaticamente o valor do frete baseado nas seguintes regras:

### UPD e Recria
- **R$ 70,00 por tonelada** independente da quantidade

### Creche e Terminação
- **Acima de 17 toneladas:** R$ 70,00 por tonelada
- **Abaixo de 17 toneladas:** R$ 1.190,00 fixo

### Cargas com Múltiplos Produtores
O valor é calculado sobre o total da carga e depois rateado proporcionalmente entre os produtores conforme a quantidade de cada um.

## 📊 Estrutura do Banco de Dados

O sistema cria automaticamente as seguintes tabelas:

- **usuarios** - Motoristas e administradores
- **fabricas** - Fábricas de ração
- **racoes** - Tipos de ração
- **tipos_produtor** - UPD, Recria, Creche, Terminação
- **produtores** - Produtores de suínos
- **tabela_precos** - Valores de frete por tipo de produtor
- **cargas** - Cargas transportadas
- **itens_carga** - Itens de cada carga (produtores)

## 🎨 Características do Design

- Interface moderna com gradientes vibrantes
- Animações suaves e micro-interações
- Design responsivo para desktop e mobile
- Paleta de cores profissional
- Feedback visual para todas as ações

## 🔒 Segurança

- Senhas criptografadas com bcrypt
- Autenticação via JWT
- Proteção de rotas administrativas
- Validação de dados no backend

## 📝 Dados Pré-cadastrados

O sistema já vem com os seguintes dados:

### Fábricas
- SS Rações
- Vaccinar
- Exnor

### Rações
- Lactação, Gestação, Recria, Reposição
- Alojamento
- Crescimento 1 e 2
- Terminação 1, 2 e 3

### Tipos de Produtor
- UPD
- Recria
- Creche
- Terminação

### Produtores
- Marcio Bickel (São Roque) - UPD
- Adriano Alberton - Terminação
- Rogerio Kolling - Creche
- Marcelo Steffens - Recria

## 🛠️ Manutenção

### Alterar Tabela de Preços
1. Faça login como administrador
2. Acesse "Cadastros" → "Tabela de Preços"
3. Adicione novo preço com data de vigência

### Adicionar Novo Motorista
1. Faça login como administrador
2. Acesse "Cadastros" → "Motoristas"
3. Clique em "Novo Motorista"

### Backup do Banco de Dados
O arquivo `database.db` na pasta `backend` contém todos os dados. Faça backup regular deste arquivo.

## 🐛 Solução de Problemas

### Erro de conexão com o backend
- Verifique se o servidor backend está rodando na porta 3000
- Verifique se não há firewall bloqueando a conexão

### Erro ao fazer login
- Verifique se está usando as credenciais corretas
- Verifique se o backend está rodando

### Dados não aparecem
- Abra o console do navegador (F12) para ver erros
- Verifique se a API está respondendo corretamente

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Console do navegador (F12)
2. Logs do servidor backend
3. Arquivo `database.db` existe e tem permissões corretas

## 🚀 Próximas Melhorias Sugeridas

- [ ] Exportação de relatórios em PDF
- [ ] Gráficos de desempenho
- [ ] Filtros avançados de data
- [ ] Edição e exclusão de cargas
- [ ] Notificações por email
- [ ] App mobile nativo
- [ ] Integração com sistemas de pagamento

---

Desenvolvido para gestão eficiente de transportes de ração 🚛
