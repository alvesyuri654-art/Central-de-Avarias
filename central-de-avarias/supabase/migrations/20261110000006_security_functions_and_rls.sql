-- ==============================================================================
-- CENTRAL DE AVARIAS - MIGRATION 06: Security Functions, NF-e Mod11 & Strict RLS
-- ==============================================================================

-- 1. Função de Validação do Dígito Verificador da Chave de Acesso da NF-e (Módulo 11 SEFAZ)
CREATE OR REPLACE FUNCTION public.validate_nfe_access_key_mod11(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
STABLE
AS $$
DECLARE
    v_clean_key TEXT;
    v_sum INTEGER := 0;
    v_weight INTEGER := 2;
    v_remainder INTEGER;
    v_expected_digit INTEGER;
    v_actual_digit INTEGER;
    i INTEGER;
BEGIN
    v_clean_key := regexp_replace(p_key, '[^0-9]', '', 'g');
    
    IF length(v_clean_key) <> 44 THEN
        RETURN FALSE;
    END IF;

    -- Ponderação Módulo 11 (pesos de 2 a 9 da direita para a esquerda nos primeiros 43 dígitos)
    FOR i IN REVERSE 43..1 LOOP
        v_sum := v_sum + (substring(v_clean_key from i for 1)::INTEGER * v_weight);
        v_weight := v_weight + 1;
        IF v_weight > 9 THEN
            v_weight := 2;
        END IF;
    END LOOP;

    v_remainder := v_sum % 11;
    IF v_remainder = 0 OR v_remainder = 1 THEN
        v_expected_digit := 0;
    ELSE
        v_expected_digit := 11 - v_remainder;
    END IF;

    v_actual_digit := substring(v_clean_key from 44 for 1)::INTEGER;

    RETURN v_expected_digit = v_actual_digit;
END;
$$;

-- 2. Funções Auxiliares de Segurança (SECURITY DEFINER com search_path seguro)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() 
          AND global_role = 'SUPERADMIN' 
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.is_corporate_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() 
          AND global_role IN ('SUPERADMIN', 'CORPORATE_MANAGER') 
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_authorized_units()
RETURNS TABLE (unit_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    -- Gestores corporativos e superadmins visualizam todas as unidades ativas
    SELECT u.id 
    FROM public.units u
    WHERE u.is_active = TRUE
      AND public.is_corporate_manager() = TRUE
    UNION
    -- Usuários operacionais visualizam exclusivamente unidades vinculadas
    SELECT up.unit_id 
    FROM public.unit_permissions up
    JOIN public.profiles p ON p.id = up.profile_id
    WHERE up.profile_id = auth.uid() 
      AND p.is_active = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.has_unit_permission(
    p_unit_id UUID,
    p_permission_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_has_perm BOOLEAN := FALSE;
BEGIN
    IF public.is_superadmin() THEN
        RETURN TRUE;
    END IF;

    -- Avaliação estática pura sem SQL dinâmico
    SELECT 
        CASE p_permission_name
            WHEN 'can_import_invoices'   THEN up.can_import_invoices
            WHEN 'can_request_transfers' THEN up.can_request_transfers
            WHEN 'can_approve_transfers' THEN up.can_approve_transfers
            WHEN 'can_dispatch_transfers'THEN up.can_dispatch_transfers
            WHEN 'can_receive_transfers' THEN up.can_receive_transfers
            ELSE FALSE
        END
    INTO v_has_perm
    FROM public.unit_permissions up
    JOIN public.profiles p ON p.id = up.profile_id
    WHERE up.profile_id = auth.uid() 
      AND up.unit_id = p_unit_id
      AND p.is_active = TRUE;

    RETURN COALESCE(v_has_perm, FALSE);
END;
$$;

-- Permissões explícitas de execução
REVOKE ALL ON FUNCTION public.validate_nfe_access_key_mod11(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_nfe_access_key_mod11(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

REVOKE ALL ON FUNCTION public.is_corporate_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_corporate_manager() TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_authorized_units() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_authorized_units() TO authenticated;

REVOKE ALL ON FUNCTION public.has_unit_permission(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_unit_permission(UUID, TEXT) TO authenticated;

-- ==============================================================================
-- 3. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ==============================================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_divergences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Políticas de Consulta (SELECT)
-- ------------------------------------------------------------------------------

CREATE POLICY "companies_select_policy" ON public.companies
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "units_select_policy" ON public.units
    FOR SELECT TO authenticated 
    USING (id IN (SELECT unit_id FROM public.get_user_authorized_units()));

CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated 
    USING (id = auth.uid() OR public.is_corporate_manager());

CREATE POLICY "unit_permissions_select_policy" ON public.unit_permissions
    FOR SELECT TO authenticated 
    USING (profile_id = auth.uid() OR public.is_corporate_manager());

CREATE POLICY "sectors_select_policy" ON public.sectors
    FOR SELECT TO authenticated 
    USING (unit_id IN (SELECT unit_id FROM public.get_user_authorized_units()));

CREATE POLICY "products_select_policy" ON public.products
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "product_aliases_select_policy" ON public.product_aliases
    FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "invoices_select_policy" ON public.invoices
    FOR SELECT TO authenticated 
    USING (unit_id IN (SELECT unit_id FROM public.get_user_authorized_units()));

CREATE POLICY "invoice_items_select_policy" ON public.invoice_items
    FOR SELECT TO authenticated 
    USING (invoice_id IN (
        SELECT id FROM public.invoices 
        WHERE unit_id IN (SELECT unit_id FROM public.get_user_authorized_units())
    ));

CREATE POLICY "inventory_lots_select_policy" ON public.inventory_lots
    FOR SELECT TO authenticated 
    USING (unit_id IN (SELECT unit_id FROM public.get_user_authorized_units()));

CREATE POLICY "stock_reservations_select_policy" ON public.stock_reservations
    FOR SELECT TO authenticated 
    USING (unit_id IN (SELECT unit_id FROM public.get_user_authorized_units()));

CREATE POLICY "stock_movements_select_policy" ON public.stock_movements
    FOR SELECT TO authenticated 
    USING (unit_id IN (SELECT unit_id FROM public.get_user_authorized_units()));

CREATE POLICY "stock_balances_select_policy" ON public.stock_balances
    FOR SELECT TO authenticated 
    USING (unit_id IN (SELECT unit_id FROM public.get_user_authorized_units()));

CREATE POLICY "transfers_select_policy" ON public.transfers
    FOR SELECT TO authenticated 
    USING (
        source_unit_id IN (SELECT unit_id FROM public.get_user_authorized_units())
        OR destination_unit_id IN (SELECT unit_id FROM public.get_user_authorized_units())
    );

CREATE POLICY "transfer_items_select_policy" ON public.transfer_items
    FOR SELECT TO authenticated 
    USING (transfer_id IN (
        SELECT id FROM public.transfers 
        WHERE source_unit_id IN (SELECT unit_id FROM public.get_user_authorized_units())
           OR destination_unit_id IN (SELECT unit_id FROM public.get_user_authorized_units())
    ));

CREATE POLICY "transfer_allocations_select_policy" ON public.transfer_allocations
    FOR SELECT TO authenticated 
    USING (unit_id IN (SELECT unit_id FROM public.get_user_authorized_units()));

CREATE POLICY "transfer_divergences_select_policy" ON public.transfer_divergences
    FOR SELECT TO authenticated 
    USING (unit_id IN (SELECT unit_id FROM public.get_user_authorized_units()));

CREATE POLICY "transfer_status_history_select_policy" ON public.transfer_status_history
    FOR SELECT TO authenticated 
    USING (unit_id IN (SELECT unit_id FROM public.get_user_authorized_units()));

CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT TO authenticated 
    USING (public.is_corporate_manager() OR unit_id IN (SELECT unit_id FROM public.get_user_authorized_units()));

-- ------------------------------------------------------------------------------
-- Políticas de Bloqueio Estrito de Mutações Diretas no Cliente (Defense-in-Depth)
-- Mutações ocorrem EXCLUSIVAMENTE via RPCs Transacionais seguras
-- ------------------------------------------------------------------------------

CREATE POLICY "block_client_insert_lots" ON public.inventory_lots FOR INSERT TO authenticated WITH CHECK (FALSE);
CREATE POLICY "block_client_update_lots" ON public.inventory_lots FOR UPDATE TO authenticated USING (FALSE);
CREATE POLICY "block_client_delete_lots" ON public.inventory_lots FOR DELETE TO authenticated USING (FALSE);

CREATE POLICY "block_client_insert_movs" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (FALSE);
CREATE POLICY "block_client_update_movs" ON public.stock_movements FOR UPDATE TO authenticated USING (FALSE);
CREATE POLICY "block_client_delete_movs" ON public.stock_movements FOR DELETE TO authenticated USING (FALSE);

CREATE POLICY "block_client_insert_bals" ON public.stock_balances FOR INSERT TO authenticated WITH CHECK (FALSE);
CREATE POLICY "block_client_update_bals" ON public.stock_balances FOR UPDATE TO authenticated USING (FALSE);
CREATE POLICY "block_client_delete_bals" ON public.stock_balances FOR DELETE TO authenticated USING (FALSE);

CREATE POLICY "block_client_insert_res" ON public.stock_reservations FOR INSERT TO authenticated WITH CHECK (FALSE);
CREATE POLICY "block_client_update_res" ON public.stock_reservations FOR UPDATE TO authenticated USING (FALSE);
CREATE POLICY "block_client_delete_res" ON public.stock_reservations FOR DELETE TO authenticated USING (FALSE);

CREATE POLICY "block_client_insert_trf" ON public.transfers FOR INSERT TO authenticated WITH CHECK (FALSE);
CREATE POLICY "block_client_update_trf" ON public.transfers FOR UPDATE TO authenticated USING (FALSE);
CREATE POLICY "block_client_delete_trf" ON public.transfers FOR DELETE TO authenticated USING (FALSE);
