# Guia Rápido - PostgreSQL Local

## ✅ PostgreSQL Configurado!

O PostgreSQL está instalado e rodando localmente com:
- **Banco de dados:** `sistema_transportes`
- **Usuário:** `crisfulber` (seu usuário do macOS)
- **Porta:** `5432`

## 🚀 Comandos Úteis

### Iniciar/Parar PostgreSQL

```bash
# Iniciar
brew services start postgresql@15

# Parar
brew services stop postgresql@15

# Reiniciar
brew services restart postgresql@15

# Ver status
brew services list
```

### Acessar o banco de dados

```bash
# Conectar ao banco
psql sistema_transportes

# Ou conectar ao postgres padrão
psql postgres
```

### Comandos dentro do psql

```sql
-- Listar bancos de dados
\l

-- Conectar a um banco
\c sistema_transportes

-- Listar tabelas
\dt

-- Ver estrutura de uma tabela
\d usuarios

-- Executar queries
SELECT * FROM usuarios;
SELECT * FROM cargas ORDER BY data DESC LIMIT 10;

-- Sair
\q
```

### Gerenciar o banco

```bash
# Criar novo banco
createdb nome_do_banco

# Deletar banco
dropdb nome_do_banco

# Fazer backup
pg_dump sistema_transportes > backup.sql

# Restaurar backup
psql sistema_transportes < backup.sql
```

## 🔧 Desenvolvimento

### Iniciar o servidor backend

```bash
cd backend
npm start
# ou para desenvolvimento com hot-reload:
npm run dev
```

### Reinicializar o banco (CUIDADO: apaga todos os dados!)

```bash
cd backend
npm run init-db
```

### Adicionar usuário de consulta manualmente

```bash
cd backend
node add-consulta-user.js
```

## 📊 Dados Padrão

Após `npm run init-db`, você terá:

- **Admin:** `admin` / `admin123`
- **Consulta:** `consulta` / `consulta123`
- **Motoristas:** `motorista1` a `motorista5` / `123456`
- 3 Fábricas
- 10 Rações
- 4 Tipos de Produtor
- 4 Produtores
- Tabela de preços configurada

## 🛠️ Troubleshooting

### PostgreSQL não inicia

```bash
# Ver logs
brew services list
tail -f /usr/local/var/log/postgresql@15.log

# Reiniciar
brew services restart postgresql@15
```

### Erro de conexão

Verifique se o `.env` tem a URL correta:
```
DATABASE_URL=postgresql://crisfulber@localhost:5432/sistema_transportes
```

### Resetar tudo

```bash
# Parar PostgreSQL
brew services stop postgresql@15

# Deletar e recriar banco
dropdb sistema_transportes
createdb sistema_transportes

# Reinicializar
cd backend
npm run init-db

# Iniciar PostgreSQL
brew services start postgresql@15
```

## 📝 Notas

- PostgreSQL roda como serviço em background
- Dados persistem entre reinicializações
- Use ferramentas gráficas como TablePlus ou pgAdmin para visualizar dados
- Faça backups regulares com `pg_dump`
