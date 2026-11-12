import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database.types';

type InventoryLot = Database['public']['Tables']['inventory_lots']['Row'];
type StockBalance = Database['public']['Tables']['stock_balances']['Row'];
type StockMovement = Database['public']['Tables']['stock_movements']['Row'];

export const inventoryService = {
  async getBalances(unitId: string): Promise<(StockBalance & { product: any; sector: any })[]> {
    const { data, error } = await supabase
      .from('stock_balances')
      .select('*, product:products(*), sector:sectors(*)')
      .eq('unit_id', unitId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as any) || [];
  },

  async getLots(unitId: string, productId?: string): Promise<(InventoryLot & { product: any; sector: any; invoice: any })[]> {
    let query = supabase
      .from('inventory_lots')
      .select('*, product:products(*), sector:sectors(*), invoice:invoices(invoice_number, issuer_name)')
      .eq('unit_id', unitId)
      .gt('current_boxes', 0)
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data as any) || [];
  },

  async getLotById(lotId: string): Promise<any> {
    const { data, error } = await supabase
      .from('inventory_lots')
      .select(`
        *,
        product:products(*),
        sector:sectors(*),
        invoice:invoices(*),
        parent_lot:inventory_lots!inventory_lots_parent_lot_id_fkey(*, origin_unit:units(*)),
        origin_unit:units!inventory_lots_origin_unit_id_fkey(*)
      `)
      .eq('id', lotId)
      .single();
    if (error) throw error;
    return data;
  },

  async getMovements(unitId: string, limit = 100): Promise<(StockMovement & { product: any; sector: any; profile: any })[]> {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, product:products(sku, name), sector:sectors(name), profile:profiles(full_name)')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as any) || [];
  },

  async adjustInventory(unitId: string, lotId: string, boxes: number, reason: string): Promise<any> {
    const { data, error } = await supabase.rpc('rpc_inventory_adjustment', {
      p_unit_id: unitId,
      p_lot_id: lotId,
      p_boxes: boxes,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  },

  async writeOff(unitId: string, lotId: string, boxes: number, reason: string): Promise<any> {
    const { data, error } = await supabase.rpc('rpc_write_off', {
      p_unit_id: unitId,
      p_lot_id: lotId,
      p_boxes: boxes,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  },

  async reconcileStock(unitId: string): Promise<any[]> {
    const { data, error } = await supabase.rpc('reconcile_and_verify_stock', {
      p_unit_id: unitId,
    });
    if (error) throw error;
    return data || [];
  },
};
