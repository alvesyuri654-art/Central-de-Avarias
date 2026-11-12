import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { inventoryService } from '@/services/inventoryService';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowLeft, GitBranch, FileText, Building2, MapPin, Calendar, Boxes } from 'lucide-react';
import { formatBoxes, formatDateTime, formatDateOnly, formatAccessKey } from '@/lib/formatters';

export const LotDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lot, setLot] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const loadLot = async () => {
      setIsLoading(true);
      try {
        const data = await inventoryService.getLotById(id);
        setLot(data);
      } catch (err) {
        console.error('Erro ao carregar detalhes do lote:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLot();
  }, [id]);

  if (isLoading) return <Spinner size="lg" message="Carregando rastreabilidade do lote..." />;
  if (!lot) return <div>Lote não encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/inventory"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Estoque
      </Link>

      {/* Header do Lote */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{lot.product?.name}</h2>
              <Badge variant="default" size="sm">
                SKU: {lot.product?.sku}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">ID do Lote: {lot.id}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Saldo Disponível:</span>
            <span className="text-2xl font-bold text-emerald-700 font-mono">
              {formatBoxes(lot.available_boxes)}
            </span>
          </div>
        </div>

        {/* Informações Físicas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block">Estoque Físico Atual:</span>
            <span className="font-bold text-slate-900 text-sm font-mono">
              {formatBoxes(lot.current_boxes)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Caixas Reservadas:</span>
            <span className="font-bold text-amber-600 text-sm font-mono">
              {formatBoxes(lot.reserved_boxes)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Entrada Inicial:</span>
            <span className="font-medium text-slate-700 font-mono">
              {formatBoxes(lot.initial_boxes)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">Setor de Armazenamento:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
              {lot.sector?.name}
            </span>
          </div>
        </div>
      </Card>

      {/* Rastreabilidade Genealógica Documental */}
      <Card
        title="Linhagem e Genealogia Documental (Rastreabilidade Ponta a Ponta)"
        subtitle="Origem fiscal faturada na Matriz e histórico de transições"
      >
        <div className="space-y-4 text-xs">
          {/* Se veio de transferência */}
          {lot.parent_lot_id ? (
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="flex items-center gap-2 text-purple-900 font-bold">
                <GitBranch className="w-4 h-4 text-purple-600" />
                <span>Lote Originado por Remessa de Transferência</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-100">
                <div>
                  <span className="text-purple-700 font-semibold block">Unidade de Procedência:</span>
                  <span className="text-purple-950 font-medium">
                    {lot.origin_unit?.name} ({lot.origin_unit?.city}/{lot.origin_unit?.state_code})
                  </span>
                </div>
                <div>
                  <span className="text-purple-700 font-semibold block">Lote Pai na Origem:</span>
                  <span className="font-mono text-purple-950">{lot.parent_lot_id}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center gap-2 text-blue-900 font-medium">
              <Building2 className="w-4 h-4 text-brand-600 shrink-0" />
              <span>Lote com entrada direta na unidade receptora via conferência física de NF-e.</span>
            </div>
          )}

          {/* Dados da Nota Fiscal Original */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <FileText className="w-4 h-4 text-brand-600" />
                <span>Nota Fiscal Original de Entrada: NF-e {lot.invoice?.invoice_number}</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                {formatDateOnly(lot.invoice?.issue_date)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
              <div>
                <span className="text-slate-400 block">Emitente:</span>
                <span className="font-medium text-slate-800">{lot.invoice?.issuer_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Chave de Acesso:</span>
                <span className="font-mono text-[10px] text-slate-600">
                  {formatAccessKey(lot.invoice?.access_key)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
