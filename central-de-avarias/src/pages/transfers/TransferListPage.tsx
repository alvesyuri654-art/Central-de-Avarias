import React, { useEffect, useState } from 'react';
import { useUnit } from '@/contexts/UnitContext';
import { transferService } from '@/services/transferService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ArrowLeftRight, Plus, Eye, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '@/lib/formatters';

export const TransferListPage: React.FC = () => {
  const { activeUnit, canRequestTransfers } = useUnit();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTransfers = async () => {
    if (!activeUnit) return;
    setIsLoading(true);
    try {
      const data = await transferService.getTransfers(activeUnit.id);
      setTransfers(data);
    } catch (err) {
      console.error('Erro ao carregar transferências:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, [activeUnit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Transferências entre Unidades</h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão do fluxo logístico de materiais: solicitação, aprovação, separação e conferência
          </p>
        </div>
        {canRequestTransfers && (
          <Link to="/transfers/create">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
              Nova Solicitação de Transferência
            </Button>
          </Link>
        )}
      </div>

      <Card>
        {isLoading ? (
          <Spinner message="Carregando transferências..." />
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={<ArrowLeftRight className="w-6 h-6" />}
            title="Nenhuma transferência encontrada"
            description="Crie uma nova solicitação de transferência para movimentar materiais entre a Matriz e as Filiais."
            actionText={canRequestTransfers ? 'Criar Primeira Solicitação' : undefined}
            onAction={() => (window.location.href = '/transfers/create')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3">Destino</th>
                  <th className="py-2.5 px-3">Data Solicitação</th>
                  <th className="py-2.5 px-3">Status do Fluxo</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((trf) => (
                  <tr key={trf.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-brand-700">
                      {trf.transfer_code}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {trf.source_unit?.name} ({trf.source_unit?.state_code})
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {trf.destination_unit?.name} ({trf.destination_unit?.state_code})
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                      {formatDateTime(trf.requested_at)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          trf.status === 'RECEIVED_COMPLETE'
                            ? 'success'
                            : trf.status === 'RECEIVED_WITH_DIVERGENCE'
                            ? 'danger'
                            : trf.status === 'IN_TRANSIT'
                            ? 'purple'
                            : trf.status === 'PICKING'
                            ? 'warning'
                            : trf.status === 'APPROVED'
                            ? 'info'
                            : 'default'
                        }
                        size="sm"
                      >
                        {trf.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/transfers/${trf.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-brand-50 hover:text-brand-700 rounded transition-colors text-slate-700"
                      >
                        <Eye className="w-3.5 h-3.5" /> Acompanhar
                      </Link>
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
