import { supabase } from '@/lib/supabaseClient';

export const reportService = {
  async getStockSummary(unitId?: string) {
    let query = supabase
      .from('stock_balances')
      .select('*, unit:units(name, city, state_code), product:products(sku, name, category), sector:sectors(name)');

    if (unitId) {
      query = query.eq('unit_id', unitId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getTransfersSummary(unitId?: string) {
    let query = supabase
      .from('transfers')
      .select('*, source:units!transfers_source_unit_id_fkey(name), dest:units!transfers_destination_unit_id_fkey(name), items:transfer_items(*, product:products(sku, name))');

    if (unitId) {
      query = query.or(`source_unit_id.eq.${unitId},destination_unit_id.eq.${unitId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  exportToCsv(data: Record<string, any>[], filename: string) {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(';'),
      ...data.map((row) =>
        headers
          .map((fieldName) => {
            const val = row[fieldName];
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val ?? '';
          })
          .join(';')
      ),
    ];

    const blob = new Blob(['\ufeff' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
