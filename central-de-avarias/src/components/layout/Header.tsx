import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { UnitSelector } from './UnitSelector';
import { LogOut, User, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Header: React.FC = () => {
  const { profile, signOut, isSuperAdmin, isCorporateManager } = useAuth();
  const { activeUnit, isHeadquarters } = useUnit();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20">
      {/* Esquerda: Identificação da Unidade Ativa */}
      <div className="flex items-center gap-4">
        <UnitSelector />
        {activeUnit && (
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant={isHeadquarters ? 'purple' : 'info'} size="sm">
              {isHeadquarters ? 'MATRIZ GERAL' : 'FILIAL REGIONAL'}
            </Badge>
            <span className="text-xs text-slate-400">
              {activeUnit.city}/{activeUnit.state_code}
            </span>
          </div>
        )}
      </div>

      {/* Direita: Perfil do Operador e Logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 text-right">
          <div className="hidden md:block">
            <p className="text-xs font-bold text-slate-800 leading-tight">
              {profile?.full_name || 'Operador'}
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              {isSuperAdmin ? (
                <span className="text-[10px] font-semibold text-purple-600 flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> SUPERADMIN
                </span>
              ) : isCorporateManager ? (
                <span className="text-[10px] font-semibold text-blue-600">GESTOR CORP</span>
              ) : (
                <span className="text-[10px] text-slate-400">OPERADOR LOCAL</span>
              )}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
            {profile?.full_name?.charAt(0) || <User className="w-4 h-4" />}
          </div>
        </div>

        <button
          onClick={signOut}
          title="Encerrar sessão"
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
