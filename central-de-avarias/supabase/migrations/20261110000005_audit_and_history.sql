-- ==============================================================================
-- CENTRAL DE AVARIAS - MIGRATION 05: Audit Logs & Transfer Status History
-- ==============================================================================

-- 1. Histórico Dedicado de Transições de Status de Transferências
CREATE TABLE public.transfer_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE RESTRICT,
    from_status public.transfer_status_enum,
    to_status public.transfer_status_enum NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Contém itens, divergências, caixas
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Trilha de Auditoria Forense do Sistema
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    unit_id UUID REFERENCES public.units(id) ON DELETE RESTRICT,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'RPC_CALL'
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Gatilhos de Proteção contra Modificação em Tabelas Imutáveis
CREATE OR REPLACE FUNCTION public.fn_prevent_mutation_immutable_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Operação proibida: registros nesta tabela são estritamente imutáveis (append-only).';
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_immutable_transfer_history
    BEFORE UPDATE OR DELETE ON public.transfer_status_history
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_immutable_tables();

CREATE TRIGGER trg_immutable_audit_logs
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_immutable_tables();

CREATE TRIGGER trg_immutable_stock_movements
    BEFORE UPDATE OR DELETE ON public.stock_movements
    FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_mutation_immutable_tables();

-- Índices de Performance
CREATE INDEX idx_transfer_history_transfer ON public.transfer_status_history(transfer_id, created_at DESC);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC);
