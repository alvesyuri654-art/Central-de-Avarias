import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database.types';

type Invoice = Database['public']['Tables']['invoices']['Row'];
type InvoiceItem = Database['public']['Tables']['invoice_items']['Row'];

export interface InvoiceConfirmPayload {
  invoiceId: string;
  sectorId: string;
  itemsMapping: {
    item_id: string;
    product_id: string;
    converted_boxes: number;
    lot_number?: string;
    expiration_date?: string;
  }[];
}

export const invoiceService = {
  async getInvoices(unitId?: string): Promise<Invoice[]> {
    let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (unitId) {
      query = query.eq('unit_id', unitId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getInvoiceById(id: string): Promise<Invoice & { items: (InvoiceItem & { product?: any })[] }> {
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    if (invError) throw invError;

    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*, product:products(*)')
      .eq('invoice_id', id)
      .order('item_index');
    if (itemsError) throw itemsError;

    return {
      ...invoice,
      items: items || [],
    };
  },

  async uploadInvoicePdf(unitId: string, accessKey: string, file: File): Promise<string> {
    const path = `${unitId}/${accessKey}_${Date.now()}.pdf`;
    const { error } = await supabase.storage.from('invoices-pdf').upload(path, file, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (error) throw error;
    return path;
  },

  async getPdfSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage.from('invoices-pdf').createSignedUrl(storagePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  },

  async createInvoiceStaging(
    invoiceData: Database['public']['Tables']['invoices']['Insert'],
    itemsData: Omit<Database['public']['Tables']['invoice_items']['Insert'], 'invoice_id'>[]
  ): Promise<Invoice> {
    // 1. Cria a nota fiscal em staging
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();
    if (invError) throw invError;

    // 2. Insere os itens vinculados
    const itemsWithInvoiceId = itemsData.map((item) => ({
      ...item,
      invoice_id: invoice.id,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithInvoiceId);
    if (itemsError) throw itemsError;

    return invoice;
  },

  async confirmInvoiceEntry(payload: InvoiceConfirmPayload): Promise<any> {
    const { data, error } = await supabase.rpc('rpc_confirm_invoice_entry', {
      p_invoice_id: payload.invoiceId,
      p_sector_id: payload.sectorId,
      p_items_mapping: payload.itemsMapping as any,
    });
    if (error) throw error;
    return data;
  },
};
