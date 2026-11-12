import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { invoiceService } from '@/services/invoiceService';
import { productService } from '@/services/productService';
import { unitService } from '@/services/unitService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { FileText, CheckCircle2, AlertCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { formatCurrency, formatAccessKey, formatDateOnly } from '@/lib/formatters';

export const InvoiceConferencePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState<string>('');
  const [itemsState, setItemsState] = useState<
    {
      item_id: string;
      product_id: string;
      converted_boxes: number;
      lot_number: string;
      expiration_date: string;
    }[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [invData, prodsData] = await Promise.all([
          invoiceService.getInvoiceById(id),
          productService.getProducts(),
        ]);

        setInvoice(invData);
        setProducts(prodsData);

        // Carrega setores da unidade da nota
        const secsData = await unitService.getSectorsByUnit(invData.unit_id);
        setSectors(secsData);
        if (secsData.length > 0) setSelectedSectorId(secsData[0].id);

        // Inicializa estado de conferência dos itens
        setItemsState(
          invData.items.map((it) => ({
            item_id: it.id,
            product_id: it.product_id || (prodsData.length > 0 ? prodsData[0].id : ''),
            converted_boxes: it.converted_boxes > 0 ? it.converted_boxes : Math.max(1, Math.floor(it.raw_quantity)),
            lot_number: '',
            expiration_date: '',
          }))
        );

        // Tenta obter signed URL do PDF se existir storage_path
        if (invData.pdf_storage_path) {
          try {
            const url = await invoiceService.getPdfSignedUrl(invData.pdf_storage_path);
            setPdfUrl(url);
          } catch (e) {
            console.warn('PDF não encontrado no storage');
          }
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao carregar dados da nota fiscal.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleItemChange = (index: number, field: string, value: any) => {
    setItemsState((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleConfirmEntry = async () => {
    if (!invoice || !selectedSectorId) {
      setErrorMsg('Por favor selecione o setor físico de armazenamento.');
      return;
    }

    // Validações
    for (const item of itemsState) {
      if (!item.product_id) {
        setErrorMsg('Todos os itens devem estar associados a um produto do catálogo.');
        return;
      }
      if (item.converted_boxes <= 0) {
        setErrorMsg('A quantidade em caixas conferidas deve ser maior que zero para todos os itens.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await invoiceService.confirmInvoiceEntry({
        invoiceId: invoice.id,
        sectorId: selectedSectorId,
        itemsMapping: itemsState.map((it) => ({
          item_id: it.item_id,
          product_id: it.product_id,
          converted_boxes: it.converted_boxes,
          lot_number: it.lot_number || undefined,
          expiration_date: it.expiration_date || undefined,
        })),
      });

      navigate('/inventory');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao confirmar entrada da nota fiscal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Spinner size="lg" message="Carregando dados da conferência..." />;
  if (!invoice) return <div>Nota fiscal não encontrada.</div>;

  const isConfirmed = invoice.status === 'CONFIRMED';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Relação de Notas
        </Link>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors border border-brand-200"
          >
            <ExternalLink className="w-4 h-4" /> Visualizar PDF da DANFE
          </a>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header da Nota */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                NF-e {invoice.invoice_number} — Série {invoice.invoice_series}
              </h2>
              <Badge variant={isConfirmed ? 'success' : 'warning'}>
                {isConfirmed ? 'Entrada Confirmada' : 'Aguardando Conferência'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Emitente: <span className="font-semibold text-slate-700">{invoice.issuer_name}</span> ({invoice.issuer_tax_id})
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Valor Contábil:</span>
            <span className="text-base font-bold text-slate-900 font-mono">
              {formatCurrency(invoice.total_value)}
            </span>
          </div>
        </div>

        <div className="pt-3 text-xs text-slate-500 font-mono">
          <span className="text-slate-400 mr-2">Chave:</span>
          {formatAccessKey(invoice.access_key)}
        </div>
      </Card>

      {/* Setor de Destino */}
      {!isConfirmed && (
        <Card title="Local de Armazenamento Físico">
          <div className="max-w-md">
            <Select
              label="Setor Físico de Avarias da Unidade"
              required
              value={selectedSectorId}
              onChange={(e) => setSelectedSectorId(e.target.value)}
              options={sectors.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.code})`,
              }))}
            />
          </div>
        </Card>
      )}

      {/* Tabela de Conferência e Mapeamento de Itens */}
      <Card
        title="Conferência Física e Associação de Produtos"
        subtitle="Confronte as quantidades impressas na NF com as caixas físicas descarregadas no pátio"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Item</th>
                <th className="py-2.5 px-3">Descrição na NF-e</th>
                <th className="py-2.5 px-3">Qtd Fiscal Faturada</th>
                <th className="py-2.5 px-3">Produto no Catálogo Oficial</th>
                <th className="py-2.5 px-3 text-right">Caixas Inteiras Físicas</th>
                <th className="py-2.5 px-3">Lote Fabricante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((it: any, idx: number) => {
                const state = itemsState[idx];
                return (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-400">#{it.item_index}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{it.raw_product_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Cód: {it.raw_product_code} | NCM: {it.raw_ncm || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {it.raw_quantity} {it.raw_unit}
                    </td>
                    <td className="py-3 px-3 min-w-[220px]">
                      {isConfirmed ? (
                        <span className="font-medium text-slate-800">
                          {it.product?.name || 'Item vinculado'}
                        </span>
                      ) : (
                        <select
                          value={state?.product_id || ''}
                          onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} — {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right min-w-[120px]">
                      {isConfirmed ? (
                        <span className="font-bold text-emerald-700 font-mono text-sm">
                          {it.converted_boxes} cx
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={state?.converted_boxes || ''}
                          onChange={(e) =>
                            handleItemChange(idx, 'converted_boxes', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-24 text-right font-mono font-bold text-sm rounded-lg border border-slate-300 py-1 px-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      )}
                    </td>
                    <td className="py-3 px-3 min-w-[130px]">
                      {isConfirmed ? (
                        <span className="text-slate-500 font-mono text-[11px]">—</span>
                      ) : (
                        <input
                          type="text"
                          placeholder="Opcional"
                          value={state?.lot_number || ''}
                          onChange={(e) => handleItemChange(idx, 'lot_number', e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-300 py-1 px-2"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!isConfirmed && (
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Ao confirmar a entrada, o sistema gerará os lotes físicos, atualizará os balanços e registrará no Livro-Razão atômico.
            </p>
            <Button
              variant="success"
              size="lg"
              onClick={handleConfirmEntry}
              isLoading={isSubmitting}
              icon={<CheckCircle2 className="w-5 h-5" />}
            >
              Confirmar Entrada no Estoque
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
