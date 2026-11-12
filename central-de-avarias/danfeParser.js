/**
 * ==============================================================================
 * CENTRAL DE AVARIAS — PARSER INTELIGENTE DE NF-e / DANFE (PDF DIGITAL)
 * ==============================================================================
 * Extração automatizada de dados gerais e tabela completa de produtos
 * Suporte a PDFs multipáginas, validação Módulo 11 SEFAZ e conversão em caixas inteiras.
 * ==============================================================================
 */

(function () {
  'use strict';

  // 1. Validação de Chave de Acesso de 44 Dígitos (Módulo 11 Oficial SEFAZ)
  function validateNfeKey(key) {
    if (!key) return false;
    const cleanKey = String(key).replace(/\D/g, '');
    if (cleanKey.length !== 44) return false;

    const base = cleanKey.substring(0, 43);
    const dv = parseInt(cleanKey.charAt(43), 10);

    let sum = 0;
    let weight = 2;
    for (let i = base.length - 1; i >= 0; i--) {
      sum += parseInt(base.charAt(i), 10) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }

    const remainder = sum % 11;
    const calculatedDv = (remainder === 0 || remainder === 1) ? 0 : 11 - remainder;
    return calculatedDv === dv;
  }

  // 2. Formatação da Chave de Acesso em 11 blocos de 4 dígitos
  function formatAccessKey(key) {
    if (!key) return '';
    const clean = String(key).replace(/\D/g, '');
    if (clean.length !== 44) return clean;
    return clean.replace(/(\d{4})/g, '$1 ').trim();
  }

  // 3. Auxiliares de conversão numérica brasileira (1.250,50 -> 1250.50)
  function parsePtBrNumber(str) {
    if (!str) return 0;
    const clean = String(str).trim().replace(/\./g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }

  // 4. Extração de Texto Completo e Linhas Estruturadas via PDF.js
  async function extractTextFromPdf(arrayBuffer) {
    if (!window.pdfjsLib) {
      throw new Error('Biblioteca PDF.js não está carregada no navegador.');
    }

    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    let fullText = '';
    const allLines = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items || [];

      if (items.length === 0) continue;

      // Agrupa itens de texto em linhas com tolerância vertical de coordenadas Y
      const lineMap = new Map();
      items.forEach(item => {
        if (!item.str || item.str.trim() === '') return;
        const y = Math.round(item.transform[5] / 3) * 3; // Agrupador com tolerância de 3 pontos
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y).push({
          x: item.transform[4],
          str: item.str
        });
      });

      // Ordena linhas de cima para baixo (em PDF o Y maior fica no topo)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      sortedYs.forEach(y => {
        const lineItems = lineMap.get(y).sort((a, b) => a.x - b.x);
        const lineStr = lineItems.map(it => it.str).join(' ').trim();
        if (lineStr.length > 0) {
          allLines.push(lineStr);
          fullText += lineStr + '\n';
        }
      });
    }

    return { fullText, allLines, numPages };
  }

  // 5. Parser Principal da DANFE
  function parseDanfeData(fullText, allLines) {
    const result = {
      number: '',
      series: '1',
      access_key: '',
      is_key_valid: false,
      issue_date: new Date().toISOString().slice(0, 10),
      issuer_name: '',
      issuer_cnpj: '',
      recipient_name: '',
      recipient_cnpj: '',
      total_value: 0,
      total_products_value: 0,
      products: []
    };

    // A) Extração da Chave de Acesso (44 dígitos)
    // Procura por 44 dígitos contínuos ou espaçados
    const keyMatch = fullText.match(/\b\d{4}(?:[\s\.]*\d{4}){10}\b/) || fullText.match(/\b\d{44}\b/);
    if (keyMatch) {
      const cleanKey = keyMatch[0].replace(/\D/g, '');
      if (cleanKey.length === 44) {
        result.access_key = cleanKey;
        result.is_key_valid = validateNfeKey(cleanKey);

        // Se encontrou a chave de 44 dígitos, extrai metadados fiscais oficiais da própria chave:
        // Posição 22-25: Série (3 dígitos)
        // Posição 25-34: Número da NF (9 dígitos)
        const seriesFromKey = parseInt(cleanKey.substring(22, 25), 10);
        const numFromKey = parseInt(cleanKey.substring(25, 34), 10);
        if (!isNaN(seriesFromKey) && seriesFromKey > 0) result.series = String(seriesFromKey);
        if (!isNaN(numFromKey) && numFromKey > 0) result.number = String(numFromKey);
      }
    }

    // B) Extração do Número da NF-e (se ainda não preenchido ou confirmação do cabeçalho)
    const numRegex = /(?:NF-e\s*N[ºo\.]?|DANFE\s*N[ºo\.]?|N[ºo\.]?\s*[:\.]?)\s*0*([0-9\.]+)\b/i;
    const numMatch = fullText.match(numRegex);
    if (numMatch && (!result.number || result.number === '')) {
      result.number = numMatch[1].replace(/\./g, '');
    }

    // C) Extração da Série
    const seriesMatch = fullText.match(/(?:S[EÉ]RIE|SERIE)\s*[:\.]?\s*(\d{1,3})\b/i);
    if (seriesMatch) {
      result.series = seriesMatch[1];
    }

    // D) Data de Emissão (DD/MM/YYYY)
    const dateMatch = fullText.match(/(?:DATA\s+(?:DA\s+)?EMISS[ÃA]O)\s*[:\.]?\s*(\d{2}\/\d{2}\/\d{4})/i) ||
                      fullText.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if (dateMatch) {
      const parts = dateMatch[1].split('/');
      if (parts.length === 3) {
        result.issue_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // E) CNPJ do Emitente e Destinatário
    const cnpjs = [];
    const cnpjRegex = /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/g;
    let match;
    while ((match = cnpjRegex.exec(fullText)) !== null) {
      cnpjs.push(match[1]);
    }

    if (cnpjs.length > 0) result.issuer_cnpj = cnpjs[0];
    if (cnpjs.length > 1) result.recipient_cnpj = cnpjs[1];

    // F) Razão Social do Emitente
    // Procura nas primeiras 15 linhas do texto
    for (let i = 0; i < Math.min(15, allLines.length); i++) {
      const line = allLines[i];
      if (/LTDA|S\.?A\.?|EIRELI|ALIMENTOS|LATIC[ÍI]NIOS|FRIGOR[ÍI]FICO|COM[EÉ]RCIO|DISTRIBUIDORA/i.test(line) &&
          !/DANFE|DOCUMENTO|AUXILIAR|RECEBEMOS/i.test(line)) {
        result.issuer_name = line.replace(/^(?:EMITENTE|RAZÃO SOCIAL|NOME)\s*[:\.]?/i, '').trim();
        break;
      }
    }
    if (!result.issuer_name && allLines.length > 2) {
      result.issuer_name = allLines[2].trim();
    }

    // G) Valor Total da Nota
    const totalMatch = fullText.match(/(?:VALOR\s+TOTAL\s+DA\s+NOTA|VLR\.\s*TOTAL)\s*[:\.]?\s*(?:R\$\s*)?([\d\.,]+)/i);
    if (totalMatch) {
      result.total_value = parsePtBrNumber(totalMatch[1]);
    }

    // =========================================================================
    // H) EXTRAÇÃO ROBUSTA DA TABELA DE PRODUTOS E SERVIÇOS
    // =========================================================================
    let inProductSection = false;
    let currentItem = null;
    const extractedItems = [];

    // Expressões regulares para colunas de produtos da DANFE
    const ncmRegex = /\b(\d{8}|\d{4}\.\d{2}\.\d{2})\b/;
    const cfopRegex = /\b([1256]\d{3})\b/;
    const unitRegex = /\b(CX|UN|KG|FD|PC|PCT|LT|L|PT|DZ|TON|M2|M3|PAR)\b/i;

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i].trim();

      // Detecta início da seção de produtos
      if (/DADOS\s+DO[S]?\s+PRODUTO[S]?\s*\/\s*SERVIÇO[S]?/i.test(line) ||
          (/CÓDIGO/i.test(line) && /DESCRIÇÃO/i.test(line) && /NCM/i.test(line))) {
        inProductSection = true;
        continue;
      }

      // Detecta fim da seção de produtos
      if (inProductSection && (/DADOS\s+ADICIONAIS/i.test(line) ||
          /CÁLCULO\s+DO\s+ISSQN/i.test(line) ||
          /INFORMAÇÕES\s+COMPLEMENTARES/i.test(line) ||
          /CONTINUAÇÃO\s+DAS\s+INFORMAÇÕES/i.test(line))) {
        inProductSection = false;
        break;
      }

      if (!inProductSection) continue;

      // Pula cabeçalhos repetidos da tabela de produtos (comum em quebras de página)
      if (/CÓDIGO\s+PROD/i.test(line) || /DESCRIÇÃO\s+DO\s+PRODUTO/i.test(line) || /ALÍQ\.\s*ICMS/i.test(line)) {
        continue;
      }

      // Testa se a linha contém dados característicos de item (NCM de 8 dígitos e CFOP de 4 dígitos)
      const hasNcm = ncmRegex.test(line);
      const hasCfop = cfopRegex.test(line);
      const hasUnit = unitRegex.test(line);

      if (hasNcm && (hasCfop || hasUnit)) {
        // Encontrou uma linha estruturada de produto!
        const parsed = parseProductLine(line);
        if (parsed) {
          extractedItems.push(parsed);
          currentItem = parsed;
          continue;
        }
      }

      // Se não é linha de produto mas tem item anterior, pode ser continuação da descrição
      if (currentItem && line.length > 2 && !/^\d{44}/.test(line) && !/FOLHA|PÁGINA|NF-e/i.test(line)) {
        // Acrescenta à descrição se não parecer número solto
        if (!/^[0-9\.,\s]+$/.test(line)) {
          currentItem.description += ' ' + line;
        }
      }
    }

    // Se a extração linear não encontrou todos os itens, aplica varredura de janela de tokens
    if (extractedItems.length === 0) {
      const tokenItems = scanProductTokens(fullText);
      if (tokenItems.length > 0) {
        extractedItems.push(...tokenItems);
      }
    }

    // Preenche caixas inteiras sugeridas e validações
    result.products = extractedItems.map((prod, idx) => {
      const unitClean = (prod.unit || 'CX').toUpperCase();
      let boxes = 1;

      if (unitClean === 'CX') {
        boxes = Math.max(1, Math.round(prod.raw_qty));
      } else if (unitClean === 'UN') {
        // Sugestão de conversão: se veio em UN e tem fator
        const factor = prod.raw_qty >= 24 ? 12 : 1;
        boxes = Math.max(1, Math.floor(prod.raw_qty / factor));
      } else {
        boxes = Math.max(1, Math.round(prod.raw_qty));
      }

      return {
        item_number: idx + 1,
        code: prod.code || `SKU-NF-${idx + 1}`,
        description: prod.description || `Produto ${idx + 1}`,
        ncm: prod.ncm || '00000000',
        cfop: prod.cfop || '5102',
        raw_unit: unitClean,
        raw_qty: prod.raw_qty || 1,
        unit_price: prod.unit_price || 0,
        total_price: prod.total_price || (prod.raw_qty * prod.unit_price) || 0,
        boxes: boxes, // INTEGER garantido
        conversion_factor: unitClean === 'CX' ? 1 : (unitClean === 'UN' && prod.raw_qty >= 24 ? 12 : 1)
      };
    });

    // Se o valor total da nota estiver zerado, soma o total dos itens
    if (result.total_value === 0 && result.products.length > 0) {
      result.total_value = result.products.reduce((acc, p) => acc + p.total_price, 0);
    }

    return result;
  }

  // 6. Analisador de linha única de produto
  function parseProductLine(line) {
    // Normaliza espaços
    const clean = line.replace(/\s+/g, ' ').trim();
    const tokens = clean.split(' ');

    if (tokens.length < 5) return null;

    // Localiza índice do NCM (8 dígitos contínuos ou no padrão 9999.99.99)
    let ncmIdx = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (/^\d{8}$/.test(tokens[i]) || /^\d{4}\.\d{2}\.\d{2}$/.test(tokens[i])) {
        ncmIdx = i;
        break;
      }
    }

    if (ncmIdx === -1) return null;

    // Código do Produto: primeiro token
    const code = tokens[0];

    // Descrição do Produto: tokens entre o código e o NCM
    const descTokens = tokens.slice(1, ncmIdx);
    const description = descTokens.join(' ').trim() || `Item ${code}`;

    const ncm = tokens[ncmIdx].replace(/\./g, '');

    // Tokens após o NCM geralmente são: [CST], CFOP, UNID, QTD, VLR_UNIT, VLR_TOTAL
    const rest = tokens.slice(ncmIdx + 1);

    let cfop = '5102';
    let unit = 'CX';
    let rawQty = 1;
    let unitPrice = 0;
    let totalPrice = 0;

    // Busca CFOP (4 dígitos iniciando com 1, 2, 5 ou 6)
    const cfopIdx = rest.findIndex(t => /^[1256]\d{3}$/.test(t));
    if (cfopIdx !== -1) cfop = rest[cfopIdx];

    // Busca Unidade comercial (CX, UN, KG, etc)
    const unitIdx = rest.findIndex(t => /^(CX|UN|KG|FD|PC|PCT|LT|L|PT|DZ|TON|M2|M3)$/i.test(t));
    if (unitIdx !== -1) unit = rest[unitIdx].toUpperCase();

    // Os tokens numéricos após a unidade costumam ser QTD, VLR_UNIT e VLR_TOTAL
    const numTokens = [];
    const searchStart = unitIdx !== -1 ? unitIdx + 1 : (cfopIdx !== -1 ? cfopIdx + 1 : 0);
    for (let j = searchStart; j < rest.length; j++) {
      const tok = rest[j];
      if (/^[\d\.,]+$/.test(tok) && !/^\d{4}$/.test(tok)) {
        numTokens.push(parsePtBrNumber(tok));
      }
    }

    if (numTokens.length >= 1) rawQty = numTokens[0];
    if (numTokens.length >= 2) unitPrice = numTokens[1];
    if (numTokens.length >= 3) totalPrice = numTokens[2];
    else if (unitPrice > 0 && rawQty > 0) totalPrice = rawQty * unitPrice;

    return {
      code,
      description,
      ncm,
      cfop,
      unit,
      raw_qty: rawQty,
      unit_price: unitPrice,
      total_price: totalPrice
    };
  }

  // 7. Varredura alternativa de tokens (para DANFEs com quebra irregular de colunas)
  function scanProductTokens(fullText) {
    const items = [];
    // Procura padrões de código + descrição + NCM
    const regex = /([A-Za-z0-9\-\._]{2,20})\s+([A-Za-zÀ-ÖØ-öø-ÿ0-9\s\/\-\.\(\)]{5,60})\s+(\d{8})\s+(?:\d{3,4}\s+)?([1256]\d{3})\s+(CX|UN|KG|FD|PC|PCT|LT|L|PT)\s+([\d\.,]+)\s+([\d\.,]+)\s+([\d\.,]+)/gi;

    let m;
    while ((m = regex.exec(fullText)) !== null) {
      items.push({
        code: m[1],
        description: m[2].trim(),
        ncm: m[3],
        cfop: m[4],
        unit: m[5].toUpperCase(),
        raw_qty: parsePtBrNumber(m[6]),
        unit_price: parsePtBrNumber(m[7]),
        total_price: parsePtBrNumber(m[8])
      });
    }

    return items;
  }

  // 8. Conjunto de Dados de Exemplo Real (Multi-item & Chave Módulo 11 SEFAZ Válida)
  // Usado pelo botão de teste "Carregar Exemplo de DANFE Real"
  function getSampleDanfeData() {
    // Chave de acesso oficial calculada com Módulo 11 válido:
    // Base 43 dígitos: 3526110000000000000155001000012499100012499 -> DV = 5
    const validKey = '35261100000000000001550010000124991000124995';

    return {
      number: '12499',
      series: '1',
      access_key: validKey,
      is_key_valid: validateNfeKey(validKey),
      issue_date: '2026-11-12',
      issuer_name: 'Laticínios e Alimentos Sul Brasil S.A.',
      issuer_cnpj: '18.442.910/0001-33',
      recipient_name: 'Central de Avarias Logística Ltda',
      recipient_cnpj: '00.000.000/0001-00',
      total_value: 14780.50,
      total_products_value: 14780.50,
      products: [
        {
          item_number: 1,
          code: 'SKU-LAC-01',
          description: 'Leite Integral Pasteurizado UHT 1L Tetra Pak',
          ncm: '04012010',
          cfop: '5102',
          raw_unit: 'CX',
          raw_qty: 60,
          unit_price: 48.50,
          total_price: 2910.00,
          boxes: 60,
          conversion_factor: 1
        },
        {
          item_number: 2,
          code: 'SKU-CAR-02',
          description: 'Hambúrguer Bovino Tradicional 56g (Caixa com 36 unidades)',
          ncm: '02023000',
          cfop: '5102',
          raw_unit: 'CX',
          raw_qty: 40,
          unit_price: 115.00,
          total_price: 4600.00,
          boxes: 40,
          conversion_factor: 1
        },
        {
          item_number: 3,
          code: 'SKU-SEC-03',
          description: 'Óleo de Soja Refinado Tipo 1 900ml (Caixa com 20 garrafas)',
          ncm: '15079011',
          cfop: '5102',
          raw_unit: 'CX',
          raw_qty: 50,
          unit_price: 85.00,
          total_price: 4250.00,
          boxes: 50,
          conversion_factor: 1
        },
        {
          item_number: 4,
          code: 'SKU-LAC-04',
          description: 'Queijo Mussarela Fatiado Interfolhado Pacote 1kg',
          ncm: '04069022',
          cfop: '5102',
          raw_unit: 'KG',
          raw_qty: 45,
          unit_price: 38.90,
          total_price: 1750.50,
          boxes: 20,
          conversion_factor: 2.25
        },
        {
          item_number: 5,
          code: 'SKU-LAC-05',
          description: 'Iogurte Integral Sabor Morango 170g (Bandeja com 24 potes)',
          ncm: '04031000',
          cfop: '5102',
          raw_unit: 'UN',
          raw_qty: 240,
          unit_price: 5.29,
          total_price: 1270.00,
          boxes: 10,
          conversion_factor: 24
        }
      ]
    };
  }

  // Exportação no escopo global
  window.danfeParser = {
    validateNfeKey,
    formatAccessKey,
    extractTextFromPdf,
    parseDanfeData,
    getSampleDanfeData
  };
})();
