-- ==============================================================================
-- CENTRAL DE AVARIAS - MIGRATION 07: Atomic Transactional Engine (RPCs)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- HELPER INTERNO: Aplicação Fiduciária de Movimentação Física e Projeção
-- Executado exclusivamente pelas RPCs transacionais de negócio
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.internal_apply_physical_movement(
    p_unit_id UUID,
    p_lot_id UUID,
    p_product_id UUID,
    p_sector_id UUID,
    p_movement_type public.stock_movement_type_enum,
    p_quantity_boxes INTEGER, -- Positivo (entrada) ou Negativo (saída)
    p_reference_id UUID,
    p_reference_type VARCHAR(50),
    p_reason TEXT,
    p_user_id UUID
)
RETURNS INTEGER -- Retorna o novo saldo físico do lote
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_new_lot_balance INTEGER;
BEGIN
    -- 1. Atualiza o saldo físico do lote (inventory_lots)
    UPDATE public.inventory_lots
    SET current_boxes = current_boxes + p_quantity_boxes,
        updated_at = timezone('utc', now())
    WHERE id = p_lot_id AND unit_id = p_unit_id
    RETURNING current_boxes INTO v_new_lot_balance;

    IF v_new_lot_balance < 0 THEN
        RAISE EXCEPTION 'Violação fiduciária: movimentação resultaria em saldo físico negativo no lote %.', p_lot_id;
    END IF;

    -- 2. Insere no Livro-Razão Imutável (stock_movements)
    INSERT INTO public.stock_movements (
        unit_id,
        lot_id,
        product_id,
        sector_id,
        movement_type,
        quantity_boxes,
        balance_after_boxes,
        reference_id,
        reference_type,
        reason,
        created_by,
        created_at
    ) VALUES (
        p_unit_id,
        p_lot_id,
        p_product_id,
        p_sector_id,
        p_movement_type,
        p_quantity_boxes,
        v_new_lot_balance,
        p_reference_id,
        p_reference_type,
        p_reason,
        p_user_id,
        timezone('utc', now())
    );

    -- 3. Atualiza a Projeção de Leitura Rápida (stock_balances)
    INSERT INTO public.stock_balances (
        unit_id,
        product_id,
        sector_id,
        physical_boxes,
        reserved_boxes,
        in_transit_boxes,
        last_movement_at,
        updated_at
    ) VALUES (
        p_unit_id,
        p_product_id,
        p_sector_id,
        p_quantity_boxes,
        0,
        0,
        timezone('utc', now()),
        timezone('utc', now())
    )
    ON CONFLICT (unit_id, product_id, sector_id)
    DO UPDATE SET
        physical_boxes = public.stock_balances.physical_boxes + p_quantity_boxes,
        last_movement_at = timezone('utc', now()),
        updated_at = timezone('utc', now());

    RETURN v_new_lot_balance;
END;
$$;

-- ==============================================================================
-- RPC 1: Confirmação Atômica de Entrada de Nota Fiscal (DANFE)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_confirm_invoice_entry(
    p_invoice_id UUID,
    p_sector_id UUID,
    p_items_mapping JSONB -- Array de objetos: [{ "item_id": "...", "product_id": "...", "converted_boxes": 10, "lot_number": "...", "expiration_date": "..." }]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invoice RECORD;
    v_user_id UUID := auth.uid();
    v_elem JSONB;
    v_item_id UUID;
    v_product_id UUID;
    v_boxes INTEGER;
    v_lot_number VARCHAR(100);
    v_exp_date DATE;
    v_new_lot_id UUID;
    v_total_boxes INTEGER := 0;
BEGIN
    -- Validação de Autenticação
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: usuário não autenticado.';
    END IF;

    -- Bloqueio da Nota Fiscal com Lock de Linha (Impede confirmações simultâneas idempotentes)
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nota Fiscal não encontrada.';
    END IF;

    IF v_invoice.status <> 'PENDING_CONFERENCE' THEN
        RAISE EXCEPTION 'Apenas notas fiscais com status PENDING_CONFERENCE podem ser confirmadas. Status atual: %', v_invoice.status;
    END IF;

    -- Validação de Permissão na Unidade da Nota
    IF NOT public.has_unit_permission(v_invoice.unit_id, 'can_import_invoices') THEN
        RAISE EXCEPTION 'Usuário não possui permissão para importar notas na unidade correspondente.';
    END IF;

    -- Validação do Setor (Deve pertencer à mesma unidade da nota)
    IF NOT EXISTS (
        SELECT 1 FROM public.sectors 
        WHERE id = p_sector_id AND unit_id = v_invoice.unit_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Setor de armazenamento inválido ou inativo para a unidade da nota fiscal.';
    END IF;

    -- Processa cada item conferido
    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items_mapping)
    LOOP
        v_item_id := (v_elem->>'item_id')::UUID;
        v_product_id := (v_elem->>'product_id')::UUID;
        v_boxes := (v_elem->>'converted_boxes')::INTEGER;
        v_lot_number := v_elem->>'lot_number';
        v_exp_date := (v_elem->>'expiration_date')::DATE;

        IF v_boxes <= 0 THEN
            RAISE EXCEPTION 'A quantidade convertida em caixas deve ser maior que zero para todos os itens.';
        END IF;

        -- Valida se o item pertence à nota fiscal
        IF NOT EXISTS (
            SELECT 1 FROM public.invoice_items 
            WHERE id = v_item_id AND invoice_id = p_invoice_id
        ) THEN
            RAISE EXCEPTION 'O item % não pertence à nota fiscal informada.', v_item_id;
        END IF;

        -- Valida se o produto existe e está ativo
        IF NOT EXISTS (
            SELECT 1 FROM public.products 
            WHERE id = v_product_id AND is_active = TRUE
        ) THEN
            RAISE EXCEPTION 'Produto % não cadastrado ou inativo.', v_product_id;
        END IF;

        -- 1. Atualiza o item da nota com o produto vinculado e a quantidade de caixas
        UPDATE public.invoice_items
        SET product_id = v_product_id,
            converted_boxes = v_boxes,
            is_matched = TRUE
        WHERE id = v_item_id;

        -- 2. Cria o lote físico no setor indicado
        INSERT INTO public.inventory_lots (
            unit_id,
            sector_id,
            product_id,
            invoice_id,
            invoice_item_id,
            origin_unit_id,
            lot_number,
            expiration_date,
            initial_boxes,
            current_boxes,
            reserved_boxes
        ) VALUES (
            v_invoice.unit_id,
            p_sector_id,
            v_product_id,
            p_invoice_id,
            v_item_id,
            v_invoice.unit_id,
            v_lot_number,
            v_exp_date,
            v_boxes,
            0, -- Será incrementado pela função de movimentação física
            0
        )
        RETURNING id INTO v_new_lot_id;

        -- 3. Aplica movimentação física no ledger e atualiza projeção
        PERFORM public.internal_apply_physical_movement(
            v_invoice.unit_id,
            v_new_lot_id,
            v_product_id,
            p_sector_id,
            'INVOICE_ENTRY',
            v_boxes,
            p_invoice_id,
            'invoices',
            'Entrada inicial por conferência física de NF-e ' || v_invoice.invoice_number,
            v_user_id
        );

        v_total_boxes := v_total_boxes + v_boxes;
    END LOOP;

    -- 4. Transiciona status da Nota Fiscal para CONFIRMED
    UPDATE public.invoices
    SET status = 'CONFIRMED',
        confirmed_by = v_user_id,
        confirmed_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    WHERE id = p_invoice_id;

    -- 5. Registro de Auditoria
    INSERT INTO public.audit_logs (
        user_id,
        unit_id,
        table_name,
        record_id,
        action,
        new_data
    ) VALUES (
        v_user_id,
        v_invoice.unit_id,
        'invoices',
        p_invoice_id,
        'RPC_CALL',
        jsonb_build_object(
            'rpc', 'rpc_confirm_invoice_entry',
            'total_boxes', v_total_boxes,
            'confirmed_at', timezone('utc', now())
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'invoice_id', p_invoice_id,
        'total_boxes_received', v_total_boxes,
        'status', 'CONFIRMED'
    );
END;
$$;

-- ==============================================================================
-- RPC 2: Solicitação de Transferência (Iniciada pelo Destino)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_request_transfer(
    p_destination_unit_id UUID,
    p_source_unit_id UUID,
    p_items JSONB, -- Array: [{ "product_id": "...", "requested_boxes": 20 }]
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_transfer_id UUID;
    v_code VARCHAR(30);
    v_elem JSONB;
    v_prod_id UUID;
    v_req_boxes INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Acesso negado: usuário não autenticado.';
    END IF;

    IF p_destination_unit_id = p_source_unit_id THEN
        RAISE EXCEPTION 'A unidade de destino deve ser diferente da unidade de origem.';
    END IF;

    IF NOT public.has_unit_permission(p_destination_unit_id, 'can_request_transfers') THEN
        RAISE EXCEPTION 'Usuário não possui autorização para solicitar transferências para esta unidade.';
    END IF;

    v_code := 'TRF-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' || substring(gen_random_uuid()::text from 1 for 6);

    INSERT INTO public.transfers (
        transfer_code,
        source_unit_id,
        destination_unit_id,
        status,
        requested_by,
        requested_at,
        notes
    ) VALUES (
        v_code,
        p_source_unit_id,
        p_destination_unit_id,
        'REQUESTED',
        v_user_id,
        timezone('utc', now()),
        p_notes
    )
    RETURNING id INTO v_transfer_id;

    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := (v_elem->>'product_id')::UUID;
        v_req_boxes := (v_elem->>'requested_boxes')::INTEGER;

        IF v_req_boxes <= 0 THEN
            RAISE EXCEPTION 'A quantidade solicitada deve ser superior a zero.';
        END IF;

        INSERT INTO public.transfer_items (
            transfer_id,
            product_id,
            requested_boxes
        ) VALUES (
            v_transfer_id,
            v_prod_id,
            v_req_boxes
        );
    END LOOP;

    INSERT INTO public.transfer_status_history (
        transfer_id,
        from_status,
        to_status,
        changed_by,
        unit_id,
        reason,
        metadata
    ) VALUES (
        v_transfer_id,
        NULL,
        'REQUESTED',
        v_user_id,
        p_destination_unit_id,
        'Solicitação de transferência gerada pela filial de destino',
        jsonb_build_object('items', p_items)
    );

    RETURN jsonb_build_object('success', TRUE, 'transfer_id', v_transfer_id, 'transfer_code', v_code);
END;
$$;

-- ==============================================================================
-- RPC 3: Aprovação de Transferência (Pela Origem)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_approve_transfer(
    p_transfer_id UUID,
    p_approved_items JSONB, -- Array: [{ "item_id": "...", "approved_boxes": 15 }]
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_trf RECORD;
    v_elem JSONB;
    v_item_id UUID;
    v_app_boxes INTEGER;
    v_req_boxes INTEGER;
BEGIN
    SELECT * INTO v_trf FROM public.transfers WHERE id = p_transfer_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Transferência não encontrada.'; END IF;

    IF v_trf.status <> 'REQUESTED' THEN
        RAISE EXCEPTION 'Apenas transferências no status REQUESTED podem ser aprovadas. Status atual: %', v_trf.status;
    END IF;

    IF NOT public.has_unit_permission(v_trf.source_unit_id, 'can_approve_transfers') THEN
        RAISE EXCEPTION 'Usuário não possui permissão para aprovar transferências na unidade de origem.';
    END IF;

    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_approved_items)
    LOOP
        v_item_id := (v_elem->>'item_id')::UUID;
        v_app_boxes := (v_elem->>'approved_boxes')::INTEGER;

        SELECT requested_boxes INTO v_req_boxes 
        FROM public.transfer_items 
        WHERE id = v_item_id AND transfer_id = p_transfer_id;

        IF v_app_boxes < 0 OR v_app_boxes > v_req_boxes THEN
            RAISE EXCEPTION 'Quantidade aprovada (%) inválida para o item % (solicitado: %).', v_app_boxes, v_item_id, v_req_boxes;
        END IF;

        UPDATE public.transfer_items
        SET approved_boxes = v_app_boxes
        WHERE id = v_item_id;
    END LOOP;

    UPDATE public.transfers
    SET status = 'APPROVED',
        approved_by = v_user_id,
        approved_at = timezone('utc', now()),
        notes = coalesce(p_notes, notes),
        updated_at = timezone('utc', now())
    WHERE id = p_transfer_id;

    INSERT INTO public.transfer_status_history (
        transfer_id, from_status, to_status, changed_by, unit_id, reason, metadata
    ) VALUES (
        p_transfer_id, 'REQUESTED', 'APPROVED', v_user_id, v_trf.source_unit_id,
        'Transferência aprovada pela unidade de origem', p_approved_items
    );

    RETURN jsonb_build_object('success', TRUE, 'transfer_id', p_transfer_id, 'status', 'APPROVED');
END;
$$;

-- ==============================================================================
-- RPC 4: Alocação Física e Reserva de Caixas (SELECT FOR UPDATE)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_allocate_and_reserve(
    p_transfer_id UUID,
    p_allocations JSONB -- Array: [{ "item_id": "...", "lot_id": "...", "boxes": 10 }]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_trf RECORD;
    v_elem JSONB;
    v_item_id UUID;
    v_lot_id UUID;
    v_boxes INTEGER;
    v_lot RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_trf FROM public.transfers WHERE id = p_transfer_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Transferência não encontrada.'; END IF;

    IF v_trf.status NOT IN ('APPROVED', 'PICKING') THEN
        RAISE EXCEPTION 'Apenas transferências APPROVED ou PICKING podem alocar materiais.';
    END IF;

    IF NOT public.has_unit_permission(v_trf.source_unit_id, 'can_dispatch_transfers') THEN
        RAISE EXCEPTION 'Usuário sem autorização de separação/expedição na unidade de origem.';
    END IF;

    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_item_id := (v_elem->>'item_id')::UUID;
        v_lot_id := (v_elem->>'lot_id')::UUID;
        v_boxes := (v_elem->>'boxes')::INTEGER;

        IF v_boxes <= 0 THEN RAISE EXCEPTION 'Quantidade alocada deve ser maior que zero.'; END IF;

        -- Valida item da transferência
        SELECT * INTO v_item FROM public.transfer_items WHERE id = v_item_id AND transfer_id = p_transfer_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Item de transferência % inválido.', v_item_id; END IF;

        -- Lock de Linha Exclusivo no Lote Físico
        SELECT * INTO v_lot 
        FROM public.inventory_lots 
        WHERE id = v_lot_id AND unit_id = v_trf.source_unit_id 
        FOR UPDATE;

        IF NOT FOUND THEN RAISE EXCEPTION 'Lote % não encontrado na unidade de origem.', v_lot_id; END IF;

        -- Validação de Produto
        IF v_lot.product_id <> v_item.product_id THEN
            RAISE EXCEPTION 'Incompatibilidade: O produto do lote % não corresponde ao produto do item solicitado.', v_lot_id;
        END IF;

        -- Validação de Saldo Disponível (current_boxes - reserved_boxes)
        IF (v_lot.current_boxes - v_lot.reserved_boxes) < v_boxes THEN
            RAISE EXCEPTION 'Saldo insuficiente no lote %. Disponível: %, Solicitado: %', 
                v_lot_id, (v_lot.current_boxes - v_lot.reserved_boxes), v_boxes;
        END IF;

        -- 1. Incrementa a reserva no lote
        UPDATE public.inventory_lots
        SET reserved_boxes = reserved_boxes + v_boxes,
            updated_at = timezone('utc', now())
        WHERE id = v_lot_id;

        -- 2. Insere registro de reserva na tabela dedicada stock_reservations
        INSERT INTO public.stock_reservations (
            lot_id,
            unit_id,
            product_id,
            transfer_id,
            reserved_boxes,
            status,
            created_by
        ) VALUES (
            v_lot_id,
            v_trf.source_unit_id,
            v_lot.product_id,
            p_transfer_id,
            v_boxes,
            'ACTIVE',
            v_user_id
        );

        -- 3. Atualiza projeção de reserva em stock_balances
        UPDATE public.stock_balances
        SET reserved_boxes = reserved_boxes + v_boxes,
            updated_at = timezone('utc', now())
        WHERE unit_id = v_trf.source_unit_id 
          AND product_id = v_lot.product_id 
          AND sector_id = v_lot.sector_id;

        -- 4. Grava alocação na transferência
        INSERT INTO public.transfer_allocations (
            transfer_item_id,
            transfer_id,
            lot_id,
            unit_id,
            product_id,
            allocated_boxes,
            allocated_by
        ) VALUES (
            v_item_id,
            p_transfer_id,
            v_lot_id,
            v_trf.source_unit_id,
            v_lot.product_id,
            v_boxes,
            v_user_id
        );
    END LOOP;

    -- Atualiza status para PICKING
    UPDATE public.transfers
    SET status = 'PICKING',
        updated_at = timezone('utc', now())
    WHERE id = p_transfer_id;

    RETURN jsonb_build_object('success', TRUE, 'transfer_id', p_transfer_id, 'status', 'PICKING');
END;
$$;

-- ==============================================================================
-- RPC 5: Expedição / Despacho de Transferência
-- Baixa física definitiva na origem e entrada em trânsito no destino
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_dispatch_transfer(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_trf RECORD;
    v_alloc RECORD;
    v_item RECORD;
    v_total_allocated INTEGER;
BEGIN
    SELECT * INTO v_trf FROM public.transfers WHERE id = p_transfer_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Transferência não encontrada.'; END IF;

    IF v_trf.status <> 'PICKING' THEN
        RAISE EXCEPTION 'Apenas transferências no status PICKING podem ser despachadas. Status atual: %', v_trf.status;
    END IF;

    IF NOT public.has_unit_permission(v_trf.source_unit_id, 'can_dispatch_transfers') THEN
        RAISE EXCEPTION 'Usuário sem permissão para despachar transferências na unidade de origem.';
    END IF;

    -- Validação: Todos os itens aprovados devem estar 100% alocados
    FOR v_item IN SELECT * FROM public.transfer_items WHERE transfer_id = p_transfer_id
    LOOP
        SELECT COALESCE(SUM(allocated_boxes), 0) INTO v_total_allocated
        FROM public.transfer_allocations
        WHERE transfer_item_id = v_item.id;

        IF v_total_allocated <> v_item.approved_boxes THEN
            RAISE EXCEPTION 'Item % possui alocação incompleta (% de % caixas aprovadas).', 
                v_item.id, v_total_allocated, v_item.approved_boxes;
        END IF;

        UPDATE public.transfer_items 
        SET dispatched_boxes = v_total_allocated 
        WHERE id = v_item.id;
    END LOOP;

    -- Processa a saída física definitiva de cada lote alocado
    FOR v_alloc IN 
        SELECT ta.*, il.sector_id 
        FROM public.transfer_allocations ta
        JOIN public.inventory_lots il ON il.id = ta.lot_id
        WHERE ta.transfer_id = p_transfer_id
    LOOP
        -- 1. Libera a reserva (pois agora é saída física definitiva)
        UPDATE public.inventory_lots
        SET reserved_boxes = reserved_boxes - v_alloc.allocated_boxes
        WHERE id = v_alloc.lot_id;

        UPDATE public.stock_balances
        SET reserved_boxes = reserved_boxes - v_alloc.allocated_boxes
        WHERE unit_id = v_trf.source_unit_id 
          AND product_id = v_alloc.product_id 
          AND sector_id = v_alloc.sector_id;

        UPDATE public.stock_reservations
        SET status = 'DISPATCHED',
            released_at = timezone('utc', now())
        WHERE transfer_id = p_transfer_id AND lot_id = v_alloc.lot_id AND status = 'ACTIVE';

        -- 2. Aplica baixa física no ledger da origem (TRANSFER_OUT)
        PERFORM public.internal_apply_physical_movement(
            v_trf.source_unit_id,
            v_alloc.lot_id,
            v_alloc.product_id,
            v_alloc.sector_id,
            'TRANSFER_OUT',
            -v_alloc.allocated_boxes, -- Negativo
            p_transfer_id,
            'transfers',
            'Expedição de transferência ' || v_trf.transfer_code,
            v_user_id
        );

        -- 3. Registra quantidade em trânsito no destino (sem criar lote físico ainda)
        -- Trânsito é projetado em stock_balances da unidade de destino
        INSERT INTO public.stock_balances (
            unit_id, product_id, sector_id, physical_boxes, reserved_boxes, in_transit_boxes, last_movement_at, updated_at
        )
        SELECT v_trf.destination_unit_id, v_alloc.product_id, s.id, 0, 0, v_alloc.allocated_boxes, timezone('utc', now()), timezone('utc', now())
        FROM public.sectors s
        WHERE s.unit_id = v_trf.destination_unit_id AND s.is_active = TRUE
        LIMIT 1
        ON CONFLICT (unit_id, product_id, sector_id)
        DO UPDATE SET
            in_transit_boxes = public.stock_balances.in_transit_boxes + v_alloc.allocated_boxes,
            updated_at = timezone('utc', now());
    END LOOP;

    -- 4. Transiciona status para IN_TRANSIT
    UPDATE public.transfers
    SET status = 'IN_TRANSIT',
        dispatched_by = v_user_id,
        dispatched_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    WHERE id = p_transfer_id;

    INSERT INTO public.transfer_status_history (
        transfer_id, from_status, to_status, changed_by, unit_id, reason
    ) VALUES (
        p_transfer_id, 'PICKING', 'IN_TRANSIT', v_user_id, v_trf.source_unit_id,
        'Carga despachada da unidade de origem; materiais em trânsito rodoviário'
    );

    RETURN jsonb_build_object('success', TRUE, 'transfer_id', p_transfer_id, 'status', 'IN_TRANSIT');
END;
$$;

-- ==============================================================================
-- RPC 6: Recebimento e Conferência Física no Destino (com Quarentena de Sobras)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_receive_transfer(
    p_transfer_id UUID,
    p_received_items JSONB, -- Array: [{ "item_id": "...", "received_boxes": 12, "destination_sector_id": "...", "quarantine_sector_id": "..." }]
    p_divergence_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_trf RECORD;
    v_elem JSONB;
    v_item_id UUID;
    v_rec_boxes INTEGER;
    v_dest_sector_id UUID;
    v_quar_sector_id UUID;
    v_item RECORD;
    v_alloc RECORD;
    v_parent_lot RECORD;
    v_new_lot_id UUID;
    v_has_divergence BOOLEAN := FALSE;
    v_regular_boxes INTEGER;
    v_excess_boxes INTEGER;
BEGIN
    SELECT * INTO v_trf FROM public.transfers WHERE id = p_transfer_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Transferência não encontrada.'; END IF;

    IF v_trf.status <> 'IN_TRANSIT' THEN
        RAISE EXCEPTION 'Apenas transferências no status IN_TRANSIT podem ser recebidas. Status atual: %', v_trf.status;
    END IF;

    IF NOT public.has_unit_permission(v_trf.destination_unit_id, 'can_receive_transfers') THEN
        RAISE EXCEPTION 'Usuário sem permissão para receber transferências na unidade de destino.';
    END IF;

    FOR v_elem IN SELECT * FROM jsonb_array_elements(p_received_items)
    LOOP
        v_item_id := (v_elem->>'item_id')::UUID;
        v_rec_boxes := (v_elem->>'received_boxes')::INTEGER;
        v_dest_sector_id := (v_elem->>'destination_sector_id')::UUID;
        v_quar_sector_id := (v_elem->>'quarantine_sector_id')::UUID;

        IF v_rec_boxes < 0 THEN RAISE EXCEPTION 'Quantidade recebida não pode ser negativa.'; END IF;

        SELECT * INTO v_item FROM public.transfer_items WHERE id = v_item_id AND transfer_id = p_transfer_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'Item de transferência % inválido.', v_item_id; END IF;

        -- Valida se o setor de destino pertence à unidade de destino
        IF NOT EXISTS (
            SELECT 1 FROM public.sectors WHERE id = v_dest_sector_id AND unit_id = v_trf.destination_unit_id AND is_active = TRUE
        ) THEN
            RAISE EXCEPTION 'Setor de destino % inválido para a unidade receptora.', v_dest_sector_id;
        END IF;

        -- Atualiza quantidade recebida no item
        UPDATE public.transfer_items 
        SET received_boxes = v_rec_boxes,
            divergence_notes = p_divergence_notes
        WHERE id = v_item_id;

        -- Baixa trânsito de stock_balances no destino
        UPDATE public.stock_balances
        SET in_transit_boxes = GREATEST(0, in_transit_boxes - v_item.dispatched_boxes),
            updated_at = timezone('utc', now())
        WHERE unit_id = v_trf.destination_unit_id AND product_id = v_item.product_id;

        -- Busca lote de origem alocado para rastreabilidade genealógica
        SELECT il.* INTO v_parent_lot
        FROM public.transfer_allocations ta
        JOIN public.inventory_lots il ON il.id = ta.lot_id
        WHERE ta.transfer_item_id = v_item_id
        LIMIT 1;

        -- Tratamento Fiduciário de Quantidades: Normal vs Falta vs Sobra
        IF v_rec_boxes > v_item.dispatched_boxes THEN
            -- SOBRA FÍSICA: 10 regulares entram no estoque, 2 excedentes vão para quarentena
            v_has_divergence := TRUE;
            v_regular_boxes := v_item.dispatched_boxes;
            v_excess_boxes := v_rec_boxes - v_item.dispatched_boxes;

            IF v_quar_sector_id IS NULL THEN
                RAISE EXCEPTION 'Setor de quarentena é obrigatório para registrar sobra física de caixas.';
            END IF;

            -- Registra a divergência de excesso
            INSERT INTO public.transfer_divergences (
                transfer_id, transfer_item_id, unit_id, product_id, divergence_type,
                expected_boxes, received_boxes, divergence_boxes, quarantine_sector_id,
                quarantine_status, reported_by, reported_at, resolution_notes
            ) VALUES (
                p_transfer_id, v_item_id, v_trf.destination_unit_id, v_item.product_id, 'EXCESS',
                v_item.dispatched_boxes, v_rec_boxes, v_excess_boxes, v_quar_sector_id,
                'PENDING_AUTHORIZATION', v_user_id, timezone('utc', now()), p_divergence_notes
            );
        ELSIF v_rec_boxes < v_item.dispatched_boxes THEN
            -- FALTA FÍSICA: entra apenas o recebido real
            v_has_divergence := TRUE;
            v_regular_boxes := v_rec_boxes;

            INSERT INTO public.transfer_divergences (
                transfer_id, transfer_item_id, unit_id, product_id, divergence_type,
                expected_boxes, received_boxes, divergence_boxes, quarantine_status,
                reported_by, reported_at, resolution_notes
            ) VALUES (
                p_transfer_id, v_item_id, v_trf.destination_unit_id, v_item.product_id, 'SHORTAGE',
                v_item.dispatched_boxes, v_rec_boxes, (v_item.dispatched_boxes - v_rec_boxes),
                'PENDING_AUTHORIZATION', v_user_id, timezone('utc', now()), p_divergence_notes
            );
        ELSE
            -- RECEBIMENTO INTEGRAL PERFEITO
            v_regular_boxes := v_rec_boxes;
        END IF;

        -- Criação do Lote Físico no Destino com Genealogia Documental (se regular_boxes > 0)
        IF v_regular_boxes > 0 THEN
            INSERT INTO public.inventory_lots (
                unit_id,
                sector_id,
                product_id,
                invoice_id,
                invoice_item_id,
                parent_lot_id,
                origin_unit_id,
                transfer_id,
                lot_number,
                manufacturing_date,
                expiration_date,
                initial_boxes,
                current_boxes,
                reserved_boxes
            ) VALUES (
                v_trf.destination_unit_id,
                v_dest_sector_id,
                v_item.product_id,
                v_parent_lot.invoice_id,
                v_parent_lot.invoice_item_id,
                v_parent_lot.id,
                v_trf.source_unit_id,
                p_transfer_id,
                v_parent_lot.lot_number,
                v_parent_lot.manufacturing_date,
                v_parent_lot.expiration_date,
                v_regular_boxes,
                0, -- Atualizado pela movimentação física
                0
            )
            RETURNING id INTO v_new_lot_id;

            -- Entrada física no livro-razão de destino (TRANSFER_IN)
            PERFORM public.internal_apply_physical_movement(
                v_trf.destination_unit_id,
                v_new_lot_id,
                v_item.product_id,
                v_dest_sector_id,
                'TRANSFER_IN',
                v_regular_boxes,
                p_transfer_id,
                'transfers',
                'Recebimento confirmado de transferência ' || v_trf.transfer_code,
                v_user_id
            );
        END IF;
    END LOOP;

    -- Define status final: RECEIVED_COMPLETE ou RECEIVED_WITH_DIVERGENCE
    UPDATE public.transfers
    SET status = CASE WHEN v_has_divergence THEN 'RECEIVED_WITH_DIVERGENCE'::public.transfer_status_enum 
                      ELSE 'RECEIVED_COMPLETE'::public.transfer_status_enum END,
        received_by = v_user_id,
        received_at = timezone('utc', now()),
        notes = coalesce(p_divergence_notes, notes),
        updated_at = timezone('utc', now())
    WHERE id = p_transfer_id;

    INSERT INTO public.transfer_status_history (
        transfer_id, from_status, to_status, changed_by, unit_id, reason, metadata
    ) VALUES (
        p_transfer_id, 'IN_TRANSIT', 
        CASE WHEN v_has_divergence THEN 'RECEIVED_WITH_DIVERGENCE' ELSE 'RECEIVED_COMPLETE' END,
        v_user_id, v_trf.destination_unit_id,
        CASE WHEN v_has_divergence THEN 'Recebimento concluído com divergência registrada' 
             ELSE 'Recebimento integral sem divergências' END,
        p_received_items
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'transfer_id', p_transfer_id,
        'has_divergence', v_has_divergence,
        'status', CASE WHEN v_has_divergence THEN 'RECEIVED_WITH_DIVERGENCE' ELSE 'RECEIVED_COMPLETE' END
    );
END;
$$;

-- ==============================================================================
-- RPC 7: Cancelamento de Transferência (com Estorno Automático de Reservas)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_cancel_transfer(
    p_transfer_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_trf RECORD;
    v_res RECORD;
BEGIN
    SELECT * INTO v_trf FROM public.transfers WHERE id = p_transfer_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Transferência não encontrada.'; END IF;

    IF v_trf.status NOT IN ('REQUESTED', 'APPROVED', 'PICKING') THEN
        RAISE EXCEPTION 'Não é permitido cancelar transferência despachada ou concluída. Status atual: %', v_trf.status;
    END IF;

    -- Se estava em fase de separação, estorna todas as reservas ativas
    IF v_trf.status = 'PICKING' THEN
        FOR v_res IN 
            SELECT * FROM public.stock_reservations 
            WHERE transfer_id = p_transfer_id AND status = 'ACTIVE'
        LOOP
            UPDATE public.inventory_lots
            SET reserved_boxes = reserved_boxes - v_res.reserved_boxes
            WHERE id = v_res.lot_id;

            UPDATE public.stock_balances
            SET reserved_boxes = reserved_boxes - v_res.reserved_boxes
            WHERE unit_id = v_res.unit_id AND product_id = v_res.product_id;

            UPDATE public.stock_reservations
            SET status = 'RELEASED_CANCELLED',
                released_at = timezone('utc', now()),
                release_reason = p_reason
            WHERE id = v_res.id;
        END LOOP;
    END IF;

    UPDATE public.transfers
    SET status = 'CANCELLED',
        notes = coalesce(notes || ' | Cancelado: ' || p_reason, 'Cancelado: ' || p_reason),
        updated_at = timezone('utc', now())
    WHERE id = p_transfer_id;

    INSERT INTO public.transfer_status_history (
        transfer_id, from_status, to_status, changed_by, unit_id, reason
    ) VALUES (
        p_transfer_id, v_trf.status, 'CANCELLED', v_user_id, v_trf.source_unit_id, p_reason
    );

    RETURN jsonb_build_object('success', TRUE, 'transfer_id', p_transfer_id, 'status', 'CANCELLED');
END;
$$;

-- ==============================================================================
-- RPC 8: Ajuste Compensatório de Inventário (Positivo ou Negativo Auditado)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_inventory_adjustment(
    p_unit_id UUID,
    p_lot_id UUID,
    p_boxes INTEGER, -- Positivo ou Negativo
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_lot RECORD;
    v_mov_type public.stock_movement_type_enum;
    v_new_bal INTEGER;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Acesso negado: usuário não autenticado.'; END IF;
    IF p_boxes = 0 THEN RAISE EXCEPTION 'Quantidade de ajuste não pode ser zero.'; END IF;
    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'Justificativa do ajuste inventarial é obrigatória (mínimo 5 caracteres).';
    END IF;

    IF NOT public.has_unit_permission(p_unit_id, 'can_import_invoices') AND NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Usuário sem autorização para realizar ajustes de inventário nesta unidade.';
    END IF;

    SELECT * INTO v_lot FROM public.inventory_lots WHERE id = p_lot_id AND unit_id = p_unit_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lote não encontrado na unidade informada.'; END IF;

    IF p_boxes < 0 AND (v_lot.current_boxes - v_lot.reserved_boxes + p_boxes) < 0 THEN
        RAISE EXCEPTION 'Ajuste negativo excede o saldo disponível do lote.';
    END IF;

    v_mov_type := CASE WHEN p_boxes > 0 THEN 'INVENTORY_ADJUSTMENT_POS'::public.stock_movement_type_enum 
                       ELSE 'INVENTORY_ADJUSTMENT_NEG'::public.stock_movement_type_enum END;

    v_new_bal := public.internal_apply_physical_movement(
        p_unit_id,
        p_lot_id,
        v_lot.product_id,
        v_lot.sector_id,
        v_mov_type,
        p_boxes,
        p_lot_id,
        'adjustments',
        p_reason,
        v_user_id
    );

    RETURN jsonb_build_object('success', TRUE, 'lot_id', p_lot_id, 'new_balance', v_new_bal);
END;
$$;

-- ==============================================================================
-- RPC 9: Baixa por Descarte de Avaria Irreparável (Write-Off)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.rpc_write_off(
    p_unit_id UUID,
    p_lot_id UUID,
    p_boxes INTEGER,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_lot RECORD;
    v_new_bal INTEGER;
BEGIN
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Acesso negado: usuário não autenticado.'; END IF;
    IF p_boxes <= 0 THEN RAISE EXCEPTION 'Quantidade de descarte deve ser maior que zero.'; END IF;
    IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'Motivo do descarte / laudo técnico é obrigatório.';
    END IF;

    SELECT * INTO v_lot FROM public.inventory_lots WHERE id = p_lot_id AND unit_id = p_unit_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Lote não encontrado na unidade.'; END IF;

    IF (v_lot.current_boxes - v_lot.reserved_boxes) < p_boxes THEN
        RAISE EXCEPTION 'Quantidade de descarte excede o saldo disponível do lote.';
    END IF;

    v_new_bal := public.internal_apply_physical_movement(
        p_unit_id,
        p_lot_id,
        v_lot.product_id,
        v_lot.sector_id,
        'WRITE_OFF',
        -p_boxes,
        p_lot_id,
        'write_offs',
        'Descarte / destruição de avaria: ' || p_reason,
        v_user_id
    );

    RETURN jsonb_build_object('success', TRUE, 'lot_id', p_lot_id, 'new_balance', v_new_bal);
END;
$$;
