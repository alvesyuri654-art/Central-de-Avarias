import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { extractNfeFromPdf, ParsedNfeData } from '@/lib/pdfParser';
import { invoiceService } from '@/services/invoiceService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { formatCurrency, formatAccessKey } from '@/lib/formatters';

export const InvoiceUploadPage: React.FC = () => {
  const { activeUnit } = useUnit();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedNfeData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Por favor selecione um arquivo no formato PDF digital da DANFE.');
      return;
    }

    setSelectedFile(file);
    setErrorMsg(null);
    setIsParsing(true);

    try {
      const extracted = await extractNfeFromPdf(file);
      setParsedData(extracted);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao extrair texto do PDF.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSaveToStaging = async () => {
    if (!parsedData || !selectedFile || !activeUnit || !user) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      // 1. Upload do arquivo PDF no storage privado do Supabase
      const storagePath = await invoiceService.uploadInvoicePdf(
        activeUnit.id,
        parsedData.access_key,
        selectedFile
      );

      // 2. Gravação dos dados em staging na tabela invoices e invoice_items
      const createdInvoice = await invoiceService.createInvoiceStaging(
        {
          unit_id: activeUnit.id,
          access_key: parsedData.access_key,
          invoice_number: parsedData.invoice_number,
          invoice_series: parsedData.invoice_series,
          issue_date: parsedData.issue_date,
          issuer_name: parsedData.issuer_name,
          issuer_tax_id: parsedData.issuer_tax_id,
          total_value: parsedData.total_value,
          pdf_storage_path: storagePath,
          status: 'PENDING_CONFERENCE',
          uploaded_by: user.id,
        },
        parsedData.items.map((item, idx) => ({
          item_index: idx + 1,
          raw_product_code: item.raw_product_code,
          raw_product_name: item.raw_product_name,
          raw_ncm: item.raw_ncm,
          raw_unit: item.raw_unit,
          raw_quantity: item.raw_quantity,
          converted_boxes: 0,
          unit_price: item.unit_price,
          total_item_value: item.total_item_value,
        }))
      );

      // 3. Redireciona para a conferência humana obrigatória
      navigate(`/invoices/${createdInvoice.id}/conference`);
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        setErrorMsg('Esta Nota Fiscal (mesma chave de acesso de 44 dígitos) já foi importada anteriormente no sistema.');
      } else {
        setErrorMsg(err.message || 'Erro ao processar e salvar a nota fiscal.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Importação de NF-e (PDF Digital)</h1>
        <p className="text-xs text-slate-500 mt-1">
          Faça o envio do documento PDF da DANFE para extração de metadados e pré-preenchimento
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Zona de Drop e Upload */}
      <Card>
        <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-10 text-center transition-colors bg-slate-50/50">
          <input
            type="file"
            id="pdf-upload"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              Clique para selecionar o PDF da Nota Fiscal
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Documento digital com texto selecionável (DANFE em PDF, até 50MB)
            </p>
            {selectedFile && (
              <div className="mt-4 px-3.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200">
                <FileText className="w-4 h-4" /> {selectedFile.name}
              </div>
            )}
          </label>
        </div>
      </Card>

      {/* Preview das Informações Extraídas */}
      {parsedData && (
        <div className="space-y-4">
          <Card title="Dados Pré-Extraídos da Nota Fiscal">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Número da NF:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {parsedData.invoice_number} (Série {parsedData.invoice_series})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Data de Emissão:</span>
                <span className="font-medium text-slate-800">{parsedData.issue_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Valor Total:</span>
                <span className="font-bold text-brand-700 text-sm">
                  {formatCurrency(parsedData.total_value)}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block">Emitente:</span>
                <span className="font-medium text-slate-800">
                  {parsedData.issuer_name} ({parsedData.issuer_tax_id})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Chave de Acesso:</span>
                <span className="font-mono text-[11px] text-slate-600 truncate block">
                  {formatAccessKey(parsedData.access_key)}
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-2">
                Itens Identificados no Documento ({parsedData.items.length})
              </h4>
              <div className="space-y-2">
                {parsedData.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono text-slate-400 mr-2">#{idx + 1}</span>
                      <span className="font-medium text-slate-800">{it.raw_product_name}</span>
                      <span className="text-slate-400 text-[11px] ml-2">({it.raw_product_code})</span>
                    </div>
                    <div className="font-mono font-bold text-slate-700">
                      {it.raw_quantity} {it.raw_unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveToStaging}
                isLoading={isSaving}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Prosseguir para Conferência Física
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
