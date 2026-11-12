import React, { useEffect, useState } from 'react';
import { unitService } from '@/services/unitService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { MapPin, Plus, Check, X } from 'lucide-react';

export const SectorsManagementPage: React.FC = () => {
  const [sectors, setSectors] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [unitId, setUnitId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [secs, us] = await Promise.all([
        unitService.getAllSectors(),
        unitService.getUnits(),
      ]);
      setSectors(secs);
      setUnits(us);
      if (us.length > 0) setUnitId(us[0].id);
    } catch (err) {
      console.error('Erro ao carregar setores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await unitService.createSector({
        unit_id: unitId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
      });

      setIsModalOpen(false);
      setCode('');
      setName('');
      setDescription('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao cadastrar setor físico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (sector: any) => {
    try {
      await unitService.toggleSectorStatus(sector.id, !sector.is_active);
      loadData();
    } catch (err: any) {
      console.error('Erro ao alternar status do setor:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Setores Físicos de Armazenamento</h1>
          <p className="text-xs text-slate-500 mt-1">
            Localizações físicas dentro dos galpões de cada unidade (pulmão, câmara, quarentena, etc.)
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Criar Novo Setor
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <Spinner message="Carregando setores..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Nome do Setor</th>
                  <th className="py-2.5 px-3">Unidade Operacional</th>
                  <th className="py-2.5 px-3">Descrição Operacional</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sectors.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-brand-700">{s.code}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{s.name}</td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {s.unit?.name} ({s.unit?.state_code})
                    </td>
                    <td className="py-3 px-3 text-slate-500">{s.description || '—'}</td>
                    <td className="py-3 px-3">
                      <Badge variant={s.is_active ? 'success' : 'danger'} size="sm">
                        {s.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleToggleStatus(s)}
                        className={`p-1 rounded ${
                          s.is_active
                            ? 'text-slate-400 hover:text-red-600'
                            : 'text-slate-400 hover:text-emerald-600'
                        }`}
                        title={s.is_active ? 'Inativar setor' : 'Ativar setor'}
                      >
                        {s.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Cadastrar Novo Setor Físico"
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            <Select
              label="Unidade Pertencente"
              required
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              options={units.map((u) => ({
                value: u.id,
                label: `${u.name} (${u.state_code})`,
              }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Código do Setor"
                required
                placeholder="Ex: SET-AV-CAMARA"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Input
                label="Nome do Setor"
                required
                placeholder="Ex: Câmara Fria de Avarias"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <Input
              label="Descrição do Uso (Opcional)"
              placeholder="Ex: Armazenamento exclusivo de produtos perecíveis"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                Salvar Setor
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
