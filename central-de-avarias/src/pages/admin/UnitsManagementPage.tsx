import React, { useEffect, useState } from 'react';
import { unitService } from '@/services/unitService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Building2, Plus, Edit2, Check, X } from 'lucide-react';
import { formatCnpj } from '@/lib/formatters';

export const UnitsManagementPage: React.FC = () => {
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [stateCode, setStateCode] = useState('SC');
  const [unitType, setUnitType] = useState<'BRANCH' | 'HEADQUARTERS'>('BRANCH');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadUnits = async () => {
    setIsLoading(true);
    try {
      const data = await unitService.getUnits();
      setUnits(data);
    } catch (err) {
      console.error('Erro ao carregar unidades:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const handleOpenModal = (unit?: any) => {
    if (unit) {
      setSelectedUnit(unit);
      setCode(unit.code);
      setName(unit.name);
      setCity(unit.city);
      setState(unit.state);
      setStateCode(unit.state_code);
      setUnitType(unit.unit_type);
      setTaxId(unit.tax_id || '');
      setAddress(unit.address || '');
    } else {
      setSelectedUnit(null);
      setCode('');
      setName('');
      setCity('');
      setState('');
      setStateCode('SC');
      setUnitType('BRANCH');
      setTaxId('');
      setAddress('');
    }
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (selectedUnit) {
        await unitService.updateUnit(selectedUnit.id, {
          name,
          city,
          state,
          state_code: stateCode.toUpperCase(),
          tax_id: taxId.trim() || null,
          address: address.trim() || null,
        });
      } else {
        await unitService.createUnit({
          company_id: 'c0000000-0000-0000-0000-000000000001',
          code: code.trim().toUpperCase(),
          name: name.trim(),
          city: city.trim(),
          state: state.trim(),
          state_code: stateCode.trim().toUpperCase(),
          unit_type: unitType,
          tax_id: taxId.trim() || null,
          address: address.trim() || null,
        });
      }

      setIsModalOpen(false);
      loadUnits();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar unidade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (unit: any) => {
    try {
      await unitService.updateUnit(unit.id, { is_active: !unit.is_active });
      loadUnits();
    } catch (err) {
      console.error('Erro ao alterar status da unidade:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestão de Unidades Operacionais</h1>
          <p className="text-xs text-slate-500 mt-1">
            Matriz e Filiais cadastradas dinamicamente no banco de dados, sem amarras no código
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => handleOpenModal()}
        >
          Cadastrar Nova Unidade
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <Spinner message="Carregando unidades..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Nome da Unidade</th>
                  <th className="py-2.5 px-3">Cidade / UF</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">CNPJ</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{u.code}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{u.name}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {u.city} - {u.state_code}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={u.unit_type === 'HEADQUARTERS' ? 'purple' : 'info'} size="sm">
                        {u.unit_type === 'HEADQUARTERS' ? 'Matriz' : 'Filial'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{formatCnpj(u.tax_id)}</td>
                    <td className="py-3 px-3">
                      <Badge variant={u.is_active ? 'success' : 'danger'} size="sm">
                        {u.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenModal(u)}
                          className="p-1 text-slate-400 hover:text-brand-600 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1 rounded ${
                            u.is_active
                              ? 'text-slate-400 hover:text-red-600'
                              : 'text-slate-400 hover:text-emerald-600'
                          }`}
                          title={u.is_active ? 'Inativar' : 'Ativar'}
                        >
                          {u.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
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

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedUnit ? 'Editar Unidade' : 'Cadastrar Nova Unidade'}
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Código Interno"
                required
                disabled={Boolean(selectedUnit)}
                placeholder="Ex: FIL-PR-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Select
                label="Tipo de Unidade"
                disabled={Boolean(selectedUnit)}
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as any)}
                options={[
                  { value: 'BRANCH', label: 'Filial Regional' },
                  { value: 'HEADQUARTERS', label: 'Matriz Geral' },
                ]}
              />
            </div>

            <Input
              label="Nome da Unidade"
              required
              placeholder="Ex: Filial Curitiba"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Cidade"
                  required
                  placeholder="Ex: Curitiba"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <Input
                label="UF"
                required
                maxLength={2}
                placeholder="PR"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value.toUpperCase())}
              />
            </div>

            <Input
              label="CNPJ Oficial (Opcional - Pode preencher após)"
              placeholder="00.000.000/0000-00"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />

            <Input
              label="Endereço Completo (Opcional)"
              placeholder="Rua, número, bairro..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                Salvar Unidade
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
