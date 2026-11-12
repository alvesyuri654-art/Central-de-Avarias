# Guia de Instalação, Configuração e Publicação
## Projeto: CENTRAL DE AVARIAS

---

### 1. Pré-Requisitos do Ambiente

* **Node.js:** Versão 20+ LTS instalada no sistema operacional.
* **Gerenciador de Pacotes:** `npm`, `pnpm` ou `yarn`.
* **Projeto Supabase:** Instância gerenciada na nuvem ([supabase.com](https://supabase.com)) ou Supabase CLI local (Docker).

---

### 2. Configuração do Banco de Dados no Supabase

1. Acesse o **SQL Editor** no painel do seu projeto Supabase.
2. Execute as migrations contidas em `supabase/migrations/` em ordem sequencial:
   * `20261110000001_core_and_units.sql`
   * `20261110000002_catalog_and_invoices.sql`
   * `20261110000003_inventory_and_reservations.sql`
   * `20261110000004_transfers_and_divergences.sql`
   * `20261110000005_audit_and_history.sql`
   * `20261110000006_security_functions_and_rls.sql`
   * `20261110000007_transactional_rpcs.sql`
   * `20261110000008_reconciliation_engine.sql`
3. Execute o script de carga inicial: `supabase/seed.sql` (cadastra a Matriz Chapecó e a Filial Itupeva e seus setores).
4. Crie o bucket privado de armazenamento no Supabase Storage:
   * Nome: `invoices-pdf`
   * Tipo: **Privado** (Public = false)
   * Limite de tamanho: 50 MB
   * Tipos permitidos: `application/pdf`

---

### 3. Configuração do Frontend e Variáveis de Ambiente

1. Navegue até a pasta do projeto:
   ```bash
   cd central-de-avarias
   ```
2. Crie seu arquivo de variáveis de ambiente com base no exemplo:
   ```bash
   cp .env.example .env
   ```
3. Preencha as chaves fornecidas pelo Supabase (Project Settings -> API):
   ```ini
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publica-anonima-jwt
   ```
   > ⚠️ **NUNCA** informe a chave `service_role` no arquivo `.env` do frontend!

4. Instale as dependências:
   ```bash
   npm install
   ```

5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   A aplicação subirá em `http://localhost:5173`.

---

### 4. Roteiro de Homologação Operacional de Ponta a Ponta

Para homologar a plataforma antes de liberar para o time de pista:

1. **Acesso:** Faça login com um operador cadastrado.
2. **Produtos:** Acesse `/products` e certifique-se de que os produtos básicos estão cadastrados.
3. **Importação:** Em `/invoices/upload`, faça o upload de uma DANFE em PDF. O sistema extrairá a chave de 44 dígitos e os itens.
4. **Conferência:** Em `/invoices/:id/conference`, valide as caixas físicas recebidas no pátio e confirme a entrada. O lote será gerado atomicamente.
5. **Estoque:** Em `/inventory`, verifique as caixas disponíveis no setor de avarias.
6. **Transferência:**
   * Alterne a unidade ativa para **Itupeva** no cabeçalho.
   * Crie uma solicitação de 10 caixas em `/transfers/create`.
   * Alterne para **Chapecó**: analise, aprove e aloque o lote em `/transfers/:id`.
   * Despache a carga (o saldo em Chapecó sofrerá baixa e entrará em trânsito).
   * Alterne para **Itupeva**: confira e receba a carga (com teste de divergência se desejado).
7. **Conciliação:** Em `/inventory/reconciliation`, execute a auditoria para atestar que o Livro-Razão físico e os balanços continuam 100% consistentes.

---

### 5. Publicação em Produção

* **Build de Produção:**
  ```bash
  npm run build
  ```
  Os arquivos estáticos otimizados serão gerados na pasta `dist/`, prontos para deploy na Vercel, Netlify, Cloudflare Pages, AWS S3/CloudFront ou servidor corporativo Nginx.
