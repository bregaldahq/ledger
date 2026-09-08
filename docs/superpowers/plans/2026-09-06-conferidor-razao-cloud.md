# Conferidor de Razão na Nuvem - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma solução completa e moderna para o Conferidor de Razão contábil, permitindo upload de arquivos (.xls e .xlsx), conciliação 1:1 em memória, exportação de planilha Excel colorida e interface web em React hospedável no Cloudflare Pages com autenticação via Supabase (apenas controle de acesso, com ZERO armazenamento de dados de planilhas no banco por segurança e privacidade), seguindo o Bregalda Design System.

**Architecture:** Backend leve em Python com FastAPI pronto para deploy (Render/Fly.io) que processa planilhas em memória usando `xlrd`/`openpyxl` e exporta `.xlsx` com formatação visual de conciliação. Frontend em React + TypeScript + Vite com os tokens oficiais do Bregalda Design System, comunicando com a API e com o Supabase Auth.

**Tech Stack:** Python 3.10+, FastAPI, Uvicorn, xlrd, olefile, openpyxl, React 19, TypeScript, Vite, Supabase Auth, Bregalda Design System (Inter + JetBrains Mono, Warm Cream `#FCFBF8`, Deep Ink `#2A2140`, Roxo Bregalda `#4B2E83`, Amarelo Sinal `#F5C400`).

**Spec:** `docs/superpowers/specs/2026-09-06-conferidor-razao-cloud-design.md`

## Global Constraints

- **Zero-Storage / Privacidade Absoluta**: NENHUM dado contábil (lançamentos, empresas, CNPJs, valores, arquivos) é gravado em banco de dados ou armazenamento persistente. O Supabase é estritamente usado para login/controle de acesso (Auth). Todo processamento de dados é 100% volátil em memória RAM.
- **Design System**: Canvas Warm Cream (`#FCFBF8`), contrastes em Deep Ink (`#2A2140`), botões e ações no Roxo Bregalda (`#4B2E83`) com raio de 3px, destaques e grifos no Amarelo Sinal (`#F5C400`), tipografia Inter para textos e JetBrains Mono para valores monetários/códigos/datas.
- **Formato dos arquivos**: Aceitar `.xls` (BIFF8 com reparo BOUNDSHEET) e `.xlsx` (OpenPyXL).
- **Processamento seguro**: Não persistir arquivos desnecessariamente em disco local; processar streams/bytes em memória.
- **Exportação Excel**: Gerar `.xlsx` com células de crédito/débito quitadas coloridas em amarelo claro (`#FEF9C3`), aquisições em aberto em vermelho suave (`#FEE2E2`) e débitos sem origem em azul suave (`#DBEAFE`).

---

### Task 1: Backend Dependencies & Suporte a .xlsx (Leitura e Exportação Colorida)

**Files:**
- Modify: `requirements.txt`
- Create: `backend/xlsx_reader.py`
- Create: `backend/xlsx_exporter.py`
- Create: `backend/tests/test_xlsx.py`

**Interfaces:**
- Consumes: `backend.ledger.Razao`, `backend.ledger.Lancamento`, `backend.reconciler.conciliar`
- Produces: 
  - `backend.xlsx_reader.ler_xlsx(fluxo_bytes: bytes, nome_arquivo: str) -> Razao`
  - `backend.xlsx_exporter.gerar_xlsx_colorido(razao_dict: dict) -> bytes`

- [ ] **Step 1: Atualizar dependências em `requirements.txt`**
Adicionar `openpyxl>=3.1.2`, `fastapi>=0.110.0`, `uvicorn>=0.28.0`, `python-multipart>=0.0.9`, `pytest>=8.0.0`.

- [ ] **Step 2: Implementar teste unitário para `xlsx_reader` e `xlsx_exporter`**
Criar `backend/tests/test_xlsx.py` validando:
1. Conversão de dados tabulares em `.xlsx` para objeto `Razao`.
2. Geração do `.xlsx` colorido a partir do resultado da conciliação contendo estilos de preenchimento (amarelo, vermelho, azul).

- [ ] **Step 3: Implementar `backend/xlsx_reader.py`**
Leitor baseado em `openpyxl` que recebe os bytes ou caminho de um `.xlsx`, localiza a linha de títulos (Data, Histórico, Contrapartida, Débito, Crédito, Saldo) e preenche a estrutura `Razao`.

- [ ] **Step 4: Implementar `backend/xlsx_exporter.py`**
Função `gerar_xlsx_colorido(razao_dict: dict) -> bytes` que cria uma planilha `.xlsx` com estilos de cabeçalho, formatação monetária `R$ #,##0.00`, grifos amarelos (`#FEF9C3`) nas linhas quitadas com nota do ID do par e dias, vermelho suave (`#FEE2E2`) nos em aberto e azul suave (`#DBEAFE`) nos sem par.

- [ ] **Step 5: Executar testes de leitura e exportação**
Rodar `pytest backend/tests/test_xlsx.py` e validar que passam.

---

### Task 2: FastAPI Web Service & Endpoints de Processamento

**Files:**
- Create: `backend/api.py`
- Create: `backend/tests/test_api.py`
- Create: `Dockerfile`

**Interfaces:**
- Consumes: `backend.ledger`, `backend.reconciler`, `backend.xls_reader`, `backend.xlsx_reader`, `backend.xlsx_exporter`
- Produces:
  - `POST /api/processar`: Multipart file upload (`file: UploadFile`), retorna JSON da conciliação
  - `POST /api/exportar-excel`: JSON payload da conciliação, retorna stream de bytes com `media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"`
  - `GET /health`: `{"status": "ok", "app": "conferidor-razao"}`

- [ ] **Step 1: Escrever testes para os endpoints em `backend/tests/test_api.py`**
Testar `/health`, `/api/processar` com arquivo `.xls` existente (`Razão (1).xls`), e `/api/exportar-excel`.

- [ ] **Step 2: Implementar `backend/api.py`**
Criar aplicação FastAPI com middleware CORS permitindo todas as origens ou `localhost`/`cloudflarepages.com`. Implementar upload direto para memória com `await file.read()`, detecção de extensão (`.xls` vs `.xlsx`), reparo automático BOUNDSHEET se `.xls`, chamada do reconciliador e resposta estruturada.

- [ ] **Step 3: Criar `Dockerfile`**
Criar Dockerfile enxuto com Python 3.11-slim, instalação das dependências e comando `CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000"]`.

- [ ] **Step 4: Executar testes da API**
Rodar `pytest backend/tests/test_api.py` e verificar sucesso.

---

### Task 3: Frontend Scaffolding, Bregalda Tokens & Supabase Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/index.html`
- Create: `frontend/src/styles/tokens.css`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/supabase.ts`

**Interfaces:**
- Produces:
  - Estilos com paleta Bregalda: `--cream: #FCFBF8`, `--ink: #2A2140`, `--purple: #4B2E83`, `--yellow: #F5C400`, `--green: #22C55E`.
  - Cliente API: `processarPlanilha(file: File): Promise<RazaoData>`, `exportarExcel(dados: RazaoData): Promise<Blob>`.
  - Cliente Supabase: `supabase` configurado via variáveis de ambiente com fallback para modo visitante/local.

- [ ] **Step 1: Criar configuração do projeto React Vite TypeScript**
Criar `frontend/package.json` com `react`, `react-dom`, `@supabase/supabase-js`, `lucide-react`, `clsx`.
Configurar `vite.config.ts`, `tsconfig.json` e `index.html` importando as fontes Inter e JetBrains Mono do Google Fonts.

- [ ] **Step 2: Criar folha de tokens `frontend/src/styles/tokens.css`**
Aplicar tokens do Bregalda Design System: superfícies, cores, tipografia e raios de borda arquiteturais de 3px para botões.

- [ ] **Step 3: Definir tipos TypeScript em `frontend/src/types.ts`**
Tipos para `Lancamento`, `Resumo`, `RazaoData`, `ConferenciaHistorico`.

- [ ] **Step 4: Implementar `frontend/src/lib/api.ts` e `frontend/src/lib/supabase.ts`**
Funções de comunicação HTTP para a API Python com suporte a base URL dinâmica (`VITE_API_URL || "http://localhost:8000"`), e cliente Supabase com tratamento gracioso quando não houver chaves configuradas.

---

### Task 4: Componentes de Interface do Usuário (Bregalda Design System)

**Files:**
- Create: `frontend/src/components/Navbar.tsx`
- Create: `frontend/src/components/Dropzone.tsx`
- Create: `frontend/src/components/MetricsStrip.tsx`
- Create: `frontend/src/components/ControlsBar.tsx`
- Create: `frontend/src/components/LedgerTable.tsx`
- Create: `frontend/src/components/MatchingDrawer.tsx`
- Create: `frontend/src/components/AuthModal.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/main.tsx`

**Interfaces:**
- Produces:
  - Aplicação SPA completa com layout limpo, acolhedor e claro.
  - Tela inicial de Dropzone com suporte a drag & drop de `.xls` e `.xlsx`.
  - Transição imediata para visão de análise ao concluir o processamento.
  - Tabela com grifo suave amarelo nos itens quitados e seleção que abre a gaveta de amarração lateral.
  - Botão de destaque para download do `.xlsx` colorido gerado pelo backend.

- [ ] **Step 1: Criar `Navbar.tsx`**
Barra superior elegante com palavra-marca Bregalda, identificador do produto "Conferidor de Razão", indicador de conexão com a API e botão de autenticação / trocar planilha.

- [ ] **Step 2: Criar `Dropzone.tsx`**
Componente amigável de seleção e arraste de arquivo com feedback de progresso, orientações claras em português acolhedor e suporte a `.xls` e `.xlsx`.

- [ ] **Step 3: Criar `MetricsStrip.tsx` e `ControlsBar.tsx`**
- `MetricsStrip`: Barra de progresso com porcentagem quitada, mais 4 cartões com números em `JetBrains Mono` e rótulos amigáveis.
- `ControlsBar`: Botões de filtro rápido (*Todos*, *Quitados*, *Em Aberto*, *Sem Par*), campo de busca em tempo real, botão secundário *Baixar CSV* e botão primário em Roxo Bregalda *Exportar Excel (.xlsx)*.

- [ ] **Step 4: Criar `LedgerTable.tsx` e `MatchingDrawer.tsx`**
- `LedgerTable`: Tabela de lançamentos contábeis com realce nas linhas, tooltip e clique para abrir detalhes do par.
- `MatchingDrawer`: Painel lateral deslizando à direita comparando a aquisição com o pagamento, dias até a quitação e alerta sobre fornecedor no histórico.

- [ ] **Step 5: Integrar tudo em `App.tsx`**
Estado reativo centralizando o arquivo ativo, dados processados, filtros, item selecionado para a gaveta, loading states e erros amigáveis.

---

### Task 5: Documentação de Deploy (Cloudflare + Supabase + Render) & Verificação Final

**Files:**
- Modify: `README.md`
- Create: `supabase/schema.sql`

- [ ] **Step 1: Criar script SQL do Supabase `supabase/schema.sql`**
Script de criação da tabela `conferencias`, RLS e bucket de storage.

- [ ] **Step 2: Atualizar `README.md`**
Instruções passo a passo de como rodar localmente (backend FastAPI + frontend Vite) e como colocar no ar (deploy no Cloudflare Pages para o frontend, Render/Fly.io para a API e configuração do Supabase).

- [ ] **Step 3: Testar build do frontend e execução do backend**
Garantir que os arquivos compilam e os testes passam.
