# Atualizações do Sistema (v1.1)

## 1. Cadastro de Cargas (Motorista)
- **KM Final Opcional:** Agora é possível cadastrar uma carga apenas com o KM Inicial. A carga ficará com status "Em andamento".
- **Finalizar Carga:** Adicionado botão "Finalizar" para cargas em andamento, permitindo informar o KM Final posteriormente.
- **Valores:** O dashboard do motorista agora exibe apenas o valor da **comissão** (padrão 12%), e não mais o valor total do frete.

## 2. Dashboard Administrativo
- **Relatório de Conferência:** Novo botão no dashboard para gerar relatório detalhado com:
  - Data
  - Nota Fiscal
  - Produtor
  - Motorista
  - Quantidade (kg)
  - Valor do Frete
- **Impressão:** Botão para imprimir o relatório diretamente do navegador.

## 3. Configurações
- **Comissões:** Nova aba "Configurações" na tela de Cadastros.
- Permite alterar o percentual de comissão dos motoristas (padrão: 12%).

## 🛠️ Correções Técnicas
- Corrigido erro de referência no banco de dados (`cargas_old`) que impedia o cadastro de novas cargas.

## ⚠️ Importante
Para que as alterações funcionem, é necessário **reiniciar o servidor backend**.

Comando para reiniciar:
1. Pare o servidor atual (Ctrl + C)
2. Execute novamente:
   ```bash
   cd sistema-transportes/backend
   npm start
   ```
