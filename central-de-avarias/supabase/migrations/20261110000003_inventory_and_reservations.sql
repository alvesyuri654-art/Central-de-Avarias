-- ==============================================================================
-- CENTRAL DE AVARIAS - MIGRATION 03: Inventory Lots, Reservations & Physical Ledger
-- ==============================================================================

-- 1. Lotes Físicos de Avaria (Fonte de Verdade do Estoque Físico)
CREATE TABLE public.inventory_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    sector_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    
    -- Vínculo Documental Obrigatório com a Nota Fiscal e Item
    invoice_id UUID NOT NULL,
    invoice_item_id UUID NOT NULL,
    
    -- Rastreabilidade Genealógica (Transf. Matriz -> Filial)
    parent_lot_id UUID REFERENCES public.inventory_lots(id) ON DELETE RESTRICT,
    origin_unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    transfer_id UUID, -- Referência à transferência quando originado por remessa
    
    -- Controle Estrito em Caixas Inteiras
    lot_number VARCHAR(100),
    manufacturing_date DATE,
    expiration_date DATE,
    initial_boxes INTEGER NOT NULL CHECK (initial_boxes > 0),
    current_boxes INTEGER NOT NULL CHECK (current_boxes >= 0),
    reserved_boxes INTEGER NOT NULL DEFAULT 0 CHECK (reserved_boxes >= 0),
    available_boxes INTEGER GENERATED ALWAYS AS (current_boxes - reserved_boxes) STORED,
    box_condition_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    
    -- Invariante de Saldo: Caixas reservadas nunca ultrapassam o saldo físico
    CONSTRAINT chk_lot_boxes_consistency CHECK (current_boxes >= reserved_boxes),
    
    -- Integridade Referencial Composta: Setor deve pertencer à mesma unidade do lote
    CONSTRAINT fk_lot_sector_same_unit FOREIGN KEY (sector_id, unit_id) 
        REFERENCES public.sectors(id, unit_id) ON DELETE RESTRICT,
    
    -- Integridade Referencial Composta: Nota fiscal deve pertencer à mesma unidade
    CONSTRAINT fk_lot_invoice_same_unit FOREIGN KEY (invoice_id, unit_id) 
        REFERENCES public.invoices(id, unit_id) ON DELETE RESTRICT,
    
    -- Integridade Referencial Composta: Item deve pertencer à mesma nota fiscal
    CONSTRAINT fk_lot_invoice_item FOREIGN KEY (invoice_item_id, invoice_id) 
        REFERENCES public.invoice_items(id, invoice_id) ON DELETE RESTRICT,
    
    -- Chaves Compostas para travamento de integridade externa
    CONSTRAINT uq_lot_id_unit_id UNIQUE (id, unit_id),
    CONSTRAINT uq_lot_id_product_id UNIQUE (id, product_id)
);

-- 2. Tabela Dedicada de Reservas de Estoque (Separação entre Físico e Reserva Lógica)
CREATE TABLE public.stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID NOT NULL,
    unit_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    transfer_id UUID, -- Vínculo opcional ou direto à transferência
    reserved_boxes INTEGER NOT NULL CHECK (reserved_boxes > 0),
    status VARCHAR(25) NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'DISPATCHED', 'RELEASED_CANCELLED')),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    released_at TIMESTAMPTZ,
    release_reason TEXT,
    CONSTRAINT fk_reservation_lot FOREIGN KEY (lot_id, unit_id) 
        REFERENCES public.inventory_lots(id, unit_id) ON DELETE RESTRICT
);

-- 3. Tipos de Movimentação Exclusivamente Física (Ledger Imutável)
CREATE TYPE public.stock_movement_type_enum AS ENUM (
    'INVOICE_ENTRY',            -- Entrada inicial via conferência de NF-e
    'TRANSFER_OUT',             -- Saída física definitiva por expedição
    'TRANSFER_IN',              -- Entrada física por recebimento confirmado
    'INVENTORY_ADJUSTMENT_POS', -- Ajuste físico positivo inventariado
    'INVENTORY_ADJUSTMENT_NEG', -- Ajuste físico negativo inventariado
    'WRITE_OFF'                 -- Descarte / destruição de avaria irreparável
);

-- 4. Livro-Razão Físico (Append-Only)
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    lot_id UUID NOT NULL REFERENCES public.inventory_lots(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    sector_id UUID NOT NULL,
    movement_type public.stock_movement_type_enum NOT NULL,
    quantity_boxes INTEGER NOT NULL CHECK (quantity_boxes <> 0), -- Positivo ou Negativo
    balance_after_boxes INTEGER NOT NULL CHECK (balance_after_boxes >= 0),
    reference_id UUID NOT NULL,
    reference_type VARCHAR(50) NOT NULL, -- 'invoices', 'transfers', 'adjustments', 'write_offs'
    reason TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT fk_mov_sector_unit FOREIGN KEY (sector_id, unit_id) 
        REFERENCES public.sectors(id, unit_id) ON DELETE RESTRICT
);

-- 5. Projeção Agregada de Leitura Rápida (Saldos em Tempo Real)
CREATE TABLE public.stock_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    sector_id UUID NOT NULL,
    physical_boxes INTEGER NOT NULL DEFAULT 0 CHECK (physical_boxes >= 0),
    reserved_boxes INTEGER NOT NULL DEFAULT 0 CHECK (reserved_boxes >= 0),
    available_boxes INTEGER GENERATED ALWAYS AS (physical_boxes - reserved_boxes) STORED,
    in_transit_boxes INTEGER NOT NULL DEFAULT 0 CHECK (in_transit_boxes >= 0),
    last_movement_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_balance_unit_product_sector UNIQUE (unit_id, product_id, sector_id),
    CONSTRAINT fk_bal_sector_unit FOREIGN KEY (sector_id, unit_id) 
        REFERENCES public.sectors(id, unit_id) ON DELETE RESTRICT,
    CONSTRAINT chk_bal_phys_reserved CHECK (physical_boxes >= reserved_boxes)
);

-- Índices de Performance
CREATE INDEX idx_lots_unit_product ON public.inventory_lots(unit_id, product_id);
CREATE INDEX idx_lots_sector ON public.inventory_lots(sector_id);
CREATE INDEX idx_lots_parent_lot ON public.inventory_lots(parent_lot_id);
CREATE INDEX idx_reservations_lot_active ON public.stock_reservations(lot_id, status);
CREATE INDEX idx_movements_lot ON public.stock_movements(lot_id);
CREATE INDEX idx_movements_reference ON public.stock_movements(reference_id, reference_type);
CREATE INDEX idx_balances_unit_product ON public.stock_balances(unit_id, product_id);
