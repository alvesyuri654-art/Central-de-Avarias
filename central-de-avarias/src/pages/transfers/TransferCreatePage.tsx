import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUnit } from '@/contexts/UnitContext';
import { unitService } from '@/services/unitService';
import { productService } from '@/services/productService';
import { transferService } from '@/services/transferService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowLeft, Plus, Trash2, Send, AlertCircle } from 'lucide-react';

export const TransferCreatePage: React.FC = () => {
  const { activeUnit } = useUnit();
  const navigate = useNavigate();

  const [units, setUnits] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sourceUnitId, setSourceUnitId] = useState('');
  const [items, setItems] = useState<{ product_id: string; requested_boxes: number }[]>([]);
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadPrerequisites = async () => {
      setIsLoading(true);
      try {
        const [unitsData, prodsData] = await Promise.all([
          unitService.getUnits(),
          productService.getProducts(),
        ]);

        setUnits(unitsData);
        setProducts(prodsData);

        // Define origem padrão (se a ativa for filial, sugere a matriz)
        const headquarters = unitsData.find((u) => u.unit_type === 'HEADQUARTERS');
        if (headquarters && headquarters.id !== activeUnit?.id) {
          setSourceUnitId(headquarters.id);
        } else {
          const other = unitsData.find((u) => u.id !== activeUnit?.id);
          if (other) setSourceUnitId(other.id);
        }

        // Item inicial padrão
        if (prodsData.length > 0) {
          setItems([{ product_id: prodsData[0].id, requested_boxes: 10 }]);
        }
      } catch (err: any) {
        setErrorMsg('Erro ao carregar unidades e produtos para solicitação.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPrerequisites();
  }, [activeUnit]);

  const handleAddItem = () => {
    if (products.length === 0) return;
    setItems((prev) => [...prev, { product_id: products[0].id, requested_boxes: 10 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUnit || !sourceUnitId) return;

    if (items.length === 0) {
      setErrorMsg('Adicione ao menos um produto na solicitação.');
      return;
    }

    for (const item of items) {
      if (item.requested_boxes <= 0) {
        setErrorMsg('Todas as quantidades solicitadas devem ser maiores que zero.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await transferService.requestTransfer(
        activeUnit.id, // Destino = Unidade ativa atual
        sourceUnitId,  // Origem = Unidade selecionada (Matriz)
        items,
        notes
      );

      navigate(`/transfers/${res.transfer_id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao gerar solicitação de transferência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <Spinner size="lg" message="Carregando dados..." />;

  const availableSources = units.filter((u) => u.id !== activeUnit?.id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/transfers"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para Transferências
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Nova Solicitação de Transferência</h1>
        <p className="text-xs text-slate-500 mt-1">
          Solicite materiais e caixas de avarias de outra unidade da empresa
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="Unidades Envolvidas">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Unidade Solicitante (Destino)
              </label>
              <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                {activeUnit?.name} ({activeUnit?.state_code})
              </div>
            </div>

            <Select
              label="Unidade Fornecedora (Origem)"
              required
              value={sourceUnitId}
              onChange={(e) => setSourceUnitId(e.target.value)}
              options={availableSources.map((u) => ({
                value: u.id,
                label: `${u.name} (${u.state_code}) — ${u.unit_type === 'HEADQUARTERS' ? 'Matriz' : 'Filial'}`,
              }))}
            />
          </div>
        </Card>

        <Card
          title="Produtos Solicitados (Caixas Inteiras)"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleAddItem}
            >
              Adicionar Item
            </Button>
          }
        >
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50"
              >
                <div className="flex-1">
                  <select
                    value={it.product_id}
                    onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 py-1.5 px-3 bg-white font-medium"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="Qtd caixas"
                    value={it.requested_boxes}
                    onChange={(e) =>
                      handleItemChange(idx, 'requested_boxes', parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full text-right text-xs font-mono font-bold rounded-lg border border-slate-300 py-1.5 px-2 bg-white"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <Input
              label="Observações da Solicitação"
              placeholder="Ex: Reposição de caixas para devoluções do cliente regional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              icon={<Send className="w-4 h-4" />}
            >
              Emitir Solicitação de Transferência
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};
