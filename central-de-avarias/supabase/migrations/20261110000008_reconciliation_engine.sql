-- ==============================================================================
-- CENTRAL DE AVARIAS - MIGRATION 08: Stock Reconciliation Engine (Full Outer Join)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_and_verify_stock(p_unit_id UUID)
RETURNS TABLE (
    unit_id UUID,
    product_id UUID,
    sector_id UUID,
    lots_physical_boxes BIGINT,
    balance_physical_boxes INTEGER,
    ledger_physical_boxes BIGINT,
    lots_reserved_boxes BIGINT,
    balance_reserved_boxes INTEGER,
    in_transit_boxes INTEGER,
    divergence_type TEXT,
    has_divergence BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- 1. Controle de Autorização: Usuário deve ter acesso à unidade solicitada
    IF NOT (
        p_unit_id IN (SELECT public.get_user_authorized_units())
        OR public.is_corporate_manager()
    ) THEN
        RAISE EXCEPTION 'Acesso negado: você não possui permissão para conciliar o estoque desta unidade.';
    END IF;

    -- 2. Conciliação Fiduciária Cruzada (Lotes vs Projeção vs Livro-Razão)
    RETURN QUERY
    WITH lot_agg AS (
        SELECT 
            il.unit_id,
            il.product_id,
            il.sector_id,
            COALESCE(SUM(il.current_boxes), 0) AS total_physical,
            COALESCE(SUM(il.reserved_boxes), 0) AS total_reserved
        FROM public.inventory_lots il
        WHERE il.unit_id = p_unit_id
        GROUP BY il.unit_id, il.product_id, il.sector_id
    ),
    ledger_agg AS (
        SELECT 
            sm.unit_id,
            sm.product_id,
            sm.sector_id,
            COALESCE(SUM(sm.quantity_boxes), 0) AS total_ledger
        FROM public.stock_movements sm
        WHERE sm.unit_id = p_unit_id
        GROUP BY sm.unit_id, sm.product_id, sm.sector_id
    ),
    balance_agg AS (
        SELECT 
            sb.unit_id,
            sb.product_id,
            sb.sector_id,
            sb.physical_boxes,
            sb.reserved_boxes,
            sb.in_transit_boxes
        FROM public.stock_balances sb
        WHERE sb.unit_id = p_unit_id
    )
    SELECT 
        COALESCE(l.unit_id, b.unit_id, m.unit_id) AS unit_id,
        COALESCE(l.product_id, b.product_id, m.product_id) AS product_id,
        COALESCE(l.sector_id, b.sector_id, m.sector_id) AS sector_id,
        COALESCE(l.total_physical, 0) AS lots_physical_boxes,
        COALESCE(b.physical_boxes, 0) AS balance_physical_boxes,
        COALESCE(m.total_ledger, 0) AS ledger_physical_boxes,
        COALESCE(l.total_reserved, 0) AS lots_reserved_boxes,
        COALESCE(b.reserved_boxes, 0) AS balance_reserved_boxes,
        COALESCE(b.in_transit_boxes, 0) AS in_transit_boxes,
        CASE 
            WHEN l.product_id IS NULL AND b.product_id IS NOT NULL THEN 'PROJECAO_SEM_LOTES'
            WHEN b.product_id IS NULL AND l.product_id IS NOT NULL THEN 'LOTES_SEM_PROJECAO'
            WHEN COALESCE(l.total_physical, 0) <> COALESCE(b.physical_boxes, 0) THEN 'DIVERGENCIA_FISICO_PROJECAO'
            WHEN COALESCE(l.total_physical, 0) <> COALESCE(m.total_ledger, 0) THEN 'DIVERGENCIA_FISICO_LEDGER'
            WHEN COALESCE(l.total_reserved, 0) <> COALESCE(b.reserved_boxes, 0) THEN 'DIVERGENCIA_RESERVAS'
            ELSE 'CONCILIADO'
        END AS divergence_type,
        (
            COALESCE(l.total_physical, 0) <> COALESCE(b.physical_boxes, 0) OR
            COALESCE(l.total_physical, 0) <> COALESCE(m.total_ledger, 0) OR
            COALESCE(l.total_reserved, 0) <> COALESCE(b.reserved_boxes, 0) OR
            (l.product_id IS NULL AND b.product_id IS NOT NULL) OR
            (b.product_id IS NULL AND l.product_id IS NOT NULL)
        ) AS has_divergence
    FROM lot_agg l
    FULL OUTER JOIN balance_agg b 
        ON b.unit_id = l.unit_id AND b.product_id = l.product_id AND b.sector_id = l.sector_id
    FULL OUTER JOIN ledger_agg m 
        ON m.unit_id = COALESCE(l.unit_id, b.unit_id) 
       AND m.product_id = COALESCE(l.product_id, b.product_id) 
       AND m.sector_id = COALESCE(l.sector_id, b.sector_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_and_verify_stock(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_and_verify_stock(UUID) TO authenticated;
