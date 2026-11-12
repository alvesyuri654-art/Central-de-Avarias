/**
 * ==============================================================================
 * CENTRAL DE AVARIAS — CLIENT APPLICATION ENGINE (SPA NATIVA)
 * ==============================================================================
 * Versão 3.0 — Estrutura Simplificada & Direcionada à Operação Real
 * ==============================================================================
 * 1. Torre de Controle
 * 2. Estoque (com Entrada Manual e sem exigência de Catálogo/SKU)
 * 3. Entrada de NF-e (Extração inteligente direta para estoque)
 * 4. Transferências (Entre Matriz e Filiais)
 * 5. Movimentações (Livro-Razão Fiduciário Completo)
 * 6. Administração (Unidades & Filiais com Cadastrar, Editar, Excluir e Inativar)
 * 7. Configurações
 * ==============================================================================
 */

(function () {
  'use strict';

  // --- SEED DE DADOS INICIAIS ---
  const INITIAL_DATA = {
    version: 3,
    activeUnitId: 'u0000000-0000-0000-0000-000000000001', // Chapecó (Matriz)
    currentUser: {
      id: 'd0000000-0000-0000-0000-000000000001',
      name: 'Yuri Alves (Operador Master)',
      email: 'yuri.alves@marvel.com.br',
      role: 'SUPERADMIN'
    },
    units: [
      {
        id: 'u0000000-0000-0000-0000-000000000001',
        code: 'MAT-SC-01',
        name: 'Matriz Chapecó',
        city: 'Chapecó',
        state_code: 'SC',
        unit_type: 'HEADQUARTERS',
        tax_id: null,
        address: 'Distrito Industrial, Chapecó - SC',
        is_active: true
      },
      {
        id: 'u0000000-0000-0000-0000-000000000002',
        code: 'FIL-SP-01',
        name: 'Filial Itupeva',
        city: 'Itupeva',
        state_code: 'SP',
        unit_type: 'BRANCH',
        tax_id: null,
        address: 'Polo Logístico Rod. dos Bandeirantes, Itupeva - SP',
        is_active: true
      }
    ],
    // Registro técnico automático para identificação e histórico de itens
    item_registry: [
      { item_id: 'it-01', description: 'Leite Integral Pasteurizado 1L', normalized_description: 'LEITE INTEGRAL PASTEURIZADO 1L', raw_unit: 'CX', unit_price: 48.50, created_at: '2026-10-20T08:30:00Z' },
      { item_id: 'it-02', description: 'Hambúrguer Bovino 56g (Cx c/ 36)', normalized_description: 'HAMBURGUER BOVINO 56G (CX C/ 36)', raw_unit: 'CX', unit_price: 115.00, created_at: '2026-10-24T09:15:00Z' },
      { item_id: 'it-03', description: 'Óleo de Soja Refinado 900ml', normalized_description: 'OLEO DE SOJA REFINADO 900ML', raw_unit: 'CX', unit_price: 85.00, created_at: '2026-10-28T14:20:00Z' },
      { item_id: 'it-04', description: 'Queijo Mussarela Fatiado 1kg', normalized_description: 'QUEIJO MUSSARELA FATIADO 1KG', raw_unit: 'CX', unit_price: 38.90, created_at: '2026-11-02T11:00:00Z' },
      { item_id: 'it-05', description: 'Iogurte Integral Morango 170g', normalized_description: 'IOGURTE INTEGRAL MORANGO 170G', raw_unit: 'CX', unit_price: null, created_at: '2026-11-08T16:00:00Z' }
    ],
    // Lotes de estoque com descrição e preços diretamente armazenados
    lots: [
      {
        id: 'lot-01',
        unit_id: 'u0000000-0000-0000-0000-000000000001', // Chapecó
        item_id: 'it-01',
        description: 'Leite Integral Pasteurizado 1L',
        lot_number: 'LOTE-2026-CH01',
        initial_boxes: 60,
        current_boxes: 60,
        reserved_boxes: 0,
        unit_price: 48.50,
        invoice_number: '12480',
        issuer_name: 'Laticínios Aurora Alimentos',
        origin_location: 'Planta Laticínios Sul',
        created_at: '2026-11-06T08:30:00Z'
      },
      {
        id: 'lot-02',
        unit_id: 'u0000000-0000-0000-0000-000000000001', // Chapecó
        item_id: 'it-02',
        description: 'Hambúrguer Bovino 56g (Cx c/ 36)',
        lot_number: 'LOTE-2026-CH02',
        initial_boxes: 35,
        current_boxes: 35,
        reserved_boxes: 0,
        unit_price: 115.00,
        invoice_number: '12485',
        issuer_name: 'Frigorífico Central',
        origin_location: 'Frigorífico Central',
        created_at: '2026-11-07T09:15:00Z'
      },
      {
        id: 'lot-03',
        unit_id: 'u0000000-0000-0000-0000-000000000001', // Chapecó
        item_id: 'it-04',
        description: 'Queijo Mussarela Fatiado 1kg',
        lot_number: 'LOTE-2026-CH03',
        initial_boxes: 25,
        current_boxes: 25,
        reserved_boxes: 0,
        unit_price: 38.90,
        invoice_number: '12460',
        issuer_name: 'Cooperativa Láctea Sul',
        origin_location: 'Cooperativa Sul',
        created_at: '2026-11-08T11:00:00Z'
      },
      {
        id: 'lot-04',
        unit_id: 'u0000000-0000-0000-0000-000000000002', // Itupeva
        item_id: 'it-03',
        description: 'Óleo de Soja Refinado 900ml',
        lot_number: 'LOTE-2026-IT01',
        initial_boxes: 40,
        current_boxes: 40,
        reserved_boxes: 0,
        unit_price: 85.00,
        invoice_number: '12440',
        issuer_name: 'Refinaria Sudeste S.A.',
        origin_location: 'Refinaria Sudeste',
        created_at: '2026-11-09T14:20:00Z'
      },
      {
        id: 'lot-05',
        unit_id: 'u0000000-0000-0000-0000-000000000002', // Itupeva
        item_id: 'it-05',
        description: 'Iogurte Integral Morango 170g',
        lot_number: 'LOTE-2026-IT02',
        initial_boxes: 15,
        current_boxes: 15,
        reserved_boxes: 0,
        unit_price: null, // Produto sem preço cadastrado para demonstrar sinalização sem inventar valor
        invoice_number: '12488',
        issuer_name: 'Distribuidora São Paulo',
        origin_location: 'CD Fornecedor SP',
        created_at: '2026-11-10T16:00:00Z'
      }
    ],
    transfers: [
      {
        id: 'trf-01',
        code: 'TRF-2026-001',
        source_unit_id: 'u0000000-0000-0000-0000-000000000001', // Chapecó
        destination_unit_id: 'u0000000-0000-0000-0000-000000000002', // Itupeva
        is_direct_to_branch: false,
        status: 'IN_TRANSIT',
        origin_location: 'Doca Matriz Chapecó - Rota Sul',
        carrier: 'Transportadora Rápido Sul Ltda',
        vehicle_plate: 'MVR-4820',
        driver: 'Carlos Silveira',
        requested_boxes: 45,
        shipped_boxes: 45,
        received_boxes: 0,
        shipped_at: '2026-11-11T14:00:00Z',
        created_at: '2026-11-11T10:00:00Z',
        items: [
          { item_id: 'it-01', description: 'Leite Integral Pasteurizado 1L', requested_boxes: 30, shipped_boxes: 30, unit_price: 48.50 },
          { item_id: 'it-02', description: 'Hambúrguer Bovino 56g (Cx c/ 36)', requested_boxes: 15, shipped_boxes: 15, unit_price: 115.00 }
        ]
      },
      {
        id: 'trf-02',
        code: 'TRF-DIR-2026-002',
        source_unit_id: 'u0000000-0000-0000-0000-000000000001', // Gestão Central
        destination_unit_id: 'u0000000-0000-0000-0000-000000000002', // Itupeva
        is_direct_to_branch: true, // Carga Direta para Itupeva sem passagem física por Chapecó
        status: 'IN_TRANSIT',
        origin_location: 'CD Fornecedor Direto - São Paulo',
        carrier: 'Logística Integrada Paulistana',
        vehicle_plate: 'SP-8831',
        driver: 'Marcos Oliveira',
        requested_boxes: 50,
        shipped_boxes: 50,
        received_boxes: 0,
        shipped_at: '2026-11-12T09:30:00Z',
        created_at: '2026-11-12T08:00:00Z',
        items: [
          { item_id: 'it-03', description: 'Óleo de Soja Refinado 900ml', requested_boxes: 50, shipped_boxes: 50, unit_price: 85.00 }
        ]
      }
    ],
    movements: [
      {
        id: 'mov-01',
        unit_id: 'u0000000-0000-0000-0000-000000000001',
        item_id: 'it-01',
        product_name: 'Leite Integral Pasteurizado 1L',
        type: 'INVOICE_ENTRY',
        quantity_boxes: 80,
        balance_after: 80,
        reason: 'Entrada NF-e 12410 - Avaria por vazamento na carga',
        origin_location: 'Planta Laticínios Sul',
        created_at: '2026-10-20T08:30:00Z',
        operator: 'Yuri Alves'
      },
      {
        id: 'mov-02',
        unit_id: 'u0000000-0000-0000-0000-000000000001',
        item_id: 'it-02',
        product_name: 'Hambúrguer Bovino 56g (Cx c/ 36)',
        type: 'INVOICE_ENTRY',
        quantity_boxes: 50,
        balance_after: 50,
        reason: 'Entrada NF-e 12425 - Rompimento de caixas no transporte refrigerado',
        origin_location: 'Frigorífico Central',
        created_at: '2026-10-24T09:15:00Z',
        operator: 'Yuri Alves'
      },
      {
        id: 'mov-03',
        unit_id: 'u0000000-0000-0000-0000-000000000002',
        item_id: 'it-03',
        product_name: 'Óleo de Soja Refinado 900ml',
        type: 'INVOICE_ENTRY',
        quantity_boxes: 45,
        balance_after: 45,
        reason: 'Entrada NF-e 12440 - Amassamento leve de embalagens secundárias',
        origin_location: 'Refinaria Sudeste',
        created_at: '2026-10-28T14:20:00Z',
        operator: 'Yuri Alves'
      },
      {
        id: 'mov-04',
        unit_id: 'u0000000-0000-0000-0000-000000000001',
        item_id: 'it-04',
        product_name: 'Queijo Mussarela Fatiado 1kg',
        type: 'INVOICE_ENTRY',
        quantity_boxes: 30,
        balance_after: 30,
        reason: 'Entrada NF-e 12460 - Embalagem despressurizada no trajeto',
        origin_location: 'Cooperativa Sul',
        created_at: '2026-11-02T11:00:00Z',
        operator: 'Yuri Alves'
      },
      {
        id: 'mov-05',
        unit_id: 'u0000000-0000-0000-0000-000000000001',
        item_id: 'it-01',
        product_name: 'Leite Integral Pasteurizado 1L',
        type: 'INVOICE_ENTRY',
        quantity_boxes: 60,
        balance_after: 140,
        reason: 'Entrada NF-e 12480 - Caixas umedecidas no descarregamento',
        origin_location: 'Planta Laticínios Sul',
        created_at: '2026-11-06T08:30:00Z',
        operator: 'Yuri Alves'
      },
      {
        id: 'mov-06',
        unit_id: 'u0000000-0000-0000-0000-000000000002',
        item_id: 'it-05',
        product_name: 'Iogurte Integral Morango 170g',
        type: 'INVOICE_ENTRY',
        quantity_boxes: 15,
        balance_after: 15,
        reason: 'Entrada NF-e 12488 - Danos na aba de selagem térmica',
        origin_location: 'CD Fornecedor SP',
        created_at: '2026-11-08T16:00:00Z',
        operator: 'Yuri Alves'
      },
      {
        id: 'mov-07',
        unit_id: 'u0000000-0000-0000-0000-000000000001',
        item_id: 'it-02',
        product_name: 'Hambúrguer Bovino 56g (Cx c/ 36)',
        type: 'INVOICE_ENTRY',
        quantity_boxes: 35,
        balance_after: 85,
        reason: 'Entrada NF-e 12485 - Deformação de caixa secundária',
        origin_location: 'Frigorífico Central',
        created_at: '2026-11-09T09:15:00Z',
        operator: 'Yuri Alves'
      },
      {
        id: 'mov-08',
        unit_id: 'u0000000-0000-0000-0000-000000000001',
        item_id: 'it-01',
        product_name: 'Leite Integral Pasteurizado 1L',
        type: 'TRANSFER_DISPATCH',
        quantity_boxes: -30,
        balance_after: 110,
        reason: 'Despacho TRF-2026-001 em trânsito para Itupeva',
        origin_location: 'Doca Matriz Chapecó',
        created_at: '2026-11-11T14:00:00Z',
        operator: 'Yuri Alves'
      },
      {
        id: 'mov-09',
        unit_id: 'u0000000-0000-0000-0000-000000000001',
        item_id: 'it-02',
        product_name: 'Hambúrguer Bovino 56g (Cx c/ 36)',
        type: 'TRANSFER_DISPATCH',
        quantity_boxes: -15,
        balance_after: 70,
        reason: 'Despacho TRF-2026-001 em trânsito para Itupeva',
        origin_location: 'Doca Matriz Chapecó',
        created_at: '2026-11-11T14:00:00Z',
        operator: 'Yuri Alves'
      },
      {
        id: 'mov-10',
        unit_id: 'u0000000-0000-0000-0000-000000000001',
        item_id: 'it-01',
        product_name: 'Leite Integral Pasteurizado 1L',
        type: 'DAMAGE_ADJUSTMENT',
        quantity_boxes: -2,
        balance_after: 108,
        reason: 'Descarte por perda total pós-inspeção técnica',
        origin_location: 'Doca Matriz Chapecó',
        created_at: '2026-11-12T10:00:00Z',
        operator: 'Yuri Alves'
      }
    ],
    invoices: [
      {
        id: 'inv-01',
        unit_id: 'u0000000-0000-0000-0000-000000000001',
        number: '12480',
        series: '1',
        access_key: '35261100000000000001550010000124801000124804',
        issuer: 'Laticínios Aurora Alimentos',
        cnpj: '11.222.333/0001-44',
        issue_date: '2026-11-06',
        total_value: 2910.00,
        status: 'CONFIRMED',
        items: [
          { description: 'Leite Integral Pasteurizado 1L', raw_unit: 'CX', raw_qty: 60, boxes: 60, unit_price: 48.50 }
        ]
      }
    ]
  };

  // --- GERENCIADOR DE ESTADO LOCAL COM PERSISTÊNCIA ---
  const STORAGE_KEY = 'central_avarias_state_v3';
  let state = loadState();

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.version === 3 && parsed.units && parsed.lots) {
          return parsed;
        }
      }
    } catch (e) {}
    const initial = JSON.parse(JSON.stringify(INITIAL_DATA));
    saveStateDirect(initial);
    return initial;
  }

  function saveStateDirect(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function saveState() {
    saveStateDirect(state);
  }

  // --- IDENTIFICAÇÃO E RASTREABILIDADE TÉCNICA INTERNA DE ITENS ---
  // Não exige catálogo prévio nem SKU; gera identificador único técnico automaticamente
  function getOrCreateItemId(description, unitPrice, rawUnit) {
    const desc = (description || 'Item não especificado').trim();
    const normalized = desc.toUpperCase().replace(/\s+/g, ' ');

    let existing = state.item_registry.find(i => i.normalized_description === normalized);
    if (existing) {
      if (unitPrice && (!existing.unit_price || existing.unit_price === 0)) {
        existing.unit_price = unitPrice;
      }
      return existing.item_id;
    }

    const newItemId = 'it-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    state.item_registry.push({
      item_id: newItemId,
      description: desc,
      normalized_description: normalized,
      raw_unit: rawUnit || 'CX',
      unit_price: unitPrice || null,
      created_at: new Date().toISOString()
    });
    return newItemId;
  }

  // --- FILTROS DA TORRE DE CONTROLE ---
  let dashboardFilters = {
    period: '30d',      // 'today', '7d', '30d', 'month', 'all', 'custom'
    unitId: 'all',      // 'all' ou ID específico
    productName: 'all', // 'all' ou descrição do produto
    origin: 'all',      // 'all' ou string de local
    customStart: '',
    customEnd: ''
  };

  // Instâncias dos gráficos para limpeza adequada
  let dashboardChartInstances = {
    top: null,
    loc: null,
    least: null,
    time: null
  };

  // --- AUXILIARES DE FORMATAÇÃO ---
  function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  function formatDateTime(dtStr) {
    if (!dtStr) return '—';
    try {
      const d = new Date(dtStr);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dtStr;
    }
  }

  // --- NAVEGAÇÃO E ROTAS ---
  let currentRoute = 'dashboard';

  function navigateTo(route) {
    currentRoute = route;
    renderApp();
  }

  function getActiveUnit() {
    return state.units.find(u => u.id === state.activeUnitId && u.is_active) ||
           state.units.find(u => u.unit_type === 'HEADQUARTERS') ||
           state.units[0];
  }

  // ===========================================================================
  // RENDERIZADOR PRINCIPAL DO SHELL (NOVA ESTRUTURA DO MENU LATERAL)
  // ===========================================================================
  function renderApp() {
    const activeUnit = getActiveUnit();
    const isHeadquarters = activeUnit?.unit_type === 'HEADQUARTERS';
    const activeUnits = state.units.filter(u => u.is_active);

    const appEl = document.getElementById('app');
    appEl.innerHTML = `
      <!-- SIDEBAR (MENU LATERAL SIMPLIFICADO) -->
      <aside class="w-64 bg-slate-900 text-white flex flex-col shrink-0 select-none border-r border-slate-800">
        <!-- Brand -->
        <div class="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/40">
          <div class="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white font-black shadow-md shadow-brand-500/30">
            CA
          </div>
          <div>
            <h1 class="font-extrabold text-sm tracking-tight text-white leading-none">CENTRAL DE AVARIAS</h1>
            <p class="text-[10px] font-bold text-brand-400 uppercase tracking-widest mt-1">Gestão Logística</p>
          </div>
        </div>

        <!-- Menu Navigation - 7 Tópicos Oficiais -->
        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <!-- 1. Torre de Controle -->
          <button onclick="window.appNav('dashboard')" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${currentRoute === 'dashboard' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            <span>Torre de Controle</span>
          </button>

          <!-- 2. Estoque -->
          <button onclick="window.appNav('inventory')" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${currentRoute === 'inventory' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            <span>Estoque</span>
          </button>

          <!-- 3. Entrada de NF-e -->
          <button onclick="window.appNav('invoices')" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${currentRoute === 'invoices' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>Entrada de NF-e</span>
          </button>

          <!-- 4. Transferências -->
          <button onclick="window.appNav('transfers')" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${currentRoute === 'transfers' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            <span>Transferências</span>
          </button>

          <!-- 5. Movimentações -->
          <button onclick="window.appNav('movements')" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${currentRoute === 'movements' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Movimentações</span>
          </button>

          <div class="pt-4 pb-1 px-3">
            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestão & Controle</span>
          </div>

          <!-- 6. Administração -->
          <button onclick="window.appNav('admin')" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${currentRoute === 'admin' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            <span>Administração</span>
          </button>

          <!-- 7. Configurações -->
          <button onclick="window.appNav('settings')" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${currentRoute === 'settings' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Configurações</span>
          </button>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Servidor Local Ativo</span>
          <span class="inline-flex items-center gap-1.5 font-bold text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online
          </span>
        </div>
      </aside>

      <!-- ÁREA PRINCIPAL -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <!-- HEADER -->
        <header class="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0">
          <!-- Seletor de Unidade Ativa -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <svg class="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              <select id="header-unit-select" onchange="window.switchUnit(this.value)" class="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer">
                ${activeUnits.map(u => `
                  <option value="${u.id}" ${u.id === activeUnit?.id ? 'selected' : ''}>
                    ${u.name} (${u.state_code}) — ${u.unit_type === 'HEADQUARTERS' ? 'MATRIZ GERAL' : 'FILIAL REGIONAL'}
                  </option>
                `).join('')}
              </select>
            </div>
            <span class="badge ${isHeadquarters ? 'badge-purple' : 'badge-info'}">
              ${isHeadquarters ? 'GESTÃO CENTRAL' : 'OPERAÇÃO FILIAL'}
            </span>
          </div>

          <!-- Operador -->
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-xs font-bold text-slate-900">${state.currentUser.name}</div>
              <div class="text-[10px] font-semibold text-brand-600">${state.currentUser.role}</div>
            </div>
            <div class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xs">
              YA
            </div>
          </div>
        </header>

        <!-- VIEW CONTAINER -->
        <main class="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          ${renderCurrentRoute()}
        </main>
      </div>

      <!-- MODAL CONTAINER (DINÂMICO) -->
      <div id="modal-container"></div>
    `;

    // Se estiver na Torre de Controle, dispara a renderização dos 4 gráficos analíticos
    if (currentRoute === 'dashboard') {
      setTimeout(renderDashboardCharts, 40);
    }
  }

  // --- RENDERIZADORES DE ROTA ---
  function renderCurrentRoute() {
    switch (currentRoute) {
      case 'dashboard': return renderDashboard();
      case 'inventory': return renderInventory();
      case 'invoices': return renderInvoices();
      case 'transfers': return renderTransfers();
      case 'movements': return renderMovements();
      case 'admin': return renderAdmin();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  }

  // ===========================================================================
  // 1. TORRE DE CONTROLE — INDICADORES GERENCIAIS & INTELIGÊNCIA DE AVARIAS
  // ===========================================================================
  function renderDashboard() {
    const activeUnit = getActiveUnit();

    // 1. Aplicação dos Filtros Ativos (Sem dependência de setores!)
    const filteredLots = state.lots.filter(lot => {
      if (dashboardFilters.unitId !== 'all' && lot.unit_id !== dashboardFilters.unitId) return false;
      if (dashboardFilters.productName !== 'all' && lot.description !== dashboardFilters.productName) return false;
      if (dashboardFilters.origin !== 'all' && (lot.origin_location || '') !== dashboardFilters.origin) return false;
      return true;
    });

    // A) Estoque Físico Total em Caixas (Sem incluir cargas em trânsito)
    const totalPhysical = filteredLots.reduce((acc, l) => acc + (l.current_boxes || 0), 0);
    const totalReserved = filteredLots.reduce((acc, l) => acc + (l.reserved_boxes || 0), 0);
    const totalAvailable = totalPhysical - totalReserved;

    // Desdobramento por unidade (Chapecó vs Itupeva)
    const chapecoUnit = state.units.find(u => u.unit_type === 'HEADQUARTERS') || state.units[0];
    const itupevaUnit = state.units.find(u => u.unit_type === 'BRANCH') || state.units[1];

    const chapecoPhysical = state.lots.filter(l => l.unit_id === chapecoUnit?.id).reduce((acc, l) => acc + (l.current_boxes || 0), 0);
    const itupevaPhysical = state.lots.filter(l => l.unit_id === itupevaUnit?.id).reduce((acc, l) => acc + (l.current_boxes || 0), 0);

    // B) Valor Total em Estoque (Baseado exclusivamente em preços cadastrados)
    let totalStockValue = 0;
    let chapecoStockValue = 0;
    let itupevaStockValue = 0;
    let unpricedLotsCount = 0;
    const unpricedProductsSet = new Set();

    filteredLots.forEach(l => {
      if (typeof l.unit_price === 'number' && l.unit_price > 0) {
        const itemVal = l.current_boxes * l.unit_price;
        totalStockValue += itemVal;
        if (l.unit_id === chapecoUnit?.id) chapecoStockValue += itemVal;
        if (l.unit_id === itupevaUnit?.id) itupevaStockValue += itemVal;
      } else {
        unpricedLotsCount++;
        unpricedProductsSet.add(l.description);
      }
    });

    // C) Cargas em Trânsito (Mercadorias a caminho de Itupeva)
    const activeInTransit = state.transfers.filter(t => t.status === 'IN_TRANSIT');
    const itupevaTransitTransfers = activeInTransit.filter(t => t.destination_unit_id === itupevaUnit?.id);
    const totalTransitBoxes = itupevaTransitTransfers.reduce((acc, t) => acc + (t.shipped_boxes || t.requested_boxes || 0), 0);
    const directTransitBoxes = itupevaTransitTransfers.filter(t => t.is_direct_to_branch).reduce((acc, t) => acc + (t.shipped_boxes || t.requested_boxes || 0), 0);
    const trfTransitBoxes = totalTransitBoxes - directTransitBoxes;

    // D) Outros Indicadores
    const distinctItemDescriptions = Array.from(new Set(state.lots.map(l => l.description)));
    const pendingTransfers = state.transfers.filter(t => t.status === 'REQUESTED' || t.status === 'APPROVED' || t.status === 'PICKING').length;
    const pendingInvoices = state.invoices.filter(i => i.status === 'PENDING_CONFERENCE').length;

    // Lista de origens únicas para o filtro
    const allOrigins = Array.from(new Set([
      ...state.movements.map(m => m.origin_location).filter(Boolean),
      ...state.transfers.map(t => t.origin_location).filter(Boolean),
      ...state.lots.map(l => l.origin_location).filter(Boolean)
    ]));

    return `
      <!-- Cabeçalho da Torre de Controle -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
            <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">Torre de Controle Operacional</h2>
          </div>
          <p class="text-xs text-slate-500 mt-1">Acompanhamento consolidado de estoque físico, valores, cargas em trânsito e ocorrências de avarias</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="window.appNav('inventory')" class="btn-primary">
            + Novo Lançamento de Estoque
          </button>
          <button onclick="window.openUploadInvoiceModal()" class="btn-secondary">
            Importar NF-e por PDF
          </button>
          <button onclick="window.openTransitDetailsModal()" class="btn-outline">
            Cargas em Trânsito (${totalTransitBoxes} cx)
          </button>
        </div>
      </div>

      <!-- Barra de Filtros da Torre de Controle (Sem filtro de setor!) -->
      <div class="card p-4 bg-slate-900 text-white border-slate-800">
        <div class="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <span class="font-bold uppercase tracking-wider text-[11px] text-slate-300">Filtros da Torre de Controle</span>
          </div>
          <button onclick="window.clearDashboardFilters()" class="text-[11px] text-brand-400 hover:text-brand-300 font-bold hover:underline">
            Limpar Filtros
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 text-xs">
          <!-- Filtro Período -->
          <div>
            <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Período</label>
            <select onchange="window.setDashboardFilter('period', this.value)" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none">
              <option value="today" ${dashboardFilters.period === 'today' ? 'selected' : ''}>Hoje</option>
              <option value="7d" ${dashboardFilters.period === '7d' ? 'selected' : ''}>Últimos 7 dias</option>
              <option value="30d" ${dashboardFilters.period === '30d' ? 'selected' : ''}>Últimos 30 dias (Padrão)</option>
              <option value="month" ${dashboardFilters.period === 'month' ? 'selected' : ''}>Mês Atual</option>
              <option value="all" ${dashboardFilters.period === 'all' ? 'selected' : ''}>Todo o Histórico</option>
              <option value="custom" ${dashboardFilters.period === 'custom' ? 'selected' : ''}>Personalizado...</option>
            </select>
          </div>

          <!-- Filtro Unidade -->
          <div>
            <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Unidade</label>
            <select onchange="window.setDashboardFilter('unitId', this.value)" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none">
              <option value="all" ${dashboardFilters.unitId === 'all' ? 'selected' : ''}>Todas as Unidades (Consolidado)</option>
              ${state.units.map(u => `
                <option value="${u.id}" ${dashboardFilters.unitId === u.id ? 'selected' : ''}>${u.name} (${u.state_code})${!u.is_active ? ' [Inativa]' : ''}</option>
              `).join('')}
            </select>
          </div>

          <!-- Filtro Produto por Descrição -->
          <div>
            <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Produto (Descrição)</label>
            <select onchange="window.setDashboardFilter('productName', this.value)" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none">
              <option value="all" ${dashboardFilters.productName === 'all' ? 'selected' : ''}>Todos os Produtos</option>
              ${distinctItemDescriptions.map(desc => `
                <option value="${desc}" ${dashboardFilters.productName === desc ? 'selected' : ''}>${desc}</option>
              `).join('')}
            </select>
          </div>

          <!-- Filtro Origem / Carregamento -->
          <div>
            <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Local de Origem</label>
            <select onchange="window.setDashboardFilter('origin', this.value)" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none">
              <option value="all" ${dashboardFilters.origin === 'all' ? 'selected' : ''}>Todas as Origens</option>
              ${allOrigins.map(orig => `
                <option value="${orig}" ${dashboardFilters.origin === orig ? 'selected' : ''}>${orig}</option>
              `).join('')}
            </select>
          </div>
        </div>

        ${dashboardFilters.period === 'custom' ? `
          <div class="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800 text-xs">
            <span class="text-slate-400">Intervalo de Datas:</span>
            <input type="date" value="${dashboardFilters.customStart || ''}" onchange="window.setDashboardFilter('customStart', this.value)" class="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white">
            <span class="text-slate-500">até</span>
            <input type="date" value="${dashboardFilters.customEnd || ''}" onchange="window.setDashboardFilter('customEnd', this.value)" class="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white">
          </div>
        ` : ''}
      </div>

      <!-- CARDS DE INDICADORES SUPERIORES -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <!-- CARD A: Estoque Físico Total -->
        <div class="card p-5 bg-gradient-to-br from-white to-slate-50 border border-slate-200">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estoque Físico Total</span>
            <span class="badge badge-success text-[10px]">Físico Real</span>
          </div>
          <div class="text-3xl font-black text-slate-900 mt-2 font-mono">${totalPhysical} <span class="text-base font-bold text-slate-500">cx</span></div>
          <div class="text-xs text-slate-500 mt-2 space-y-1">
            <div class="flex justify-between border-b border-slate-100 pb-1">
              <span>Chapecó (Matriz):</span>
              <strong class="text-slate-700 font-mono">${chapecoPhysical} cx</strong>
            </div>
            <div class="flex justify-between">
              <span>Itupeva (Filial):</span>
              <strong class="text-slate-700 font-mono">${itupevaPhysical} cx</strong>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            * Não contabiliza mercadorias que estejam apenas em trânsito.
          </div>
        </div>

        <!-- CARD B: Valor Total em Estoque -->
        <div class="card p-5 bg-gradient-to-br from-white to-emerald-50/30 border border-slate-200">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Valor em Estoque</span>
            <span class="badge badge-info text-[10px]">Financeiro</span>
          </div>
          <div class="text-2xl font-black text-emerald-700 mt-2 font-mono">${formatCurrency(totalStockValue)}</div>
          <div class="text-xs text-slate-600 mt-2 space-y-1">
            <div class="flex justify-between border-b border-slate-100 pb-1">
              <span>Chapecó:</span>
              <strong class="text-slate-800 font-mono">${formatCurrency(chapecoStockValue)}</strong>
            </div>
            <div class="flex justify-between">
              <span>Itupeva:</span>
              <strong class="text-slate-800 font-mono">${formatCurrency(itupevaStockValue)}</strong>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-100 text-[10px]">
            ${unpricedLotsCount > 0 ? `
              <span class="badge badge-warning text-[10px] font-semibold" title="Itens sem preço cadastrado: ${Array.from(unpricedProductsSet).join(', ')}">
                ⚠️ ${unpricedProductsSet.size} item(ns) sem valor cadastrado
              </span>
            ` : `
              <span class="text-emerald-700 font-semibold">✓ 100% dos itens valorizados</span>
            `}
          </div>
        </div>

        <!-- CARD C: Cargas em Trânsito -->
        <div class="card p-5 bg-gradient-to-br from-white to-purple-50/40 border border-slate-200">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Cargas em Trânsito</span>
            <span class="badge badge-purple text-[10px]">${itupevaTransitTransfers.length} remessa(s)</span>
          </div>
          <div class="text-3xl font-black text-purple-700 mt-2 font-mono">${totalTransitBoxes} <span class="text-base font-bold text-purple-600">cx</span></div>
          <div class="text-xs text-slate-600 mt-2 space-y-1">
            <div class="flex justify-between border-b border-slate-100 pb-1">
              <span>Matriz ➔ Itupeva:</span>
              <strong class="text-purple-900 font-mono">${trfTransitBoxes} cx</strong>
            </div>
            <div class="flex justify-between">
              <span>Direto ➔ Itupeva:</span>
              <strong class="text-purple-900 font-mono">${directTransitBoxes} cx</strong>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-100">
            <button onclick="window.openTransitDetailsModal()" class="w-full text-center text-xs text-purple-700 font-bold hover:underline">
              Ver Detalhes do Trânsito ➔
            </button>
          </div>
        </div>

        <!-- CARD D: Resumo Operacional -->
        <div class="card p-5 bg-gradient-to-br from-white to-slate-50 border border-slate-200">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resumo Operacional</span>
            <span class="badge badge-info text-[10px]">Visão Geral</span>
          </div>
          <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div class="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <div class="text-[10px] text-slate-400">Itens Distintos</div>
              <div class="font-bold text-slate-800 text-sm font-mono">${distinctItemDescriptions.length}</div>
            </div>
            <div class="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <div class="text-[10px] text-slate-400">Unidades Ativas</div>
              <div class="font-bold text-slate-800 text-sm font-mono">${state.units.filter(u => u.is_active).length}</div>
            </div>
            <div class="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <div class="text-[10px] text-slate-400">TRF Pendentes</div>
              <div class="font-bold text-amber-600 text-sm font-mono">${pendingTransfers}</div>
            </div>
            <div class="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <div class="text-[10px] text-slate-400">NF-e p/ Conferir</div>
              <div class="font-bold text-brand-600 text-sm font-mono">${pendingInvoices}</div>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            ${totalAvailable} cx disponíveis | ${totalReserved} cx reservadas
          </div>
        </div>
      </div>

      <!-- 4 GRÁFICOS GERENCIAIS DE DESEMPENHO DE AVARIAS -->
      <div class="flex items-center justify-between mt-8 mb-2">
        <div>
          <h3 class="text-base font-extrabold text-slate-900">Desempenho e Inteligência de Avarias</h3>
          <p class="text-xs text-slate-500">Métricas analíticas calculadas por descrição de produto, ocorrências geográficas e evolução temporal</p>
        </div>
        <button onclick="window.appNav('movements')" class="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1">
          <span>Consultar Histórico Completo do Livro-Razão</span>
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      <!-- Grid com os 4 Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Gráfico 1: Produtos com Maior Incidência de Avarias -->
        <div class="card p-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 class="font-bold text-sm text-slate-900">Gráfico 1 — Produtos com Maior Incidência de Avarias</h4>
              <p class="text-[11px] text-slate-500">Ranking por volume de caixas avariadas e taxa percentual de avaria</p>
            </div>
            <span class="badge badge-danger">Ranking Crítico</span>
          </div>
          <div class="relative h-64 mt-3" id="container-chart-top">
            <canvas id="chart-top-damaged"></canvas>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Fórmula: (Caixas avariadas ÷ caixas movimentadas) × 100</span>
            <span id="label-top-damaged" class="font-bold text-slate-700"></span>
          </div>
        </div>

        <!-- Gráfico 2: Avarias por Unidade ou Local de Origem -->
        <div class="card p-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 class="font-bold text-sm text-slate-900">Gráfico 2 — Avarias por Unidade ou Local de Origem</h4>
              <p class="text-[11px] text-slate-500">Comparativo entre Chapecó, Itupeva e pontos de carregamento</p>
            </div>
            <span class="badge badge-purple">Distribuição Geográfica</span>
          </div>
          <div class="relative h-64 mt-3" id="container-chart-loc">
            <canvas id="chart-by-location"></canvas>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Concentração de ocorrências operacionais</span>
            <span id="label-location" class="font-bold text-purple-700"></span>
          </div>
        </div>

        <!-- Gráfico 3: Produtos com Menor Incidência de Avarias -->
        <div class="card p-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 class="font-bold text-sm text-slate-900">Gráfico 3 — Produtos com Menor Incidência de Avarias</h4>
              <p class="text-[11px] text-slate-500">Itens com melhor histórico operacional e menor índice de sinistro</p>
            </div>
            <span class="badge badge-success">Benchmark de Qualidade</span>
          </div>
          <div class="relative h-64 mt-3" id="container-chart-least">
            <canvas id="chart-least-damaged"></canvas>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Produtos com taxa de perda inferior a 2%</span>
            <span id="label-least-damaged" class="font-bold text-emerald-700"></span>
          </div>
        </div>

        <!-- Gráfico 4: Evolução das Avarias ao Longo do Tempo -->
        <div class="card p-5">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 class="font-bold text-sm text-slate-900">Gráfico 4 — Evolução das Avarias ao Longo do Tempo</h4>
              <p class="text-[11px] text-slate-500">Série histórica de ocorrências por data no período selecionado</p>
            </div>
            <span class="badge badge-info">Tendência Temporal</span>
          </div>
          <div class="relative h-64 mt-3" id="container-chart-time">
            <canvas id="chart-timeline"></canvas>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Acompanhamento da curva de sinistralidade</span>
            <span id="label-timeline" class="font-bold text-blue-700"></span>
          </div>
        </div>
      </div>
    `;
  }

  // --- CONTROLES DE FILTRO DO DASHBOARD ---
  window.setDashboardFilter = function(key, val) {
    dashboardFilters[key] = val;
    renderApp();
  };

  window.clearDashboardFilters = function() {
    dashboardFilters = {
      period: '30d',
      unitId: 'all',
      productName: 'all',
      origin: 'all',
      customStart: '',
      customEnd: ''
    };
    renderApp();
  };

  // --- RENDERIZADOR DOS GRÁFICOS (CHART.JS) ---
  function renderDashboardCharts() {
    if (!window.Chart) return;

    // Limpa instâncias anteriores
    Object.keys(dashboardChartInstances).forEach(k => {
      if (dashboardChartInstances[k]) {
        try { dashboardChartInstances[k].destroy(); } catch (e) {}
        dashboardChartInstances[k] = null;
      }
    });

    const now = new Date();
    const filteredMovements = state.movements.filter(m => {
      if (dashboardFilters.unitId !== 'all' && m.unit_id !== dashboardFilters.unitId) return false;
      if (dashboardFilters.productName !== 'all' && m.product_name !== dashboardFilters.productName) return false;
      if (dashboardFilters.origin !== 'all' && (m.origin_location || '') !== dashboardFilters.origin) return false;

      if (m.created_at) {
        const mDate = new Date(m.created_at);
        if (dashboardFilters.period === 'today') {
          return mDate.toDateString() === now.toDateString();
        } else if (dashboardFilters.period === '7d') {
          const limit = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
          return mDate >= limit;
        } else if (dashboardFilters.period === '30d') {
          const limit = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
          return mDate >= limit;
        } else if (dashboardFilters.period === 'month') {
          return mDate.getMonth() === now.getMonth() && mDate.getFullYear() === now.getFullYear();
        } else if (dashboardFilters.period === 'custom' && dashboardFilters.customStart && dashboardFilters.customEnd) {
          const start = new Date(dashboardFilters.customStart);
          const end = new Date(dashboardFilters.customEnd + 'T23:59:59');
          return mDate >= start && mDate <= end;
        }
      }
      return true;
    });

    function renderEmptyState(canvasId, msg) {
      const cvs = document.getElementById(canvasId);
      if (!cvs) return;
      const parent = cvs.parentElement;
      if (parent) {
        parent.innerHTML = `
          <div class="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <svg class="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            <p class="text-xs font-bold text-slate-600">${msg || 'Sem dados suficientes para os filtros aplicados.'}</p>
            <p class="text-[10px] text-slate-400 mt-1">Expanda o período selecionado ou altere os filtros de unidade/origem.</p>
          </div>
        `;
      }
    }

    // Gráfico 1: Produtos por maior incidência
    const prodDamageMap = {};
    const prodThroughputMap = {};

    filteredMovements.forEach(m => {
      const pName = m.product_name || 'Item';
      if (m.quantity_boxes > 0 && (m.type === 'INVOICE_ENTRY' || m.type === 'MANUAL_ENTRY' || m.type === 'ADJUST_AVARIA')) {
        prodDamageMap[pName] = (prodDamageMap[pName] || 0) + m.quantity_boxes;
      }
      prodThroughputMap[pName] = (prodThroughputMap[pName] || 0) + Math.abs(m.quantity_boxes);
    });

    const rankedTopProds = Object.keys(prodDamageMap).map(pName => {
      const damagedBoxes = prodDamageMap[pName];
      const throughput = Math.max(prodThroughputMap[pName] || 0, damagedBoxes * 4);
      const rate = ((damagedBoxes / throughput) * 100).toFixed(2);
      return {
        name: pName,
        damagedBoxes,
        throughput,
        rate: parseFloat(rate)
      };
    }).sort((a, b) => b.damagedBoxes - a.damagedBoxes);

    if (rankedTopProds.length > 0) {
      const topCtx = document.getElementById('chart-top-damaged');
      if (topCtx) {
        dashboardChartInstances.top = new Chart(topCtx, {
          type: 'bar',
          data: {
            labels: rankedTopProds.map(p => p.name.length > 25 ? p.name.substring(0, 22) + '...' : p.name),
            datasets: [{
              label: 'Caixas Avariadas',
              data: rankedTopProds.map(p => p.damagedBoxes),
              backgroundColor: 'rgba(239, 68, 68, 0.85)',
              borderColor: '#dc2626',
              borderWidth: 1,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  afterLabel: function(ctx) {
                    const item = rankedTopProds[ctx.dataIndex];
                    return [
                      `Taxa de Avaria: ${item.rate}%`,
                      `Volume Total Movimentado: ${item.throughput} cx`
                    ];
                  }
                }
              }
            },
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'Caixas (cx)', font: { size: 10 } } }
            }
          }
        });

        const topItem = rankedTopProds[0];
        const labelEl = document.getElementById('label-top-damaged');
        if (labelEl) labelEl.textContent = `Maior incidência: ${topItem.name} (${topItem.damagedBoxes} cx | Taxa: ${topItem.rate}%)`;
      }
    } else {
      renderEmptyState('chart-top-damaged', 'Nenhum registro de avaria no período.');
    }

    // Gráfico 2: Avarias por Unidade ou Local de Origem
    const locMap = {};
    filteredMovements.forEach(m => {
      if (m.quantity_boxes > 0) {
        const u = state.units.find(x => x.id === m.unit_id);
        const locKey = m.origin_location || u?.name || 'Não identificado';
        locMap[locKey] = (locMap[locKey] || 0) + m.quantity_boxes;
      }
    });

    const locKeys = Object.keys(locMap);
    if (locKeys.length > 0) {
      const locCtx = document.getElementById('chart-by-location');
      if (locCtx) {
        dashboardChartInstances.loc = new Chart(locCtx, {
          type: 'doughnut',
          data: {
            labels: locKeys,
            datasets: [{
              data: locKeys.map(k => locMap[k]),
              backgroundColor: ['#0284c7', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#64748b'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    const total = locKeys.reduce((a, k) => a + locMap[k], 0);
                    const val = ctx.raw;
                    const pct = ((val / total) * 100).toFixed(1);
                    return ` ${ctx.label}: ${val} cx (${pct}%)`;
                  }
                }
              }
            }
          }
        });

        const sortedLocs = locKeys.sort((a, b) => locMap[b] - locMap[a]);
        const locLabelEl = document.getElementById('label-location');
        if (locLabelEl) {
          locLabelEl.textContent = `Maior ocorrência: ${sortedLocs[0]} (${locMap[sortedLocs[0]]} cx)`;
        }
      }
    } else {
      renderEmptyState('chart-by-location', 'Sem dados de localidade no período.');
    }

    // Gráfico 3: Produtos com Menor Incidência
    const allItemsRanked = Array.from(new Set(state.lots.map(l => l.description))).map(pName => {
      const dmg = prodDamageMap[pName] || 0;
      const th = prodThroughputMap[pName] || 500;
      const rate = ((dmg / th) * 100).toFixed(2);
      return {
        name: pName,
        damagedBoxes: dmg,
        throughput: th,
        rate: parseFloat(rate)
      };
    }).sort((a, b) => a.rate - b.rate);

    const leastItems = allItemsRanked.slice(0, 4);
    if (leastItems.length > 0) {
      const leastCtx = document.getElementById('chart-least-damaged');
      if (leastCtx) {
        dashboardChartInstances.least = new Chart(leastCtx, {
          type: 'bar',
          data: {
            labels: leastItems.map(p => p.name.length > 25 ? p.name.substring(0, 22) + '...' : p.name),
            datasets: [{
              label: 'Taxa de Avaria (%)',
              data: leastItems.map(p => p.rate),
              backgroundColor: 'rgba(16, 185, 129, 0.85)',
              borderColor: '#059669',
              borderWidth: 1,
              borderRadius: 6
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  afterLabel: function(ctx) {
                    const item = leastItems[ctx.dataIndex];
                    return [
                      `Caixas Avariadas: ${item.damagedBoxes} cx`,
                      `Total Movimentado: ${item.throughput} cx`,
                      `Status: Excelente Desempenho`
                    ];
                  }
                }
              }
            },
            scales: {
              x: { beginAtZero: true, title: { display: true, text: 'Taxa (%)', font: { size: 10 } } }
            }
          }
        });

        const bestItem = leastItems[0];
        const leastLabelEl = document.getElementById('label-least-damaged');
        if (leastLabelEl) {
          leastLabelEl.textContent = `Melhor Desempenho: ${bestItem.name} (${bestItem.rate}% avarias)`;
        }
      }
    } else {
      renderEmptyState('chart-least-damaged', 'Sem dados de benchmark disponíveis.');
    }

    // Gráfico 4: Evolução Temporal
    const dateMap = {};
    filteredMovements.forEach(m => {
      if (m.created_at && m.quantity_boxes > 0 && (m.type === 'INVOICE_ENTRY' || m.type === 'MANUAL_ENTRY' || m.type === 'ADJUST_AVARIA')) {
        const dStr = m.created_at.slice(0, 10);
        dateMap[dStr] = (dateMap[dStr] || 0) + m.quantity_boxes;
      }
    });

    const sortedDates = Object.keys(dateMap).sort();
    if (sortedDates.length > 0) {
      const timeCtx = document.getElementById('chart-timeline');
      if (timeCtx) {
        dashboardChartInstances.time = new Chart(timeCtx, {
          type: 'line',
          data: {
            labels: sortedDates.map(d => {
              const [y, m, day] = d.split('-');
              return `${day}/${m}`;
            }),
            datasets: [{
              label: 'Caixas Avariadas Registradas',
              data: sortedDates.map(d => dateMap[d]),
              borderColor: '#0284c7',
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#0284c7',
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    return ` Avarias no dia: ${ctx.raw} caixas`;
                  }
                }
              }
            },
            scales: {
              y: { beginAtZero: true, title: { display: true, text: 'Caixas', font: { size: 10 } } }
            }
          }
        });

        const summaryEl = document.getElementById('label-timeline');
        if (summaryEl) {
          summaryEl.textContent = `${sortedDates.length} datas com registros operacionais`;
        }
      }
    } else {
      renderEmptyState('chart-timeline', 'Nenhuma movimentação temporal no período.');
    }
  }

  // ===========================================================================
  // 2. ESTOQUE (COM ENTRADA MANUAL E SEM DEPENDÊNCIA DE CATÁLOGO/SKU)
  // ===========================================================================
  function renderInventory() {
    const activeUnit = getActiveUnit();
    const lots = state.lots.filter(l => l.unit_id === activeUnit?.id);

    return `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">Estoque de Materiais — ${activeUnit?.name}</h2>
          <p class="text-xs text-slate-500 mt-1">Gestão de saldos físicos por unidade, valores reais e histórico fiduciário de lotes</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.openManualStockEntryModal()" class="btn-primary">
            + Lançamento Manual de Estoque
          </button>
          <button onclick="window.openUploadInvoiceModal()" class="btn-secondary">
            Importar NF-e
          </button>
        </div>
      </div>

      <div class="card p-5">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="table-header">
                <th class="table-cell">Lote</th>
                <th class="table-cell">Descrição do Produto</th>
                <th class="table-cell text-right">Físico</th>
                <th class="table-cell text-right">Reservado</th>
                <th class="table-cell text-right">Disponível</th>
                <th class="table-cell text-right">Valor Unit. Ref.</th>
                <th class="table-cell text-right">Valor Total</th>
                <th class="table-cell">Nota Fiscal / Origem</th>
                <th class="table-cell text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${lots.length === 0 ? `
                <tr><td colspan="9" class="table-cell text-center text-slate-400 py-10">Nenhum produto em estoque nesta unidade. Clique em "+ Lançamento Manual de Estoque" ou "Importar NF-e".</td></tr>
              ` : lots.map(l => {
                const available = l.current_boxes - l.reserved_boxes;
                const totalVal = (l.unit_price && l.current_boxes) ? (l.current_boxes * l.unit_price) : null;
                return `
                  <tr class="hover:bg-slate-50">
                    <td class="table-cell font-mono font-bold text-slate-900 text-xs">${l.lot_number}</td>
                    <td class="table-cell">
                      <div class="font-bold text-slate-800">${l.description}</div>
                      <div class="text-[10px] text-slate-400 font-mono">ID Técnico: ${l.item_id || '—'}</div>
                    </td>
                    <td class="table-cell text-right font-mono font-bold text-slate-900">${l.current_boxes} cx</td>
                    <td class="table-cell text-right font-mono font-bold text-amber-600">${l.reserved_boxes} cx</td>
                    <td class="table-cell text-right font-mono font-bold text-emerald-600">${available} cx</td>
                    <td class="table-cell text-right font-mono text-xs ${l.unit_price ? 'text-slate-700' : 'text-amber-600 font-bold'}">
                      ${l.unit_price ? formatCurrency(l.unit_price) : '⚠️ Não informado'}
                    </td>
                    <td class="table-cell text-right font-mono font-bold text-slate-800 text-xs">
                      ${totalVal !== null ? formatCurrency(totalVal) : '—'}
                    </td>
                    <td class="table-cell text-xs text-slate-500">
                      ${l.invoice_number ? `NF ${l.invoice_number}` : 'Manual'} 
                      <span class="text-[10px] text-slate-400 block">${l.origin_location || '—'}</span>
                    </td>
                    <td class="table-cell text-right space-x-1 whitespace-nowrap">
                      <button onclick="window.openAdjustModal('${l.id}')" class="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs font-bold">Ajustar</button>
                      <button onclick="window.openWriteOffModal('${l.id}')" class="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-bold">Baixa</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Modal: Lançamento Manual de Estoque (Sem SKU ou Catálogo!)
  window.openManualStockEntryModal = function() {
    const activeUnit = getActiveUnit();
    const activeUnits = state.units.filter(u => u.is_active);

    const modalHtml = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Novo Lançamento Manual de Estoque</h3>
              <p class="text-xs text-slate-500 mt-0.5">Cadastre a entrada de produtos diretamente, sem necessidade de catálogo ou SKU</p>
            </div>
            <button onclick="window.closeModal()" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <form onsubmit="window.saveManualStockEntry(event)" class="space-y-4 mt-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Descrição Completa do Produto *</label>
              <input type="text" id="man-desc" required placeholder="ex: Leite UHT 1L Desnatado ou Caixa de Biscoitos Recheados" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-800">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Quantidade (Caixas Inteiras) *</label>
                <input type="number" min="1" step="1" id="man-qty" required value="10" class="w-full border-2 border-brand-500 rounded-xl px-3.5 py-2 font-mono font-bold text-brand-700 bg-brand-50/20 text-sm">
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Valor Unitário Ref. (R$)</label>
                <input type="number" min="0" step="0.01" id="man-price" placeholder="Opcional" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Unidade de Destino *</label>
                <select id="man-unit" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-800">
                  ${activeUnits.map(u => `
                    <option value="${u.id}" ${u.id === activeUnit?.id ? 'selected' : ''}>${u.name} (${u.state_code})</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">Local de Origem / Procedência</label>
                <input type="text" id="man-origin" placeholder="ex: Doca Central ou Fornecedor Local" class="w-full border border-slate-300 rounded-xl px-3.5 py-2">
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Observações e Informações Complementares</label>
              <textarea id="man-notes" rows="2" placeholder="Informações de avaria, laudo ou número de controle interno..." class="w-full border border-slate-300 rounded-xl p-3"></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary">Registrar Entrada no Estoque</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  window.saveManualStockEntry = function(e) {
    e.preventDefault();
    const desc = document.getElementById('man-desc').value.trim();
    const qty = parseInt(document.getElementById('man-qty').value, 10);
    const priceVal = parseFloat(document.getElementById('man-price').value);
    const price = (!isNaN(priceVal) && priceVal > 0) ? priceVal : null;
    const unitId = document.getElementById('man-unit').value;
    const origin = document.getElementById('man-origin').value.trim() || 'Lançamento Manual';
    const notes = document.getElementById('man-notes').value.trim();

    if (!desc || isNaN(qty) || qty <= 0) {
      alert('Erro: Informe a descrição e uma quantidade válida em caixas inteiras.');
      return;
    }

    // Identificador técnico interno automático
    const itemId = getOrCreateItemId(desc, price, 'CX');
    const lotNumber = 'LOTE-MAN-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);

    const newLot = {
      id: 'lot-' + Date.now(),
      unit_id: unitId,
      item_id: itemId,
      description: desc,
      lot_number: lotNumber,
      initial_boxes: qty,
      current_boxes: qty,
      reserved_boxes: 0,
      unit_price: price,
      invoice_number: null,
      issuer_name: 'Lançamento Manual',
      origin_location: origin,
      notes: notes,
      created_at: new Date().toISOString()
    };
    state.lots.unshift(newLot);

    // Registro Fiduciário no Livro-Razão
    state.movements.unshift({
      id: 'mov-' + Date.now(),
      unit_id: unitId,
      item_id: itemId,
      product_name: desc,
      type: 'MANUAL_ENTRY',
      quantity_boxes: qty,
      balance_after: qty,
      reason: notes ? `Lançamento manual: ${notes}` : 'Entrada manual avulsa no estoque',
      origin_location: origin,
      created_at: new Date().toISOString(),
      operator: state.currentUser.name
    });

    saveState();
    window.closeModal();
    renderApp();
    alert(`Sucesso! Lançamento de "${desc}" (${qty} cx) registrado no estoque da unidade.`);
  };

  // ===========================================================================
  // 3. ENTRADA DE NOTAS FISCAIS (NF-e)
  // ===========================================================================
  function renderInvoices() {
    const activeUnit = getActiveUnit();
    const invoices = state.invoices.filter(i => i.unit_id === activeUnit?.id);

    return `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">Entrada de Notas Fiscais (NF-e)</h2>
          <p class="text-xs text-slate-500 mt-1">Importação de DANFE em PDF com extração automática inteligente e conferência física</p>
        </div>
        <button onclick="window.openUploadInvoiceModal()" class="btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Importar Novo PDF de NF-e
        </button>
      </div>

      <div class="card p-5">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="table-header">
                <th class="table-cell">Número / Série</th>
                <th class="table-cell">Emitente / Fornecedor</th>
                <th class="table-cell">Data Emissão</th>
                <th class="table-cell">Valor Total</th>
                <th class="table-cell">Chave de 44 Dígitos</th>
                <th class="table-cell">Status</th>
                <th class="table-cell text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.length === 0 ? `
                <tr><td colspan="7" class="table-cell text-center text-slate-400 py-10">Nenhuma nota fiscal cadastrada. Clique em "Importar Novo PDF de NF-e" acima.</td></tr>
              ` : invoices.map(inv => `
                <tr class="hover:bg-slate-50">
                  <td class="table-cell font-bold text-slate-900">NF-e ${inv.number} (Série ${inv.series || '1'})</td>
                  <td class="table-cell font-medium text-slate-700">${inv.issuer}</td>
                  <td class="table-cell text-slate-500 font-mono text-[11px]">${inv.issue_date}</td>
                  <td class="table-cell font-mono font-bold text-slate-800">${formatCurrency(inv.total_value)}</td>
                  <td class="table-cell font-mono text-[10px] text-slate-400 max-w-xs truncate">${inv.access_key}</td>
                  <td class="table-cell">
                    <span class="badge ${inv.status === 'CONFIRMED' ? 'badge-success' : 'badge-warning'}">
                      ${inv.status === 'CONFIRMED' ? 'Confirmada' : 'Aguardando Conferência'}
                    </span>
                  </td>
                  <td class="table-cell text-right">
                    ${inv.status === 'PENDING_CONFERENCE' ? `
                      <button onclick="window.openConferenceModal('${inv.id}')" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs shadow-sm">
                        Conferir Itens
                      </button>
                    ` : `
                      <span class="text-xs text-emerald-600 font-bold">Integrada</span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Modais de Upload e Conferência de NF-e
  let stagedInvoiceData = null;

  window.openUploadInvoiceModal = function() {
    const modalHtml = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Importação Inteligente de NF-e (PDF Digital)</h3>
              <p class="text-xs text-slate-500 mt-0.5">Leitura automática de cabeçalho, chave SEFAZ e todos os produtos da DANFE</p>
            </div>
            <button onclick="window.closeModal()" class="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div id="drop-zone" ondragover="event.preventDefault(); this.classList.add('border-brand-500', 'bg-brand-50/20')" ondragleave="this.classList.remove('border-brand-500', 'bg-brand-50/20')" ondrop="window.handlePdfDrop(event)" class="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50/50 hover:border-brand-500 transition-all cursor-pointer">
            <svg class="w-12 h-12 mx-auto text-brand-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
            <div class="text-sm font-bold text-slate-800">Clique para selecionar ou arraste o PDF da NF-e aqui</div>
            <p class="text-xs text-slate-400 mt-1">Compatível com DANFE digital padrão SEFAZ (incluindo notas de várias páginas)</p>
            <input type="file" id="nfe-pdf-file-input" accept=".pdf" onchange="window.handlePdfFileSelected(event)" class="hidden">
            <button type="button" onclick="document.getElementById('nfe-pdf-file-input').click()" class="mt-4 btn-primary">
              Procurar Arquivo PDF no Computador
            </button>
          </div>

          <div id="pdf-extraction-status" class="hidden p-3 rounded-xl text-xs flex items-center gap-2"></div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button type="button" onclick="window.loadSampleDanfe()" class="text-xs text-brand-600 font-bold hover:underline flex items-center gap-1.5">
              <span>📄 Carregar Exemplo de DANFE Real (Simulação de PDF Digital)</span>
            </button>
            <button type="button" onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  window.handlePdfFileSelected = function(e) {
    const file = e.target.files && e.target.files[0];
    if (file) window.processPdfFile(file);
  };

  window.handlePdfDrop = function(e) {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      window.processPdfFile(file);
    } else {
      alert('Por favor, anexe um arquivo digital no formato .PDF.');
    }
  };

  window.processPdfFile = async function(file) {
    const statusEl = document.getElementById('pdf-extraction-status');
    if (statusEl) {
      statusEl.className = 'p-3 rounded-xl text-xs flex items-center gap-2 bg-brand-50 text-brand-800 border border-brand-200';
      statusEl.innerHTML = `<span class="w-4 h-4 rounded-full border-2 border-brand-600 border-t-transparent animate-spin shrink-0"></span><span>Lendo páginas do documento e interpretando layout fiscal da DANFE...</span>`;
      statusEl.classList.remove('hidden');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const extracted = await window.danfeParser.extractTextFromPdf(arrayBuffer);
      const parsedData = window.danfeParser.parseDanfeData(extracted.fullText, extracted.allLines);

      stagedInvoiceData = parsedData;
      stagedInvoiceData.filename = file.name;
      stagedInvoiceData.numPages = extracted.numPages;

      if (statusEl) {
        statusEl.className = 'p-3 rounded-xl text-xs flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200';
        statusEl.innerHTML = `✓ Extração concluída: ${parsedData.products.length} produto(s) identificado(s) na nota fiscal.`;
      }

      setTimeout(() => {
        window.closeModal();
        window.openConferenceModal('staged');
      }, 500);
    } catch (err) {
      console.error('Falha na extração do PDF:', err);
      if (statusEl) {
        statusEl.className = 'p-3 rounded-xl text-xs flex items-center gap-2 bg-red-50 text-red-800 border border-red-200';
        statusEl.innerHTML = `Falha ao interpretar o PDF: ${err.message}.`;
      }
    }
  };

  window.loadSampleDanfe = function() {
    stagedInvoiceData = window.danfeParser.getSampleDanfeData();
    window.closeModal();
    window.openConferenceModal('staged');
  };

  window.openConferenceModal = function(invoiceIdOrStaged) {
    let inv = (invoiceIdOrStaged === 'staged') ? stagedInvoiceData : state.invoices.find(i => i.id === invoiceIdOrStaged);
    if (!inv) return;

    const activeUnit = getActiveUnit();
    const activeUnits = state.units.filter(u => u.is_active);
    const destinationUnitId = inv.unit_id || activeUnit?.id;
    const isKeyValid = window.danfeParser.validateNfeKey(inv.access_key);
    const formattedKey = window.danfeParser.formatAccessKey(inv.access_key);

    const modalHtml = `
      <div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
        <div class="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-bold text-slate-900">Conferência Física — NF-e ${inv.number} (Série ${inv.series || '1'})</h3>
                <span class="badge ${isKeyValid ? 'badge-success' : 'badge-warning'}">
                  ${isKeyValid ? '✓ Chave Válida (Módulo 11 SEFAZ)' : 'Chave não validada'}
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">Emitente: <strong>${inv.issuer_name || inv.issuer}</strong> — CNPJ: ${inv.issuer_cnpj || inv.cnpj || '—'}</p>
            </div>
            <button onclick="window.closeModal()" class="text-slate-400 hover:text-slate-600 text-sm">✕ Fechar</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Data de Emissão</span>
              <strong class="text-slate-800 font-mono">${inv.issue_date}</strong>
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Valor Total da Nota</span>
              <strong class="text-emerald-700 font-mono text-sm">${formatCurrency(inv.total_value)}</strong>
            </div>
            <div class="sm:col-span-2">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Chave de Acesso (44 Dígitos)</span>
              <span class="text-slate-700 font-mono text-[11px] block truncate" title="${inv.access_key}">${formattedKey}</span>
            </div>
          </div>

          <form onsubmit="window.submitInvoiceConference(event, '${invoiceIdOrStaged}')" class="space-y-4 text-xs">
            <!-- Direcionamento de Unidade e Origem (Sem dependência de setor!) -->
            <div class="p-4 bg-brand-50/50 rounded-xl border border-brand-200 space-y-3">
              <div class="font-bold text-brand-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <svg class="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>Direcionamento e Roteamento Logístico da Carga</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Unidade de Destino *</label>
                  <select id="conf-unit-select" class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-bold text-slate-800">
                    ${activeUnits.map(u => `
                      <option value="${u.id}" ${u.id === destinationUnitId ? 'selected' : ''}>
                        ${u.name} (${u.unit_type === 'HEADQUARTERS' ? 'Matriz' : 'Filial'})
                      </option>
                    `).join('')}
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Local de Origem / Carregamento *</label>
                  <input type="text" id="conf-origin-location" value="${inv.issuer_name || 'Planta Produtiva Sul'}" required class="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white font-medium">
                </div>
              </div>

              <div class="pt-2 border-t border-brand-200/60 flex items-center gap-2">
                <input type="checkbox" id="conf-is-direct-transit" class="rounded text-brand-600 focus:ring-brand-500 h-4 w-4">
                <label for="conf-is-direct-transit" class="text-slate-700 font-semibold cursor-pointer">
                  Mercadoria direcionada diretamente para a Filial de Itupeva (Carga em Trânsito — sem entrada física na Matriz)
                </label>
              </div>
            </div>

            <!-- Tabela Estruturada de Produtos -->
            <div class="border rounded-xl p-4 bg-white space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 class="font-bold text-slate-900 text-sm">Produtos Identificados na DANFE (${(inv.products || []).length} itens)</h4>
                  <p class="text-[11px] text-slate-400">Confira as quantidades em caixas inteiras antes de confirmar</p>
                </div>
                <button type="button" onclick="window.addManualInvoiceItem()" class="text-xs text-brand-600 font-bold hover:underline">
                  + Adicionar Item Avulso
                </button>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left" id="conf-items-table">
                  <thead>
                    <tr class="table-header">
                      <th class="table-cell">#</th>
                      <th class="table-cell">Descrição Original do Produto</th>
                      <th class="table-cell">Faturado</th>
                      <th class="table-cell text-right">Caixas Inteiras (Físico)</th>
                      <th class="table-cell text-right">Valor Unit. Ref.</th>
                      <th class="table-cell text-right">Valor Total</th>
                      <th class="table-cell text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody id="conf-items-tbody">
                    ${(inv.products || []).map((p, idx) => `
                      <tr class="border-b border-slate-100 hover:bg-slate-50" data-item-idx="${idx}">
                        <td class="table-cell font-mono text-[11px] text-slate-400">${idx + 1}</td>
                        <td class="table-cell">
                          <input type="text" value="${p.description}" required class="conf-item-desc border border-slate-200 rounded px-2.5 py-1 text-xs w-72 font-bold text-slate-800">
                          <div class="text-[10px] text-slate-400 font-mono mt-0.5">NCM: ${p.ncm || '—'} | Cód. Orig.: ${p.code || '—'}</div>
                        </td>
                        <td class="table-cell font-mono text-slate-600 whitespace-nowrap">
                          ${p.raw_qty} ${p.raw_unit}
                        </td>
                        <td class="table-cell text-right">
                          <input type="number" min="1" step="1" value="${p.boxes || Math.max(1, Math.round(p.raw_qty))}" required class="conf-item-boxes w-24 border-2 border-brand-500 rounded-lg px-2 py-1 text-right font-mono font-bold text-sm text-brand-700 bg-brand-50/20">
                          <div class="text-[10px] text-slate-400 text-right mt-0.5">caixas inteiras</div>
                        </td>
                        <td class="table-cell text-right font-mono text-slate-700 whitespace-nowrap">
                          <input type="number" step="0.01" min="0" value="${p.unit_price || 0}" class="conf-item-price w-20 border border-slate-200 rounded px-2 py-1 text-right font-mono text-xs">
                        </td>
                        <td class="table-cell text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                          ${formatCurrency(p.total_price)}
                        </td>
                        <td class="table-cell text-center">
                          <button type="button" onclick="this.closest('tr').remove()" class="text-red-500 hover:text-red-700 font-bold text-xs p-1">✕</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-slate-100">
              <div class="text-[11px] text-slate-500">
                🔒 Quantidades registradas diretamente em <strong>caixas inteiras (INTEGER)</strong> no livro-razão.
              </div>
              <div class="flex items-center gap-2">
                <button type="button" onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
                <button type="submit" class="btn-primary">Confirmar Entrada no Estoque / Registrar Carga</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  window.addManualInvoiceItem = function() {
    const tbody = document.getElementById('conf-items-tbody');
    if (!tbody) return;
    const idx = tbody.children.length;
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-100 hover:bg-slate-50';
    tr.innerHTML = `
      <td class="table-cell font-mono text-[11px] text-slate-400">${idx + 1}</td>
      <td class="table-cell"><input type="text" value="Novo Produto Identificado" required class="conf-item-desc border border-slate-200 rounded px-2.5 py-1 text-xs w-72 font-bold text-slate-800"></td>
      <td class="table-cell font-mono text-slate-600">10 CX</td>
      <td class="table-cell text-right"><input type="number" min="1" step="1" value="10" required class="conf-item-boxes w-24 border-2 border-brand-500 rounded-lg px-2 py-1 text-right font-mono font-bold text-sm text-brand-700 bg-brand-50/20"></td>
      <td class="table-cell text-right"><input type="number" step="0.01" min="0" value="50.00" class="conf-item-price w-20 border border-slate-200 rounded px-2 py-1 text-right font-mono text-xs"></td>
      <td class="table-cell text-right font-mono font-bold text-slate-800">R$ 500,00</td>
      <td class="table-cell text-center"><button type="button" onclick="this.closest('tr').remove()" class="text-red-500 hover:text-red-700 font-bold text-xs p-1">✕</button></td>
    `;
    tbody.appendChild(tr);
  };

  window.submitInvoiceConference = function(e, invoiceIdOrStaged) {
    e.preventDefault();

    const unitId = document.getElementById('conf-unit-select').value;
    const originLocation = document.getElementById('conf-origin-location').value.trim();
    const isDirectTransit = document.getElementById('conf-is-direct-transit').checked;

    const rows = document.querySelectorAll('#conf-items-tbody tr');
    if (rows.length === 0) {
      alert('Erro: A nota fiscal precisa conter pelo menos um item.');
      return;
    }

    const confirmedProducts = [];
    rows.forEach(r => {
      const desc = r.querySelector('.conf-item-desc').value.trim();
      const boxes = parseInt(r.querySelector('.conf-item-boxes').value, 10);
      const priceVal = parseFloat(r.querySelector('.conf-item-price').value);
      const price = (!isNaN(priceVal) && priceVal > 0) ? priceVal : null;

      if (!isNaN(boxes) && boxes > 0) {
        // Gera/recupera identificador técnico interno automaticamente
        const itemId = getOrCreateItemId(desc, price, 'CX');
        confirmedProducts.push({
          item_id: itemId,
          description: desc,
          boxes,
          unit_price: price
        });
      }
    });

    if (confirmedProducts.length === 0) {
      alert('Erro: Informe quantidades válidas de caixas inteiras.');
      return;
    }

    let inv = (invoiceIdOrStaged === 'staged') ? stagedInvoiceData : state.invoices.find(i => i.id === invoiceIdOrStaged);
    if (!inv) return;

    // Registra a nota fiscal como confirmada
    const invoiceRecord = {
      id: inv.id || ('inv-' + Date.now()),
      unit_id: unitId,
      number: inv.number || '00000',
      series: inv.series || '1',
      access_key: inv.access_key || '00000000000000000000000000000000000000000000',
      issuer: inv.issuer_name || inv.issuer || 'Fornecedor',
      cnpj: inv.issuer_cnpj || inv.cnpj || null,
      issue_date: inv.issue_date || new Date().toISOString().slice(0, 10),
      total_value: inv.total_value || confirmedProducts.reduce((a, p) => a + (p.boxes * (p.unit_price || 0)), 0),
      status: 'CONFIRMED',
      items: confirmedProducts
    };

    const existingIdx = state.invoices.findIndex(i => i.id === invoiceRecord.id);
    if (existingIdx !== -1) {
      state.invoices[existingIdx] = invoiceRecord;
    } else {
      state.invoices.unshift(invoiceRecord);
    }

    if (isDirectTransit) {
      const itupevaUnit = state.units.find(u => u.unit_type === 'BRANCH') || state.units[1];
      const totalBoxes = confirmedProducts.reduce((a, p) => a + p.boxes, 0);

      const transferRecord = {
        id: 'trf-' + Date.now(),
        code: 'TRF-DIR-' + inv.number,
        source_unit_id: unitId,
        destination_unit_id: itupevaUnit?.id,
        is_direct_to_branch: true,
        status: 'IN_TRANSIT',
        origin_location: originLocation,
        carrier: 'Logística de Distribuição Direta',
        vehicle_plate: 'DIR-2026',
        driver: 'Operador Logístico',
        requested_boxes: totalBoxes,
        shipped_boxes: totalBoxes,
        received_boxes: 0,
        shipped_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        items: confirmedProducts.map(cp => ({
          item_id: cp.item_id,
          description: cp.description,
          requested_boxes: cp.boxes,
          shipped_boxes: cp.boxes,
          unit_price: cp.unit_price
        }))
      };
      state.transfers.unshift(transferRecord);
      alert(`Sucesso! NF-e ${inv.number} registrada como CARGA DIRETA EM TRÂNSITO para Itupeva (${totalBoxes} caixas). O estoque físico da filial será atualizado apenas no momento da confirmação do recebimento.`);
    } else {
      // Entrada física direta nos lotes e no livro-razão
      confirmedProducts.forEach(cp => {
        const lotRecord = {
          id: 'lot-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          unit_id: unitId,
          item_id: cp.item_id,
          description: cp.description,
          lot_number: 'LOTE-NF' + inv.number,
          initial_boxes: cp.boxes,
          current_boxes: cp.boxes,
          reserved_boxes: 0,
          unit_price: cp.unit_price,
          invoice_number: inv.number,
          issuer_name: invoiceRecord.issuer,
          origin_location: originLocation,
          created_at: new Date().toISOString()
        };
        state.lots.unshift(lotRecord);

        state.movements.unshift({
          id: 'mov-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          unit_id: unitId,
          item_id: cp.item_id,
          product_name: cp.description,
          type: 'INVOICE_ENTRY',
          quantity_boxes: cp.boxes,
          balance_after: cp.boxes,
          reason: `Entrada física confirmada de NF-e ${inv.number} — Lote ${lotRecord.lot_number}`,
          origin_location: originLocation,
          created_at: new Date().toISOString(),
          operator: state.currentUser.name
        });
      });
      alert(`Sucesso! NF-e ${inv.number} conferida e integrada com sucesso ao estoque da unidade.`);
    }

    saveState();
    window.closeModal();
    renderApp();
  };

  // ===========================================================================
  // 4. TRANSFERÊNCIAS ENTRE UNIDADES
  // ===========================================================================
  function renderTransfers() {
    const activeUnit = getActiveUnit();
    const transfers = state.transfers.filter(t => t.source_unit_id === activeUnit?.id || t.destination_unit_id === activeUnit?.id);

    return `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">Transferências entre Unidades</h2>
          <p class="text-xs text-slate-500 mt-1">Workflow completo de solicitação, aprovação, separação, trânsito e conferência de recebimento</p>
        </div>
        <button onclick="window.openCreateTransferModal()" class="btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Nova Solicitação de Transferência
        </button>
      </div>

      <div class="card p-5">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="table-header">
                <th class="table-cell">Código TRF</th>
                <th class="table-cell">Origem</th>
                <th class="table-cell">Destino</th>
                <th class="table-cell">Status do Fluxo</th>
                <th class="table-cell">Caixas</th>
                <th class="table-cell text-right">Ação Operacional</th>
              </tr>
            </thead>
            <tbody>
              ${transfers.length === 0 ? `
                <tr><td colspan="6" class="table-cell text-center text-slate-400 py-10">Nenhuma transferência em andamento.</td></tr>
              ` : transfers.map(t => {
                const src = state.units.find(u => u.id === t.source_unit_id);
                const dst = state.units.find(u => u.id === t.destination_unit_id);
                const isSource = t.source_unit_id === activeUnit?.id;
                const isDest = t.destination_unit_id === activeUnit?.id;

                let badgeClass = 'badge-info';
                if (t.status === 'RECEIVED_COMPLETE') badgeClass = 'badge-success';
                if (t.status === 'RECEIVED_WITH_DIVERGENCE') badgeClass = 'badge-danger';
                if (t.status === 'IN_TRANSIT') badgeClass = 'badge-purple';
                if (t.status === 'PICKING') badgeClass = 'badge-warning';

                return `
                  <tr class="hover:bg-slate-50">
                    <td class="table-cell font-mono font-bold text-brand-600">${t.code}</td>
                    <td class="table-cell font-bold text-slate-800">${src?.name || 'Origem'}</td>
                    <td class="table-cell font-bold text-slate-800">${dst?.name || 'Destino'}</td>
                    <td class="table-cell"><span class="badge ${badgeClass}">${t.status}</span></td>
                    <td class="table-cell font-mono font-bold text-slate-700">${t.shipped_boxes || t.requested_boxes} cx</td>
                    <td class="table-cell text-right">
                      ${t.status === 'IN_TRANSIT' && isDest ? `
                        <button onclick="window.openReceiveModal('${t.id}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm">
                          Receber na Doca
                        </button>
                      ` : ''}
                      ${t.status === 'IN_TRANSIT' && !isDest ? `
                        <span class="text-xs font-semibold text-purple-700">Em trânsito p/ ${dst?.name}</span>
                      ` : ''}
                      ${t.status === 'REQUESTED' && isSource ? `
                        <button onclick="window.approveTransfer('${t.id}')" class="px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-xs">
                          Aprovar Envio
                        </button>
                      ` : ''}
                      ${t.status === 'APPROVED' && isSource ? `
                        <button onclick="window.openAllocateModal('${t.id}')" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs">
                          Alocar & Reservar
                        </button>
                      ` : ''}
                      ${t.status === 'PICKING' && isSource ? `
                        <button onclick="window.dispatchTransfer('${t.id}')" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs">
                          Despachar Carga
                        </button>
                      ` : ''}
                      ${t.status === 'RECEIVED_COMPLETE' ? `
                        <span class="text-xs text-emerald-600 font-bold">✓ Concluída</span>
                      ` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  window.openCreateTransferModal = function() {
    const activeUnit = getActiveUnit();
    const otherActiveUnits = state.units.filter(u => u.id !== activeUnit?.id && u.is_active);
    const availableItems = Array.from(new Set(state.lots.filter(l => l.unit_id === activeUnit?.id && l.current_boxes > l.reserved_boxes).map(l => l.description)));

    const modalHtml = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <h3 class="text-lg font-bold text-slate-900">Solicitar Transferência de Materiais</h3>
          <p class="text-xs text-slate-500 mt-1">Origem: <strong>${activeUnit?.name}</strong></p>

          <form onsubmit="window.saveTransferRequest(event)" class="space-y-4 mt-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Unidade de Destino (Ativa)</label>
              <select id="trf-dest-unit" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-800">
                ${otherActiveUnits.map(u => `<option value="${u.id}">${u.name} (${u.city}/${u.state_code})</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Produto / Material a Transferir</label>
              <select id="trf-product-desc" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-medium">
                ${availableItems.length > 0 ? availableItems.map(d => `<option value="${d}">${d}</option>`).join('') : '<option value="Material Diverso">Material Diverso</option>'}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Quantidade Solicitada (Caixas Inteiras)</label>
              <input type="number" min="1" step="1" id="trf-qty" value="10" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono font-bold">
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary">Enviar Solicitação</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  window.saveTransferRequest = function(e) {
    e.preventDefault();
    const destUnitId = document.getElementById('trf-dest-unit').value;
    const prodDesc = document.getElementById('trf-product-desc').value;
    const qty = parseInt(document.getElementById('trf-qty').value, 10);

    const refLot = state.lots.find(l => l.unit_id === state.activeUnitId && l.description === prodDesc);

    const newTrf = {
      id: 'trf-' + Date.now(),
      code: 'TRF-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900),
      source_unit_id: state.activeUnitId,
      destination_unit_id: destUnitId,
      is_direct_to_branch: false,
      status: 'REQUESTED',
      requested_boxes: qty,
      shipped_boxes: 0,
      received_boxes: 0,
      origin_location: 'Doca Matriz',
      created_at: new Date().toISOString(),
      items: [
        { item_id: refLot?.item_id || 'it-trf', description: prodDesc, requested_boxes: qty, unit_price: refLot?.unit_price }
      ]
    };

    state.transfers.unshift(newTrf);
    saveState();
    window.closeModal();
    renderApp();
  };

  window.approveTransfer = function(transferId) {
    const t = state.transfers.find(x => x.id === transferId);
    if (!t) return;
    t.status = 'APPROVED';
    saveState();
    renderApp();
  };

  window.openAllocateModal = function(transferId) {
    const t = state.transfers.find(x => x.id === transferId);
    if (!t) return;
    t.status = 'PICKING';
    t.shipped_boxes = t.requested_boxes;
    saveState();
    renderApp();
  };

  window.dispatchTransfer = function(transferId) {
    const t = state.transfers.find(x => x.id === transferId);
    if (!t) return;
    t.status = 'IN_TRANSIT';
    t.shipped_at = new Date().toISOString();
    saveState();
    renderApp();
  };

  window.openReceiveModal = function(transferId) {
    const t = state.transfers.find(x => x.id === transferId);
    if (!t) return;

    const modalHtml = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
          <h3 class="text-lg font-bold text-slate-900">Conferência de Recebimento — ${t.code}</h3>
          <p class="text-xs text-slate-500 mt-1">Despachado: <strong>${t.shipped_boxes} caixas</strong></p>

          <form onsubmit="window.confirmReceive(event, '${t.id}')" class="space-y-4 mt-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Caixas Inteiras Efetivamente Recebidas na Doca</label>
              <input type="number" min="0" step="1" id="rec-boxes" value="${t.shipped_boxes}" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono font-bold text-sm">
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary">Confirmar Recebimento Físico</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  window.confirmReceive = function(e, transferId) {
    e.preventDefault();
    const t = state.transfers.find(x => x.id === transferId);
    if (!t) return;

    const receivedBoxes = parseInt(document.getElementById('rec-boxes').value, 10);
    t.received_boxes = receivedBoxes;
    t.status = (receivedBoxes === t.shipped_boxes) ? 'RECEIVED_COMPLETE' : 'RECEIVED_WITH_DIVERGENCE';

    (t.items || []).forEach(it => {
      const newLot = {
        id: 'lot-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        unit_id: t.destination_unit_id,
        item_id: it.item_id,
        description: it.description,
        lot_number: 'LOTE-TRF-' + t.code,
        initial_boxes: receivedBoxes,
        current_boxes: receivedBoxes,
        reserved_boxes: 0,
        unit_price: it.unit_price,
        invoice_number: 'TRF-' + t.code,
        issuer_name: 'Transferência ' + t.code,
        origin_location: t.origin_location || 'Transferência',
        created_at: new Date().toISOString()
      };
      state.lots.unshift(newLot);

      state.movements.unshift({
        id: 'mov-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        unit_id: t.destination_unit_id,
        item_id: it.item_id,
        product_name: it.description,
        type: 'TRANSFER_RECEIPT',
        quantity_boxes: receivedBoxes,
        balance_after: receivedBoxes,
        reason: `Recebimento de transferência ${t.code}`,
        origin_location: t.origin_location || 'Doca Filial',
        created_at: new Date().toISOString(),
        operator: state.currentUser.name
      });
    });

    saveState();
    window.closeModal();
    renderApp();
  };

  // ===========================================================================
  // 5. MOVIMENTAÇÕES (LIVRO-RAZÃO APPEND-ONLY)
  // ===========================================================================
  function renderMovements() {
    const activeUnit = getActiveUnit();
    const movements = state.movements.filter(m => dashboardFilters.unitId === 'all' || m.unit_id === activeUnit?.id);

    return `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">Histórico de Movimentações — Livro-Razão</h2>
          <p class="text-xs text-slate-500 mt-1">Livro-razão fiduciário imutável (append-only) com rastreabilidade completa por unidade</p>
        </div>
        <button onclick="window.exportMovementsCsv()" class="btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Exportar Livro-Razão (CSV)
        </button>
      </div>

      <div class="card p-5">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="table-header">
                <th class="table-cell">Data / Hora</th>
                <th class="table-cell">ID Movimento</th>
                <th class="table-cell">Unidade</th>
                <th class="table-cell">Tipo</th>
                <th class="table-cell">Descrição do Produto</th>
                <th class="table-cell text-right">Caixas</th>
                <th class="table-cell text-right">Saldo Resultante</th>
                <th class="table-cell">Origem / Procedência</th>
                <th class="table-cell">Justificativa Fiduciária</th>
                <th class="table-cell">Operador</th>
              </tr>
            </thead>
            <tbody>
              ${movements.length === 0 ? `
                <tr><td colspan="10" class="table-cell text-center text-slate-400 py-10">Nenhuma movimentação registrada no livro-razão.</td></tr>
              ` : movements.map(m => {
                const unit = state.units.find(u => u.id === m.unit_id);
                const isPos = m.quantity_boxes > 0;
                return `
                  <tr class="hover:bg-slate-50">
                    <td class="table-cell font-mono text-[11px] text-slate-500 whitespace-nowrap">${formatDateTime(m.created_at)}</td>
                    <td class="table-cell font-mono text-[10px] text-slate-400">${m.id}</td>
                    <td class="table-cell font-bold text-slate-700 text-xs">${unit?.name || '—'}</td>
                    <td class="table-cell">
                      <span class="badge ${isPos ? 'badge-success' : 'badge-danger'}">${m.type}</span>
                    </td>
                    <td class="table-cell font-bold text-slate-800">${m.product_name}</td>
                    <td class="table-cell text-right font-mono font-bold ${isPos ? 'text-emerald-600' : 'text-red-600'}">
                      ${isPos ? '+' : ''}${m.quantity_boxes} cx
                    </td>
                    <td class="table-cell text-right font-mono font-bold text-slate-800">${m.balance_after !== undefined ? m.balance_after + ' cx' : '—'}</td>
                    <td class="table-cell text-slate-600 text-xs">${m.origin_location || '—'}</td>
                    <td class="table-cell text-slate-600 max-w-xs truncate" title="${m.reason}">${m.reason}</td>
                    <td class="table-cell text-slate-500 text-xs">${m.operator}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  window.exportMovementsCsv = function() {
    if (state.movements.length === 0) return alert('Nenhum dado para exportar.');
    const headers = ['Data_Hora;ID;Unidade;Tipo;Produto;Caixas;Saldo_Resultante;Origem;Justificativa;Operador'];
    const rows = state.movements.map(m => {
      const unit = state.units.find(u => u.id === m.unit_id);
      return `"${m.created_at}";"${m.id}";"${unit?.name}";"${m.type}";"${m.product_name}";${m.quantity_boxes};${m.balance_after || ''};"${m.origin_location || ''}";"${m.reason}";"${m.operator}"`;
    });
    const csvContent = '\ufeff' + headers.concat(rows).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `livro_razao_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // ===========================================================================
  // 6. ADMINISTRAÇÃO (UNIDADES & FILIAIS COM CADASTRO, EDIÇÃO, EXCLUSÃO E INATIVAÇÃO)
  // ===========================================================================
  function renderAdmin() {
    return `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">Administração de Unidades & Filiais</h2>
          <p class="text-xs text-slate-500 mt-1">Gerenciamento completo: cadastro dinâmico, edição cadastral, inativação e controle de exclusão</p>
        </div>
        <button onclick="window.openAddUnitModal()" class="btn-primary">
          + Nova Unidade
        </button>
      </div>

      <div class="card p-5">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="table-header">
                <th class="table-cell">Código</th>
                <th class="table-cell">Nome da Unidade</th>
                <th class="table-cell">Cidade / UF</th>
                <th class="table-cell">Tipo</th>
                <th class="table-cell">CNPJ</th>
                <th class="table-cell">Endereço</th>
                <th class="table-cell">Situação</th>
                <th class="table-cell text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${state.units.map(u => {
                const isHQ = u.unit_type === 'HEADQUARTERS';
                return `
                  <tr class="hover:bg-slate-50">
                    <td class="table-cell font-mono font-bold text-brand-600">${u.code}</td>
                    <td class="table-cell font-bold text-slate-900">${u.name}</td>
                    <td class="table-cell text-slate-600">${u.city} - ${u.state_code}</td>
                    <td class="table-cell">
                      <span class="badge ${isHQ ? 'badge-purple' : 'badge-info'}">
                        ${isHQ ? 'MATRIZ' : 'FILIAL'}
                      </span>
                    </td>
                    <td class="table-cell font-mono text-xs text-slate-500">${u.tax_id || 'Configurável (NULL)'}</td>
                    <td class="table-cell text-xs text-slate-500">${u.address || '—'}</td>
                    <td class="table-cell">
                      <span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">
                        ${u.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td class="table-cell text-right space-x-1 whitespace-nowrap">
                      <!-- Ações de Gestão -->
                      <button onclick="window.openEditUnitModal('${u.id}')" class="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold">
                        Editar
                      </button>
                      ${!isHQ ? `
                        <button onclick="window.toggleUnitStatus('${u.id}')" class="px-2.5 py-1 ${u.is_active ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'} rounded-lg text-xs font-bold">
                          ${u.is_active ? 'Inativar' : 'Reativar'}
                        </button>
                        <button onclick="window.openDeleteUnitModal('${u.id}')" class="px-2.5 py-1 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-bold">
                          Excluir
                        </button>
                      ` : `
                        <span class="text-[10px] text-purple-700 font-bold px-2 py-1 bg-purple-50 rounded-lg">Matriz Protegida</span>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // A) Cadastrar Nova Unidade
  window.openAddUnitModal = function() {
    const modalHtml = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
          <h3 class="text-lg font-bold text-slate-900">Cadastrar Nova Unidade / Filial</h3>
          <p class="text-xs text-slate-500 mt-1">Registro dinâmico no banco de dados.</p>
          <form onsubmit="window.saveNewUnit(event)" class="space-y-4 mt-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Código da Unidade *</label>
              <input type="text" id="new-unit-code" required placeholder="ex: FIL-PR-01" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Nome da Unidade *</label>
              <input type="text" id="new-unit-name" required placeholder="ex: Filial Curitiba" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-bold">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Cidade *</label>
                <input type="text" id="new-unit-city" required placeholder="Curitiba" class="w-full border border-slate-300 rounded-xl px-3.5 py-2">
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">UF (Estado) *</label>
                <input type="text" id="new-unit-state" required maxlength="2" placeholder="PR" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 uppercase font-mono">
              </div>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Endereço Completo</label>
              <input type="text" id="new-unit-address" placeholder="Rua / Distrito Industrial..." class="w-full border border-slate-300 rounded-xl px-3.5 py-2">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">CNPJ (Opcional)</label>
              <input type="text" id="new-unit-tax" placeholder="00.000.000/0000-00 (ou deixar vazio)" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono">
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary">Cadastrar Unidade</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  window.saveNewUnit = function(e) {
    e.preventDefault();
    const code = document.getElementById('new-unit-code').value.trim().toUpperCase();
    const name = document.getElementById('new-unit-name').value.trim();
    const city = document.getElementById('new-unit-city').value.trim();
    const stateCode = document.getElementById('new-unit-state').value.trim().toUpperCase();
    const address = document.getElementById('new-unit-address').value.trim() || null;
    const taxId = document.getElementById('new-unit-tax').value.trim() || null;

    state.units.push({
      id: 'unit-' + Date.now(),
      code,
      name,
      city,
      state_code: stateCode,
      unit_type: 'BRANCH',
      tax_id: taxId,
      address,
      is_active: true
    });

    saveState();
    window.closeModal();
    renderApp();
    alert(`Unidade "${name}" cadastrada com sucesso!`);
  };

  // B) Editar Unidade Existente
  window.openEditUnitModal = function(unitId) {
    const u = state.units.find(x => x.id === unitId);
    if (!u) return;

    const modalHtml = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
          <h3 class="text-lg font-bold text-slate-900">Editar Unidade — ${u.name}</h3>
          <p class="text-xs text-slate-500 mt-1">Atualização cadastral no sistema.</p>

          <form onsubmit="window.saveEditUnit(event, '${u.id}')" class="space-y-4 mt-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Código da Unidade</label>
              <input type="text" id="edit-unit-code" value="${u.code}" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Nome da Unidade</label>
              <input type="text" id="edit-unit-name" value="${u.name}" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-bold">
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Cidade</label>
                <input type="text" id="edit-unit-city" value="${u.city}" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2">
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">UF (Estado)</label>
                <input type="text" id="edit-unit-state" value="${u.state_code}" required maxlength="2" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 uppercase font-mono">
              </div>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Endereço Completo</label>
              <input type="text" id="edit-unit-address" value="${u.address || ''}" class="w-full border border-slate-300 rounded-xl px-3.5 py-2">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">CNPJ (Opcional)</label>
              <input type="text" id="edit-unit-tax" value="${u.tax_id || ''}" placeholder="00.000.000/0000-00" class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono">
            </div>
            <div class="flex items-center gap-2 pt-1">
              <input type="checkbox" id="edit-unit-active" ${u.is_active ? 'checked' : ''} ${u.unit_type === 'HEADQUARTERS' ? 'disabled' : ''} class="rounded text-brand-600 h-4 w-4">
              <label for="edit-unit-active" class="font-bold text-slate-700">Unidade em Situação Ativa</label>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary">Salvar Alterações</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  window.saveEditUnit = function(e, unitId) {
    e.preventDefault();
    const u = state.units.find(x => x.id === unitId);
    if (!u) return;

    u.code = document.getElementById('edit-unit-code').value.trim().toUpperCase();
    u.name = document.getElementById('edit-unit-name').value.trim();
    u.city = document.getElementById('edit-unit-city').value.trim();
    u.state_code = document.getElementById('edit-unit-state').value.trim().toUpperCase();
    u.address = document.getElementById('edit-unit-address').value.trim() || null;
    u.tax_id = document.getElementById('edit-unit-tax').value.trim() || null;

    if (u.unit_type !== 'HEADQUARTERS') {
      u.is_active = document.getElementById('edit-unit-active').checked;
    }

    saveState();
    window.closeModal();
    renderApp();
  };

  // C) Inativar / Reativar Unidade
  window.toggleUnitStatus = function(unitId) {
    const u = state.units.find(x => x.id === unitId);
    if (!u) return;

    if (u.unit_type === 'HEADQUARTERS') {
      alert('Atenção: A Matriz Central de Chapecó não pode ser inativada.');
      return;
    }

    u.is_active = !u.is_active;

    // Se inativou a unidade que estava ativa no seletor, volta para a Matriz
    if (!u.is_active && state.activeUnitId === u.id) {
      const hq = state.units.find(x => x.unit_type === 'HEADQUARTERS') || state.units[0];
      state.activeUnitId = hq.id;
    }

    saveState();
    renderApp();
    alert(`Unidade "${u.name}" agora está ${u.is_active ? 'ATIVA' : 'INATIVA'}.`);
  };

  // D) Excluir Unidade com Verificação Rigorosa de Dependências
  window.openDeleteUnitModal = function(unitId) {
    const u = state.units.find(x => x.id === unitId);
    if (!u) return;

    // Proteção absoluta da Matriz
    if (u.unit_type === 'HEADQUARTERS') {
      alert('Atenção: A Matriz de Chapecó é a unidade central corporativa do sistema e não pode ser excluída.');
      return;
    }

    // 1. Verificação de Vínculos e Dependências Fiduciárias
    const linkedLots = state.lots.filter(l => l.unit_id === u.id);
    const linkedTransfers = state.transfers.filter(t => t.source_unit_id === u.id || t.destination_unit_id === u.id);
    const linkedMovements = state.movements.filter(m => m.unit_id === u.id);
    const linkedInvoices = state.invoices.filter(i => i.unit_id === u.id);

    const hasDependencies = (linkedLots.length > 0 || linkedTransfers.length > 0 || linkedMovements.length > 0 || linkedInvoices.length > 0);

    let modalHtml = '';

    if (hasDependencies) {
      // IMPEDE EXCLUSÃO FÍSICA E OFERECE INATIVAÇÃO
      modalHtml = `
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-red-200 space-y-4">
            <div class="flex items-center gap-3 text-red-600 border-b border-red-100 pb-3">
              <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <div>
                <h3 class="text-base font-bold text-slate-900">Exclusão Bloqueada: Registros Históricos Vinculados</h3>
                <p class="text-xs text-red-600 font-medium">Unidade: <strong>${u.name} (${u.city}/${u.state_code})</strong></p>
              </div>
            </div>

            <p class="text-xs text-slate-600">
              Para preservar a <strong>integridade fiduciária, fiscal e histórica</strong>, esta unidade <u>não pode ser excluída fisicamente</u> porque possui movimentações e saldos ativos vinculados:
            </p>

            <div class="grid grid-cols-2 gap-2 text-xs bg-red-50/50 p-3 rounded-xl border border-red-100 font-mono">
              <div>• Lotes em Estoque: <strong>${linkedLots.length}</strong></div>
              <div>• Transferências: <strong>${linkedTransfers.length}</strong></div>
              <div>• Movimentações Livro-Razão: <strong>${linkedMovements.length}</strong></div>
              <div>• Notas Fiscais: <strong>${linkedInvoices.length}</strong></div>
            </div>

            <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
              <strong>Solução Recomendada:</strong> Inative a unidade. Uma unidade inativa não recebe novas transferências ou lançamentos, mas preserva 100% do histórico operacional e fiscal.
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
              <button onclick="window.toggleUnitStatus('${u.id}'); window.closeModal();" class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm">
                Inativar Unidade
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      // UNIDADE SEM VÍNCULOS: PERMITE EXCLUSÃO PERMANENTE
      modalHtml = `
        <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 class="text-lg font-bold text-red-600">Confirmar Exclusão de Unidade</h3>
            <p class="text-xs text-slate-600">
              Tem certeza de que deseja excluir permanentemente a unidade <strong>${u.name}</strong> (${u.city}/${u.state_code})?
            </p>
            <p class="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              ✓ Esta unidade não possui nenhum histórico, lote ou transferência vinculada. A exclusão será definitiva.
            </p>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
              <button onclick="window.confirmPermanentDeleteUnit('${u.id}')" class="btn-danger">
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      `;
    }

    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  window.confirmPermanentDeleteUnit = function(unitId) {
    const idx = state.units.findIndex(x => x.id === unitId);
    if (idx === -1) return;

    const u = state.units[idx];
    state.units.splice(idx, 1);

    if (state.activeUnitId === unitId) {
      const hq = state.units.find(x => x.unit_type === 'HEADQUARTERS') || state.units[0];
      state.activeUnitId = hq.id;
    }

    saveState();
    window.closeModal();
    renderApp();
    alert(`Unidade "${u.name}" excluída com sucesso.`);
  };

  // ===========================================================================
  // 7. CONFIGURAÇÕES
  // ===========================================================================
  function renderSettings() {
    return `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900">Configurações do Sistema</h2>
          <p class="text-xs text-slate-500 mt-1">Parâmetros operacionais, integridade e informações do ambiente</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="card p-6 space-y-4">
          <h3 class="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Informações da Plataforma</h3>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-50">
              <span class="text-slate-500">Aplicação:</span>
              <strong class="text-slate-800">Central de Avarias</strong>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-50">
              <span class="text-slate-500">Versão:</span>
              <span class="badge badge-info">3.0 (Operação Simplificada)</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-50">
              <span class="text-slate-500">Controle de Unidades:</span>
              <strong class="text-slate-800">Multiunidade Dinâmica (Matriz Chapecó / Filiais)</strong>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-50">
              <span class="text-slate-500">Padrão de Volume:</span>
              <strong class="text-slate-800">Caixas Inteiras (INTEGER)</strong>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-500">Identificação Técnica:</span>
              <strong class="text-emerald-700">Automática sem dependência de Catálogo/SKU</strong>
            </div>
          </div>
        </div>

        <div class="card p-6 space-y-4">
          <h3 class="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Manutenção e Redefinição</h3>
          <p class="text-xs text-slate-500">
            Caso deseje restaurar os dados iniciais de demonstração (Matriz Chapecó, Filial Itupeva e cargas em trânsito), utilize o botão abaixo.
          </p>
          <div class="pt-4">
            <button onclick="window.resetSystemData()" class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all">
              Redefinir Dados para Padrão de Demonstração
            </button>
          </div>
        </div>
      </div>
    `;
  }

  window.resetSystemData = function() {
    if (confirm('Atenção: Deseja redefinir os dados para o padrão inicial de demonstração? Todas as alterações manuais serão resetadas.')) {
      localStorage.removeItem(STORAGE_KEY);
      state = JSON.parse(JSON.stringify(INITIAL_DATA));
      saveState();
      renderApp();
      alert('Dados redefinidos com sucesso.');
    }
  };

  // ===========================================================================
  // MODAIS DE AJUSTE, BAIXA E DETALHAMENTO DE TRÂNSITO
  // ===========================================================================
  window.closeModal = function() {
    const el = document.getElementById('modal-container');
    if (el) el.innerHTML = '';
  };

  window.appNav = function(route) {
    navigateTo(route);
  };

  window.switchUnit = function(unitId) {
    state.activeUnitId = unitId;
    saveState();
    renderApp();
  };

  window.openAdjustModal = function(lotId) {
    const lot = state.lots.find(l => l.id === lotId);
    if (!lot) return;

    const modalHtml = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
          <h3 class="text-lg font-bold text-slate-900">Ajuste Fiduciário de Estoque</h3>
          <p class="text-xs text-slate-500 mt-1">Lote: <strong>${lot.lot_number}</strong> — ${lot.description}</p>

          <form onsubmit="window.saveAdjust(event, '${lot.id}')" class="space-y-4 mt-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Novo Saldo Físico (Caixas Inteiras)</label>
              <input type="number" min="0" step="1" id="adj-boxes" value="${lot.current_boxes}" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono font-bold text-sm">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Justificativa Obrigatória</label>
              <textarea id="adj-reason" required rows="3" placeholder="Motivo da recontagem física..." class="w-full border border-slate-300 rounded-xl p-3"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary">Registrar no Livro-Razão</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  window.saveAdjust = function(e, lotId) {
    e.preventDefault();
    const newQty = parseInt(document.getElementById('adj-boxes').value, 10);
    const reason = document.getElementById('adj-reason').value.trim();
    const lot = state.lots.find(l => l.id === lotId);
    if (!lot) return;

    const diff = newQty - lot.current_boxes;
    lot.current_boxes = newQty;

    state.movements.unshift({
      id: 'mov-' + Date.now(),
      unit_id: lot.unit_id,
      item_id: lot.item_id,
      product_name: lot.description,
      type: 'ADJUST_AVARIA',
      quantity_boxes: diff,
      balance_after: newQty,
      reason: reason,
      origin_location: lot.origin_location || 'Galpão Unidade',
      created_at: new Date().toISOString(),
      operator: state.currentUser.name
    });

    saveState();
    window.closeModal();
    renderApp();
  };

  window.openWriteOffModal = function(lotId) {
    const lot = state.lots.find(l => l.id === lotId);
    if (!lot) return;

    const modalHtml = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
          <h3 class="text-lg font-bold text-red-600">Baixa Definitiva de Material Avariado</h3>
          <p class="text-xs text-slate-500 mt-1">Lote: <strong>${lot.lot_number}</strong> — ${lot.description}</p>

          <form onsubmit="window.saveWriteOff(event, '${lot.id}')" class="space-y-4 mt-4 text-xs">
            <div>
              <label class="block font-bold text-slate-700 mb-1">Quantidade de Caixas a Baixar</label>
              <input type="number" min="1" max="${lot.current_boxes - lot.reserved_boxes}" step="1" id="wo-boxes" value="1" required class="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono font-bold">
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Motivo da Baixa</label>
              <select id="wo-reason-type" class="w-full border border-slate-300 rounded-xl px-3.5 py-2">
                <option value="DESCARTE_LIXO">Descarte Físico / Incineração</option>
                <option value="DOACAO">Doação Autorizada</option>
                <option value="DEVOLUCAO_FORNECEDOR">Devolução ao Fornecedor com NF</option>
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">Justificativa e Laudo de Perda</label>
              <textarea id="wo-reason" required rows="3" placeholder="Informações de descarte..." class="w-full border border-slate-300 rounded-xl p-3"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onclick="window.closeModal()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-danger">Confirmar Baixa Definitiva</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  window.saveWriteOff = function(e, lotId) {
    e.preventDefault();
    const qty = parseInt(document.getElementById('wo-boxes').value, 10);
    const reasonType = document.getElementById('wo-reason-type').value;
    const reason = document.getElementById('wo-reason').value.trim();
    const lot = state.lots.find(l => l.id === lotId);
    if (!lot) return;

    lot.current_boxes -= qty;

    state.movements.unshift({
      id: 'mov-' + Date.now(),
      unit_id: lot.unit_id,
      item_id: lot.item_id,
      product_name: lot.description,
      type: 'WRITE_OFF',
      quantity_boxes: -qty,
      balance_after: lot.current_boxes,
      reason: `[${reasonType}] ${reason}`,
      origin_location: lot.origin_location || 'Doca Descarte',
      created_at: new Date().toISOString(),
      operator: state.currentUser.name
    });

    saveState();
    window.closeModal();
    renderApp();
  };

  window.openTransitDetailsModal = function() {
    const activeInTransit = state.transfers.filter(t => t.status === 'IN_TRANSIT');
    const itupevaUnit = state.units.find(u => u.unit_type === 'BRANCH') || state.units[1];

    const modalHtml = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-bold text-slate-900">Detalhamento de Cargas em Trânsito</h3>
              <p class="text-xs text-slate-500">Mercadorias em deslocamento logístico direcionadas para a filial de Itupeva</p>
            </div>
            <span class="badge badge-purple">${activeInTransit.length} remessa(s) em trânsito</span>
          </div>

          <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <div>
              <strong>Regra de Integridade Fiduciária:</strong> As mercadorias listadas abaixo estão em trânsito e <u>NÃO</u> são computadas no saldo físico da filial de Itupeva até que ocorra a conferência física e confirmação formal do recebimento.
            </div>
          </div>

          ${activeInTransit.length === 0 ? `
            <div class="p-8 text-center text-slate-400 text-xs">
              Nenhuma remessa em trânsito no momento.
            </div>
          ` : activeInTransit.map(t => {
            const src = state.units.find(u => u.id === t.source_unit_id);
            const dst = state.units.find(u => u.id === t.destination_unit_id);
            return `
              <div class="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-brand-600 text-sm">${t.code}</span>
                    <span class="badge ${t.is_direct_to_branch ? 'badge-info' : 'badge-purple'}">
                      ${t.is_direct_to_branch ? 'Carga Direta (Sem Passar por Chapecó)' : 'Transferência Matriz ➔ Filial'}
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-500 font-mono">
                    Despachado em: ${formatDateTime(t.shipped_at)}
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Origem de Carregamento</span>
                    <strong class="text-slate-800">${t.origin_location || src?.name}</strong>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Destino Programado</span>
                    <strong class="text-slate-800">${dst?.name} (${dst?.city}/${dst?.state_code})</strong>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[10px] uppercase font-bold">Transporte / Veículo</span>
                    <span class="text-slate-700">${t.carrier || 'Frota Própria'} — Placa: ${t.vehicle_plate || '—'}</span>
                  </div>
                </div>

                <div class="bg-white rounded-lg border border-slate-200 p-3">
                  <div class="text-[11px] font-bold text-slate-700 uppercase mb-2">Produtos Transportados</div>
                  <table class="w-full text-xs">
                    <thead>
                      <tr class="text-slate-400 border-b border-slate-100 text-[10px] uppercase">
                        <th class="text-left pb-1">Produto</th>
                        <th class="text-right pb-1">Caixas Despachadas</th>
                        <th class="text-right pb-1">Valor Unitário Ref.</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(t.items || []).map(it => `
                        <tr class="border-b border-slate-50">
                          <td class="py-1.5 font-bold text-slate-800">${it.description || 'Item'}</td>
                          <td class="py-1.5 text-right font-mono font-bold text-purple-700">${it.shipped_boxes || it.requested_boxes} cx</td>
                          <td class="py-1.5 text-right font-mono text-slate-600">${formatCurrency(it.unit_price)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>

                <div class="flex items-center justify-between text-xs pt-1">
                  <span class="font-bold text-slate-700">Total da Carga: ${t.shipped_boxes || t.requested_boxes} caixas</span>
                  ${state.activeUnitId === itupevaUnit?.id ? `
                    <button onclick="window.closeModal(); window.openReceiveModal('${t.id}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm">
                      Confirmar Recebimento em Itupeva
                    </button>
                  ` : `
                    <span class="text-[11px] text-slate-400">Alterne para Itupeva para confirmar o recebimento na doca</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}

          <div class="flex justify-end pt-3 border-t border-slate-100">
            <button onclick="window.closeModal()" class="btn-secondary">Fechar</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('modal-container').innerHTML = modalHtml;
  };

  // Inicialização da Aplicação
  renderApp();
})();
