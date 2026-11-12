import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database.types';

type Product = Database['public']['Tables']['products']['Row'];
type ProductAlias = Database['public']['Tables']['product_aliases']['Row'];

export const productService = {
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async createProduct(product: Database['public']['Tables']['products']['Insert']): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProduct(id: string, updates: Database['public']['Tables']['products']['Update']): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async findAlias(supplierTaxId: string, supplierProductCode: string): Promise<ProductAlias | null> {
    const { data, error } = await supabase
      .from('product_aliases')
      .select('*, product:products(*)')
      .eq('supplier_tax_id', supplierTaxId)
      .eq('supplier_product_code', supplierProductCode)
      .maybeSingle();
    if (error) return null;
    return data;
  },

  async createAlias(alias: Database['public']['Tables']['product_aliases']['Insert']): Promise<ProductAlias> {
    const { data, error } = await supabase
      .from('product_aliases')
      .insert(alias)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
