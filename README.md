<div align="center">

# Ledger

**Suíte contábil e financeira de alta precisão desenvolvida por Bregalda.**

[![CI/CD Pipeline](https://github.com/bregaldahq/ledger/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/bregaldahq/ledger/actions/workflows/ci-cd.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-22C55E.svg?logo=github)](https://bregaldahq.github.io/ledger/)
[![Python Version](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Zero-Storage](https://img.shields.io/badge/Privacidade-Zero--Storage%20(RAM)-22C55E.svg)](#-política-estrita-de-zero-storage)
[![Domínio](https://img.shields.io/badge/Produção-ledger.bregalda.com-4B2E83.svg)](https://ledger.bregalda.com)

<p align="center">
  <em>Ferramentas ponderadas para problemas técnicos reais.</em>
</p>

</div>

---

## 📌 Visão Geral

O **Ledger** é uma suíte modular de ferramentas contábeis e financeiras projetada para eliminar o atrito manual e o estresse operacional de contadores, controllers e analistas financeiros.

Construído sob a filosofia de software independente da **Bregalda**, o Ledger combina algoritmos determinísticos de alta velocidade, processamento estritamente em memória volátil (**Zero-Storage**) e uma interface editorial acolhedora que respeita o tempo e a atenção do profissional.

---

## ⚡ Módulo Pioneiro: Conferidor de Razão Contábil

O primeiro módulo ativo na plataforma automatiza a exaustiva conciliação de contas de **Duplicatas a Pagar** a partir de exportações de Livro Razão em formatos legados (`.xls` BIFF8 de sistemas como Domínio, Questor e Totvs) ou planilhas modernas (`.xlsx`).

```
                              FLUXO DE CONCILIAÇÃO 1:1
┌─────────────────────────┐
│   Upload da Planilha    │ (.xls ou .xlsx direto do sistema contábil)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ Leitura & Auto-Reparo   │ (Reparo em RAM de cabeçalhos corrompidos BOUNDSHEET)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Algoritmo Cronológico  │ (Pareamento 1:1 Crédito x Débito mais próximo no tempo,
└────────────┬────────────┘  com conferência de fornecedor e desempate determinístico)
             │
             ├──────────────────────────────────────────────┐
             ▼                                              ▼
┌─────────────────────────┐                    ┌─────────────────────────┐
│ Painel Web Interativo   │                    │ Planilha Excel Colorida │
│ Tabela com rolagem auto │                    │ Células com marca-texto │
│ e realce do par         │                    │ amarelo, vermelho e azul│
└─────────────────────────┘                    └─────────────────────────┘
```

### Principais Capacidades:
* **Amarração 1:1 Estrita**: Cada nota de compra (crédito) é amarrada a um único pagamento (débito) de valor centavo a centavo idêntico.
* **Proximidade Cronológica**: Havendo compras e pagamentos múltiplos com valores repetidos, o algoritmo vincula automaticamente a aquisição ao pagamento realizado mais próximo no tempo posterior à emissão ($T_d \ge T_c$), analisando também a correspondência textual do fornecedor no histórico.
* **Marcação Contábil Visual**:
  * 🟨 **Quitado & Amarrado (`#FEF9C3`)**: Com anotação do par, ID da amarração e intervalo em dias.
  * 🟥 **Em Aberto (`#FEE2E2`)**: Notas fiscais pendentes de quitação no período.
  * 🟦 **Sem Par (`#DBEAFE`)**: Pagamentos bancários sem nota de origem correspondente no mês.
* **Exportação Fiel em `.xlsx`**: Gera com 1 clique o arquivo Excel formatado com estilos, notas e formatação monetária contábil (`R$ #,##0.00`).
* **Auto-Reparo de BIFF8**: Corrige silenciosamente em memória o defeito de cabeçalho comum em softwares legados ("Expected BOF record").

---

## 🗺️ Roadmap da Suíte Ledger

O Ledger foi desenhado para hospedar múltiplas ferramentas sob o mesmo ecossistema:

| Módulo | Finalidade | Status |
| :--- | :--- | :--- |
| **Conferidor de Razão** | Amarração 1:1 de Duplicatas a Pagar (.xls e .xlsx) | ✅ **Ativo (v1.0.0)** |
| **Conciliador de Extrato (OFX)** | Cruzamento de extratos bancários contra contas do razão | ⏳ Planejado |
| **Comparador de Balancetes** | Auditoria de divergências e saltos de saldos entre competências | ⏳ Planejado |
| **Auditor de Retenções** | Validação de alíquotas de IRRF, PIS/COFINS, CSLL e ISS | ⏳ Planejado |
| **Validador Fiscal** | Validação em lote de chaves de acesso NFe e regras de CFOP | ⏳ Planejado |

---

## 🛡️ Política Estrita de Zero-Storage & Segurança

A privacidade dos dados financeiros é um pilar intransponível:

1. **Zero Armazenamento Contábil**: Nenhuma planilha enviada, nenhum lançamento e nenhum CNPJ é gravado em disco ou persistido em banco de dados. O processamento ocorre exclusivamente na memória volátil (RAM) e é liberado ao término da resposta HTTP.
2. **Padrão BFF (Zero Keys no Frontend)**: O pacote `@supabase/supabase-js` e quaisquer chaves de provedores foram 100% eliminados do cliente web. Todo o fluxo de autenticação é intermediado pelo servidor FastAPI (`/api/auth/*`).
3. **Fail-Closed em Produção**: Caso as variáveis de autenticação não estejam configuradas em produção, a API recusa conexões com erro 500/401, impedindo qualquer modo de teste aberto na nuvem.
4. **Whitelist de E-mails**: Acesso restrito via variável de ambiente `ALLOWED_EMAILS`. Usuários não autorizados recebem HTTP 403 Forbidden antes de qualquer emissão de token.

---

## 📐 Bregalda Design System

A interface do Ledger rejeita o ruído visual de dashboards genéricos e adota a estética de **livro-mestre encadernado**:

* **Warm Cream (`#FCFBF8`)**: Fundo quente de papel de alta gramatura, que evita o cansaço visual.
* **Deep Ink (`#2A2140`)**: Tinta escura com contraste preciso para leituras prolongadas.
* **Roxo Bregalda (`#4B2E83`)**: Acentuação institucional e botões de comando primários.
* **Marca-Texto Tradicional (`#FEF9C3`)**: O amarelo clássico de escritório de contabilidade para dados quitados.
* **Tipografia**: `Inter` para clareza em textos e `JetBrains Mono` com alinhamento tabular para valores monetários e datas.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* **Python 3.11+**
* **Node.js 20+** e **npm**

### 1. Clonar o Repositório
```bash
git clone https://github.com/bregaldahq/ledger.git
cd ledger
```

### 2. Configurar o Backend (Python FastAPI)
```bash
# Criar e ativar ambiente virtual
python -m venv .venv
source .venv/bin/activate  # No Windows: .venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Executar a API em modo de desenvolvimento
python -m uvicorn backend.api:app --reload --port 8000
```
A API estará disponível em `http://localhost:8000` (documentação Swagger interativa em `http://localhost:8000/docs`).

### 3. Configurar o Frontend (React + Vite)
```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```
Abra o navegador em `http://localhost:5173`. A tela de login solicitará suas credenciais autorizadas.

---

## 🧪 Testes Automatizados & Qualidade

O projeto conta com **37 testes automatizados** cobrindo leituras, conciliações cronológicas, exportações Excel e auditoria de segurança:

```bash
# Executar suíte completa do backend
python -m pytest backend/tests -v

# Executar build de produção e tipagem estática do frontend
cd frontend && npm run build
```

---

## ☁️ Arquitetura de Deploy em Produção

```
              ┌──────────────────────────────────────────────┐
              │            Cloudflare Pages CDN              │
              │          (https://ledger.bregalda.com)       │
              └──────────────────────┬───────────────────────┘
                                     │ Chamadas API (BFF)
                                     ▼
              ┌──────────────────────────────────────────────┐
              │             Render / Fly.io API              │
              │         (Contêiner Docker FastAPI)           │
              └──────────────────────┬───────────────────────┘
                                     │ Validação Servidor-a-Servidor
                                     ▼
              ┌──────────────────────────────────────────────┐
              │            Supabase Auth (Zero-Storage)      │
              │            (Apenas controle de login)        │
              └──────────────────────────────────────────────┘
```

* **Frontend**: Compilado estaticamente e hospedado no **Cloudflare Pages** sob o domínio customizado `ledger.bregalda.com`.
* **Backend**: Contêiner Docker implantado no **Render** (Web Service) ou **Fly.io**, com porta `8000` e variáveis de ambiente secretas protegidas no servidor.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais detalhes.

---

<div align="center">
  <sub>Construído com rigor artesanal pela <strong>Bregalda</strong>.</sub>
</div>
