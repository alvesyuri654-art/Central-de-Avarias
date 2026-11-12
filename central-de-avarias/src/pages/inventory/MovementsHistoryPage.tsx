import React, { useEffect, useState } from 'react';
import { useUnit } from '@/contexts/UnitContext';
import { inventoryService } from '@/services/inventoryService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { History, ArrowLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatBoxes, formatDateTime } from '@/lib/formatters';

export const MovementsHistoryPage: React.FC = () => {
  const { activeUnit } = useUnit();
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!activeUnit) return;
    const loadMovements = async () => {
      setIsLoading(true);
      try {
        const data = await inventoryService.getMovements(activeUnit.id, 200);
        setMovements(data);
      } catch (err) {
        console.error('Erro ao carregar movimentações:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadMovements();
  }, [activeUnit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/inventory" className="text-slate-400 hover:text-slate-700">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Histórico Físico de Movimentações</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Livro-Razão (Ledger) imutável de entradas, transferências e ajustes da unidade ativa
          </p>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <Spinner message="Carregando livro-razão físico..." />
        ) : movements.length === 0 ? (
          <EmptyState
            icon={<History className="w-6 h-6" />}
            title="Nenhuma movimentação registrada"
            description="Todas as entradas, transferências e baixas geram histórico auditável nesta tela."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Tipo do Fato</th>
                  <th className="py-2.5 px-3">Produto (SKU)</th>
                  <th className="py-2.5 px-3">Setor Físico</th>
                  <th className="py-2.5 px-3 text-right">Qtd Movimentada</th>
                  <th className="py-2.5 px-3 text-right">Saldo Posterior</th>
                  <th className="py-2.5 px-3">Justificativa / Motivo</th>
                  <th className="py-2.5 px-3">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => {
                  const isPositive = m.quantity_boxes > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
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
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {m.product?.name}
                        <span className="text-[10px] text-slate-400 font-mono ml-1">
                          ({m.product?.sku})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{m.sector?.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-sm whitespace-nowrap">
                        <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                          {isPositive ? `+${m.quantity_boxes}` : m.quantity_boxes} cx
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                        {m.balance_after_boxes} cx
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={m.reason}>
                        {m.reason}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {m.profile?.full_name || 'Sistema'}
                      </td>
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
