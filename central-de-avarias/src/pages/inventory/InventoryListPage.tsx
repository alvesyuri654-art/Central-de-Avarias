import React, { useEffect, useState } from 'react';
import { useUnit } from '@/contexts/UnitContext';
import { inventoryService } from '@/services/inventoryService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Modal } from '@/components/ui/Modal';
import {
  Boxes,
  Search,
  SlidersHorizontal,
  Trash2,
  Eye,
  GitBranch,
  Lock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatBoxes, formatDateOnly } from '@/lib/formatters';

export const InventoryListPage: React.FC = () => {
  const { activeUnit } = useUnit();
  const [lots, setLots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modais de Ajuste e Descarte
  const [selectedLot, setSelectedLot] = useState<any | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false);
  const [adjustBoxes, setAdjustBoxes] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadInventory = async () => {
    if (!activeUnit) return;
    setIsLoading(true);
    try {
      const data = await inventoryService.getLots(activeUnit.id);
      setLots(data);
    } catch (err) {
      console.error('Erro ao carregar estoque de lotes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [activeUnit]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUnit || !selectedLot) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await inventoryService.adjustInventory(
        activeUnit.id,
        selectedLot.id,
        parseInt(adjustBoxes, 10),
        actionReason
      );
      setIsAdjustModalOpen(false);
      setAdjustBoxes('');
      setActionReason('');
      loadInventory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar ajuste de inventário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWriteOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUnit || !selectedLot) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await inventoryService.writeOff(
        activeUnit.id,
        selectedLot.id,
        parseInt(adjustBoxes, 10),
        actionReason
      );
      setIsWriteOffModalOpen(false);
      setAdjustBoxes('');
      setActionReason('');
      loadInventory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar baixa por descarte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLots = lots.filter(
    (l) =>
      l.product?.name.toLowerCase().includes(search.toLowerCase()) ||
      l.product?.sku.toLowerCase().includes(search.toLowerCase()) ||
      l.sector?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Estoque Físico de Avarias</h1>
          <p className="text-xs text-slate-500 mt-1">
            Visualização de caixas em prateleira, controle de reservas e rastreabilidade genealógica
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/inventory/movements">
            <Button variant="outline" size="sm">
              Ver Histórico de Fatos
            </Button>
          </Link>
          <Link to="/inventory/reconciliation">
            <Button variant="secondary" size="sm">
              Conciliação Fiduciária
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtro de Busca */}
      <Card>
        <div className="max-w-md">
          <Input
            placeholder="Buscar por produto, SKU ou setor físico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* Grid de Lotes */}
      <Card>
        {isLoading ? (
          <Spinner message="Carregando estoque físico..." />
        ) : filteredLots.length === 0 ? (
          <EmptyState
            icon={<Boxes className="w-6 h-6" />}
            title="Nenhum lote físico em estoque"
            description="Não existem caixas armazenadas nos setores da unidade ativa."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Produto / SKU</th>
                  <th className="py-2.5 px-3">Setor Físico</th>
                  <th className="py-2.5 px-3 text-right">Físico Total</th>
                  <th className="py-2.5 px-3 text-right">Reservado</th>
                  <th className="py-2.5 px-3 text-right">Disponível</th>
                  <th className="py-2.5 px-3">Origem Documental</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{lot.product?.name}</div>
                      <div className="text-[10px] text-brand-700 font-mono font-semibold">
                        SKU: {lot.product?.sku}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {lot.sector?.name || '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatBoxes(lot.current_boxes)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-600 font-medium">
                      {lot.reserved_boxes > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" /> {formatBoxes(lot.reserved_boxes)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                      {formatBoxes(lot.available_boxes)}
                    </td>
                    <td className="py-3 px-3">
                      {lot.parent_lot_id ? (
                        <Badge variant="purple" size="sm" className="gap-1">
                          <GitBranch className="w-3 h-3" /> Remessa Transferida
                        </Badge>
                      ) : (
                        <span className="text-slate-600 font-medium">
                          NF {lot.invoice?.invoice_number || '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/inventory/lots/${lot.id}`}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded"
                          title="Rastreabilidade genealógica"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedLot(lot);
                            setIsAdjustModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                          title="Ajuste inventarial auditado"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLot(lot);
                            setIsWriteOffModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Baixa por descarte de avaria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Ajuste de Inventário */}
      {isAdjustModalOpen && selectedLot && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title="Ajuste Compensatório de Inventário"
          subtitle={`Produto: ${selectedLot.product?.name} (Saldo Atual: ${selectedLot.current_boxes} cx)`}
          maxWidth="md"
        >
          <form onSubmit={handleAdjust} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}
            <Input
              label="Quantidade de Ajuste (Caixas Inteiras)"
              type="number"
              step="1"
              required
              helperText="Informe valor positivo para acréscimo ou negativo para redução física."
              placeholder="Ex: -2 ou +5"
              value={adjustBoxes}
              onChange={(e) => setAdjustBoxes(e.target.value)}
            />
            <Input
              label="Justificativa Obrigatória do Ajuste"
              required
              placeholder="Ex: Contagem de inventário cíclico apontou quebra física no palete 02"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsAdjustModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                Confirmar Ajuste
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Descarte (Write-Off) */}
      {isWriteOffModalOpen && selectedLot && (
        <Modal
          isOpen={isWriteOffModalOpen}
          onClose={() => setIsWriteOffModalOpen(false)}
          title="Baixa por Descarte de Avaria Irreparável"
          subtitle={`Destruição ou descarte final de caixas sem possibilidade de aproveitamento`}
          maxWidth="md"
        >
          <form onSubmit={handleWriteOff} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}
            <Input
              label="Quantidade a Descartar (Caixas Inteiras)"
              type="number"
              min="1"
              max={selectedLot.available_boxes}
              required
              placeholder={`Máximo disponível: ${selectedLot.available_boxes} cx`}
              value={adjustBoxes}
              onChange={(e) => setAdjustBoxes(e.target.value)}
            />
            <Input
              label="Motivo Técnico / Laudo de Descarte"
              required
              placeholder="Ex: Embalagem violada com vazamento de líquido e perda sanitária total"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsWriteOffModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" size="sm" type="submit" isLoading={isSubmitting}>
                Executar Baixa Definitiva
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
