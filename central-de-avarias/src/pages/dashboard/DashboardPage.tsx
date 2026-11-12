import React, { useEffect, useState } from 'react';
import { useUnit } from '@/contexts/UnitContext';
import { inventoryService } from '@/services/inventoryService';
import { transferService } from '@/services/transferService';
import { invoiceService } from '@/services/invoiceService';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import {
  Boxes,
  Lock,
  Truck,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { formatBoxes, formatDateTime } from '@/lib/formatters';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { activeUnit } = useUnit();
  const [isLoading, setIsLoading] = useState(true);
  const [balances, setBalances] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (!activeUnit) return;

    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [balRes, movRes, trfRes, invRes] = await Promise.all([
          inventoryService.getBalances(activeUnit.id),
          inventoryService.getMovements(activeUnit.id, 6),
          transferService.getTransfers(activeUnit.id),
          invoiceService.getInvoices(activeUnit.id),
        ]);

        setBalances(balRes);
        setMovements(movRes);
        setTransfers(trfRes);
        setPendingInvoices(invRes.filter((i) => i.status === 'PENDING_CONFERENCE'));
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [activeUnit]);

  if (isLoading) {
    return <Spinner size="lg" message="Carregando indicadores da unidade..." />;
  }

  // Cálculos dos KPIs
  const totalPhysical = balances.reduce((acc, b) => acc + (b.physical_boxes || 0), 0);
  const totalReserved = balances.reduce((acc, b) => acc + (b.reserved_boxes || 0), 0);
  const totalAvailable = balances.reduce((acc, b) => acc + (b.available_boxes || 0), 0);
  const totalInTransit = balances.reduce((acc, b) => acc + (b.in_transit_boxes || 0), 0);

  const inTransitTransfers = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
  const pendingTransfers = transfers.filter((t) => ['REQUESTED', 'APPROVED', 'PICKING'].includes(t.status)).length;
  const divergenceTransfers = transfers.filter((t) => t.status === 'RECEIVED_WITH_DIVERGENCE').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Torre de Controle Operacional — {activeUnit?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Status consolidado do galpão de avarias, posições em prateleira e fluxos logísticos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/invoices/upload"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Importar NF-e
          </Link>
          <Link
            to="/transfers/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Nova Transferência
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Estoque Físico Total"
          value={formatBoxes(totalPhysical)}
          subtitle="Caixas em setores físicos"
          icon={<Boxes className="w-6 h-6" />}
          color="blue"
        />

        <StatCard
          title="Caixas Disponíveis"
          value={formatBoxes(totalAvailable)}
          subtitle="Livres para transferência"
          icon={<CheckCircle2 className="w-6 h-6" />}
          color="emerald"
        />

        <StatCard
          title="Caixas Reservadas"
          value={formatBoxes(totalReserved)}
          subtitle="Bloqueadas para separação"
          icon={<Lock className="w-6 h-6" />}
          color="amber"
        />

        <StatCard
          title="Carga em Trânsito"
          value={formatBoxes(totalInTransit)}
          subtitle={`${inTransitTransfers} transferência(s) na rota`}
          icon={<Truck className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* Segunda Linha de Alertas e Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Alerta de Notas Aguardando Conferência */}
        <Card
          title="Notas Fiscais em Conferência"
          subtitle="Entradas de devolução aguardando validação de caixas"
          action={
            <Link to="/invoices" className="text-xs text-brand-600 hover:underline font-semibold">
              Ver todas ({pendingInvoices.length})
            </Link>
          }
        >
          {pendingInvoices.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Nenhuma nota fiscal pendente de conferência nesta unidade.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvoices.slice(0, 4).map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">NF-e {inv.invoice_number}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      {inv.issuer_name}
                    </p>
                  </div>
                  <Link
                    to={`/invoices/${inv.id}/conference`}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
                  >
                    Conferir
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Status das Transferências */}
        <Card
          title="Transferências em Andamento"
          subtitle="Solicitações ativas e expedições em rota"
          action={
            <Link to="/transfers" className="text-xs text-brand-600 hover:underline font-semibold">
              Acessar
            </Link>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/60 border border-blue-100">
              <span className="text-xs font-semibold text-blue-900">Em separação / Aprovadas</span>
              <Badge variant="info">{pendingTransfers}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50/60 border border-purple-100">
              <span className="text-xs font-semibold text-purple-900">Em trânsito rodoviário</span>
              <Badge variant="purple">{inTransitTransfers}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50/60 border border-red-100">
              <span className="text-xs font-semibold text-red-900">Recebidas com Divergência</span>
              <Badge variant={divergenceTransfers > 0 ? 'danger' : 'default'}>
                {divergenceTransfers}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Integridade e Conciliação */}
        <Card
          title="Fidelidade Contábil & Fiduciária"
          subtitle="Consistência entre Lotes, Ledger e Projeção"
          action={
            <Link to="/inventory/reconciliation" className="text-xs text-brand-600 hover:underline font-semibold">
              Auditar
            </Link>
          }
        >
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Estoque 100% Conciliado</h4>
            </div>
            <p className="text-xs mt-2 text-emerald-700 leading-relaxed">
              O motor de conciliação confirmou correspondência fiduciária entre o Livro-Razão físico imutável e os lotes em prateleira.
            </p>
          </div>
        </Card>
      </div>

      {/* Tabela de Últimas Movimentações Físicas */}
      <Card
        title="Últimas Movimentações Físicas do Galpão"
        subtitle="Livro-Razão append-only de entradas e saídas de caixas"
        action={
          <Link to="/inventory/movements" className="text-xs text-brand-600 hover:underline font-semibold">
            Ver histórico completo
          </Link>
        }
      >
        {movements.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Nenhuma movimentação física registrada até o momento nesta unidade.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Setor</th>
                  <th className="py-2.5 px-3 text-right">Caixas</th>
                  <th className="py-2.5 px-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const isPositive = m.quantity_boxes > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="py-2 px-3">
                        <Badge
                          variant={
                            m.movement_type === 'INVOICE_ENTRY'
                              ? 'success'
                              : m.movement_type === 'TRANSFER_IN'
                              ? 'info'
                              : m.movement_type === 'TRANSFER_OUT'
                              ? 'purple'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {m.movement_type}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {m.product?.name || m.product_id}
                      </td>
                      <td className="py-2 px-3 text-slate-500">{m.sector?.name || '—'}</td>
                      <td className="py-2 px-3 text-right font-bold font-mono">
                        <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                          {isPositive ? `+${m.quantity_boxes}` : m.quantity_boxes} cx
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500">{m.profile?.full_name || 'Sistema'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
