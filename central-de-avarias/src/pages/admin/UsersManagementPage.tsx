import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { unitService } from '@/services/unitService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Users, Shield, Plus, Key } from 'lucide-react';

export const UsersManagementPage: React.FC = () => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [userPermissions, setUserPermissions] = useState<any[]>([]);
  const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);

  // Formulário de Nova Permissão por Unidade
  const [newUnitId, setNewUnitId] = useState('');
  const [newUnitRole, setNewUnitRole] = useState<'UNIT_MANAGER' | 'STOCK_OPERATOR' | 'UNIT_AUDITOR'>('STOCK_OPERATOR');
  const [canImport, setCanImport] = useState(true);
  const [canRequest, setCanRequest] = useState(true);
  const [canApprove, setCanApprove] = useState(false);
  const [canDispatch, setCanDispatch] = useState(true);
  const [canReceive, setCanReceive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profsRes, us] = await Promise.all([
        supabase.from('profiles').select('*, default_unit:units(name, state_code)').order('full_name'),
        unitService.getUnits(),
      ]);

      setProfiles(profsRes.data || []);
      setUnits(us);
      if (us.length > 0) setNewUnitId(us[0].id);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPermissions = async (profile: any) => {
    setSelectedProfile(profile);
    setIsPermsModalOpen(true);
    setErrorMsg(null);

    const { data } = await supabase
      .from('unit_permissions')
      .select('*, unit:units(name, state_code)')
      .eq('profile_id', profile.id);

    setUserPermissions(data || []);
  };

  const handleSavePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !newUnitId) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from('unit_permissions').upsert({
        profile_id: selectedProfile.id,
        unit_id: newUnitId,
        unit_role: newUnitRole,
        can_import_invoices: canImport,
        can_request_transfers: canRequest,
        can_approve_transfers: canApprove,
        can_dispatch_transfers: canDispatch,
        can_receive_transfers: canReceive,
      }, { onConflict: 'profile_id,unit_id' });

      if (error) throw error;

      // Recarrega permissões do perfil
      const { data } = await supabase
        .from('unit_permissions')
        .select('*, unit:units(name, state_code)')
        .eq('profile_id', selectedProfile.id);
      setUserPermissions(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conceder permissão na unidade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Usuários, Perfis e Permissões</h1>
        <p className="text-xs text-slate-500 mt-1">
          Governança de acesso multiunidade e matriz de autorizações granulares
        </p>
      </div>

      <Card>
        {isLoading ? (
          <Spinner message="Carregando operadores cadastrados..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Nome Completo</th>
                  <th className="py-2.5 px-3">E-mail Corporativo</th>
                  <th className="py-2.5 px-3">Unidade Padrão</th>
                  <th className="py-2.5 px-3">Papel Global</th>
                  <th className="py-2.5 px-3">Situação</th>
                  <th className="py-2.5 px-3 text-right">Permissões de Unidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-900">{p.full_name}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{p.email}</td>
                    <td className="py-3 px-3 text-slate-700">
                      {p.default_unit?.name} ({p.default_unit?.state_code})
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          p.global_role === 'SUPERADMIN'
                            ? 'purple'
                            : p.global_role === 'CORPORATE_MANAGER'
                            ? 'info'
                            : 'default'
                        }
                        size="sm"
                      >
                        {p.global_role}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={p.is_active ? 'success' : 'danger'} size="sm">
                        {p.is_active ? 'Ativo' : 'Bloqueado'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] py-1"
                        icon={<Key className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenPermissions(p)}
                      >
                        Matriz de Acessos
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Gestão de Permissões por Unidade */}
      {isPermsModalOpen && selectedProfile && (
        <Modal
          isOpen={isPermsModalOpen}
          onClose={() => setIsPermsModalOpen(false)}
          title={`Permissões Operacionais: ${selectedProfile.full_name}`}
          subtitle="Controle de acesso por filial para operações críticas de pátio"
          maxWidth="lg"
        >
          <div className="space-y-5 text-xs">
            {errorMsg && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {errorMsg}
              </div>
            )}

            {/* Lista Atual de Unidades Autorizadas */}
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                Unidades com Acesso Concedido
              </h4>
              {userPermissions.length === 0 ? (
                <p className="text-slate-400 py-2">Nenhuma unidade configurada para este operador.</p>
              ) : (
                <div className="space-y-2">
                  {userPermissions.map((up) => (
                    <div
                      key={up.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-800 text-sm">
                          {up.unit?.name} ({up.unit?.state_code})
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="info" size="sm">{up.unit_role}</Badge>
                          <span className="text-[10px] text-slate-500">
                            {up.can_approve_transfers ? 'Pode Aprovar TRF | ' : ''}
                            {up.can_dispatch_transfers ? 'Pode Despachar | ' : ''}
                            {up.can_receive_transfers ? 'Pode Receber' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Conceder / Ajustar Permissão em Unidade */}
            <form onSubmit={handleSavePermission} className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Adicionar ou Atualizar Vínculo de Unidade
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Unidade"
                  value={newUnitId}
                  onChange={(e) => setNewUnitId(e.target.value)}
                  options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.state_code})` }))}
                />
                <Select
                  label="Papel Local na Unidade"
                  value={newUnitRole}
                  onChange={(e) => setNewUnitRole(e.target.value as any)}
                  options={[
                    { value: 'UNIT_MANAGER', label: 'Gerente da Unidade (Aprova TRFs)' },
                    { value: 'STOCK_OPERATOR', label: 'Operador de Pista / Almoxarifado' },
                    { value: 'UNIT_AUDITOR', label: 'Auditor (Somente Leitura)' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canImport}
                    onChange={(e) => setCanImport(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Importar NF-e</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canRequest}
                    onChange={(e) => setCanRequest(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Solicitar TRF</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canApprove}
                    onChange={(e) => setCanApprove(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="font-bold text-brand-700">Aprovar TRF</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canDispatch}
                    onChange={(e) => setCanDispatch(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Despachar Carga</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canReceive}
                    onChange={(e) => setCanReceive(e.target.checked)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Receber Carga</span>
                </label>
              </div>

              <div className="flex justify-end pt-3">
                <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                  Salvar Permissão na Unidade
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
