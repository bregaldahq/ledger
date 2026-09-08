-- ==============================================================================
-- Conferidor de Razão na Nuvem - Supabase Auth & Arquitetura Zero-Storage
-- ==============================================================================
--
-- POLÍTICA DE SEGURANÇA: ZERO-STORAGE
-- ------------------------------------------------------------------------------
-- Este projeto adota uma arquitetura estrita de ZERO-STORAGE para dados contábeis.
-- NENHUMA tabela de lançamentos, notas fiscais, contas ou arquivos é criada no
-- banco de dados PostgreSQL do Supabase.
--
-- Todo o processamento contábil (leitura, conciliação 1:1 e exportação colorida)
-- ocorre 100% em memória volátil (RAM) no backend FastAPI e no navegador React.
--
-- O Supabase é utilizado única e exclusivamente pelo módulo de autenticação
-- nativo (GoTrue / auth.users) para controle de acesso via e-mail e senha.
-- ==============================================================================

-- 1. CONSULTA DE VERIFICAÇÃO DE USUÁRIOS
-- Execute este comando no SQL Editor do Supabase para verificar se o usuário da mãe
-- do Ricardo foi devidamente criado e confirmado:
SELECT 
    id,
    email,
    raw_user_meta_data->>'nome' AS nome,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;

-- 2. CRIAÇÃO MANUAL VIA SQL (OPCIONAL / ALTERNATIVA AO PAINEL)
-- Recomendamos criar o usuário diretamente pelo painel (Authentication -> Users -> Add User)
-- marcando "Auto Confirm User = TRUE".
--
-- Caso prefira criar via SQL, utilize a extensão pgcrypto para hash de senha:
/*
-- Exemplo de inserção direta com senha hasheada (substitua os valores):
-- INSERT INTO auth.users (
--     instance_id,
--     id,
--     aud,
--     role,
--     email,
--     encrypted_password,
--     email_confirmed_at,
--     raw_app_meta_data,
--     raw_user_meta_data,
--     created_at,
--     updated_at
-- ) VALUES (
--     '00000000-0000-0000-0000-000000000000',
--     gen_random_uuid(),
--     'authenticated',
--     'authenticated',
--     'mae@exemplo.com.br',
--     crypt('SenhaSegura123!', gen_salt('bf')),
--     NOW(),
--     '{"provider":"email","providers":["email"]}',
--     '{"nome":"Mãe do Ricardo"}',
--     NOW(),
--     NOW()
-- );
*/

-- 3. CONFIRMAÇÃO DA POLÍTICA ZERO-STORAGE NO SCHEMA PÚBLICO
-- Nenhuma tabela contábil deve existir no schema 'public'.
-- A query abaixo confirma que o schema público permanece limpo:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
