# Catálogo de Stored Procedures e RPCs Transacionais
## Projeto: CENTRAL DE AVARIAS

Todas as mutações críticas de estoque e transições de workflow são processadas exclusivamente através de Stored Procedures em PL/pgSQL com `SECURITY DEFINER` e `SET search_path = public, pg_temp;`.

---

### 1. `rpc_confirm_invoice_entry`
* **Objetivo:** Entrada atômica no estoque de uma NF-e após conferência física humana.
* **Argumentos:**
  * `p_invoice_id UUID`
  * `p_sector_id UUID`
  * `p_items_mapping JSONB` (array com `item_id`, `product_id`, `converted_boxes`, `lot_number`, `expiration_date`)
* **Garantias Transacionais:**
  1. Adquire lock de linha (`FOR UPDATE`) no registro da NF-e.
  2. Valida se o status é estritamente `PENDING_CONFERENCE`.
  3. Valida se o setor pertence à unidade receptora.
  4. Cria os lotes em `inventory_lots`, grava as movimentações físicas `INVOICE_ENTRY` no ledger, atualiza a projeção `stock_balances` e transiciona a NF para `CONFIRMED`.
  5. Grava log de auditoria forense em `audit_logs`.

---

### 2. `rpc_request_transfer`
* **Objetivo:** Solicitação formal de transferência de materiais gerada pela unidade de destino (ex: Filial Itupeva solicitando da Matriz Chapecó).
* **Argumentos:**
  * `p_destination_unit_id UUID`
  * `p_source_unit_id UUID`
  * `p_items JSONB` (array com `product_id`, `requested_boxes`)
  * `p_notes TEXT`
* **Regras de Negócio:**
  1. Verifica se `p_destination_unit_id <> p_source_unit_id`.
  2. Gera código único no formato `TRF-YYYYMMDD-XXXXXX`.
  3. Cria o registro com status `REQUESTED` e popula `transfer_status_history`.

---

### 3. `rpc_approve_transfer`
* **Objetivo:** Aprovação e definição das quantidades autorizadas pela unidade de origem (Chapecó).
* **Argumentos:**
  * `p_transfer_id UUID`
  * `p_approved_items JSONB` (`item_id`, `approved_boxes`)
  * `p_notes TEXT`
* **Regras de Negócio:**
  1. Valida se status é `REQUESTED`.
  2. Garante que $\text{approved\_boxes} \le \text{requested\_boxes}$.
  3. Transiciona status para `APPROVED`.

---

### 4. `rpc_allocate_and_reserve`
* **Objetivo:** Alocação de lotes físicos específicos e reserva preventiva de caixas.
* **Argumentos:**
  * `p_transfer_id UUID`
  * `p_allocations JSONB` (`item_id`, `lot_id`, `boxes`)
* **Garantias de Concorrência:**
  1. Executa `SELECT ... FOR UPDATE` no lote físico em Chapecó.
  2. Valida se $(\text{current\_boxes} - \text{reserved\_boxes}) \ge \text{boxes}$.
  3. Incrementa `reserved_boxes` no lote e na projeção `stock_balances`.
  4. Insere linha na tabela `stock_reservations` com status `ACTIVE`.
  5. Transiciona a transferência para status `PICKING`.
  6. **Importante:** Não altera `current_boxes` (estoque físico permanece inalterado na prateleira até a expedição).

---

### 5. `rpc_dispatch_transfer`
* **Objetivo:** Expedição da carga rodoviária, baixa física na origem e registro de trânsito no destino.
* **Argumentos:**
  * `p_transfer_id UUID`
* **Garantias Fiduciárias:**
  1. Valida se 100% dos itens aprovados estão alocados.
  2. Finaliza a reserva em `stock_reservations` (`status = 'DISPATCHED'`).
  3. Executa baixa física definitiva na origem via movimentação `TRANSFER_OUT` no ledger imutável.
  4. Incrementa `in_transit_boxes` na projeção `stock_balances` da filial de destino.
  5. Não cria lotes físicos no destino nesta etapa (pois as caixas ainda estão na rodovia).
  6. Transiciona status para `IN_TRANSIT`.

---

### 6. `rpc_receive_transfer`
* **Objetivo:** Conferência física e recebimento na unidade de destino (Itupeva), com segregação de faltas e sobras físicas.
* **Argumentos:**
  * `p_transfer_id UUID`
  * `p_received_items JSONB` (`item_id`, `received_boxes`, `destination_sector_id`, `quarantine_sector_id`)
  * `p_divergence_notes TEXT`
* **Tratamento de Sobras e Genealogia:**
  1. Baixa a quantidade em trânsito no destino.
  2. Se $\text{recebido} > \text{expedido}$ (Sobra Física): as caixas regulares entram no estoque regular e as caixas excedentes são isoladas no setor de **Quarentena** via `transfer_divergences` com status `PENDING_AUTHORIZATION`.
  3. Cria o novo lote físico no destino com `parent_lot_id`, `origin_unit_id` e vínculo com a NF-e original de Chapecó.
  4. Registra movimentação física `TRANSFER_IN` no livro-razão do destino.
  5. Transiciona para `RECEIVED_COMPLETE` (se 100% regular) ou `RECEIVED_WITH_DIVERGENCE`.

---

### 7. `rpc_cancel_transfer`
* **Objetivo:** Cancelamento de transferência antes do despacho, com liberação imediata de caixas reservadas.
* **Argumentos:**
  * `p_transfer_id UUID`
  * `p_reason TEXT`
* **Garantia:** Se estava em `PICKING`, decrementa `reserved_boxes` de todos os lotes alocados e marca reservas como `RELEASED_CANCELLED`, restaurando a disponibilidade física instantaneamente.

---

### 8. `rpc_inventory_adjustment`
* **Objetivo:** Ajuste de inventário físico (positivo ou negativo) decorrente de contagem física auditada.
* **Argumentos:**
  * `p_unit_id UUID`
  * `p_lot_id UUID`
  * `p_boxes INTEGER` (positivo ou negativo)
  * `p_reason TEXT` (justificativa obrigatória)

---

### 9. `rpc_write_off`
* **Objetivo:** Baixa definitiva por descarte ou destruição de caixas avariadas sem aproveitamento.
* **Argumentos:**
  * `p_unit_id UUID`
  * `p_lot_id UUID`
  * `p_boxes INTEGER`
  * `p_reason TEXT` (motivo do laudo pericial)
