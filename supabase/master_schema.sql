-- ==========================================
-- SCRIPT BUILD: ESQUEMA UNIFICADO LCA DADOS
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Usuários e Integração com Auth)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Clientes (CRM)
CREATE TABLE clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    document TEXT, -- CPF/CNPJ
    type TEXT DEFAULT 'Pessoa Física',
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Processos (Cases)
CREATE TABLE cases (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'new', -- new, progress, waiting, done
    priority TEXT DEFAULT 'medium',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Transações (Financeiro)
CREATE TABLE transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    status TEXT DEFAULT 'Pendente', -- Pendente, Pago
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tarefas (Tasks)
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- pending, completed
    priority TEXT DEFAULT 'medium', -- low, medium, high
    due_date DATE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Eventos (Agenda - Calendar)
CREATE TABLE events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT DEFAULT 'Reunião',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- Inicialmente liberado para todos os usuários logados.
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for authenticated users on profiles" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL for authenticated users on clients" ON clients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL for authenticated users on cases" ON cases FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL for authenticated users on transactions" ON transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL for authenticated users on tasks" ON tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable ALL for authenticated users on events" ON events FOR ALL USING (auth.role() = 'authenticated');
