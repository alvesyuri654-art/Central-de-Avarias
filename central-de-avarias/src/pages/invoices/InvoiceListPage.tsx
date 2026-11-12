import React, { useEffect, useState } from 'react';
import { useUnit } from '@/contexts/UnitContext';
import { invoiceService } from '@/services/invoiceService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Plus, FileSpreadsheet, Eye, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDateOnly, formatAccessKey } from '@/lib/formatters';

export const InvoiceListPage: React.FC = () => {
  const { activeUnit, canImportInvoices } = useUnit();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadInvoices = async () => {
    if (!activeUnit) return;
    setIsLoading(true);
    try {
      const data = await invoiceService.getInvoices(activeUnit.id);
      setInvoices(data);
    } catch (err) {
      console.error('Erro ao carregar notas fiscais:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [activeUnit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Entrada de Notas Fiscais (NF-e)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Importação de DANFE em PDF, extração de dados e conferência física para entrada em estoque
          </p>
        </div>
        {canImportInvoices && (
          <Link to="/invoices/upload">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
              Importar Nova NF-e (PDF)
            </Button>
          </Link>
        )}
      </div>

      <Card>
        {isLoading ? (
          <Spinner message="Carregando notas fiscais..." />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="w-6 h-6" />}
            title="Nenhuma nota fiscal encontrada"
            description="Faça o upload do PDF da DANFE para iniciar a conferência física e dar entrada nas caixas de avarias."
            actionText={canImportInvoices ? 'Importar Primeira Nota' : undefined}
            onAction={() => (window.location.href = '/invoices/upload')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Número / Série</th>
                  <th className="py-2.5 px-3">Emitente / Fornecedor</th>
                  <th className="py-2.5 px-3">Data Emissão</th>
                  <th className="py-2.5 px-3">Valor Total</th>
                  <th className="py-2.5 px-3">Chave de Acesso</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      NF {inv.invoice_number} - Série {inv.invoice_series}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700 max-w-[200px] truncate">
                      {inv.issuer_name}
                      <div className="text-[10px] text-slate-400 font-mono">{inv.issuer_tax_id}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                      {formatDateOnly(inv.issue_date)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                      {formatCurrency(inv.total_value)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400 max-w-[140px] truncate">
                      {formatAccessKey(inv.access_key)}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant={
                          inv.status === 'CONFIRMED'
                            ? 'success'
                            : inv.status === 'PENDING_CONFERENCE'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {inv.status === 'CONFIRMED'
                          ? 'Entrada Confirmada'
                          : inv.status === 'PENDING_CONFERENCE'
                          ? 'Aguardando Conferência'
                          : 'Cancelada'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {inv.status === 'PENDING_CONFERENCE' ? (
                        <Link
                          to={`/invoices/${inv.id}/conference`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
                        >
                          Conferir Caixas
                        </Link>
                      ) : (
                        <Link
                          to={`/invoices/${inv.id}/conference`}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded transition-colors"
                          title="Visualizar detalhes"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detalhes
                        </Link>
                      )}
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
