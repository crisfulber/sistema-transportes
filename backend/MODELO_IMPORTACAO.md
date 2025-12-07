# Modelo de Importação de Dados - Sistema de Transportes

Este documento descreve o formato esperado para os arquivos CSV para importação de dados em massa.
Os arquivos devem ser salvos no formato **CSV (separado por ponto-e-vírgula ';')** e codificação **UTF-8**.

## Instruções Gerais
1. Crie uma pasta chamada `importacao` dentro da pasta `backend`.
2. Salve seus arquivos Excel como CSV nesta pasta com os nomes indicados abaixo.
3. Certifique-se de que os valores decimais usem ponto `.` ou vírgula `,` (o sistema tentará converter).
4. As colunas devem estar na ordem exata especificada. A primeira linha (cabeçalho) é ignorada pelo script, mas deve existir.

---

## 1. Tipos de Produtor
**Nome do arquivo:** `tipos_produtor.csv`

| Coluna | Descrição | Obrigatório | Exemplo |
|--------|-----------|-------------|---------|
| 1 | Nome do Tipo | Sim | Integrado |
| 2 | Ativo (1=Sim, 0=Não) | Não (Padrão 1) | 1 |

**Exemplo CSV:**
```csv
Nome;Ativo
Integrado;1
Cooperado;1
```

---

## 2. Fábricas
**Nome do arquivo:** `fabricas.csv`

| Coluna | Descrição | Obrigatório | Exemplo |
|--------|-----------|-------------|---------|
| 1 | Nome da Fábrica | Sim | Fábrica A |
| 2 | Ativo | Não (Padrão 1) | 1 |

**Exemplo:**
```csv
Nome;Ativo
Fábrica Cascavel;1
Fábrica Toledo;1
```

---

## 3. Rações
**Nome do arquivo:** `racoes.csv`

| Coluna | Descrição | Obrigatório | Exemplo |
|--------|-----------|-------------|---------|
| 1 | Nome da Ração | Sim | Ração Inicial |
| 2 | Ativo | Não (Padrão 1) | 1 |

---

## 4. Motoristas
**Nome do arquivo:** `motoristas.csv`

| Coluna | Descrição | Obrigatório | Exemplo |
|--------|-----------|-------------|---------|
| 1 | Nome Completo | Sim | João da Silva |
| 2 | Username (Login) | Sim | joao.silva |
| 3 | Senha | Sim | 123456 |
| 4 | Ativo | Não (Padrão 1) | 1 |

---

## 5. Produtores
**Nome do arquivo:** `produtores.csv`
*Requer que os Tipos de Produtor já estejam cadastrados.*

| Coluna | Descrição | Obrigatório | Exemplo |
|--------|-----------|-------------|---------|
| 1 | Nome do Produtor | Sim | Sítio Alvorada |
| 2 | Localização | Não | Linha 12 |
| 3 | Nome do Tipo de Produtor | Sim (Deve ser idêntico ao cadastrado) | Integrado |
| 4 | Ativo | Não (Padrão 1) | 1 |

---

## 6. Tabela de Preços
**Nome do arquivo:** `precos.csv`

| Coluna | Descrição | Obrigatório | Exemplo |
|--------|-----------|-------------|---------|
| 1 | Nome do Tipo de Produtor | Sim | Integrado |
| 2 | Valor por Tonelada | Sim | 10,50 |
| 3 | Valor Fixo | Não | 150,00 |
| 4 | Tonelagem Mínima | Não | 15 |
| 5 | Vigência Início (AAAA-MM-DD) | Sim | 2024-01-01 |
| 6 | Ativo | Não | 1 |

---

## 7. Cargas e Itens (Histórico)
**Nome do arquivo:** `cargas.csv`
*Cada linha representa um ITEM de carga. O sistema agrupará itens da mesma carga se tiverem mesma Data, Motorista e KMs digitados igualmente.*

| Coluna | Descrição | Obrigatório | Exemplo |
|--------|-----------|-------------|---------|
| 1 | Data (AAAA-MM-DD) | Sim | 2024-03-15 |
| 2 | Username do Motorista | Sim | joao.silva |
| 3 | KM Inicial | Sim | 10000 |
| 4 | KM Final | Não | 10150 |
| 5 | Nome da Fábrica | Sim | Fábrica Cascavel |
| 6 | Nome do Produtor | Sim | Sítio Alvorada |
| 7 | Nome da Ração | Sim | Ração Inicial |
| 8 | Nota Fiscal | Sim | 12345 |
| 9 | Quantidade (Kg) | Sim | 15000 |
