# Matriz de Segurança, Permissões (RBAC) e Políticas de RLS
## Projeto: CENTRAL DE AVARIAS

---

### 1. Papéis Globais (`profiles.global_role`)

* **`SUPERADMIN`:** Administrador geral da plataforma (TI / Governança). Possui acesso irrestrito a todas as unidades, gestão cadastral de filiais, catálogo de produtos e visualização de trilhas de auditoria.
* **`CORPORATE_MANAGER`:** Diretor ou gestor corporativo da Matriz. Visualiza posições analíticas consolidadas de todas as filiais e relatórios executivos; não realiza separação física ou recebimento em doca.
* **`STANDARD_USER`:** Operador padrão. Seu escopo de atuação depende estritamente das unidades às quais foi associado na tabela `unit_permissions`.

---

### 2. Papéis Locais por Unidade (`unit_permissions.unit_role`)

| Papel Local | Importar NF-e | Solicitar TRF | Aprovar TRF | Despachar TRF | Receber TRF |
|---|:---:|:---:|:---:|:---:|:---:|
| **`UNIT_MANAGER`** | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim | ✅ Sim |
| **`STOCK_OPERATOR`**| ✅ Sim | ✅ Sim | ❌ Não | ✅ Sim | ✅ Sim |
| **`UNIT_AUDITOR`**  | ❌ Não | ❌ Não | ❌ Não | ❌ Não | ❌ Não |

---

### 3. Modelo de Isolamento via Row Level Security (RLS)

O Supabase aplica Row Level Security ativamente em todas as 18 tabelas:

1. **Isolamento de Consulta (`SELECT`):** Usuários comuns só enxergam registros onde `unit_id IN (SELECT get_user_authorized_units())`. Usuários de Itupeva não conseguem ler notas fiscais, lotes ou setores de Chapecó.
2. **Transferências:** Visíveis exclusivamente para a unidade de origem e para a unidade de destino.
3. **Bloqueio de Mutação Direta no Cliente (`INSERT`, `UPDATE`, `DELETE`):** As políticas de mutação direta para `inventory_lots`, `stock_movements`, `stock_balances`, `stock_reservations` e `transfers` retornam `FALSE` para o cliente web. Toda gravação deve ocorrer obrigatoriamente através das Stored Procedures transacionais auditadas.
4. **Proteção do Storage Privado (`invoices-pdf`):** URLs assinadas temporárias só podem ser geradas por usuários que possuam autorização na unidade vinculada à respectiva NF-e.
