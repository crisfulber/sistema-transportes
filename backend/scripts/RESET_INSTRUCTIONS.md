# Como Resetar o Banco de Dados

Para limpar completamente o banco de dados e restaurar o usuário admin padrão:

## Localmente

1. No terminal, vá para a pasta `backend`:
   ```bash
   cd backend
   ```
2. Execute o script:
   ```bash
   npm run reset-db
   ```

## Em Produção (Render)

1. Acesse o Dashboard do Render.
2. Vá na aba "Shell" do seu serviço.
3. Execute:
   ```bash
   cd backend && node scripts/reset-db.js
   ```

**Atenção:** Isso apagará todos os dados!
