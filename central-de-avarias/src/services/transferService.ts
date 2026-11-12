import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database.types';

type Transfer = Database['public']['Tables']['transfers']['Row'];

export const transferService = {
  async getTransfers(unitId?: string): Promise<any[]> {
    let query = supabase
      .from('transfers')
      .select('*, source_unit:units!transfers_source_unit_id_fkey(*), destination_unit:units!transfers_destination_unit_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (unitId) {
      query = query.or(`source_unit_id.eq.${unitId},destination_unit_id.eq.${unitId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getTransferById(id: string): Promise<any> {
    const { data: transfer, error: trfError } = await supabase
      .from('transfers')
      .select(`
        *,
        source_unit:units!transfers_source_unit_id_fkey(*),
        destination_unit:units!transfers_destination_unit_id_fkey(*),
        requested_by_profile:profiles!transfers_requested_by_fkey(full_name),
        approved_by_profile:profiles!transfers_approved_by_fkey(full_name),
        dispatched_by_profile:profiles!transfers_dispatched_by_fkey(full_name),
        received_by_profile:profiles!transfers_received_by_fkey(full_name)
      `)
      .eq('id', id)
      .single();
    if (trfError) throw trfError;

    const [itemsRes, allocRes, histRes, divRes] = await Promise.all([
      supabase.from('transfer_items').select('*, product:products(*)').eq('transfer_id', id),
      supabase.from('transfer_allocations').select('*, lot:inventory_lots(*), product:products(*)').eq('transfer_id', id),
      supabase.from('transfer_status_history').select('*, profile:profiles(full_name)').eq('transfer_id', id).order('created_at', { ascending: true }),
      supabase.from('transfer_divergences').select('*, product:products(*), sector:sectors(*)').eq('transfer_id', id),
    ]);

    return {
      ...transfer,
      items: itemsRes.data || [],
      allocations: allocRes.data || [],
      history: histRes.data || [],
      divergences: divRes.data || [],
    };
  },

  async requestTransfer(
    destinationUnitId: string,
    sourceUnitId: string,
    items: { product_id: string; requested_boxes: number }[],
    notes?: string
  ): Promise<any> {
    const { data, error } = await supabase.rpc('rpc_request_transfer', {
      p_destination_unit_id: destinationUnitId,
      p_source_unit_id: sourceUnitId,
      p_items: items as any,
      p_notes: notes || null,
    });
    if (error) throw error;
    return data;
  },

  async approveTransfer(
    transferId: string,
    approvedItems: { item_id: string; approved_boxes: number }[],
    notes?: string
  ): Promise<any> {
    const { data, error } = await supabase.rpc('rpc_approve_transfer', {
      p_transfer_id: transferId,
      p_approved_items: approvedItems as any,
      p_notes: notes || null,
    });
    if (error) throw error;
    return data;
  },

  async allocateAndReserve(
    transferId: string,
    allocations: { item_id: string; lot_id: string; boxes: number }[]
  ): Promise<any> {
    const { data, error } = await supabase.rpc('rpc_allocate_and_reserve', {
      p_transfer_id: transferId,
      p_allocations: allocations as any,
    });
    if (error) throw error;
    return data;
  },

  async dispatchTransfer(transferId: string): Promise<any> {
    const { data, error } = await supabase.rpc('rpc_dispatch_transfer', {
      p_transfer_id: transferId,
    });
    if (error) throw error;
    return data;
  },

  async receiveTransfer(
    transferId: string,
    receivedItems: {
      item_id: string;
      received_boxes: number;
      destination_sector_id: string;
      quarantine_sector_id?: string;
    }[],
    divergenceNotes?: string
  ): Promise<any> {
    const { data, error } = await supabase.rpc('rpc_receive_transfer', {
      p_transfer_id: transferId,
      p_received_items: receivedItems as any,
      p_divergence_notes: divergenceNotes || null,
    });
    if (error) throw error;
    return data;
  },

  async cancelTransfer(transferId: string, reason: string): Promise<any> {
    const { data, error } = await supabase.rpc('rpc_cancel_transfer', {
      p_transfer_id: transferId,
      p_reason: reason,
    });
    if (error) throw error;
    return data;
  },
};
