# Sistema de Gestão de Transportes de Ração

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

Sistema web completo para gerenciar cargas de transporte de ração de suínos, com controle de motoristas, produtores, fábricas e cálculo automático de fretes.

## 🚀 Tecnologias Utilizadas

### Backend
- **Node.js** com **Express** - Framework web leve e rápido
- **PostgreSQL** - Banco de dados relacional robusto e escalável
- **JWT** - Autenticação segura
- **bcryptjs** - Criptografia de senhas

### Frontend
- **HTML5, CSS3, JavaScript** puro - Sem frameworks pesados, fácil manutenção
- Design moderno com gradientes e animações
- Totalmente responsivo (desktop e mobile)

## 📋 Pré-requisitos

Você precisa ter instalado:
- **Node.js** (versão 18 ou superior)
- **PostgreSQL** (versão 12 ou superior)

### Instalando o Node.js no macOS

1. Instale o Homebrew (se ainda não tiver):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. Instale o Node.js:
```bash
brew install node@22
```

3. Verifique a instalação:
```bash
node --version
npm --version
```

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/crisfulber/sistema-transportes.git
cd sistema-transportes
```

### 2. Instale e configure o PostgreSQL

Veja o guia completo em [POSTGRES_SETUP.md](POSTGRES_SETUP.md)

Resumo rápido:

```bash
# Instalar PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Criar banco de dados
createdb sistema_transportes
```

### 3. Configure as variáveis de ambiente

```bash
cd backend
cp .env.example .env
```

Edite o arquivo `.env`:

```env
PORT=3000
JWT_SECRET=sua_chave_secreta_super_segura_aqui
DATABASE_URL=postgresql://postgres@localhost:5432/sistema_transportes
NODE_ENV=development
```

### 4. Instale as dependências e inicialize o banco

```bash
npm install
npm run init-db
```

### 5. Inicie o servidor backend

```bash
npm start
```

O servidor estará rodando em `http://localhost:3000`

### 6. Abra o frontend

Em outro terminal:

```bash
cd frontend
python3 -m http.server 8080
```

Acesse no navegador: `http://localhost:8080`

## 👤 Credenciais de Acesso

### Administrador
- **Username:** admin
- **Senha:** admin123
- **Permissões:** Acesso total ao sistema (dashboard, cadastros, relatórios)

### Consulta
- **Username:** consulta
- **Senha:** consulta123
- **Permissões:** Acesso apenas ao dashboard e relatórios (somente leitura)

### Motoristas
O sistema vem com 5 motoristas pré-cadastrados para demonstração.
- **Senha padrão:** 123456
- **Permissões:** Cadastro de cargas e visualização de suas próprias cargas

## 📱 Funcionalidades

### Para Motoristas
- ✅ Login individual
- ✅ Cadastro de cargas com múltiplos produtores
- ✅ KM final opcional (finalizar carga depois)
- ✅ Visualização de cargas do mês
- ✅ Dashboard com estatísticas pessoais
- ✅ Visualização de comissão (configurável)
- ✅ Detalhamento de cada carga

### Para Administradores
- ✅ Dashboard geral com desempenho de todos os motoristas
- ✅ Relatório de conferência (NF, Produtor, Motorista)
- ✅ Cadastro de motoristas
- ✅ Cadastro de produtores e tipos
- ✅ Cadastro de fábricas
- ✅ Cadastro de rações
- ✅ Tabela de preços configurável
- ✅ Configuração de percentual de comissão
- ✅ Visualização de todas as cargas

## 💰 Regras de Cálculo de Frete

O sistema calcula automaticamente o valor do frete baseado em regras configuráveis:

### Tipos de Produtor
O sistema suporta diferentes tipos de produtores, cada um com suas próprias regras de precificação:

- **Tipo A e Tipo B:** Valor fixo por tonelada
- **Tipo C e Tipo D:** 
  - Acima de X toneladas: valor por tonelada
  - Abaixo de X toneladas: valor fixo

### Cargas com Múltiplos Produtores
O valor é calculado sobre o total da carga e depois rateado proporcionalmente entre os produtores conforme a quantidade de cada um.

### Comissão do Motorista
O motorista recebe um percentual (configurável) do valor total do frete.

## 📊 Estrutura do Banco de Dados

O sistema cria automaticamente as seguintes tabelas:

- **usuarios** - Motoristas e administradores
- **fabricas** - Fábricas de ração
- **racoes** - Tipos de ração
- **tipos_produtor** - Categorias de produtores
- **produtores** - Produtores cadastrados
- **tabela_precos** - Valores de frete por tipo de produtor
- **cargas** - Cargas transportadas
- **itens_carga** - Itens de cada carga (produtores)
- **configuracoes** - Configurações do sistema (comissões, etc)

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
- Variáveis de ambiente para dados sensíveis

## 📝 Dados Pré-cadastrados

O sistema já vem com dados de demonstração:

### Fábricas
- 3 fábricas de exemplo

### Rações
- 10 tipos de ração para demonstração

### Tipos de Produtor
- 4 categorias diferentes

### Produtores
- 4 produtores de exemplo

### Motoristas
- 5 motoristas para testes

**Nota:** Todos os dados pré-cadastrados são apenas para demonstração e devem ser substituídos por dados reais em produção.

## 🛠️ Manutenção

### Alterar Tabela de Preços
1. Faça login como administrador
2. Acesse "Cadastros" → "Tabela de Preços"
3. Adicione novo preço com data de vigência

### Alterar Comissão dos Motoristas
1. Faça login como administrador
2. Acesse "Cadastros" → "Configurações"
3. Altere o percentual de comissão

### Adicionar Novo Motorista
1. Faça login como administrador
2. Acesse "Cadastros" → "Motoristas"
3. Clique em "Novo Motorista"

### Backup do Banco de Dados
O arquivo `database.db` na pasta `backend` contém todos os dados. Faça backup regular deste arquivo.

### Visualizar Dados do Banco
```bash
cd backend
node ver_dados.js
```

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

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abrir um Pull Request

## 🚀 Próximas Melhorias Sugeridas

- [ ] Exportação de relatórios em PDF
- [ ] Gráficos de desempenho
- [ ] Filtros avançados de data
- [ ] Edição e exclusão de cargas
- [ ] Notificações por email
- [ ] App mobile nativo
- [ ] Integração com sistemas de pagamento
- [ ] Testes automatizados

---

Desenvolvido com ❤️ para gestão eficiente de transportes de ração 🚛
