import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';

export type UserRole = 'student' | 'industry' | 'academician' | 'admin';

export interface UserProfile {
  id: string;
  role: UserRole | null;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  phone?: string;
  status?: string;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuthContextType {
  session: any | null;
  user: any | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  completeProfile: (role: UserRole, orgName?: string) => Promise<void>;
  getDashboardRedirect: (role: UserRole) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getDashboardRedirect(role: UserRole): string {
  switch (role) {
    case 'industry':
      return '/industry/dashboard.html';
    case 'academician':
      return '/academician/dashboard.html';
    case 'admin':
      return '/admin/dashboard.html';
    case 'student':
    default:
      return '/student/dashboard.html';
  }
}

export function isPublicPage(pathname: string = window.location.pathname): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return (
    clean === '/' ||
    clean === '/index.html' ||
    clean === '/root/index.html' ||
    clean === '/login' ||
    clean === '/login.html' ||
    clean === '/root/login.html' ||
    clean === '/register' ||
    clean === '/register.html' ||
    clean === '/root/register.html' ||
    clean === '/admin/login' ||
    clean === '/admin/login.html'
  );
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Requirement 2a: Query the profiles table for that user's id to get their role
  const fetchAndSyncProfile = async (sbUser: any) => {
    if (!sbUser?.id) {
      setProfile(null);
      setRole(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        const resolvedRole = data.role as UserRole;
        if (resolvedRole && ['student', 'industry', 'academician', 'admin'].includes(resolvedRole)) {
          setRole(resolvedRole);
          return { role: resolvedRole, profile: data };
        }
      }
    } catch (e) {
      console.warn('[AuthProvider] Failed to fetch profile:', e);
    }

    // Check localStorage fallback for pending OAuth role
    const pendingRole = localStorage.getItem('ayush_oauth_pending_role') as UserRole;
    if (pendingRole && ['student', 'industry', 'academician', 'admin'].includes(pendingRole)) {
      setRole(pendingRole);
      return { role: pendingRole, profile: null };
    }

    // Check user_metadata
    if (sbUser.user_metadata?.role) {
      const metaRole = sbUser.user_metadata.role as UserRole;
      if (['student', 'industry', 'academician', 'admin'].includes(metaRole)) {
        setRole(metaRole);
        return { role: metaRole, profile: null };
      }
    }

    return { role: null, profile: null };
  };

  // Requirement 1 & 2: Global listener using supabase.auth.onAuthStateChange()
  useEffect(() => {
    let isMounted = true;

    // 1. Initial Session Check
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const res = await fetchAndSyncProfile(currentSession.user);
        handleRoleRedirect(res?.role, currentSession.user);
      }
      setIsLoading(false);
    }).catch(err => {
      console.warn('[AuthProvider] getSession error:', err);
      if (isMounted) setIsLoading(false);
    });

    // 2. Global Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[AuthProvider] Auth state changed:', event, newSession?.user?.email);
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const res = await fetchAndSyncProfile(newSession.user);
        handleRoleRedirect(res?.role, newSession.user);
      } else {
        setProfile(null);
        setRole(null);
        localStorage.removeItem('ayush_current_user');
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Requirements 2b-2f & 4: Role-based Redirection
   */
  const handleRoleRedirect = (detectedRole: UserRole | null | undefined, sbUser: any) => {
    const pathname = window.location.pathname;

    // Requirement 2f: If no role exists in profiles, redirect to role selection
    if (!detectedRole) {
      if (!pathname.includes('/auth/callback')) {
        window.location.replace('/auth/callback.html');
      }
      return;
    }

    // Requirements 2b, 2c, 2d, 2e
    const targetDashboard = getDashboardRedirect(detectedRole);

    // Requirement 3: Store in global state / localStorage
    const authUser = {
      id: sbUser.id,
      email: sbUser.email,
      full_name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0],
      role: detectedRole,
      avatar: sbUser.user_metadata?.avatar_url || 'AY',
      redirect: targetDashboard
    };
    localStorage.setItem('ayush_current_user', JSON.stringify(authUser));

    // Requirement 4: If on login/register/root, immediately redirect to dashboard
    if (isPublicPage(pathname) || pathname.includes('/auth/callback')) {
      console.log(`[AuthProvider] Redirecting ${detectedRole} to ${targetDashboard}`);
      window.location.replace(targetDashboard);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('ayush_current_user');
    localStorage.removeItem('ayush_registered_user');
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    window.location.replace('/login.html');
  };

  const completeProfile = async (newRole: UserRole, orgName?: string) => {
    if (!user) return;
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
    const avatarUrl = user.user_metadata?.avatar_url || null;

    // Upsert into profiles table
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      role: newRole,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    });

    // Upsert role-specific table
    if (newRole === 'student') {
      await supabase.from('student_profiles').upsert({
        profile_id: user.id,
        college_institution: orgName || 'National Institute of Ayurveda',
        career_stage: 'profile',
        updated_at: new Date().toISOString()
      });
    } else if (newRole === 'industry') {
      await supabase.from('industry_profiles').upsert({
        profile_id: user.id,
        company_name: orgName || `${fullName} Healthcare`,
        updated_at: new Date().toISOString()
      });
    } else if (newRole === 'academician') {
      await supabase.from('academician_profiles').upsert({
        profile_id: user.id,
        institution: orgName || 'National Institute of Ayurveda',
        updated_at: new Date().toISOString()
      });
    }

    setRole(newRole);
    const target = getDashboardRedirect(newRole);
    window.location.replace(target);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        isLoading,
        signOut,
        completeProfile,
        getDashboardRedirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
