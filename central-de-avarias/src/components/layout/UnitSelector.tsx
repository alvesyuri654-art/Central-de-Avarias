import React from 'react';
import { useUnit } from '@/contexts/UnitContext';
import { Building2, ChevronDown } from 'lucide-react';

export const UnitSelector: React.FC = () => {
  const { activeUnit, authorizedUnits, setActiveUnitId, isLoadingUnits } = useUnit();

  if (isLoadingUnits) {
    return <div className="text-xs text-slate-400 animate-pulse">Carregando unidades...</div>;
  }

  if (authorizedUnits.length === 0) {
    return (
      <div className="text-xs text-red-500 font-medium">Nenhuma unidade vinculada</div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 transition-colors px-3 py-1.5 rounded-lg border border-slate-200">
        <Building2 className="w-4 h-4 text-brand-600 shrink-0" />
        <select
          value={activeUnit?.id || ''}
          onChange={(e) => setActiveUnitId(e.target.value)}
          className="bg-transparent text-xs font-semibold text-slate-800 pr-4 focus:outline-none cursor-pointer appearance-none"
        >
          {authorizedUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.state_code}) — {u.unit_type === 'HEADQUARTERS' ? 'Matriz' : 'Filial'}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none -ml-3" />
      </div>
    </div>
  );
};
