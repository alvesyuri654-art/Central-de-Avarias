# Central de Avarias — Plataforma Corporativa de Gestão de Estoque e Transferências

Sistema corporativo de alto desempenho e confiabilidade transacional para controle de materiais avariados, gestão fiduciária de estoque em caixas inteiras, importação de NF-e em PDF, rastreabilidade genealógica e transferências interestaduais entre Matriz (Chapecó/SC) e Filiais (Itupeva/SP e novas unidades dinâmicas).

---

## 🚀 Principais Capacidades Operacionais

1. **Gestão Multiunidade Dinâmica:** Unidades cadastradas como registros relacionais com isolamento estrito via Row Level Security (RLS). Nenhuma unidade hardcoded no código.
2. **Controle Estrito em Caixas Inteiras (`INTEGER`):** O MVP opera exclusivamente com contagem inteira de caixas (`CHECK (boxes >= 0)`), eliminando erros de arredondamento de float.
3. **Separação entre Físico e Reserva:** Caixas reservadas não reduzem o estoque físico nem são computadas como saída no Livro-Razão até a expedição real.
4. **Livro-Razão Físico Imutável (Append-Only):** A tabela `stock_movements` é estritamente append-only. Modificações ou exclusões são proibidas no nível de trigger no banco.
5. **Genealogia de Lotes:** Ao transferir materiais da Matriz para a Filial, o lote de destino mantém vínculo direto com o lote pai (`parent_lot_id`), unidade de procedência e a Nota Fiscal original de entrada.
6. **Importação e Extração de PDF da DANFE:** Extração vetorial com validação algorítmica do dígito verificador módulo 11 da chave de 44 dígitos da NF-e e conferência humana obrigatória.
7. **Isolamento de Sobras Físicas em Quarentena:** Se forem expedidas 10 caixas e chegarem 12 no destino, as 10 regulares entram no estoque e as 2 excedentes são isoladas no setor de quarentena via `transfer_divergences`.
8. **Motor de Conciliação Fiduciária (Full Outer Join):** Auditoria em tempo real cruzando Lotes Físicos vs. Livro-Razão vs. Cache de Balanços.

---

## 📂 Estrutura do Projeto

```text
central-de-avarias/
├── supabase/
│   ├── migrations/             # 8 Migrations versionadas em ordem sequencial
│   ├── seed.sql                # Carga inicial da Empresa, Chapecó e Itupeva
│   ├── config.toml             # Configurações do Supabase (Auth, Storage, DB)
│   └── tests/                  # Suíte de verificação automatizada em SQL
├── src/
│   ├── components/             # Primitivas UI (Button, Modal, StatCard) e Layout
│   ├── contexts/               # AuthContext e UnitContext (gestão de sessão e unidade ativa)
│   ├── lib/                    # Supabase Client, formatters, validators e pdfParser
│   ├── pages/                  # Módulos: Dashboard, Estoque, NF-e, Transferências, Admin
│   ├── routes/                 # Roteamento seguro com ProtectedRoute
│   ├── services/               # Camada de comunicação com o Supabase e RPCs
│   └── types/                  # Tipagem TypeScript rigorosa (database.types.ts)
├── docs/                       # Documentação técnica de arquitetura, banco e RPCs
├── package.json
└── vite.config.ts
```

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React 18, TypeScript 5, Vite, Tailwind CSS, TanStack Query v5, React Router v6, Lucide React.
* **Backend & Banco:** PostgreSQL 15+, Supabase BaaS, Supabase Auth (JWT), Supabase Storage (Bucket privado `invoices-pdf`), Row Level Security (RLS) e Stored Procedures em PL/pgSQL com `SECURITY DEFINER`.

---

## 📄 Documentação Adicional

* [Modelagem do Banco de Dados e Dicionário (docs/DATABASE.md)](docs/DATABASE.md)
* [Catálogo de Stored Procedures e RPCs Transacionais (docs/RPCS.md)](docs/RPCS.md)
* [Matriz de Permissões e Segurança RLS (docs/SECURITY.md)](docs/SECURITY.md)
* [Guia de Configuração, Instalação e Homologação (docs/SETUP.md)](docs/SETUP.md)
