# Supabase Auth - Guia de Configuração & Controle de Acesso

Este diretório contém a documentação e scripts de referência para o serviço de autenticação do **Conferidor de Razão na Nuvem** (Bregalda).

---

## 1. Política Estrita de Zero-Storage (Privacidade Absoluta)

O **Conferidor de Razão** lida com dados contábeis sensíveis: razões contábeis, duplicatas a pagar, notas fiscais, CNPJs, datas de pagamento e movimentações bancárias.

Por diretriz fundamental de arquitetura e privacidade:
- **ZERO ARMAZENAMENTO DE DADOS CONTÁBEIS**: Nenhum arquivo (`.xls`, `.xlsx`), nenhum lançamento e nenhuma informação contábil é persistida em banco de dados, tabelas relacionais ou buckets de arquivos do Supabase.
- **Processamento 100% em Memória RAM**: A leitura, reparo de formato, conciliação 1:1 e exportação colorida ocorrem exclusivamente na memória volátil do backend FastAPI e na sessão do navegador React.
- **Uso Exclusivo do Supabase**: O Supabase é utilizado **estritamente para controle de acesso (Autenticação)**, validando o login e senha da usuária.

---

## 2. Passo a Passo: Configuração do Projeto Supabase

### 2.1 Criar o Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e faça login na sua conta.
2. Clique em **"New Project"**.
3. Escolha um nome para o projeto (ex: `conferidor-razao`) e defina uma senha mestra do banco de dados (guarde essa senha em local seguro).
4. Selecione a região mais próxima (ex: `South America (São Paulo) - sa-east-1`).
5. Escolha o plano **Free** e clique em **Create new project**.

### 2.2 Obter as Chaves de Conexão da API
1. No menu lateral esquerdo do painel, clique em **Project Settings** (ícone de engrenagem) e depois em **API**.
2. Na seção **API** (ou **API Keys**), localize:
   - **Project URL**: `https://[id-do-projeto].supabase.co`
   - **Publishable Key (ou anon key)**: Chave pública/published (`sb_publishable_...` ou `eyJ...`)
   - **Secret Key (ou service_role / client secret)**: Chave secreta de servidor (`sb_secret_...` ou `eyJ...`)
3. **Atenção (Arquitetura BFF - Zero Keys no Frontend):**
   Ambas as chaves residem **exclusivamente nas variáveis de ambiente do Backend Python** (no painel do Render/Fly.io ou no arquivo `backend/.env`). O frontend **nunca recebe nem armazena nenhuma chave**:
   ```env
   SUPABASE_URL=https://[id-do-projeto].supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # (ou SUPABASE_ANON_KEY)
   SUPABASE_SECRET_KEY=sb_secret_...             # (ou SUPABASE_CLIENT_SECRET)
   ```
   > 💡 O backend reconhece automaticamente tanto os nomes modernos (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) quanto os legados (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

---

## 3. Passo a Passo: Cadastrar o Acesso para a Mãe do Ricardo

Para que a mãe do Ricardo possa acessar o sistema com facilidade e sem atrito técnico, o usuário deve ser criado diretamente pelo painel administrativo do Supabase:

1. No painel do Supabase, clique em **Authentication** (ícone de cadeado / pessoas) no menu lateral.
2. Na aba **Users**, clique no botão **"Add user"** (canto superior direito) e selecione **"Create user"**.
3. No formulário que se abre:
   - **Email**: insira o e-mail dela (ex: `mae@dominio.com.br` ou o e-mail pessoal que ela utiliza).
   - **Password**: defina uma senha amigável e segura.
   - **Auto Confirm User?**: **Marque esta opção como SIM / ATIVADO (`true`)**.
     > **Importante:** Marcar *Auto Confirm* garante que ela não precise procurar um e-mail de confirmação ou clicar em links complexos. A conta fica pronta para uso imediato.
4. Clique em **"Create user"**.
5. *(Opcional)* Para personalizar a saudação na barra superior da interface:
   - Você pode incluir no campo de metadados do usuário o nome dela (`{"nome": "Mãe do Ricardo"}` ou o primeiro nome dela). Assim, a barra de navegação mostrará o nome dela de forma acolhedora.

---

## 4. Configurações de Segurança Recomendadas (Hardening)

Para restringir o sistema apenas aos usuários autorizados (evitando que terceiros criem contas):

1. **Desabilitar Novos Cadastros Públicos (Signups)**:
   - Acesse **Authentication** > **Providers** > **Email**.
   - Desmarque a opção **"Enable Signups"** (ou "Allow new users to sign up").
   - Salve as alterações.
   - *Resultado:* Apenas usuários criados manualmente por você no painel conseguirão entrar. O formulário de login na interface servirá estritamente para autenticar credenciais existentes.

2. **Desativar Confirmação Obrigatória de E-mail**:
   - Ainda em **Authentication** > **Providers** > **Email**.
   - Desmarque **"Confirm email"**.
   - Isso evita problemas caso o serviço de e-mails atinja limites ou caia na caixa de spam.

3. **Controle Direto de Acesso por Usuário**:
   - Não é necessário configurar listas manuais ou variáveis de e-mails no servidor (`ALLOWED_EMAILS`).
   - O acesso é concedido de forma dinâmica para **qualquer usuário que você cadastrar no painel do Supabase** (Authentication > Users). Se o e-mail não existir ou a senha estiver incorreta, o login é imediatamente negado pelo backend.

---

## 5. Barreira de Entrada Obrigatória (Login Gate & Zero Keys)

O sistema conta com proteção prévia estrita:
- **Zero Keys no Frontend**: O cliente React não possui nenhuma credencial de terceiros, dependendo exclusivamente dos endpoints de autenticação do backend (`/api/auth/*`).
- **Antes de Entrar**: Nenhuma planilha pode ser enviada e nenhuma tabela é exibida antes da autenticação bem-sucedida.
- **Fail-Closed**: Em produção, requisições não autenticadas ou com tokens expirados são bloqueadas com HTTP 401/403.
- **Em Desenvolvimento Local**: Suporta login local simulado caso o Supabase não esteja conectado.

