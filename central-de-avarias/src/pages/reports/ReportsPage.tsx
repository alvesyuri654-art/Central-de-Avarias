import React, { useEffect, useState } from 'react';
import { useUnit } from '@/contexts/UnitContext';
import { reportService } from '@/services/reportService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { FileSpreadsheet, Download, BarChart3 } from 'lucide-react';
import { formatBoxes } from '@/lib/formatters';

export const ReportsPage: React.FC = () => {
  const { activeUnit } = useUnit();
  const [reportType, setReportType] = useState<'STOCK' | 'TRANSFERS'>('STOCK');
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = async () => {
    if (!activeUnit) return;
    setIsLoading(true);
    try {
      if (reportType === 'STOCK') {
        const rows = await reportService.getStockSummary(activeUnit.id);
        setDataRows(rows);
      } else {
        const rows = await reportService.getTransfersSummary(activeUnit.id);
        setDataRows(rows);
      }
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeUnit, reportType]);

  const handleExportCsv = () => {
    if (dataRows.length === 0) return;

    if (reportType === 'STOCK') {
      const formatted = dataRows.map((r) => ({
        Unidade: r.unit?.name || '—',
        UF: r.unit?.state_code || '—',
        SKU: r.product?.sku || '—',
        Produto: r.product?.name || '—',
        Categoria: r.product?.category || '—',
        Setor: r.sector?.name || '—',
        Fisico_Caixas: r.physical_boxes,
        Reservado_Caixas: r.reserved_boxes,
        Disponivel_Caixas: r.available_boxes,
        Transito_Caixas: r.in_transit_boxes,
      }));
      reportService.exportToCsv(formatted, `relatorio_estoque_${activeUnit?.code}`);
    } else {
      const formatted = dataRows.map((r) => ({
        Codigo_Transferencia: r.transfer_code,
        Status: r.status,
        Origem: r.source?.name,
        Destino: r.dest?.name,
        Data_Solicitacao: r.requested_at,
        Data_Expedicao: r.dispatched_at || '—',
        Data_Recebimento: r.received_at || '—',
      }));
      reportService.exportToCsv(formatted, `relatorio_transferencias_${activeUnit?.code}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Relatórios Analíticos</h1>
          <p className="text-xs text-slate-500 mt-1">
            Extração de relatórios gerenciais e exportação de dados para planilhas
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExportCsv}
          disabled={dataRows.length === 0}
        >
          Exportar Planilha (CSV)
        </Button>
      </div>

      {/* Seletor de Relatório */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setReportType('STOCK')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            reportType === 'STOCK'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Posição de Estoque por Setor
        </button>
        <button
          onClick={() => setReportType('TRANSFERS')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            reportType === 'TRANSFERS'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Histórico e Trânsito de Transferências
        </button>
      </div>

      <Card>
        {isLoading ? (
          <Spinner message="Consolidando dados do relatório..." />
        ) : dataRows.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            Nenhum registro encontrado para este relatório na unidade selecionada.
          </div>
        ) : reportType === 'STOCK' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Setor Físico</th>
                  <th className="py-2.5 px-3 text-right">Físico Total</th>
                  <th className="py-2.5 px-3 text-right">Reservado</th>
                  <th className="py-2.5 px-3 text-right">Disponível</th>
                  <th className="py-2.5 px-3 text-right">Em Trânsito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-700">
                      {r.product?.sku}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{r.product?.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{r.sector?.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatBoxes(r.physical_boxes)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                      {formatBoxes(r.reserved_boxes)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                      {formatBoxes(r.available_boxes)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-purple-700">
                      {formatBoxes(r.in_transit_boxes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3">Destino</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Data Solicitação</th>
                  <th className="py-2.5 px-3">Itens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataRows.map((trf) => (
                  <tr key={trf.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-700">
                      {trf.transfer_code}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{trf.source?.name}</td>
                    <td className="py-2.5 px-3 text-slate-700">{trf.dest?.name}</td>
                    <td className="py-2.5 px-3 font-medium">{trf.status}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{trf.requested_at}</td>
                    <td className="py-2.5 px-3 text-slate-600">{trf.items?.length || 0} produto(s)</td>
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
