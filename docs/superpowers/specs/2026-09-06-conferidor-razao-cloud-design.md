# Especificação de Design: Conferidor de Razão na Nuvem

**Data:** 2026-09-06  
**Status:** Aprovado  
**Autor:** Antigravity & Ricardo Bregalda  
**Objetivo:** Permitir que a usuária (mãe do Ricardo) acesse um site online, faça upload de planilhas contábeis (.xls / .xlsx), visualize os lançamentos do Razão com conciliação automática de Débito/Crédito (1:1), inspecione os pares amarrados e baixe uma planilha Excel (.xlsx) colorida e formatada com a marcação contábil.

---

## 1. Contexto e Motivação

O projeto atual possui um motor em Python altamente confiável que:
1. Lê arquivos `.xls` (BIFF8), incluindo a recuperação de arquivos com cabeçalho OLE/BOUNDSHEET corrompido emitidos por certos sistemas contábeis (`backend/xls_reader.py`).
2. Interpreta a estrutura de Razão contábil com cabeçalhos de Empresa, CNPJ, Período, Conta e linhas de lançamentos (`backend/ledger.py`).
3. Executa conciliação determinística 1 para 1 entre lançamentos de Crédito (aquisições) e Débito (pagamentos), calculando o intervalo em dias e validando a correspondência de nomes de fornecedores no histórico (`backend/reconciler.py`).

No entanto, o sistema atual roda apenas localmente (`localhost:8765`), depende de arquivos previamente colocados em uma pasta local do sistema de arquivos e não possui tela de envio (upload), suporte a `.xlsx`, nem exportação para planilhas Excel coloridas.

---

## 2. Decisões Arquiteturais

### 2.1 Fronteira e Hospedagem
* **Frontend:** Single Page Application em React + TypeScript + Vite, hospedada gratuitamente no **Cloudflare Pages**.
* **Design System:** **Bregalda Design System** (Warm Cream `#FCFBF8`, Deep Ink `#2A2140`, Roxo Bregalda `#4B2E83`, Amarelo Sinal `#F5C400`, Verde Ship `#22C55E`, tipografia Inter + JetBrains Mono, cantos precisos de 3px para controles).
* **Backend de Processamento:** API leve em Python com **FastAPI** + **Uvicorn**, pronta para deploy conteinerizado (Docker) no **Render** ou **Fly.io**.
* **Banco de Dados, Autenticação e Storage:** **Supabase** apenas para **Auth** (controle de acesso seguro por login/senha para a mãe do Ricardo). **NENHUM dado de planilha, lançamento, empresa, valor ou arquivo é salvo no banco ou no storage.** O sistema opera em política estrita de **Zero-Storage** / Efêmero.
* **Privacidade e Processamento:** As requisições de análise e exportação processam os dados 100% diretamente em memória (RAM). Uma vez encerrada a sessão ou fechada a aba, nenhum dado persiste no servidor ou na nuvem.

---

## 3. Componentes do Sistema

### 3.1 Backend Python (`backend/`)
1. **`xls_reader.py`**: Mantido intacto com suporte à abertura direta a partir de bytes em memória e reparo automático de registro BOUNDSHEET.
2. **`xlsx_reader.py`**: Novo módulo usando `openpyxl` para ler planilhas modernas `.xlsx` que sigam a mesma estrutura de colunas (Data, Histórico, Contrapartida, Débito, Crédito, Saldo).
3. **`xlsx_exporter.py`**: Novo módulo usando `openpyxl` para gerar o arquivo `.xlsx` de retorno com células coloridas:
   * Linhas quitadas: preenchimento suave Amarelo Sinal (`#FEF9C3` / borda `#F5C400`), indicando a amarração e dias.
   * Aquisições em aberto: destaque Lápis Vermelho (`#FEE2E2`).
   * Débitos sem par: destaque Lápis Azul (`#DBEAFE`).
   * Metadados de cabeçalho preservados (Empresa, CNPJ, Período, Conta).
4. **`api.py` (FastAPI)**:
   * `POST /api/processar`: Recebe arquivo `.xls` ou `.xlsx` via `multipart/form-data`, processa em memória e devolve JSON estruturado com métricas, resumo e lançamentos conciliados.
   * `POST /api/exportar-excel`: Recebe o payload da conciliação e devolve os bytes do `.xlsx` para download instantâneo (`Content-Disposition: attachment; filename="..."`).
   * `GET /health`: Endpoint de verificação de integridade da API.
   * Suporte a CORS configurado para o domínio do Cloudflare Pages e localhost.

### 3.2 Frontend React (`frontend/`)
1. **`Navbar`**:
   * Identidade visual Bregalda com palavra-marca, indicador de status operacional e botão de logout/sair.
2. **`Dropzone`**:
   * Área de arrastar e soltar e seleção de arquivo com feedback visual imediato, restrição de formatos (`.xls`, `.xlsx`) e animação suave durante o processamento.
3. **`MetricsStrip`**:
   * Barra de progresso de cobertura (% quitado).
   * 4 cartões de métricas (Adquirido, Quitado, Em Aberto, Sem Par no mês).
4. **`ControlsBar`**:
   * Filtros segmentados (*Todos*, *Quitados*, *Em Aberto*, *Sem Par*).
   * Barra de busca rápida em tempo real (filtra fornecedor, valor, data ou histórico).
   * Botão de ação primária: **Exportar Excel (.xlsx)**.
   * Botão de ação secundária: **Exportar CSV**.
5. **`LedgerTable`**:
   * Tabela contábil de alta densidade e legibilidade, alinhamento tabular perfeito com `JetBrains Mono`.
   * Realce nas linhas quitadas; clique na linha seleciona o par.
6. **`MatchingDrawer`**:
   * Painel deslizante/gaveta com apresentação lado a lado da Aquisição (Crédito) e do Pagamento (Débito), prazo em dias e alerta de conferência de fornecedor quando divergente.
7. **`HistorySidebar` (Supabase)**:
   * Lista das últimas conciliações salvas no Supabase, permitindo recarregar uma conciliação anterior sem precisar reenviar o arquivo.

---

## 4. Política Estrita de Privacidade e Zero-Storage

* **Autenticação com Supabase**: O Supabase é utilizado exclusivamente para autenticação de usuários (`auth.users`). Apenas usuários autorizados (sua mãe) conseguem fazer login e ter acesso à interface e aos endpoints da API.
* **Sem Banco de Dados Contábil**: Nenhuma tabela para armazenar lançamentos, CNPJs ou empresas é criada.
* **Sem Armazenamento de Arquivos (No Storage)**: O arquivo enviado pelo navegador é processado em memória RAM pela API Python e descartado logo após o término da requisição.
* **Exportação Efêmera**: Quando a usuária clica em "Exportar Excel", a API gera o `.xlsx` instantaneamente no fluxo de bytes da resposta HTTP para download imediato no computador dela. Nenhuma cópia fica salva na nuvem.

---

## 5. Estrutura de Diretórios

```
contabilidade/
├── backend/
│   ├── api.py               # Servidor FastAPI
│   ├── ledger.py            # Parser do razão
│   ├── reconciler.py        # Conciliação 1:1
│   ├── xls_reader.py        # Leitor .xls com reparo BOUNDSHEET
│   ├── xlsx_reader.py       # Leitor .xlsx com openpyxl
│   ├── xlsx_exporter.py     # Gerador de Excel colorido
│   ├── requirements.txt     # Dependências do backend
│   └── tests/
│       ├── test_reconciler.py
│       ├── test_xlsx.py
│       └── test_api.py
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── Dropzone.tsx
│       │   ├── MetricsStrip.tsx
│       │   ├── ControlsBar.tsx
│       │   ├── LedgerTable.tsx
│       │   └── MatchingDrawer.tsx
│       ├── styles/
│       │   └── tokens.css
│       ├── lib/
│       │   ├── supabase.ts
│       │   └── api.ts
│       ├── types.ts
│       ├── App.tsx
│       └── main.tsx
├── docs/
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── Dockerfile
└── README.md
```

---

## 6. Critérios de Sucesso e Verificação
1. Testes unitários para `xlsx_reader.py` e `xlsx_exporter.py` garantindo que os mesmos dados de teste gerem o mesmo pareamento que no `.xls`.
2. Testes de endpoint da API FastAPI para `/processar` e `/exportar-excel`.
3. Build estático do frontend com `npm run build` sem erros de TypeScript ou lint.
4. Interface aderente aos tokens do Bregalda Design System, com foco em facilidade de uso para usuário final.
