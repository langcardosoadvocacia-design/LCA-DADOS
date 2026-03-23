-- Script para Restaurar a Estrutura Original do Supabase
-- Isso recriará as tabelas exatas que a sua interface original espera.

-- 1. Colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    oab TEXT,
    tipo TEXT NOT NULL,
    comissao_padrao DECIMAL(5,2),
    ativo BOOLEAN DEFAULT true,
    avatar_url TEXT,
    escritorio_id UUID
);

-- 2. Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo TEXT,
    doc TEXT,
    documento TEXT,
    email TEXT,
    contato TEXT,
    rg TEXT,
    estado_civil TEXT,
    profissao TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    cidade TEXT,
    uf TEXT,
    cep TEXT,
    data_nascimento DATE
);

-- 3. Processos (Contratos)
CREATE TABLE IF NOT EXISTS processos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero TEXT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    cliente_nome TEXT,
    valor_total DECIMAL(15,2),
    imposto DECIMAL(5,2),
    parcelas INTEGER,
    colaboradores JSONB,
    data_inicio DATE,
    status TEXT
);

-- 4. Transacoes (Financeiro)
CREATE TABLE IF NOT EXISTS transacoes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo TEXT NOT NULL,
    valor DECIMAL(15,2) NOT NULL,
    data DATE NOT NULL,
    entidade TEXT,
    status TEXT,
    concretizado BOOLEAN DEFAULT false,
    referencia TEXT,
    conta TEXT,
    parent_id UUID REFERENCES transacoes(id) ON DELETE CASCADE,
    beneficiario_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
    parcela_origem_id UUID,
    data_pagamento DATE
);

-- 5. Demandas (Tarefas)
CREATE TABLE IF NOT EXISTS demandas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descricao TEXT,
    status TEXT,
    prioridade TEXT,
    data_prazo DATE,
    data_limite DATE,
    colaborador_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
    vinculo_id UUID,
    vinculo_tipo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. CRM Orcamentos
CREATE TABLE IF NOT EXISTS crm_orcamentos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    escritorio_id UUID,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    nome_prospect TEXT NOT NULL,
    telefone_prospect TEXT NOT NULL,
    email_prospect TEXT,
    origem TEXT,
    descricao TEXT,
    valor_proposto DECIMAL(15,2),
    status TEXT,
    data_envio DATE,
    data_retorno DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Distribuicoes
CREATE TABLE IF NOT EXISTS distribuicoes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    processo TEXT,
    honorario DECIMAL(15,2),
    percentual DECIMAL(5,2),
    data DATE,
    status TEXT,
    "baseLiquida" DECIMAL(15,2),
    valor DECIMAL(15,2),
    referencia TEXT
);

-- Desabilitar RLS para não quebrar o código antigo que não enviava headers de auth estritos
ALTER TABLE colaboradores DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE processos DISABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE demandas DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_orcamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE distribuicoes DISABLE ROW LEVEL SECURITY;
