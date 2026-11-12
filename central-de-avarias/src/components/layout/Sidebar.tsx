import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  FileSpreadsheet,
  ArrowLeftRight,
  Package,
  BarChart3,
  Building2,
  MapPin,
  Users,
  Scale,
  History,
  Box,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const { isSuperAdmin, isCorporateManager } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Estoque de Avarias', path: '/inventory', icon: <Boxes className="w-4 h-4" /> },
    { label: 'Histórico de Fatos', path: '/inventory/movements', icon: <History className="w-4 h-4" /> },
    { label: 'Conciliação Fiduciária', path: '/inventory/reconciliation', icon: <Scale className="w-4 h-4" /> },
    { label: 'Entrada de NF-e', path: '/invoices', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { label: 'Transferências', path: '/transfers', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { label: 'Catálogo de Produtos', path: '/products', icon: <Package className="w-4 h-4" /> },
    { label: 'Relatórios Analíticos', path: '/reports', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const adminItems = [
    { label: 'Unidades', path: '/admin/units', icon: <Building2 className="w-4 h-4" /> },
    { label: 'Setores Físicos', path: '/admin/sectors', icon: <MapPin className="w-4 h-4" /> },
    { label: 'Usuários & Perfis', path: '/admin/users', icon: <Users className="w-4 h-4" /> },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
      isActive
        ? 'bg-brand-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <Box className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-sm text-slate-900 tracking-tight leading-none">
            CENTRAL DE AVARIAS
          </h1>
          <p className="text-[10px] font-semibold text-brand-600 tracking-wider mt-1 uppercase">
            Gestão Multiunidade
          </p>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Operacional
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass}>
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {(isSuperAdmin || isCorporateManager) && (
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Administração
            </p>
            <nav className="space-y-1">
              {adminItems.map((item) => (
                <NavLink key={item.path} to={item.path} className={linkClass}>
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Versão 1.0.0</span>
          <span className="font-medium text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
          </span>
        </div>
      </div>
    </aside>
  );
};
