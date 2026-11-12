import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { productService } from '@/services/productService';
import { useAuth } from '@/contexts/AuthContext';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { profile } = useAuth();
  const [sku, setSku] = useState(initialData?.sku || '');
  const [name, setName] = useState(initialData?.name || '');
  const [barcode, setBarcode] = useState(initialData?.barcode || '');
  const [category, setCategory] = useState(initialData?.category || 'Lácteos');
  const [minBoxes, setMinBoxes] = useState(initialData?.minimum_stock_boxes?.toString() || '0');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (initialData) {
        await productService.updateProduct(initialData.id, {
          name,
          barcode: barcode || null,
          category: category || null,
          minimum_stock_boxes: parseInt(minBoxes, 10) || 0,
        });
      } else {
        // Obter company_id padrão
        await productService.createProduct({
          company_id: 'c0000000-0000-0000-0000-000000000001',
          sku: sku.trim().toUpperCase(),
          name: name.trim(),
          barcode: barcode.trim() || null,
          category: category.trim() || null,
          unit_of_measure: 'CX',
          minimum_stock_boxes: parseInt(minBoxes, 10) || 0,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar o produto no catálogo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Produto' : 'Cadastrar Novo Produto'}
      subtitle="Catálogo único corporativo padronizado em caixas inteiras"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isLoading}>
            {initialData ? 'Atualizar Produto' : 'Salvar no Catálogo'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Código SKU"
            required
            disabled={Boolean(initialData)}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Ex: SKU-LAC-01"
          />
          <Input
            label="Código de Barras (EAN)"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Ex: 7891234567890"
          />
        </div>

        <Input
          label="Descrição Oficial do Produto"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Leite Integral Pasteurizado 1L (Caixa c/ 12)"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex: Congelados, Secos"
          />
          <Input
            label="Estoque Mínimo (Caixas)"
            type="number"
            min="0"
            required
            value={minBoxes}
            onChange={(e) => setMinBoxes(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
};
