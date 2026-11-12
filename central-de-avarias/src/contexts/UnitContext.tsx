import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthContext';
import type { Database } from '@/types/database.types';

type Unit = Database['public']['Tables']['units']['Row'];

interface UnitContextType {
  activeUnit: Unit | null;
  authorizedUnits: Unit[];
  isLoadingUnits: boolean;
  setActiveUnitId: (unitId: string) => void;
  canImportInvoices: boolean;
  canRequestTransfers: boolean;
  canApproveTransfers: boolean;
  canDispatchTransfers: boolean;
  canReceiveTransfers: boolean;
  isHeadquarters: boolean;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export const UnitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, permissions, isCorporateManager, isSuperAdmin } = useAuth();
  const [authorizedUnits, setAuthorizedUnits] = useState<Unit[]>([]);
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);
  const [isLoadingUnits, setIsLoadingUnits] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setAuthorizedUnits([]);
      setActiveUnit(null);
      setIsLoadingUnits(false);
      return;
    }

    const loadUnits = async () => {
      setIsLoadingUnits(true);
      try {
        const { data, error } = await supabase
          .from('units')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        const units = data || [];
        setAuthorizedUnits(units);

        // Seleciona unidade preferencial ou padrão
        const savedUnitId = localStorage.getItem('central_avarias_active_unit');
        const defaultUnit =
          units.find((u) => u.id === savedUnitId) ||
          units.find((u) => u.id === profile?.default_unit_id) ||
          units[0] ||
          null;

        setActiveUnit(defaultUnit);
      } catch (err) {
        console.error('[UnitContext] Erro ao carregar unidades:', err);
      } finally {
        setIsLoadingUnits(false);
      }
    };

    loadUnits();
  }, [user, profile]);

  const setActiveUnitId = (unitId: string) => {
    const selected = authorizedUnits.find((u) => u.id === unitId);
    if (selected) {
      setActiveUnit(selected);
      localStorage.setItem('central_avarias_active_unit', unitId);
    }
  };

  const currentPermission = permissions.find((p) => p.unit_id === activeUnit?.id);

  const canImportInvoices = isSuperAdmin || Boolean(currentPermission?.can_import_invoices);
  const canRequestTransfers = isSuperAdmin || Boolean(currentPermission?.can_request_transfers);
  const canApproveTransfers = isSuperAdmin || Boolean(currentPermission?.can_approve_transfers);
  const canDispatchTransfers = isSuperAdmin || Boolean(currentPermission?.can_dispatch_transfers);
  const canReceiveTransfers = isSuperAdmin || Boolean(currentPermission?.can_receive_transfers);
  const isHeadquarters = activeUnit?.unit_type === 'HEADQUARTERS';

  return (
    <UnitContext.Provider
      value={{
        activeUnit,
        authorizedUnits,
        isLoadingUnits,
        setActiveUnitId,
        canImportInvoices,
        canRequestTransfers,
        canApproveTransfers,
        canDispatchTransfers,
        canReceiveTransfers,
        isHeadquarters,
      }}
    >
      {children}
    </UnitContext.Provider>
  );
};

export const useUnit = (): UnitContextType => {
  const context = useContext(UnitContext);
  if (!context) {
    throw new Error('useUnit deve ser utilizado dentro de um UnitProvider');
  }
  return context;
};
