import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database.types';

type Unit = Database['public']['Tables']['units']['Row'];
type Sector = Database['public']['Tables']['sectors']['Row'];

export const unitService = {
  async getUnits(): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async createUnit(unit: Database['public']['Tables']['units']['Insert']): Promise<Unit> {
    const { data, error } = await supabase
      .from('units')
      .insert(unit)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateUnit(id: string, updates: Database['public']['Tables']['units']['Update']): Promise<Unit> {
    const { data, error } = await supabase
      .from('units')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getSectorsByUnit(unitId: string): Promise<Sector[]> {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .eq('unit_id', unitId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getAllSectors(): Promise<(Sector & { unit?: { name: string; state_code: string } })[]> {
    const { data, error } = await supabase
      .from('sectors')
      .select('*, unit:units(name, state_code)')
      .order('name');
    if (error) throw error;
    return (data as any) || [];
  },

  async createSector(sector: Database['public']['Tables']['sectors']['Insert']): Promise<Sector> {
    const { data, error } = await supabase
      .from('sectors')
      .insert(sector)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggleSectorStatus(id: string, isActive: boolean): Promise<Sector> {
    const { data, error } = await supabase
      .from('sectors')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
