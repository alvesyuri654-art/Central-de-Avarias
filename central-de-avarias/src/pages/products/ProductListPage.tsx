import React, { useEffect, useState } from 'react';
import { productService } from '@/services/productService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Plus, Search, Edit2, Package, Check, X } from 'lucide-react';
import { ProductFormModal } from './ProductFormModal';

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Erro ao carregar catálogo de produtos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleToggleStatus = async (product: any) => {
    try {
      await productService.updateProduct(product.id, { is_active: !product.is_active });
      loadProducts();
    } catch (err) {
      console.error('Erro ao alterar status do produto:', err);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Catálogo Corporativo de Produtos</h1>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro mestre único compartilhado entre a Matriz e todas as filiais
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setSelectedProduct(null);
            setIsModalOpen(true);
          }}
        >
          Novo Produto
        </Button>
      </div>

      {/* Busca e Filtros */}
      <Card>
        <div className="max-w-md">
          <Input
            placeholder="Buscar por descrição, SKU ou código de barras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* Lista */}
      <Card>
        {isLoading ? (
          <Spinner message="Carregando catálogo..." />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Package className="w-6 h-6" />}
            title="Nenhum produto encontrado"
            description="Cadastre novos produtos no catálogo corporativo para realizar entradas de avarias."
            actionText="Cadastrar Primeiro Produto"
            onAction={() => {
              setSelectedProduct(null);
              setIsModalOpen(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Descrição Oficial</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Unidade</th>
                  <th className="py-2.5 px-3 text-right">Estoque Mínimo</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-700">{p.sku}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <div>{p.name}</div>
                      {p.barcode && <div className="text-[10px] text-slate-400 font-mono">EAN: {p.barcode}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{p.category || '—'}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="default" size="sm">
                        {p.unit_of_measure}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {p.minimum_stock_boxes} cx
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={p.is_active ? 'success' : 'danger'} size="sm">
                        {p.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setIsModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-brand-600 rounded"
                          title="Editar dados"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`p-1 rounded ${
                            p.is_active
                              ? 'text-slate-400 hover:text-red-600'
                              : 'text-slate-400 hover:text-emerald-600'
                          }`}
                          title={p.is_active ? 'Inativar produto' : 'Ativar produto'}
                        >
                          {p.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
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
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadProducts}
          initialData={selectedProduct}
        />
      )}
    </div>
  );
};
