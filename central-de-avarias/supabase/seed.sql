-- ==============================================================================
-- CENTRAL DE AVARIAS - SEED INICIAL DE PRODUÇÃO / HOMOLOGAÇÃO
-- Carga declarativa das Unidades Iniciais sem dados cadastrais fictícios
-- ==============================================================================

-- 1. Empresa Principal (Controladora)
INSERT INTO public.companies (id, corporate_name, trade_name, tax_id, is_active)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Transportes Marvel Ltda',
    'Marvel Transportes',
    NULL, -- CNPJ oficial será configurado pelo administrador no painel
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- 2. Unidade MATRIZ: Chapecó / SC
INSERT INTO public.units (
    id,
    company_id,
    code,
    name,
    city,
    state,
    state_code,
    unit_type,
    tax_id,
    address,
    is_active
) VALUES (
    'u0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'MAT-SC-01',
    'Matriz Chapecó',
    'Chapecó',
    'Santa Catarina',
    'SC',
    'HEADQUARTERS',
    NULL, -- Sem CNPJ fictício
    NULL, -- Endereço preenchível pelo usuário
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- 3. Unidade FILIAL: Itupeva / SP
INSERT INTO public.units (
    id,
    company_id,
    code,
    name,
    city,
    state,
    state_code,
    unit_type,
    tax_id,
    address,
    is_active
) VALUES (
    'u0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'FIL-SP-01',
    'Filial Itupeva',
    'Itupeva',
    'São Paulo',
    'SP',
    'BRANCH',
    NULL, -- Sem CNPJ fictício
    NULL, -- Endereço preenchível pelo usuário
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- 4. Setores Físicos Iniciais da MATRIZ (Chapecó)
INSERT INTO public.sectors (id, unit_id, code, name, description, is_active)
VALUES 
    (
        's0000000-0000-0000-0000-000000000001',
        'u0000000-0000-0000-0000-000000000001',
        'SET-AV-GERAL',
        'Setor de Avarias Gerais - Pulmão',
        'Armazenamento principal de caixas avariadas na Matriz',
        TRUE
    ),
    (
        's0000000-0000-0000-0000-000000000002',
        'u0000000-0000-0000-0000-000000000001',
        'SET-QUAR-MAT',
        'Setor de Quarentena - Matriz',
        'Guarda de itens aguardando laudo pericial ou decisão de descarte',
        TRUE
    ),
    (
        's0000000-0000-0000-0000-000000000003',
        'u0000000-0000-0000-0000-000000000001',
        'SET-EXPED-MAT',
        'Doca de Expedição de Transferências',
        'Separação e conferência de cargas destinadas às filiais',
        TRUE
    )
ON CONFLICT (id) DO NOTHING;

-- 5. Setores Físicos Iniciais da FILIAL (Itupeva)
INSERT INTO public.sectors (id, unit_id, code, name, description, is_active)
VALUES 
    (
        's0000000-0000-0000-0000-000000000004',
        'u0000000-0000-0000-0000-000000000002',
        'SET-REC-FIL',
        'Recepção e Triagem de Devoluções',
        'Entrada inicial de devoluções de rota e transferências',
        TRUE
    ),
    (
        's0000000-0000-0000-0000-000000000005',
        'u0000000-0000-0000-0000-000000000002',
        'SET-QUAR-FIL',
        'Quarentena de Sobras e Divergências',
        'Isolamento obrigatório de sobras físicas até regularização gerencial',
        TRUE
    ),
    (
        's0000000-0000-0000-0000-000000000006',
        'u0000000-0000-0000-0000-000000000002',
        'SET-AV-FIL',
        'Estoque de Avarias Itupeva',
        'Armazenamento local de caixas para aproveitamento ou retorno',
        TRUE
    )
ON CONFLICT (id) DO NOTHING;
