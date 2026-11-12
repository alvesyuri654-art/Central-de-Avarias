import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Central de Avarias] Atenção: Credenciais VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas no arquivo .env.'
  );
}

/**
 * Cliente singleton do Supabase configurado estritamente com chave anônima pública.
 * Todas as operações respeitam as políticas de Row Level Security (RLS) e RPCs de banco.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
