-- ==============================================================================
-- CENTRAL DE AVARIAS - MIGRATION 01: Core, Units, Profiles & Sectors
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums Organizacionais e de Permissão
CREATE TYPE public.unit_type_enum AS ENUM ('HEADQUARTERS', 'BRANCH');
CREATE TYPE public.global_role_enum AS ENUM ('SUPERADMIN', 'CORPORATE_MANAGER', 'STANDARD_USER');
CREATE TYPE public.unit_role_enum AS ENUM ('UNIT_MANAGER', 'STOCK_OPERATOR', 'UNIT_AUDITOR');

-- 1. Empresas
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corporate_name VARCHAR(150) NOT NULL,
    trade_name VARCHAR(150) NOT NULL,
    tax_id VARCHAR(18) UNIQUE, -- NULL permitida até cadastro oficial; sem dados fictícios
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Unidades (Matriz Chapecó e Filial Itupeva cadastradas dinamicamente)
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    unit_type public.unit_type_enum NOT NULL,
    tax_id VARCHAR(18) UNIQUE, -- Sem dados cadastrais fictícios
    address VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_units_company_code UNIQUE (company_id, code),
    CONSTRAINT uq_units_id_company UNIQUE (id, company_id)
);

-- 3. Perfis de Usuário (Integrados ao Supabase Auth)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    default_unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    global_role public.global_role_enum NOT NULL DEFAULT 'STANDARD_USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Permissões Granulares por Unidade
CREATE TABLE public.unit_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    unit_role public.unit_role_enum NOT NULL DEFAULT 'STOCK_OPERATOR',
    can_import_invoices BOOLEAN NOT NULL DEFAULT FALSE,
    can_request_transfers BOOLEAN NOT NULL DEFAULT TRUE,
    can_approve_transfers BOOLEAN NOT NULL DEFAULT FALSE,
    can_dispatch_transfers BOOLEAN NOT NULL DEFAULT FALSE,
    can_receive_transfers BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_profile_unit UNIQUE (profile_id, unit_id)
);

-- 5. Setores Físicos de Armazenamento por Unidade
CREATE TABLE public.sectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_unit_sector_code UNIQUE (unit_id, code),
    -- Identificador composto para travar chaves estrangeiras com segurança de unidade
    CONSTRAINT uq_sector_id_unit_id UNIQUE (id, unit_id)
);

-- Índices de Performance
CREATE INDEX idx_units_company_active ON public.units(company_id, is_active);
CREATE INDEX idx_profiles_global_role ON public.profiles(global_role, is_active);
CREATE INDEX idx_unit_permissions_lookup ON public.unit_permissions(profile_id, unit_id);
CREATE INDEX idx_sectors_unit_active ON public.sectors(unit_id, is_active);
