import React, { useEffect, useState } from 'react';
import { useUnit } from '@/contexts/UnitContext';
import { inventoryService } from '@/services/inventoryService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Scale, CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ReconciliationPage: React.FC = () => {
  const { activeUnit } = useUnit();
  const [reconciliationRows, setReconciliationRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const runReconciliation = async () => {
    if (!activeUnit) return;
    setIsLoading(true);
    try {
      const data = await inventoryService.reconcileStock(activeUnit.id);
      setReconciliationRows(data);
    } catch (err) {
      console.error('Erro ao executar conciliação:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runReconciliation();
  }, [activeUnit]);

  const hasAnyDivergence = reconciliationRows.some((r) => r.has_divergence);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/inventory" className="text-slate-400 hover:text-slate-700">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Conciliação Fiduciária de Estoque</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Auditoria matemática cruzada entre Lotes Físicos, Livro-Razão e Cache de Balanços
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={runReconciliation}
          icon={<RefreshCw className="w-4 h-4" />}
          isLoading={isLoading}
        >
          Executar Auditoria Imediata
        </Button>
      </div>

      {/* Banner de Status Geral */}
      <div
        className={`p-5 rounded-2xl border flex items-center justify-between ${
          hasAnyDivergence
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}
      >
        <div className="flex items-center gap-3">
          {hasAnyDivergence ? (
            <AlertTriangle className="w-7 h-7 text-red-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
          )}
          <div>
            <h3 className="font-bold text-sm">
              {hasAnyDivergence
                ? 'DIVERGÊNCIAS DETECTADAS NO ESTOQUE'
                : 'ESTOQUE FISICAMENTE E CONTABILMENTE CONCILIADO'}
            </h3>
            <p className="text-xs mt-0.5 opacity-90">
              {hasAnyDivergence
                ? 'Foram identificadas inconsistências entre as somas de lotes e os balanços agregados.'
                : 'Todas as caixas em prateleiras coincidem matematicamente com o Livro-Razão (Ledger).'}
            </p>
          </div>
        </div>
        <Badge variant={hasAnyDivergence ? 'danger' : 'success'}>
          {hasAnyDivergence ? 'Atenção Operacional' : 'Fidelidade 100%'}
        </Badge>
      </div>

      {/* Tabela de Confronto */}
      <Card
        title="Matriz de Comparação Fiduciária em Três Vias (Full Outer Join)"
        subtitle="Verificação rigorosa linha por linha de produto e setor físico"
      >
        {isLoading ? (
          <Spinner message="Processando auditoria das transações..." />
        ) : reconciliationRows.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            Nenhum registro para conciliar nesta unidade.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Produto ID</th>
                  <th className="py-2.5 px-3">Setor ID</th>
                  <th className="py-2.5 px-3 text-right">Lotes Físicos</th>
                  <th className="py-2.5 px-3 text-right">Saldo Balanço</th>
                  <th className="py-2.5 px-3 text-right">Ledger Físico</th>
                  <th className="py-2.5 px-3 text-right">Reservado Lotes</th>
                  <th className="py-2.5 px-3 text-right">Reservado Balanço</th>
                  <th className="py-2.5 px-3">Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reconciliationRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/50 ${
                      row.has_divergence ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 truncate max-w-[140px]">
                      {row.product_id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 truncate max-w-[140px]">
                      {row.sector_id}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {row.lots_physical_boxes} cx
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                      {row.balance_physical_boxes} cx
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                      {row.ledger_physical_boxes} cx
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                      {row.lots_reserved_boxes} cx
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                      {row.balance_reserved_boxes} cx
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={row.has_divergence ? 'danger' : 'success'}
                        size="sm"
                      >
                        {row.divergence_type}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
