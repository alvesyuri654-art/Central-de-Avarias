import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';

// Páginas
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { InventoryListPage } from '@/pages/inventory/InventoryListPage';
import { LotDetailPage } from '@/pages/inventory/LotDetailPage';
import { MovementsHistoryPage } from '@/pages/inventory/MovementsHistoryPage';
import { ReconciliationPage } from '@/pages/inventory/ReconciliationPage';
import { InvoiceListPage } from '@/pages/invoices/InvoiceListPage';
import { InvoiceUploadPage } from '@/pages/invoices/InvoiceUploadPage';
import { InvoiceConferencePage } from '@/pages/invoices/InvoiceConferencePage';
import { TransferListPage } from '@/pages/transfers/TransferListPage';
import { TransferCreatePage } from '@/pages/transfers/TransferCreatePage';
import { TransferDetailPage } from '@/pages/transfers/TransferDetailPage';
import { ProductListPage } from '@/pages/products/ProductListPage';
import { UnitsManagementPage } from '@/pages/admin/UnitsManagementPage';
import { SectorsManagementPage } from '@/pages/admin/SectorsManagementPage';
import { UsersManagementPage } from '@/pages/admin/UsersManagementPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas Protegidas com Layout Administrativo */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />

          {/* Estoque e Fatos */}
          <Route path="/inventory" element={<InventoryListPage />} />
          <Route path="/inventory/lots/:id" element={<LotDetailPage />} />
          <Route path="/inventory/movements" element={<MovementsHistoryPage />} />
          <Route path="/inventory/reconciliation" element={<ReconciliationPage />} />

          {/* Notas Fiscais */}
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/upload" element={<InvoiceUploadPage />} />
          <Route path="/invoices/:id/conference" element={<InvoiceConferencePage />} />

          {/* Transferências */}
          <Route path="/transfers" element={<TransferListPage />} />
          <Route path="/transfers/create" element={<TransferCreatePage />} />
          <Route path="/transfers/:id" element={<TransferDetailPage />} />

          {/* Catálogo de Produtos */}
          <Route path="/products" element={<ProductListPage />} />

          {/* Relatórios */}
          <Route path="/reports" element={<ReportsPage />} />

          {/* Administração */}
          <Route path="/admin/units" element={<UnitsManagementPage />} />
          <Route path="/admin/sectors" element={<SectorsManagementPage />} />
          <Route path="/admin/users" element={<UsersManagementPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
