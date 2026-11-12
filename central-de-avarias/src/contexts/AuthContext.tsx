import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UnitPermission = Database['public']['Tables']['unit_permissions']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  permissions: UnitPermission[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  isCorporateManager: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<UnitPermission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfileAndPermissions = async (userId: string) => {
    try {
      const [profileRes, permsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('unit_permissions').select('*').eq('profile_id', userId),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
      }
      if (permsRes.data) {
        setPermissions(permsRes.data);
      }
    } catch (err) {
      console.error('[AuthContext] Erro ao carregar perfil e permissões:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndPermissions(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfileAndPermissions(session.user.id);
      } else {
        setProfile(null);
        setPermissions([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setPermissions([]);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndPermissions(user.id);
    }
  };

  const isSuperAdmin = profile?.global_role === 'SUPERADMIN';
  const isCorporateManager = isSuperAdmin || profile?.global_role === 'CORPORATE_MANAGER';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        permissions,
        isLoading,
        isSuperAdmin,
        isCorporateManager,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
