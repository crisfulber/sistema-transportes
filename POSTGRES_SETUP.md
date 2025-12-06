# Configuração do PostgreSQL para Desenvolvimento Local

Este guia explica como configurar o PostgreSQL localmente para desenvolvimento.

## 📦 Instalação do PostgreSQL no macOS

### Opção 1: Homebrew (Recomendado)

```bash
# Instalar PostgreSQL
brew install postgresql@15

# Iniciar o serviço
brew services start postgresql@15

# Verificar instalação
psql --version
```

### Opção 2: Postgres.app

1. Baixe em: https://postgresapp.com/
2. Arraste para a pasta Applications
3. Abra o Postgres.app
4. Clique em "Initialize" para criar um novo servidor

## 🔧 Configuração Inicial

### 1. Criar banco de dados

```bash
# Conectar ao PostgreSQL
psql postgres

# Criar banco de dados
CREATE DATABASE sistema_transportes;

# Criar usuário (opcional)
CREATE USER sistema_transportes_user WITH PASSWORD 'sua_senha_aqui';

# Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE sistema_transportes TO sistema_transportes_user;

# Sair
\q
```

### 2. Configurar variáveis de ambiente

Crie ou edite o arquivo `backend/.env`:

```env
# Porta do servidor
PORT=3000

# Chave secreta para JWT
JWT_SECRET=sua_chave_secreta_super_segura_aqui

# URL de conexão do PostgreSQL
# Formato: postgresql://usuario:senha@host:porta/nome_banco
DATABASE_URL=postgresql://postgres@localhost:5432/sistema_transportes

# Ou se criou um usuário específico:
# DATABASE_URL=postgresql://sistema_transportes_user:sua_senha_aqui@localhost:5432/sistema_transportes

# Ambiente
NODE_ENV=development
```

### 3. Inicializar o banco de dados

```bash
cd backend
node init-db-postgres.js
```

Este script irá:
- Criar todas as tabelas necessárias
- Inserir dados iniciais (admin, motoristas, etc)
- Configurar índices

### 4. Iniciar o servidor

```bash
npm run start:prod
```

Ou para desenvolvimento com hot-reload:

```bash
npm run dev
```

## 🔍 Comandos Úteis do PostgreSQL

### Conectar ao banco

```bash
psql -d sistema_transportes
```

### Listar tabelas

```sql
\dt
```

### Ver estrutura de uma tabela

```sql
\d usuarios
```

### Executar queries

```sql
SELECT * FROM usuarios;
SELECT * FROM cargas ORDER BY data DESC LIMIT 10;
```

### Limpar dados (cuidado!)

```sql
TRUNCATE TABLE cargas CASCADE;
TRUNCATE TABLE usuarios CASCADE;
```

### Sair

```sql
\q
```

## 🐛 Troubleshooting

### Erro: "connection refused"

```bash
# Verificar se o PostgreSQL está rodando
brew services list

# Reiniciar o serviço
brew services restart postgresql@15
```

### Erro: "database does not exist"

```bash
# Criar o banco manualmente
createdb sistema_transportes
```

### Erro: "permission denied"

```bash
# Conectar como superuser e conceder permissões
psql postgres
GRANT ALL PRIVILEGES ON DATABASE sistema_transportes TO seu_usuario;
```

### Resetar banco de dados completamente

```bash
# Dropar e recriar
dropdb sistema_transportes
createdb sistema_transportes
node init-db-postgres.js
```

## 📊 Ferramentas Gráficas (Opcional)

### pgAdmin
- Download: https://www.pgadmin.org/download/
- Interface web completa para gerenciar PostgreSQL

### TablePlus
- Download: https://tableplus.com/
- Interface nativa para macOS (gratuita para uso básico)

### DBeaver
- Download: https://dbeaver.io/
- Ferramenta universal gratuita e open-source

## 🔄 Migração de SQLite para PostgreSQL

Se você tem dados no SQLite e quer migrar para PostgreSQL:

1. Exporte os dados do SQLite
2. Use o script `backend/migrate.js` (se disponível)
3. Ou importe manualmente via SQL

## 📝 Notas Importantes

- **Produção (Render)**: Usa PostgreSQL automaticamente
- **Desenvolvimento**: Agora também usa PostgreSQL (mesma base de dados)
- **Backup**: Faça backups regulares com `pg_dump`
- **Senhas**: Nunca commite senhas reais no `.env`

## 🚀 Próximos Passos

Após configurar o PostgreSQL:

1. Teste o login com as credenciais padrão
2. Cadastre algumas cargas de teste
3. Verifique os relatórios
4. Configure backup automático (opcional)
