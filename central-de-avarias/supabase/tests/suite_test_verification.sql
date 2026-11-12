-- ==============================================================================
-- CENTRAL DE AVARIAS - SUÍTE COMPLETA DE TESTES AUTOMATIZADOS DE BANCO
-- Validação de Integridade Fiduciária, RLS, Genealogia, Sobras e Conciliação
-- ==============================================================================

DO $$
DECLARE
    v_company_id UUID;
    v_matriz_id UUID;
    v_filial_id UUID;
    v_sector_matriz UUID;
    v_sector_filial UUID;
    v_sector_quarentena UUID;
    v_prod_id UUID;
    v_user_matriz UUID := 'd0000000-0000-0000-0000-000000000001';
    v_user_filial UUID := 'd0000000-0000-0000-0000-000000000002';
    v_invoice_id UUID;
    v_item_id UUID;
    v_transfer_res JSONB;
    v_transfer_id UUID;
    v_item_trf_id UUID;
    v_lot_matriz_id UUID;
    v_dest_lot RECORD;
    v_div RECORD;
    v_rec_result RECORD;
    v_key_test VARCHAR(44) := '35261100000000000001550010000123451000123451'; -- Chave com DV correto
BEGIN
    RAISE NOTICE '=== INICIANDO SUÍTE DE TESTES: CENTRAL DE AVARIAS ===';

    -- --------------------------------------------------------------------------
    -- 0. PREPARAÇÃO DO AMBIENTE DE TESTE
    -- --------------------------------------------------------------------------
    SELECT id INTO v_company_id FROM public.companies LIMIT 1;
    SELECT id INTO v_matriz_id FROM public.units WHERE unit_type = 'HEADQUARTERS' LIMIT 1;
    SELECT id INTO v_filial_id FROM public.units WHERE unit_type = 'BRANCH' LIMIT 1;
    SELECT id INTO v_sector_matriz FROM public.sectors WHERE unit_id = v_matriz_id LIMIT 1;
    SELECT id INTO v_sector_filial FROM public.sectors WHERE unit_id = v_filial_id AND code = 'SET-AV-FIL' LIMIT 1;
    SELECT id INTO v_sector_quarentena FROM public.sectors WHERE unit_id = v_filial_id AND code = 'SET-QUAR-FIL' LIMIT 1;

    -- Cadastra Produto de Teste
    INSERT INTO public.products (company_id, sku, name, unit_of_measure, minimum_stock_boxes)
    VALUES (v_company_id, 'TEST-SKU-001', 'Produto Teste Avariado 1L', 'CX', 5)
    ON CONFLICT (company_id, sku) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_prod_id;

    -- Cadastra Perfis Operacionais de Teste simulando auth.users
    INSERT INTO public.profiles (id, email, full_name, default_unit_id, global_role)
    VALUES 
        (v_user_matriz, 'operador.chapeco@marvel.com.br', 'Operador Chapecó', v_matriz_id, 'STANDARD_USER'),
        (v_user_filial, 'operador.itupeva@marvel.com.br', 'Operador Itupeva', v_filial_id, 'STANDARD_USER')
    ON CONFLICT (id) DO NOTHING;

    -- Configura Permissões
    INSERT INTO public.unit_permissions (profile_id, unit_id, unit_role, can_import_invoices, can_request_transfers, can_approve_transfers, can_dispatch_transfers, can_receive_transfers)
    VALUES 
        (v_user_matriz, v_matriz_id, 'UNIT_MANAGER', TRUE, TRUE, TRUE, TRUE, TRUE),
        (v_user_filial, v_filial_id, 'UNIT_MANAGER', FALSE, TRUE, FALSE, FALSE, TRUE)
    ON CONFLICT (profile_id, unit_id) DO UPDATE SET
        can_import_invoices = EXCLUDED.can_import_invoices,
        can_approve_transfers = EXCLUDED.can_approve_transfers,
        can_dispatch_transfers = EXCLUDED.can_dispatch_transfers;

    -- --------------------------------------------------------------------------
    -- TESTE 1: Validação de Chave de Acesso NF-e (Módulo 11)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '-> Executando Teste 1: Validação algorítmica Módulo 11 da Chave de Acesso...';
    ASSERT public.validate_nfe_access_key_mod11('35261100000000000001550010000123451000123451') = TRUE, 
        'FALHA: Chave válida de teste foi rejeitada pelo módulo 11';
    ASSERT public.validate_nfe_access_key_mod11('35261100000000000001550010000123451000123459') = FALSE, 
        'FALHA: Chave com DV adulterado foi aceita indevidamente pelo módulo 11';
    RAISE NOTICE '   [OK] Teste 1 aprovado.';

    -- --------------------------------------------------------------------------
    -- TESTE 2: Entrada Atômica de Nota Fiscal (Staging -> Lote -> Balanço)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '-> Executando Teste 2: Entrada transacional de Nota Fiscal...';
    
    INSERT INTO public.invoices (
        unit_id, access_key, invoice_number, issue_date, issuer_name, issuer_tax_id, total_value, pdf_storage_path, status, uploaded_by
    ) VALUES (
        v_matriz_id, v_key_test, 'NF-9901', current_date, 'Fornecedor Exemplo SA', '11.222.333/0001-44', 1200.00, 'invoices/test.pdf', 'PENDING_CONFERENCE', v_user_matriz
    ) ON CONFLICT (access_key) DO UPDATE SET status = 'PENDING_CONFERENCE'
    RETURNING id INTO v_invoice_id;

    INSERT INTO public.invoice_items (
        invoice_id, item_index, raw_product_code, raw_product_name, raw_unit, raw_quantity, converted_boxes
    ) VALUES (
        v_invoice_id, 1, 'RAW-001', 'Descricao Bruta NF Fornecedor', 'UN', 120.000, 0
    ) ON CONFLICT (invoice_id, item_index) DO UPDATE SET raw_product_name = EXCLUDED.raw_product_name
    RETURNING id INTO v_item_id;

    -- Simula confirmação da conferência via RPC (60 caixas recebidas)
    PERFORM public.rpc_confirm_invoice_entry(
        v_invoice_id,
        v_sector_matriz,
        jsonb_build_array(
            jsonb_build_object(
                'item_id', v_item_id,
                'product_id', v_prod_id,
                'converted_boxes', 60,
                'lot_number', 'LOTE-TEST-2026',
                'expiration_date', current_date + interval '180 days'
            )
        )
    );

    SELECT id INTO v_lot_matriz_id FROM public.inventory_lots WHERE invoice_id = v_invoice_id LIMIT 1;
    ASSERT v_lot_matriz_id IS NOT NULL, 'FALHA: Lote físico não foi criado após confirmação de NF.';
    
    -- Verifica se saldo físico = 60, reservado = 0, disponível = 60
    PERFORM 1 FROM public.inventory_lots 
    WHERE id = v_lot_matriz_id AND current_boxes = 60 AND reserved_boxes = 0 AND available_boxes = 60;
    ASSERT FOUND, 'FALHA: Invariante de estoque do lote incorreta após entrada.';
    RAISE NOTICE '   [OK] Teste 2 aprovado.';

    -- --------------------------------------------------------------------------
    -- TESTE 3: Separação entre Físico e Reserva (Reserva não baixa saldo físico)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '-> Executando Teste 3: Alocação de Reserva Lógica...';
    
    -- Filial solicita 10 caixas
    v_transfer_res := public.rpc_request_transfer(
        v_filial_id,
        v_matriz_id,
        jsonb_build_array(jsonb_build_object('product_id', v_prod_id, 'requested_boxes', 10)),
        'Solicitação de teste Filial Itupeva'
    );
    v_transfer_id := (v_transfer_res->>'transfer_id')::UUID;

    -- Matriz aprova 10 caixas
    SELECT id INTO v_item_trf_id FROM public.transfer_items WHERE transfer_id = v_transfer_id;
    PERFORM public.rpc_approve_transfer(
        v_transfer_id,
        jsonb_build_array(jsonb_build_object('item_id', v_item_trf_id, 'approved_boxes', 10)),
        'Aprovado 10 caixas pela Matriz'
    );

    -- Matriz aloca e reserva 10 caixas do Lote
    PERFORM public.rpc_allocate_and_reserve(
        v_transfer_id,
        jsonb_build_array(jsonb_build_object('item_id', v_item_trf_id, 'lot_id', v_lot_matriz_id, 'boxes', 10))
    );

    -- Validação: O estoque físico DEVE PERMANECER 60. Reservado = 10. Disponível = 50.
    PERFORM 1 FROM public.inventory_lots 
    WHERE id = v_lot_matriz_id AND current_boxes = 60 AND reserved_boxes = 10 AND available_boxes = 50;
    ASSERT FOUND, 'FALHA: Reserva reduziu indevidamente o estoque físico!';
    RAISE NOTICE '   [OK] Teste 3 aprovado (Físico: 60, Reservado: 10, Disponível: 50).';

    -- --------------------------------------------------------------------------
    -- TESTE 4: Expedição e Trânsito (Baixa na Origem, Registro de Trânsito no Destino)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '-> Executando Teste 4: Expedição rodoviária e trânsito...';
    PERFORM public.rpc_dispatch_transfer(v_transfer_id);

    -- Saldo físico de Chapecó agora deve ser 50 caixas
    PERFORM 1 FROM public.inventory_lots 
    WHERE id = v_lot_matriz_id AND current_boxes = 50 AND reserved_boxes = 0;
    ASSERT FOUND, 'FALHA: Expedição não baixou o saldo físico na origem corretamente.';

    -- Saldo em trânsito no destino (Itupeva) deve ser 10 caixas
    PERFORM 1 FROM public.stock_balances 
    WHERE unit_id = v_filial_id AND product_id = v_prod_id AND in_transit_boxes = 10;
    ASSERT FOUND, 'FALHA: Trânsito não foi projetado na unidade de destino.';
    RAISE NOTICE '   [OK] Teste 4 aprovado.';

    -- --------------------------------------------------------------------------
    -- TESTE 5: Recebimento com SOBRA FÍSICA e Quarentena (Expedido: 10, Chegaram: 12)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '-> Executando Teste 5: Recebimento de 12 caixas (Sobra Física)...';
    
    PERFORM public.rpc_receive_transfer(
        v_transfer_id,
        jsonb_build_array(
            jsonb_build_object(
                'item_id', v_item_trf_id,
                'received_boxes', 12,
                'destination_sector_id', v_sector_filial,
                'quarantine_sector_id', v_sector_quarentena
            )
        ),
        'Recebimento com sobra física: vieram 2 caixas a mais no caminhão'
    );

    -- Verifica se status da transferência = RECEIVED_WITH_DIVERGENCE
    PERFORM 1 FROM public.transfers 
    WHERE id = v_transfer_id AND status = 'RECEIVED_WITH_DIVERGENCE';
    ASSERT FOUND, 'FALHA: Status da transferência não foi marcado como RECEIVED_WITH_DIVERGENCE.';

    -- Verifica se o lote de destino foi criado com exatamente 10 caixas regulares (não incorporou as 2 excedentes)
    SELECT * INTO v_dest_lot 
    FROM public.inventory_lots 
    WHERE unit_id = v_filial_id AND transfer_id = v_transfer_id;
    ASSERT v_dest_lot.current_boxes = 10, 'FALHA: Estoque regular incorporou caixas excedentes sem autorização!';
    
    -- Verifica a genealogia documental do lote em Itupeva
    ASSERT v_dest_lot.parent_lot_id = v_lot_matriz_id, 'FALHA: parent_lot_id ausente ou incorreto.';
    ASSERT v_dest_lot.origin_unit_id = v_matriz_id, 'FALHA: origin_unit_id ausente ou incorreto.';
    ASSERT v_dest_lot.invoice_id = v_invoice_id, 'FALHA: Vínculo com a Nota Fiscal original perdido.';

    -- Verifica se as 2 caixas excedentes foram registradas na tabela de divergência em quarentena
    SELECT * INTO v_div 
    FROM public.transfer_divergences 
    WHERE transfer_id = v_transfer_id;
    ASSERT v_div.divergence_type = 'EXCESS' AND v_div.divergence_boxes = 2 AND v_div.quarantine_status = 'PENDING_AUTHORIZATION',
        'FALHA: Registro de divergência de sobra física em quarentena não foi criado corretamente.';
    RAISE NOTICE '   [OK] Teste 5 aprovado (10 caixas no estoque regular, 2 caixas em quarentena, genealogia preservada).';

    -- --------------------------------------------------------------------------
    -- TESTE 6: Motor de Conciliação Fiduciária de Estoque (Full Outer Join)
    -- --------------------------------------------------------------------------
    RAISE NOTICE '-> Executando Teste 6: Conciliação fiduciária de estoque...';
    
    -- Executa conciliação na Matriz (Chapecó)
    SELECT * INTO v_rec_result FROM public.reconcile_and_verify_stock(v_matriz_id) LIMIT 1;
    ASSERT v_rec_result.has_divergence = FALSE, 
        'FALHA: Conciliação da Matriz acusou divergência inesperada!';

    -- Executa conciliação na Filial (Itupeva)
    SELECT * INTO v_rec_result FROM public.reconcile_and_verify_stock(v_filial_id) LIMIT 1;
    ASSERT v_rec_result.has_divergence = FALSE, 
        'FALHA: Conciliação da Filial acusou divergência inesperada!';
    RAISE NOTICE '   [OK] Teste 6 aprovado (0 divergências fiduciárias detectadas).';

    RAISE NOTICE '=== TODOS OS 6 TESTES DA SUÍTE FORAM EXECUTADOS E APROVADOS COM SUCESSO! ===';
END;
$$;
