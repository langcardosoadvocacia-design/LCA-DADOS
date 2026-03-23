-- Script Mestre: Auto-Cura e Dados Mocks
-- LCA DADOS - Auto-Healing Schema & Mock Data

-- === PASSO 1: AUTO-CURA DA ESTRUTURA ===
-- Garante que se suas tabelas antigas estiverem faltando colunas (pq o KILL não as deletou), elas serão criadas agora!

-- Auto-Cura Clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS documento TEXT;

-- Auto-Cura Transacoes (Financeiro)
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS beneficiario_id UUID REFERENCES colaboradores(id) ON DELETE SET NULL;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES transacoes(id) ON DELETE CASCADE;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS parcela_origem_id UUID;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS data_pagamento DATE;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS concretizado BOOLEAN DEFAULT false;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS referencia TEXT;
ALTER TABLE transacoes ADD COLUMN IF NOT EXISTS conta TEXT;

-- Auto-Cura Demandas (Tarefas)
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS vinculo_id UUID;
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS vinculo_tipo TEXT;
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS prioridade TEXT;
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS data_prazo DATE;
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS data_limite DATE;

-- Auto-Cura Processos (Contratos)
ALTER TABLE processos ADD COLUMN IF NOT EXISTS parcelas INTEGER;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS colaboradores JSONB;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS cliente_nome TEXT;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS valor_total DECIMAL(15,2);
ALTER TABLE processos ADD COLUMN IF NOT EXISTS imposto DECIMAL(5,2);
ALTER TABLE processos ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE processos ADD COLUMN IF NOT EXISTS status TEXT;


-- === PASSO 2: INSERÇÃO DOS DADOS FALSOS ===
-- Limpa os dados existentes caso rode mais de uma vez (ordem importa pela FK/Cascade)
DELETE FROM distribuicoes;
DELETE FROM crm_orcamentos;
DELETE FROM demandas;
DELETE FROM transacoes;
DELETE FROM processos;
DELETE FROM clientes;
DELETE FROM colaboradores WHERE id != (SELECT id FROM colaboradores ORDER BY id LIMIT 1); -- Deixa sua conta de teste logada intacta!

-- IDs Estáticos para Relacionamentos Seguros
-- Criamos um escritório caso não exista e um ID padrão se não for UUID suportado
-- '868f08f0-104b-4683-9eb1-30960d738f6d'

-- 1. Inserindo Colaboradores
INSERT INTO colaboradores (id, nome, email, oab, tipo, comissao_padrao, ativo, escritorio_id)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Dr. Roberto Lang', 'roberto.lang@mock.com', 'RS-12345', 'admin', 30.00, true, '868f08f0-104b-4683-9eb1-30960d738f6d'),
    ('22222222-2222-2222-2222-222222222222', 'Dra. Ana Costa', 'ana.costa@mock.com', 'RS-54321', 'associado', 20.00, true, '868f08f0-104b-4683-9eb1-30960d738f6d');

-- 2. Inserindo Clientes
INSERT INTO clientes (id, nome, tipo, documento, email, contato, cidade, uf)
VALUES 
    ('33333333-3333-3333-3333-333333333333', 'Construtora Horizonte LTDA', 'PJ', '00.111.222/0001-33', 'contato@horizonte.com', '(11) 98888-7777', 'São Paulo', 'SP'),
    ('44444444-4444-4444-4444-444444444444', 'Carlos Eduardo Silva', 'PF', '123.456.789-00', 'carlos@silva.com', '(51) 97777-6666', 'Porto Alegre', 'RS'),
    ('99999999-9999-9999-9999-999999999999', 'Tech Solutions Brazil', 'PJ', '55.666.777/0001-88', 'financeiro@techbr.com', '(48) 96666-5555', 'Florianópolis', 'SC');

-- 3. Inserindo Processos (Contratos)
INSERT INTO processos (id, numero, cliente_id, cliente_nome, valor_total, imposto, parcelas, data_inicio, status)
VALUES 
    ('77777777-7777-7777-7777-777777777777', 'CONT-2024-001', '33333333-3333-3333-3333-333333333333', 'Construtora Horizonte LTDA', 50000.00, 16.33, 5, '2024-03-01', 'ativo'),
    ('88888888-8888-8888-8888-888888888888', 'CONT-2024-002', '44444444-4444-4444-4444-444444444444', 'Carlos Eduardo Silva', 12000.00, 0, 1, '2024-03-10', 'concluido');

-- 4. Inserindo Transações Financeiras com Parente e Filhos
-- Receita Pai (Honorários Iniciais)
INSERT INTO transacoes (id, tipo, valor, data, entidade, status, concretizado, referencia, conta)
VALUES 
    ('55555555-5555-5555-5555-555555555555', 'receita', 10000.00, current_date - interval '5 days', 'Construtora Horizonte LTDA', 'recebido', true, 'CONT-2024-001 (1/5)', 'Cora Banco');

-- Imposto (Despesa) Filha
INSERT INTO transacoes (id, tipo, valor, data, entidade, status, concretizado, referencia, conta, parent_id)
VALUES 
    (uuid_generate_v4(), 'despesa', 1633.00, current_date - interval '5 days', 'Governo (Impostos)', 'pago', true, 'Imposto / CONT-2024-001', 'Cora Banco', '55555555-5555-5555-5555-555555555555');

-- Comissão Filha para Dra. Ana Costa (Associado)
INSERT INTO transacoes (id, tipo, valor, data, entidade, status, concretizado, referencia, conta, parent_id, beneficiario_id)
VALUES 
    (uuid_generate_v4(), 'distribuicao', 2000.00, current_date - interval '5 days', 'Dra. Ana Costa', 'pendente', false, 'CONT-2024-001 (1/5)', 'Cora Banco', '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222');

-- Despesa Extra do Escritório
INSERT INTO transacoes (id, tipo, valor, data, entidade, status, concretizado, referencia, conta)
VALUES 
    (uuid_generate_v4(), 'despesa', 850.00, current_date - interval '2 days', 'Google Ads', 'pago', true, 'Marketing Digital Mês 03', 'Cartão Sicoob');

-- Receita Pendente
INSERT INTO transacoes (id, tipo, valor, data, entidade, status, concretizado, referencia, conta)
VALUES 
    (uuid_generate_v4(), 'receita', 15000.00, current_date + interval '10 days', 'Tech Solutions Brazil', 'pendente', false, 'Auditoria Preventiva', 'Cora Banco');

-- 5. Inserindo Tarefas (Demandas)
INSERT INTO demandas (titulo, descricao, status, prioridade, data_prazo, colaborador_id, vinculo_tipo)
VALUES 
    ('Elaboração de Peça Inicial', 'Ação Indenizatória do cliente Carlos', 'em_andamento', 'alta', current_date + interval '2 days', '11111111-1111-1111-1111-111111111111', 'cliente'),
    ('Revisão Contratual Horizonte', 'Analisar aditivo 03 do contrato vigente', 'pendente', 'media', current_date + interval '5 days', '22222222-2222-2222-2222-222222222222', 'processo');

-- 6. Inserindo CRM Orçamentos
INSERT INTO crm_orcamentos (escritorio_id, nome_prospect, telefone_prospect, origem, valor_proposto, status)
VALUES 
    ('868f08f0-104b-4683-9eb1-30960d738f6d', 'Supermercado Boas Compras', '(51) 95555-4444', 'Indicação', 25000.00, 'enviado'),
    ('868f08f0-104b-4683-9eb1-30960d738f6d', 'João Batista Gomes', '(11) 94444-3333', 'Instagram', 5000.00, 'prospeccao');
