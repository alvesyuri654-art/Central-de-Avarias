-- ==============================================================================
-- CENTRAL DE AVARIAS - MIGRATION 04: Transfers, Allocations & Divergences
-- ==============================================================================

-- 1. Status do Workflow de Transferências
CREATE TYPE public.transfer_status_enum AS ENUM (
    'REQUESTED',                -- Solicitado pela Filial
    'APPROVED',                 -- Aprovado pela Matriz
    'REJECTED',                 -- Reprovado pela Matriz
    'PICKING',                  -- Lotes alocados e caixas reservadas
    'IN_TRANSIT',               -- Carga despachada / em trânsito rodoviário
    'RECEIVED_COMPLETE',        -- Conferência finalizada sem divergências
    'RECEIVED_WITH_DIVERGENCE', -- Conferência finalizada com falta, sobra ou avaria
    'CANCELLED'                 -- Cancelado antes da expedição
);

-- 2. Transferências entre Unidades
CREATE TABLE public.transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_code VARCHAR(30) NOT NULL UNIQUE,
    source_unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    destination_unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    status public.transfer_status_enum NOT NULL DEFAULT 'REQUESTED',
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ,
    dispatched_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    dispatched_at TIMESTAMPTZ,
    received_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT chk_distinct_units CHECK (source_unit_id <> destination_unit_id),
    CONSTRAINT uq_transfer_id_source UNIQUE (id, source_unit_id),
    CONSTRAINT uq_transfer_id_dest UNIQUE (id, destination_unit_id)
);

-- 3. Itens da Transferência
CREATE TABLE public.transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    requested_boxes INTEGER NOT NULL CHECK (requested_boxes > 0),
    approved_boxes INTEGER NOT NULL DEFAULT 0 CHECK (approved_boxes >= 0),
    dispatched_boxes INTEGER NOT NULL DEFAULT 0 CHECK (dispatched_boxes >= 0),
    received_boxes INTEGER NOT NULL DEFAULT 0 CHECK (received_boxes >= 0),
    divergence_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_transfer_product UNIQUE (transfer_id, product_id),
    CONSTRAINT uq_transfer_item_id_transfer UNIQUE (id, transfer_id),
    CONSTRAINT uq_transfer_item_id_product UNIQUE (id, product_id),
    CONSTRAINT chk_transfer_item_quantities CHECK (
        approved_boxes <= requested_boxes AND
        dispatched_boxes <= approved_boxes
    )
);

-- 4. Alocações Físicas de Lotes na Origem com Integridade de Produto e Unidade
CREATE TABLE public.transfer_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_item_id UUID NOT NULL,
    transfer_id UUID NOT NULL,
    lot_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    product_id UUID NOT NULL,
    allocated_boxes INTEGER NOT NULL CHECK (allocated_boxes > 0),
    allocated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    -- Vínculo estrito com o item da transferência
    CONSTRAINT fk_alloc_item FOREIGN KEY (transfer_item_id, transfer_id) 
        REFERENCES public.transfer_items(id, transfer_id) ON DELETE RESTRICT,
    
    -- Vínculo com a unidade do lote
    CONSTRAINT fk_alloc_lot_unit FOREIGN KEY (lot_id, unit_id) 
        REFERENCES public.inventory_lots(id, unit_id) ON DELETE RESTRICT,
    
    -- Garantia Fiduciária 1: O produto do lote deve ser IDÊNTICO ao produto do item solicitado
    CONSTRAINT fk_alloc_lot_product FOREIGN KEY (lot_id, product_id) 
        REFERENCES public.inventory_lots(id, product_id) ON DELETE RESTRICT,
    CONSTRAINT fk_alloc_item_product FOREIGN KEY (transfer_item_id, product_id) 
        REFERENCES public.transfer_items(id, product_id) ON DELETE RESTRICT
);

-- 5. Tratamento de Divergências, Faltas e Sobras Físicas em Quarentena
CREATE TYPE public.divergence_type_enum AS ENUM (
    'SHORTAGE',             -- Falta de caixas no recebimento
    'EXCESS',               -- Sobra física de caixas no recebimento
    'DAMAGED_IN_TRANSIT'    -- Dano ocorrido durante o trajeto
);

CREATE TYPE public.quarantine_status_enum AS ENUM (
    'PENDING_AUTHORIZATION',  -- Em quarentena aguardando decisão gerencial
    'AUTHORIZED_INCORPORATED',-- Incorporado ao estoque regular após aprovação
    'REJECTED_RETURNED',      -- Devolvido à unidade de origem
    'WRITTEN_OFF'             -- Descartado por avaria total
);

CREATE TABLE public.transfer_divergences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE RESTRICT,
    transfer_item_id UUID NOT NULL REFERENCES public.transfer_items(id) ON DELETE RESTRICT,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT, -- Unidade que detectou (destino)
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    divergence_type public.divergence_type_enum NOT NULL,
    expected_boxes INTEGER NOT NULL CHECK (expected_boxes >= 0),
    received_boxes INTEGER NOT NULL CHECK (received_boxes >= 0),
    divergence_boxes INTEGER NOT NULL CHECK (divergence_boxes > 0),
    quarantine_sector_id UUID REFERENCES public.sectors(id) ON DELETE RESTRICT, -- Obrigatório para sobras
    quarantine_status public.quarantine_status_enum NOT NULL DEFAULT 'PENDING_AUTHORIZATION',
    reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    CONSTRAINT chk_divergence_boxes_calc CHECK (
        (divergence_type = 'SHORTAGE' AND expected_boxes > received_boxes AND divergence_boxes = (expected_boxes - received_boxes)) OR
        (divergence_type = 'EXCESS' AND received_boxes > expected_boxes AND divergence_boxes = (received_boxes - expected_boxes)) OR
        (divergence_type = 'DAMAGED_IN_TRANSIT')
    )
);

-- Índices de Performance
CREATE INDEX idx_transfers_source_dest ON public.transfers(source_unit_id, destination_unit_id, status);
CREATE INDEX idx_transfer_items_transfer ON public.transfer_items(transfer_id);
CREATE INDEX idx_allocations_item ON public.transfer_allocations(transfer_item_id);
CREATE INDEX idx_divergences_transfer ON public.transfer_divergences(transfer_id, quarantine_status);
