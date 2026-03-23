-- ==========================================
-- SCRIPT KILL: LIMPEZA TOTAL DO SUPABASE
-- CUIDADO: Este script deletará TODAS as tabelas e funções do schema public.
-- ==========================================

DO $$ DECLARE
    r RECORD;
BEGIN
    -- 1. Deletar todas as tabelas
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- 2. Deletar todas as funções
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END $$;
