# Notas de Lançamento (Changelog) · Ledger

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [v1.1.0] - 2026-09-13

### 🌟 Adicionado
* **Filtro Rápido "Pendentes" na Interface Web**:
  * Adicionado novo botão no painel de controle que reúne, em uma única visão unificada, todos os lançamentos **Em Aberto** (compras sem pagamento) e **Sem Par** (pagamentos sem nota correspondente no período).
  * Contador em tempo real com a soma consolidada das pendências e badge em tom âmbar (`#F59E0B`) no padrão do Bregalda Design System.
  * Suporte em lançamentos duplos assimétricos (priorização da pendência quando um lado estiver quitado e o outro em aberto).
  * Integração total com a busca textual e o recálculo da telemetria instantânea.
* **Exportação Excel Limpa ("Apenas Pendentes")**:
  * O botão de exportação para Excel agora conta com um seletor inteligente (*split button*), permitindo baixar:
    1. **Planilha Completa**: Todos os registros com marca-texto amarelo, vermelho e azul.
    2. **Apenas Pendentes (Limpo)**: Oculta 100% dos lançamentos quitados/conferidos, mantendo estritamente as pendências e recalculando o totalizador de rodapé (`Total pendente`).
  * Tratamento amigável e elegante para empresas 100% conciliadas: insere uma linha informativa verde suave confirmando que não há pendências no período.
  * O arquivo gerado adota automaticamente o sufixo `_pendentes.xlsx`.

### 🛡️ Aprimoramentos & Acessibilidade
* **Acessibilidade Completa (ARIA & Teclado)**:
  * O menu suspenso de exportação inclui `role="menu"`, `role="menuitem"`, `aria-haspopup="menu"` e `aria-expanded`.
  * Suporte a fechamento com a tecla <kbd>Esc</kbd> e ao clicar em qualquer área externa da tela.
  * Posicionamento responsivo abaixo do botão com limite de largura adaptativo para dispositivos compactos.
* **Cobertura de Testes Expandida**:
  * Suíte de testes ampliada para **41 testes automatizados** aprovados (pytest), incluindo novos testes para a exportação de pendentes, cenários com 100% dos lançamentos quitados e integração ponta a ponta com a API FastAPI.
* **Zero-Storage Intacto**:
  * Todo o processamento do filtro e a geração da planilha limpa continuam sendo realizados 100% na memória volátil (RAM), sem armazenamento em disco ou banco de dados.

---

## [v1.0.0] - 2026-09-13

### 🚀 Lançamento Oficial da Plataforma
* **Módulo Conferidor de Razão Contábil**:
  * Conciliação 1:1 estrita de contas de Duplicatas a Pagar a partir de arquivos `.xls` (BIFF8 legados) e `.xlsx` (Excel moderno).
* **Algoritmo Cronológico Inteligente**:
  * Pareamento automático no tempo ($T_d \ge T_c$) com verificação do nome de fornecedor no histórico contábil e desempate determinístico por linha.
* **Privacidade Absoluta (Zero-Storage)**:
  * Leitura, reparo e conciliação 100% voláteis em memória RAM. Nenhum dado contábil é gravado em disco ou banco de dados.
* **Arquitetura BFF (Zero Keys no Frontend)**:
  * Eliminação completa de chaves de API e SDKs de terceiros no cliente web. Todas as validações ocorrem no servidor FastAPI (`/api/auth/*`).
* **Bregalda Design System**:
  * Interface visual construída sob os princípios editoriais da marca (Warm Cream, Deep Ink, Roxo Bregalda, tipografia Inter e JetBrains Mono).
* **Exportação Excel Colorida (.xlsx)**:
  * Geração instantânea de planilha com células coloridas em amarelo (quitados), vermelho (aberto) e azul (sem par).
* **Suíte de Testes Automatizados**:
  * 37 testes automatizados cobrindo leituras, conciliações, exportações e auditoria estrita de segurança.
