-- ==============================================================================
-- CENTRAL DE AVARIAS - MIGRATION 02: Catalog & Invoices (DANFE Staging)
-- ==============================================================================

-- 1. Catálogo Corporativo Único de Produtos
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    sku VARCHAR(50) NOT NULL,
    barcode VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit_of_measure VARCHAR(10) NOT NULL DEFAULT 'CX', -- Padronizado em Caixas no MVP
    minimum_stock_boxes INTEGER NOT NULL DEFAULT 0 CHECK (minimum_stock_boxes >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_products_company_sku UNIQUE (company_id, sku),
    CONSTRAINT uq_product_id_company UNIQUE (id, company_id)
);

-- 2. De-Para Inteligente de Fornecedores (Aliases)
CREATE TABLE public.product_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    supplier_tax_id VARCHAR(18),
    supplier_product_code VARCHAR(100) NOT NULL,
    supplier_product_name VARCHAR(255) NOT NULL,
    confidence_score NUMERIC(3, 2) DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_supplier_code_alias UNIQUE (supplier_tax_id, supplier_product_code)
);

-- 3. Notas Fiscais (Área de Staging para Conferência Física)
CREATE TYPE public.invoice_status_enum AS ENUM (
    'PENDING_CONFERENCE',
    'CONFIRMED',
    'CANCELLED'
);

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    access_key VARCHAR(44) NOT NULL UNIQUE,
    invoice_number VARCHAR(20) NOT NULL,
    invoice_series VARCHAR(10) NOT NULL DEFAULT '1',
    issue_date DATE NOT NULL,
    issuer_name VARCHAR(200) NOT NULL,
    issuer_tax_id VARCHAR(18) NOT NULL,
    recipient_tax_id VARCHAR(18),
    total_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    pdf_storage_path VARCHAR(255) NOT NULL,
    status public.invoice_status_enum NOT NULL DEFAULT 'PENDING_CONFERENCE',
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    confirmed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    confirmed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT chk_access_key_length CHECK (length(access_key) = 44),
    -- Identificador composto para travar integridade de lotes por unidade
    CONSTRAINT uq_invoice_id_unit_id UNIQUE (id, unit_id)
);

-- 4. Itens da Nota Fiscal (Dados Fiscais Brutos vs Caixas Operacionais)
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    item_index INTEGER NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    raw_product_code VARCHAR(100) NOT NULL,
    raw_product_name VARCHAR(255) NOT NULL,
    raw_ncm VARCHAR(10),
    raw_unit VARCHAR(10) NOT NULL,              -- Unidade original impressa na NF (ex: UN, KG, CX)
    raw_quantity NUMERIC(12, 3) NOT NULL,       -- Quantidade fiscal faturada original
    converted_boxes INTEGER NOT NULL DEFAULT 0, -- Caixas inteiras validadas na conferência humana
    unit_price NUMERIC(12, 4) NOT NULL DEFAULT 0,
    total_item_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_matched BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_invoice_item_index UNIQUE (invoice_id, item_index),
    CONSTRAINT chk_invoice_quantities CHECK (raw_quantity > 0 AND converted_boxes >= 0),
    CONSTRAINT uq_invoice_item_id_invoice_id UNIQUE (id, invoice_id)
);

-- Índices de Performance
CREATE INDEX idx_products_sku_barcode ON public.products(sku, barcode);
CREATE INDEX idx_invoices_unit_status ON public.invoices(unit_id, status);
CREATE INDEX idx_invoices_access_key ON public.invoices(access_key);
CREATE INDEX idx_invoice_items_lookup ON public.invoice_items(invoice_id, product_id);
