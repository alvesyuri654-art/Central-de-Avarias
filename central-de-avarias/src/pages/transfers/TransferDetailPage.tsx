import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { transferService } from '@/services/transferService';
import { inventoryService } from '@/services/inventoryService';
import { unitService } from '@/services/unitService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import {
  ArrowLeft,
  CheckCircle2,
  Truck,
  PackageCheck,
  AlertTriangle,
  Lock,
  History,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { formatBoxes, formatDateTime } from '@/lib/formatters';

export const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { activeUnit } = useUnit();
  const { user } = useAuth();

  const [transfer, setTransfer] = useState<any | null>(null);
  const [sourceLots, setSourceLots] = useState<any[]>([]);
  const [destSectors, setDestSectors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modais de Transição de Estado
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approvedBoxesState, setApprovedBoxesState] = useState<{ [itemId: string]: number }>({});

  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [selectedItemForAlloc, setSelectedItemForAlloc] = useState<any | null>(null);
  const [selectedLotId, setSelectedLotId] = useState('');
  const [allocBoxes, setAllocBoxes] = useState('');

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveItemsState, setReceiveItemsState] = useState<{
    [itemId: string]: { received: number; sectorId: string; quarSectorId: string };
  }>({});
  const [divergenceNotes, setDivergenceNotes] = useState('');

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const loadTransfer = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await transferService.getTransferById(id);
      setTransfer(data);

      // Carrega setores do destino caso seja necessário receber
      const secs = await unitService.getSectorsByUnit(data.destination_unit_id);
      setDestSectors(secs);

      // Se a transferência estiver em picking ou approved, busca lotes da origem
      if (['APPROVED', 'PICKING'].includes(data.status)) {
        const lots = await inventoryService.getLots(data.source_unit_id);
        setSourceLots(lots);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar dados da transferência.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransfer();
  }, [id]);

  if (isLoading) return <Spinner size="lg" message="Carregando workflow da transferência..." />;
  if (!transfer) return <div>Transferência não encontrada.</div>;

  const isSourceUnit = activeUnit?.id === transfer.source_unit_id;
  const isDestUnit = activeUnit?.id === transfer.destination_unit_id;

  // Handlers das Ações
  const handleApprove = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = transfer.items.map((it: any) => ({
        item_id: it.id,
        approved_boxes: approvedBoxesState[it.id] ?? it.requested_boxes,
      }));
      await transferService.approveTransfer(transfer.id, payload);
      setIsApproveModalOpen(false);
      loadTransfer();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao aprovar transferência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAlloc || !selectedLotId) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await transferService.allocateAndReserve(transfer.id, [
        {
          item_id: selectedItemForAlloc.id,
          lot_id: selectedLotId,
          boxes: parseInt(allocBoxes, 10),
        },
      ]);
      setIsAllocateModalOpen(false);
      setAllocBoxes('');
      loadTransfer();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao alocar e reservar lote.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await transferService.dispatchTransfer(transfer.id);
      loadTransfer();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao expedir transferência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceive = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = transfer.items.map((it: any) => {
        const state = receiveItemsState[it.id] || {
          received: it.dispatched_boxes,
          sectorId: destSectors[0]?.id,
          quarSectorId: destSectors.find((s) => s.code.includes('QUAR'))?.id,
        };
        return {
          item_id: it.id,
          received_boxes: state.received,
          destination_sector_id: state.sectorId,
          quarantine_sector_id: state.quarSectorId,
        };
      });

      await transferService.receiveTransfer(transfer.id, payload, divergenceNotes);
      setIsReceiveModalOpen(false);
      loadTransfer();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao concluir recebimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await transferService.cancelTransfer(transfer.id, cancelReason);
      setIsCancelModalOpen(false);
      loadTransfer();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cancelar transferência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verificação se todos os itens estão 100% alocados para poder despachar
  const isReadyToDispatch =
    transfer.status === 'PICKING' &&
    transfer.items.every((it: any) => {
      const allocated = transfer.allocations
        .filter((a: any) => a.transfer_item_id === it.id)
        .reduce((acc: number, a: any) => acc + a.allocated_boxes, 0);
      return allocated === it.approved_boxes && it.approved_boxes > 0;
    });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/transfers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Transferências
        </Link>
        {['REQUESTED', 'APPROVED', 'PICKING'].includes(transfer.status) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setIsCancelModalOpen(true)}
          >
            Cancelar Transferência
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Cartão de Identificação */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">{transfer.transfer_code}</h2>
              <Badge
                variant={
                  transfer.status === 'RECEIVED_COMPLETE'
                    ? 'success'
                    : transfer.status === 'RECEIVED_WITH_DIVERGENCE'
                    ? 'danger'
                    : transfer.status === 'IN_TRANSIT'
                    ? 'purple'
                    : transfer.status === 'PICKING'
                    ? 'warning'
                    : 'info'
                }
              >
                {transfer.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Criada em: {formatDateTime(transfer.requested_at)}
            </p>
          </div>

          {/* Botões de Ação do Workflow de Acordo com o Status */}
          <div className="flex items-center gap-2">
            {transfer.status === 'REQUESTED' && isSourceUnit && (
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => {
                  const initial: any = {};
                  transfer.items.forEach((it: any) => (initial[it.id] = it.requested_boxes));
                  setApprovedBoxesState(initial);
                  setIsApproveModalOpen(true);
                }}
              >
                Analisar & Aprovar Solicitação
              </Button>
            )}

            {isReadyToDispatch && isSourceUnit && (
              <Button
                variant="primary"
                size="sm"
                icon={<Truck className="w-4 h-4" />}
                onClick={handleDispatch}
                isLoading={isSubmitting}
              >
                Despachar Carga (Expedir)
              </Button>
            )}

            {transfer.status === 'IN_TRANSIT' && isDestUnit && (
              <Button
                variant="success"
                size="sm"
                icon={<PackageCheck className="w-4 h-4" />}
                onClick={() => {
                  const initial: any = {};
                  transfer.items.forEach(
                    (it: any) =>
                      (initial[it.id] = {
                        received: it.dispatched_boxes,
                        sectorId: destSectors[0]?.id || '',
                        quarSectorId: destSectors.find((s) => s.code.includes('QUAR'))?.id || '',
                      })
                  );
                  setReceiveItemsState(initial);
                  setIsReceiveModalOpen(true);
                }}
              >
                Conferir e Receber Carga
              </Button>
            )}
          </div>
        </div>

        {/* Unidades */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block font-semibold uppercase tracking-wider">
              Unidade de Origem (Fornecedora)
            </span>
            <span className="text-sm font-bold text-slate-800 mt-0.5 block">
              {transfer.source_unit?.name} ({transfer.source_unit?.city}/{transfer.source_unit?.state_code})
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block font-semibold uppercase tracking-wider">
              Unidade de Destino (Receptora)
            </span>
            <span className="text-sm font-bold text-slate-800 mt-0.5 block">
              {transfer.destination_unit?.name} ({transfer.destination_unit?.city}/{transfer.destination_unit?.state_code})
            </span>
          </div>
        </div>
      </Card>

      {/* Itens e Alocações */}
      <Card
        title="Itens da Transferência e Alocações Físicas"
        subtitle="Controle fiduciário de caixas solicitadas, aprovadas, alocadas e recebidas"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">Produto</th>
                <th className="py-2.5 px-3 text-right">Solicitado</th>
                <th className="py-2.5 px-3 text-right">Aprovado</th>
                <th className="py-2.5 px-3 text-right">Alocado (Reserva)</th>
                <th className="py-2.5 px-3 text-right">Expedido</th>
                <th className="py-2.5 px-3 text-right">Recebido</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfer.items.map((it: any) => {
                const itemAllocs = transfer.allocations.filter(
                  (a: any) => a.transfer_item_id === it.id
                );
                const totalAlloc = itemAllocs.reduce(
                  (acc: number, a: any) => acc + a.allocated_boxes,
                  0
                );

                return (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{it.product?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        SKU: {it.product?.sku}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                      {formatBoxes(it.requested_boxes)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                      {formatBoxes(it.approved_boxes)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-600 font-bold">
                      {formatBoxes(totalAlloc)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-purple-700 font-bold">
                      {formatBoxes(it.dispatched_boxes)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                      {formatBoxes(it.received_boxes)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {['APPROVED', 'PICKING'].includes(transfer.status) &&
                        isSourceUnit &&
                        totalAlloc < it.approved_boxes && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[11px] py-1"
                            onClick={() => {
                              setSelectedItemForAlloc(it);
                              setAllocBoxes((it.approved_boxes - totalAlloc).toString());
                              setIsAllocateModalOpen(true);
                            }}
                          >
                            Alocar Lote
                          </Button>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Divergências Registradas (se houver) */}
      {transfer.divergences.length > 0 && (
        <Card title="Apontamento de Divergências no Recebimento">
          <div className="space-y-3">
            {transfer.divergences.map((div: any) => (
              <div
                key={div.id}
                className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>DIVERGÊNCIA: {div.divergence_type}</span>
                  </div>
                  <Badge variant="orange">{div.quarantine_status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-amber-800">
                  <div>
                    <span className="block text-slate-500">Esperado:</span>
                    <span className="font-bold">{div.expected_boxes} cx</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Recebido Físico:</span>
                    <span className="font-bold">{div.received_boxes} cx</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Diferença em Quarentena:</span>
                    <span className="font-bold text-red-600 font-mono text-sm">
                      {div.divergence_boxes} cx
                    </span>
                  </div>
                </div>
                {div.resolution_notes && (
                  <p className="text-slate-600 text-[11px] pt-1 border-t border-amber-100">
                    Nota do operador: {div.resolution_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Histórico e Linha do Tempo Auditada */}
      <Card
        title="Histórico de Transições de Status (Auditoria)"
        subtitle="Registro cronológico imutável de aprovações, expedições e recebimentos"
      >
        <div className="space-y-4">
          {transfer.history.map((h: any, idx: number) => (
            <div key={h.id} className="flex items-start gap-3 text-xs">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    Status alterado para: <Badge variant="default">{h.to_status}</Badge>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatDateTime(h.created_at)}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{h.reason}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Operador responsável: {h.profile?.full_name || 'Sistema'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal de Aprovação */}
      {isApproveModalOpen && (
        <Modal
          isOpen={isApproveModalOpen}
          onClose={() => setIsApproveModalOpen(false)}
          title="Aprovação da Solicitação de Transferência"
          subtitle="Confirme ou ajuste a quantidade autorizada de caixas para envio"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {transfer.items.map((it: any) => (
              <div
                key={it.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-800">{it.product?.name}</div>
                  <div className="text-[11px] text-slate-400">
                    Solicitado: {it.requested_boxes} caixas
                  </div>
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    min="0"
                    max={it.requested_boxes}
                    value={approvedBoxesState[it.id] ?? it.requested_boxes}
                    onChange={(e) =>
                      setApprovedBoxesState((prev) => ({
                        ...prev,
                        [it.id]: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsApproveModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleApprove} isLoading={isSubmitting}>
                Confirmar Aprovação
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Alocação e Reserva */}
      {isAllocateModalOpen && selectedItemForAlloc && (
        <Modal
          isOpen={isAllocateModalOpen}
          onClose={() => setIsAllocateModalOpen(false)}
          title="Alocação Física e Reserva de Caixas"
          subtitle={`Produto: ${selectedItemForAlloc.product?.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleAllocate} className="space-y-4">
            <Select
              label="Lote Físico de Origem Disponível"
              required
              value={selectedLotId}
              onChange={(e) => setSelectedLotId(e.target.value)}
              options={sourceLots
                .filter((l) => l.product_id === selectedItemForAlloc.product_id && l.available_boxes > 0)
                .map((l) => ({
                  value: l.id,
                  label: `Lote ${l.lot_number || l.id.slice(0, 8)} (${l.sector?.name}) — Disp: ${l.available_boxes} cx`,
                }))}
            />
            <Input
              label="Quantidade a Reservar deste Lote"
              type="number"
              min="1"
              required
              value={allocBoxes}
              onChange={(e) => setAllocBoxes(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsAllocateModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                Reservar Caixas
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Recebimento com Tratamento de Sobras */}
      {isReceiveModalOpen && (
        <Modal
          isOpen={isReceiveModalOpen}
          onClose={() => setIsReceiveModalOpen(false)}
          title="Conferência de Recebimento de Carga"
          subtitle="Informe as caixas reais descarregadas. Sobras serão isoladas em quarentena."
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {transfer.items.map((it: any) => {
              const state = receiveItemsState[it.id] || {
                received: it.dispatched_boxes,
                sectorId: destSectors[0]?.id || '',
                quarSectorId: destSectors.find((s) => s.code.includes('QUAR'))?.id || '',
              };
              const isExcess = state.received > it.dispatched_boxes;

              return (
                <div key={it.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{it.product?.name}</span>
                      <span className="text-[11px] text-slate-400 block font-mono">
                        Expedido da Matriz: {it.dispatched_boxes} cx
                      </span>
                    </div>
                    <div className="w-32">
                      <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">
                        Qtd Recebida
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={state.received}
                        onChange={(e) =>
                          setReceiveItemsState((prev) => ({
                            ...prev,
                            [it.id]: {
                              ...state,
                              received: parseInt(e.target.value, 10) || 0,
                            },
                          }))
                        }
                        className="w-full text-right font-mono font-bold text-sm rounded-lg border border-slate-300 py-1.5 px-2 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <Select
                      label="Setor de Estoque Regular"
                      value={state.sectorId}
                      onChange={(e) =>
                        setReceiveItemsState((prev) => ({
                          ...prev,
                          [it.id]: { ...state, sectorId: e.target.value },
                        }))
                      }
                      options={destSectors.map((s) => ({
                        value: s.id,
                        label: s.name,
                      }))}
                    />

                    {isExcess && (
                      <Select
                        label="Setor de Quarentena (Sobra)"
                        value={state.quarSectorId}
                        onChange={(e) =>
                          setReceiveItemsState((prev) => ({
                            ...prev,
                            [it.id]: { ...state, quarSectorId: e.target.value },
                          }))
                        }
                        options={destSectors.map((s) => ({
                          value: s.id,
                          label: s.name,
                        }))}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            <Input
              label="Observações do Recebimento"
              placeholder="Ex: Carga conferida no pátio com o motorista"
              value={divergenceNotes}
              onChange={(e) => setDivergenceNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsReceiveModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="success" size="sm" onClick={handleReceive} isLoading={isSubmitting}>
                Confirmar Recebimento
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Cancelamento */}
      {isCancelModalOpen && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title="Cancelar Transferência"
          maxWidth="md"
        >
          <form onSubmit={handleCancel} className="space-y-4">
            <Input
              label="Justificativa do Cancelamento"
              required
              placeholder="Ex: Material não será mais necessário na filial"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsCancelModalOpen(false)}>
                Voltar
              </Button>
              <Button variant="danger" size="sm" type="submit" isLoading={isSubmitting}>
                Confirmar Cancelamento
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
