# 🚀 Deploy no Render.com

Este guia te ajudará a fazer o deploy do Sistema de Transportes no Render.com gratuitamente.

## 📋 Pré-requisitos

1. Conta no GitHub (já tem ✅)
2. Conta no Render.com (criar em https://render.com)
3. Repositório no GitHub (já tem ✅)

## 🔧 Passo a Passo

### 1. Criar conta no Render

1. Acesse https://render.com
2. Clique em **"Get Started"**
3. Faça login com sua conta do GitHub
4. Autorize o Render a acessar seus repositórios

### 2. Criar novo Blueprint

1. No dashboard do Render, clique em **"New +"**
2. Selecione **"Blueprint"**
3. Conecte seu repositório **crisfulber/sistema-transportes**
4. O Render detectará automaticamente o arquivo `render.yaml`
5. Clique em **"Apply"**

### 3. Configurar variáveis de ambiente (automático)

O Render criará automaticamente:
- ✅ Banco de dados PostgreSQL (gratuito)
- ✅ Web Service (backend + frontend)
- ✅ Variável `JWT_SECRET` (gerada automaticamente)
- ✅ Variável `DATABASE_URL` (conectada ao PostgreSQL)

### 4. Aguardar o deploy

- O primeiro deploy leva ~5-10 minutos
- Você verá os logs em tempo real
- Quando terminar, aparecerá um link como: `https://sistema-transportes.onrender.com`

### 5. Acessar o sistema

1. Clique no link gerado
2. Faça login com as credenciais padrão:
   - **Admin:** username=`admin`, senha=`admin123`
   - **Motoristas:** senha=`123456`

## ⚠️ Importante

### Plano Free do Render

- ✅ **Totalmente gratuito**
- ✅ **HTTPS automático**
- ✅ **Deploy automático** a cada push no GitHub
- ⚠️ **Inatividade:** O serviço "dorme" após 15 minutos sem uso
- ⚠️ **Acordar:** Leva ~30 segundos para acordar no primeiro acesso
- ✅ **Banco de dados:** PostgreSQL com 1GB grátis

### Dados Iniciais

O sistema criará automaticamente:
- Usuário admin
- 5 motoristas de exemplo
- Fábricas, rações, tipos de produtor
- Tabela de preços

## 🔄 Atualizações Automáticas

Sempre que você fizer `git push` no GitHub, o Render fará deploy automático da nova versão!

## 🐛 Solução de Problemas

### Deploy falhou
- Verifique os logs no dashboard do Render
- Certifique-se de que o `render.yaml` está correto

### Banco de dados vazio
- O Render cria um novo banco PostgreSQL
- Os dados do SQLite local não são migrados automaticamente
- O sistema criará os dados iniciais automaticamente

### Serviço muito lento
- Normal no plano free após inatividade
- Aguarde ~30 segundos no primeiro acesso

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no dashboard do Render
2. Consulte a documentação: https://render.com/docs
3. Verifique se todas as variáveis de ambiente estão configuradas

---

✅ Após o deploy, seu sistema estará disponível 24/7 na internet!
