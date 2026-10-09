import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /**
   * True once the role/technician lookup for the current user has finished.
   * isAdmin and isTechnician are only meaningful when this is true - before
   * it, they are both false simply because nothing has been fetched yet.
   */
  profileLoaded: boolean;
  isTechnician: boolean;
  isAdmin: boolean;
  technicianId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = async (userId: string) => {
    try {
      const [techRes, rolesRes] = await Promise.all([
        supabase.from('technicians').select('id').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);
      setTechnicianId(techRes.data?.id ?? null);
      const roles: string[] = (rolesRes.data ?? []).map((r: { role: string }) => r.role);
      setIsAdmin(roles.includes('admin'));
    } finally {
      setProfileLoaded(true);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Mark the profile as pending before fetching it, so consumers do not
        // read the previous user's (or the signed-out) role flags and briefly
        // conclude this account has no access.
        setProfileLoaded(false);
        setTimeout(() => { loadProfile(session.user.id); }, 0);
      } else {
        setTechnicianId(null);
        setIsAdmin(false);
        setProfileLoaded(true);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setProfileLoaded(false);
        await loadProfile(session.user.id);
      } else {
        setProfileLoaded(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setTechnicianId(null);
    setIsAdmin(false);
    setProfileLoaded(true);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      profileLoaded,
      isTechnician: !!technicianId,
      isAdmin,
      technicianId,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
