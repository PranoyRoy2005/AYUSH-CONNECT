/**
 * AYUSH CONNECT — Authentication System
 * SIH 2026: Role-aware authentication & session manager
 */

import { 
  supabase, 
  signUpUserWithSupabase, 
  signInUserWithSupabase, 
  signOutUserWithSupabase,
  signInWithOAuthProvider,
  isDemoMode,
  setDemoMode
} from './supabase.js';

// Mode Management: Single unified DEMO_MODE flag (defaults to Production in production builds)
export function getAppMode() {
  return isDemoMode() ? 'dev' : 'prod';
}

export function setAppMode(mode) {
  const isDev = mode === 'dev';
  setDemoMode(isDev);
  const normalized = isDev ? 'dev' : 'prod';
  localStorage.setItem('ayush_app_mode', normalized);
  applyAppMode(normalized);
  return normalized;
}

export function toggleAppMode() {
  const current = getAppMode();
  const next = current === 'dev' ? 'prod' : 'dev';
  setAppMode(next);
  if (next === 'prod') {
    showToast('Production Mode: Real Supabase Auth active. Demo switchers hidden.', 'info');
  } else {
    showToast('Development Mode: Demo role switcher & instant access enabled.', 'success');
  }
  return next;
}

export function applyAppMode(mode) {
  const currentMode = mode || getAppMode();
  const isProd = currentMode === 'prod';

  // Toggle class on body for CSS-based hiding
  if (document.body) {
    document.body.classList.toggle('mode-production-active', isProd);
  }

  // Update mode toggle buttons on page
  const toggleButtons = document.querySelectorAll('.mode-toggle-btn, #app-mode-toggle');
  toggleButtons.forEach(btn => {
    btn.classList.toggle('mode-dev', !isProd);
    btn.classList.toggle('mode-prod', isProd);
    if (isProd) {
      btn.innerHTML = `<i class="fa-solid fa-shield-halved" style="color:#059669;"></i> <span>Prod Mode</span>`;
      btn.title = "Current: Production Mode (Supabase Auth). Click to switch to Dev Mode.";
    } else {
      btn.innerHTML = `<i class="fa-solid fa-code" style="color:#ea580c;"></i> <span>Dev Mode</span>`;
      btn.title = "Current: Development Mode (Demo Active). Click to switch to Prod Mode.";
    }
  });

  // Explicitly show or hide role switchers and demo helpers
  const demoElements = document.querySelectorAll('.role-demo-pill, #demo-role-dropdown, .demo-access-bar, .demo-access-container, .quick-demo-access');
  demoElements.forEach(el => {
    el.style.display = isProd ? 'none' : '';
  });
}

// Attach globally
if (typeof window !== 'undefined') {
  window.toggleAppMode = toggleAppMode;
  window.setAppMode = setAppMode;
  window.getAppMode = getAppMode;
}

// Demo Pre-configured Credentials
export const DEMO_USERS = {
  student: {
    id: 'usr_student_01',
    email: 'ayush.sharma@ayush.edu.in',
    password: 'password123',
    role: 'student',
    full_name: 'Ayush Sharma',
    institution: 'All India Institute of Ayurveda (AIIA), New Delhi',
    course: 'BAMS + Health Informatics',
    avatar: 'AS',
    redirect: '/student/dashboard.html'
  },
  industry: {
    id: 'usr_ind_01',
    email: 's.deshmukh@himalayawellness.com',
    password: 'password123',
    role: 'industry',
    full_name: 'Sunita Deshmukh',
    company_name: 'Himalaya Wellness Company',
    designation: 'Head of Clinical R&D Recruitment',
    avatar: 'SD',
    redirect: '/industry/dashboard.html'
  },
  academician: {
    id: 'usr_acad_01',
    email: 'vs.ramaswamy@nia.edu.in',
    password: 'password123',
    role: 'academician',
    full_name: 'Dr. V. S. Ramaswamy',
    institution: 'National Institute of Ayurveda (NIA), Jaipur',
    department: 'Dravyaguna & Clinical Pharmacology',
    avatar: 'VR',
    redirect: '/academician/dashboard.html'
  },
  admin: {
    id: 'usr_admin_01',
    email: 'admin@ayushconnect.gov.in',
    password: 'password123',
    role: 'admin',
    full_name: 'Administrator',
    designation: 'Director, AYUSH Skills & Employment Directorate',
    avatar: 'AD',
    redirect: '/admin/dashboard.html'
  }
};

/**
 * Get the currently logged-in user or fallback to demo user ONLY in demo mode on protected pages
 */
export function getCurrentUser() {
  const saved = localStorage.getItem('ayush_current_user');
  let parsedUser = null;
  if (saved) {
    try {
      parsedUser = JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing stored user', e);
    }
  }

  // Determine portal role from current URL if on a protected portal page
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  let portalRole = null;
  if (pathname.startsWith('/industry/')) portalRole = 'industry';
  else if (pathname.startsWith('/academician/')) portalRole = 'academician';
  else if (pathname.startsWith('/admin/') && !pathname.includes('/admin/login')) portalRole = 'admin';
  else if (pathname.startsWith('/student/')) portalRole = 'student';

  // If user is accessing the admin portal:
  if (portalRole === 'admin') {
    if (parsedUser) {
      // If user is logged in with their own account, ensure their active role is admin
      // while strictly preserving their real full_name, email, and dynamic avatar!
      if (parsedUser.role !== 'admin') {
        parsedUser = {
          ...parsedUser,
          role: 'admin'
        };
      }
      // If full_name is missing or placeholder, derive from registered user if available
      if (!parsedUser.full_name || parsedUser.full_name === 'Rajesh Kumar, IAS') {
        const rawReg = localStorage.getItem('ayush_registered_user');
        if (rawReg) {
          try {
            const reg = JSON.parse(rawReg);
            if (reg.full_name || reg.name) {
              parsedUser.full_name = reg.full_name || reg.name;
            }
          } catch (e) {}
        }
      }
      if (parsedUser.full_name && parsedUser.full_name !== 'Rajesh Kumar, IAS') {
        parsedUser.avatar = parsedUser.full_name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'AD';
      }
      setCurrentUser(parsedUser);
      return parsedUser;
    }
  }

  // In demo mode: if user is on a protected portal, the active user should ALWAYS correspond to that portal!
  if (isDemoMode() && portalRole && DEMO_USERS[portalRole]) {
    // If no user saved, or saved user is a demo user with a different role, automatically align to current portal demo user
    if (!parsedUser || (parsedUser.id && String(parsedUser.id).startsWith('usr_') && parsedUser.role !== portalRole)) {
      const correctDemo = { ...DEMO_USERS[portalRole] };
      const rawReg = localStorage.getItem('ayush_registered_user');
      if (rawReg) {
        try {
          const reg = JSON.parse(rawReg);
          if (reg.full_name || reg.name) {
            correctDemo.full_name = reg.full_name || reg.name;
            correctDemo.email = reg.email || correctDemo.email;
            correctDemo.avatar = correctDemo.full_name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'AD';
          }
        } catch (e) {}
      }
      setCurrentUser(correctDemo);
      return correctDemo;
    }
  }

  if (parsedUser) return parsedUser;

  // Fallback in demo mode: return role-appropriate demo user
  if (isDemoMode() && portalRole && DEMO_USERS[portalRole]) {
    const fallbackDemo = { ...DEMO_USERS[portalRole] };
    const rawReg = localStorage.getItem('ayush_registered_user');
    if (rawReg) {
      try {
        const reg = JSON.parse(rawReg);
        if (reg.full_name || reg.name) {
          fallbackDemo.full_name = reg.full_name || reg.name;
          fallbackDemo.email = reg.email || fallbackDemo.email;
          fallbackDemo.avatar = fallbackDemo.full_name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'AD';
        }
      } catch (e) {}
    }
    setCurrentUser(fallbackDemo);
    return fallbackDemo;
  }

  return null;
}

/**
 * Set active user
 */
export function setCurrentUser(user) {
  localStorage.setItem('ayush_current_user', JSON.stringify(user));
}

/**
 * Helper to get role redirect path
 * Requirement 2:
 *  - student -> /student/dashboard.html
 *  - industry -> /industry/dashboard.html
 *  - academician -> /academician/dashboard.html
 *  - admin -> /admin/dashboard.html
 */
export function getRedirectForRole(role) {
  const r = (role || '').toLowerCase().trim();
  if (r === 'industry') return '/industry/dashboard.html';
  if (r === 'academician') return '/academician/dashboard.html';
  if (r === 'admin') return '/admin/dashboard.html';
  return '/student/dashboard.html';
}

/**
 * Check if the current page is the landing / home page
 */
export function isLandingPage(path = (typeof window !== 'undefined' ? window.location.pathname : '')) {
  const clean = path.replace(/\/+$/, '') || '/';
  return (
    clean === '/' ||
    clean === '/index.html' ||
    clean === '/root/index.html'
  );
}

/**
 * Check if the current page is an auth page (login/register)
 * where an authenticated user who is attempting to login should be routed to their workspace.
 * NOTE: The landing page (/) is NOT an auth page!
 */
export function isPublicAuthPage(path = (typeof window !== 'undefined' ? window.location.pathname : '')) {
  const clean = path.replace(/\/+$/, '') || '/';
  return (
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

/**
 * Check if current page is a role-protected portal page
 */
export function isProtectedPortalPage(path = (typeof window !== 'undefined' ? window.location.pathname : '')) {
  return (
    path.startsWith('/student/') ||
    path.startsWith('/industry/') ||
    path.startsWith('/academician/') ||
    (path.startsWith('/admin/') && !path.includes('/admin/login'))
  );
}

/**
 * Query the profiles table for that user's id to get their role.
 * (Requirement 2a)
 * Fallback: pending OAuth role in localStorage, or user_metadata.
 */
export async function resolveUserRoleAndProfile(sbUser) {
  if (!sbUser?.id) return { role: null, profile: null };

  let role = null;
  let profile = null;

  // 1. Query the `profiles` table for that user's id to get their `role`
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sbUser.id)
      .maybeSingle();

    if (!error && data) {
      profile = data;
      if (data.role && ['student', 'industry', 'academician', 'admin'].includes(data.role.toLowerCase().trim())) {
        role = data.role.toLowerCase().trim();
      }
    }
  } catch (err) {
    console.warn('[AYUSH Auth] profiles query exception:', err);
  }

  // 2. Fallback to pending OAuth role from localStorage
  if (!role && typeof localStorage !== 'undefined') {
    const pending = localStorage.getItem('ayush_oauth_pending_role');
    if (pending && ['student', 'industry', 'academician', 'admin'].includes(pending.toLowerCase().trim())) {
      role = pending.toLowerCase().trim();
      try {
        await supabase.from('profiles').upsert({
          id: sbUser.id,
          email: sbUser.email,
          full_name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0],
          role: role,
          avatar_url: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('[AYUSH Auth] Error saving pending role to profiles:', e);
      }
      localStorage.removeItem('ayush_oauth_pending_role');
    }
  }

  // 3. Fallback to user_metadata
  if (!role && sbUser.user_metadata?.role) {
    const metaRole = sbUser.user_metadata.role.toLowerCase().trim();
    if (['student', 'industry', 'academician', 'admin'].includes(metaRole)) {
      role = metaRole;
    }
  }

  return { role, profile };
}

/**
 * Evaluates authenticated session and performs instantaneous redirection.
 * Requirements:
 * 2a. Query `profiles` for user's id to get `role`
 * 2b. If role = 'student' -> /student/dashboard.html
 * 2c. If role = 'industry' -> /industry/dashboard.html
 * 2d. If role = 'academician' -> /academician/dashboard.html
 * 2e. If role = 'admin' -> /admin/dashboard.html
 * 2f. If no row exists yet in `profiles` -> redirect to Complete your profile / Select your role page
 * 4. If an already-logged-in user navigates to landing/login/register, immediately redirect to dashboard.
 */
export async function redirectUserByRole(sbUser, { forceRedirect = false } = {}) {
  if (typeof window === 'undefined') return;
  if (window.__ayush_redirect_in_progress) return;

  const { role, profile } = await resolveUserRoleAndProfile(sbUser);

  const fullName = profile?.full_name 
    || sbUser.user_metadata?.full_name 
    || sbUser.user_metadata?.name 
    || sbUser.email?.split('@')[0] 
    || 'Ayush User';
  const avatarUrl = profile?.avatar_url 
    || sbUser.user_metadata?.avatar_url 
    || sbUser.user_metadata?.picture 
    || null;

  const authUser = {
    id: sbUser.id,
    email: sbUser.email,
    full_name: fullName,
    role: role || null,
    avatar: avatarUrl || fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AY',
    avatar_url: avatarUrl,
    auth_provider: sbUser.app_metadata?.provider || 'supabase',
    redirect: role ? getRedirectForRole(role) : '/auth/callback.html'
  };

  const activeUser = getCurrentUser();
  const isDemoActive = isDemoMode() || (activeUser?.id && String(activeUser.id).startsWith('usr_'));

  if (!isDemoActive) {
    setCurrentUser(authUser);
    saveRegisteredUser(authUser);
    syncUserHeader();
  }

  const pathname = window.location.pathname;
  const isPublic = isPublicAuthPage(pathname);
  const isCallback = pathname.includes('/auth/callback');
  const isLanding = isLandingPage(pathname);

  // If user just completed OAuth or signed up, NEVER leave them stranded on the landing page!
  const justLoggedIn = sessionStorage.getItem('ayush_oauth_in_progress') === 'true' ||
                       sessionStorage.getItem('ayush_just_logged_in') === 'true' ||
                       localStorage.getItem('ayush_oauth_just_logged_in') === 'true';

  if (justLoggedIn) {
    sessionStorage.removeItem('ayush_oauth_in_progress');
    sessionStorage.removeItem('ayush_just_logged_in');
    localStorage.removeItem('ayush_oauth_just_logged_in');
    const targetDashboard = getRedirectForRole(role || 'student');
    console.log(`[AYUSH Auth] Just logged in / OAuth completed. Routing to ${targetDashboard}`);
    window.__ayush_redirect_in_progress = true;
    window.location.replace(targetDashboard);
    return;
  }

  // CRITICAL: NEVER automatically redirect away from the landing page UNLESS forceRedirect is true.
  // Visitors and logged-in users alike can view and explore the landing page freely.
  if (isLanding && !forceRedirect) {
    console.log(`[AYUSH Auth] User on landing page (${role || 'guest'}). Preserving landing page view.`);
    return;
  }

  // CRITICAL: In Demo Mode or if actively using a demo user account, DO NOT force redirect away from demo portals!
  // Clicking "Industry" in Demo Mode must stay securely on the Industry dashboard.
  if (isDemoActive && !forceRedirect) {
    console.log(`[AYUSH Auth] Demo mode or demo user active. Bypassing Supabase session role guard for ${pathname}.`);
    return;
  }

  // Requirement 2f: If no role exists in profiles yet, redirect to Complete Profile / Select Role
  if (!role) {
    if (!isCallback) {
      console.log('[AYUSH Auth] No confirmed role in profiles. Redirecting to role selection...');
      window.__ayush_redirect_in_progress = true;
      window.location.replace('/auth/callback.html');
    }
    return;
  }

  // Role-based Approval Check for Industry and Academician
  if (role === 'industry' || role === 'academician') {
    const overrides = JSON.parse(localStorage.getItem('ayush_user_status_overrides') || '{}');
    const userOverride = overrides[sbUser.id] || overrides[sbUser.email];
    const isApproved = userOverride?.status === 'approved' || profile?.is_approved === true || profile?.status === 'approved';
    const isPending = userOverride?.status === 'pending' || profile?.status === 'pending' || (!isApproved && profile?.status !== 'rejected');
    const isRejected = userOverride?.status === 'rejected' || profile?.status === 'rejected';

    if (!isApproved) {
      const statusReason = isRejected ? 'rejected' : 'pending';
      if (!pathname.includes('/pending-approval')) {
        console.warn(`[AYUSH Auth] Account status for ${sbUser.email} is '${statusReason}'. Redirecting to pending approval page.`);
        window.__ayush_redirect_in_progress = true;
        window.location.replace(`/pending-approval.html?status=${statusReason}&role=${role}&email=${encodeURIComponent(sbUser.email || '')}`);
      }
      return;
    }
  }

  // Admin access protection: non-admins cannot access admin portal pages
  if (pathname.startsWith('/admin/') && !pathname.includes('/admin/login')) {
    const currentSession = getCurrentUser();
    const isAdmin = role === 'admin' || currentSession?.role === 'admin';
    if (!isAdmin) {
      console.warn(`[AYUSH Auth] Unauthorized access attempt to admin console by role '${role}'.`);
      window.__ayush_redirect_in_progress = true;
      window.location.replace('/admin/login.html?error=unauthorized');
      return;
    }
  }

  // Confirmed role exists
  const targetDashboard = getRedirectForRole(role);

  // If user is on a public auth or landing page, or force redirect requested
  if (isPublic || forceRedirect) {
    console.log(`[AYUSH Auth] Redirecting ${role} from ${pathname} to ${targetDashboard}`);
    window.__ayush_redirect_in_progress = true;
    window.location.replace(targetDashboard);
    return;
  }

  // If user is on callback page and role is confirmed
  if (isCallback) {
    console.log(`[AYUSH Auth] Callback finished for ${role}. Redirecting to ${targetDashboard}`);
    window.__ayush_redirect_in_progress = true;
    window.location.replace(targetDashboard);
    return;
  }

  // Role guarding: if user is on a protected portal belonging to another role
  if (isProtectedPortalPage(pathname)) {
    const expectedPrefix = `/${role}/`;
    if (!pathname.startsWith(expectedPrefix)) {
      console.warn(`[AYUSH Auth] Role mismatch for ${pathname} (user is ${role}). Redirecting to ${targetDashboard}`);
      window.__ayush_redirect_in_progress = true;
      window.location.replace(targetDashboard);
    }
  }
}

/**
 * Requirement 1: Global auth state listener using supabase.auth.onAuthStateChange()
 * Active on every page across the entire app.
 */
let isGlobalListenerInitialized = false;

export function initGlobalAuthListener() {
  if (typeof window === 'undefined') return;
  if (isGlobalListenerInitialized) return;
  isGlobalListenerInitialized = true;

  // Supabase Auth State Change Listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[AYUSH Auth] onAuthStateChange event:', event, session?.user?.email);

    if (session?.user) {
      const activeUser = getCurrentUser();
      const isDemoActive = isDemoMode() || (activeUser?.id && String(activeUser.id).startsWith('usr_'));
      if (isDemoActive) {
        console.log('[AYUSH Auth] Demo mode/user active. Skipping background onAuthStateChange redirect.');
        return;
      }
      await redirectUserByRole(session.user, { forceRedirect: false });
    } else if (event === 'SIGNED_OUT') {
      const pathname = window.location.pathname;
      if (isProtectedPortalPage(pathname)) {
        if (!isDemoMode() || !getCurrentUser()) {
          window.location.replace('/login.html');
        }
      }
    }
  });

  // Query active session immediately
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) {
      const activeUser = getCurrentUser();
      const isDemoActive = isDemoMode() || (activeUser?.id && String(activeUser.id).startsWith('usr_'));
      if (isDemoActive) {
        console.log('[AYUSH Auth] Demo mode/user active. Skipping initial getSession redirect.');
        return;
      }
      await redirectUserByRole(session.user, { forceRedirect: false });
    } else {
      // In demo mode: only redirect if user is actively on an auth page (login/register)
      if (isDemoMode()) {
        const localUser = getCurrentUser();
        if (localUser && isPublicAuthPage(window.location.pathname) && !isLandingPage(window.location.pathname)) {
          if (localUser.role && localUser.id && String(localUser.id).startsWith('usr_')) {
            const dest = getRedirectForRole(localUser.role);
            window.__ayush_redirect_in_progress = true;
            window.location.replace(dest);
          }
        }
      }
    }
  }).catch(err => {
    console.warn('[AYUSH Auth] getSession check error:', err);
  });
}

// Auto-initialize global auth listener immediately when module is imported
if (typeof window !== 'undefined') {
  initGlobalAuthListener();
}

/**
 * Registry of all locally registered / cached accounts
 */
export function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem('ayush_users_registry');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveRegisteredUser(user) {
  try {
    if (!user || !user.email) return;
    const registry = getRegisteredUsers();
    registry[user.email.toLowerCase()] = user;
    localStorage.setItem('ayush_users_registry', JSON.stringify(registry));
    localStorage.setItem('ayush_registered_user', JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save user in registry:', e);
  }
}

/**
 * Handle Login Form Submit
 * Awaits Supabase authentication, resolves user role, and routes accurately.
 */
export async function handleLogin(email, password, role = 'student') {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanEmail || !cleanPassword) {
    showToast('Please enter both your email and password.', 'error');
    return { success: false, error: 'Missing credentials' };
  }

  // 1. Attempt real Supabase Authentication
  let supabaseResult = null;
  try {
    supabaseResult = await signInUserWithSupabase(cleanEmail, cleanPassword);
  } catch (err) {
    console.warn('Supabase signIn exception:', err);
    supabaseResult = { error: err };
  }

  // Supabase Authentication Success!
  if (supabaseResult?.data?.session && supabaseResult?.data?.user) {
    const sbUser = supabaseResult.data.user;
    
    // Look up true role from profiles table (Requirement 2a)
    const { role: userRole, profile } = await resolveUserRoleAndProfile(sbUser);

    // Admin Portal Sign In Handling
    if (role === 'admin') {
      userRole = 'admin';
    }

    // Role-based Approval Check for Industry and Academician
    if (userRole === 'industry' || userRole === 'academician') {
      const overrides = JSON.parse(localStorage.getItem('ayush_user_status_overrides') || '{}');
      const userOverride = overrides[sbUser.id] || overrides[cleanEmail];
      const isApproved = userOverride?.status === 'approved' || profile?.is_approved === true || profile?.status === 'approved';
      const isRejected = userOverride?.status === 'rejected' || profile?.status === 'rejected';

      if (!isApproved) {
        await signOutUserWithSupabase();
        localStorage.removeItem('ayush_current_user');

        const statusReason = isRejected ? 'rejected' : 'pending';
        const errorMsg = isRejected
          ? 'Your account registration was rejected by the Ministry of AYUSH administrator.'
          : 'Your account is pending administrator approval. Please wait until your credentials are confirmed.';

        showToast(errorMsg, isRejected ? 'error' : 'warning');
        window.__ayush_redirect_in_progress = true;
        window.location.replace(`/pending-approval.html?status=${statusReason}&role=${userRole}&email=${encodeURIComponent(cleanEmail)}`);
        return { success: false, error: errorMsg };
      }
    }

    const userFullName = profile?.full_name 
      || sbUser.user_metadata?.full_name 
      || sbUser.user_metadata?.name 
      || cleanEmail.split('@')[0];
    const avatarUrl = profile?.avatar_url 
      || sbUser.user_metadata?.avatar_url 
      || sbUser.user_metadata?.picture 
      || null;

    // Requirement 2b-2f
    const redirect = userRole ? getRedirectForRole(userRole) : '/auth/callback.html';

    const authUser = {
      id: sbUser.id,
      email: sbUser.email,
      full_name: userFullName,
      role: userRole || null,
      avatar: avatarUrl || userFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AY',
      avatar_url: avatarUrl,
      auth_provider: 'supabase',
      redirect
    };

    setCurrentUser(authUser);
    saveRegisteredUser(authUser);
    showToast(`Welcome back, ${userFullName}! Signed in with Supabase. Redirecting...`, 'success');

    // Immediate direct redirect right after sign-in resolves (Requirement 3)
    window.__ayush_redirect_in_progress = true;
    window.location.replace(redirect);
    return { success: true, user: authUser };
  }

  // Handle Supabase Auth Errors
  if (supabaseResult?.error) {
    const err = supabaseResult.error;
    if (err.code === 'email_not_confirmed') {
      const msg = 'Supabase Notice: Email confirmation is required by your Supabase project. Disable "Confirm email" in Supabase Auth to skip verification.';
      showToast(msg, 'warning');
      if (!isDemoMode()) {
        return { success: false, error: msg };
      }
    }
    // Check if entered credentials match a known demo account before failing
    const matchedDemo = Object.values(DEMO_USERS).find(
      u => u.email.toLowerCase() === cleanEmail && (u.password === cleanPassword || cleanPassword === 'password123')
    );
    if (matchedDemo && role !== 'admin') {
      setDemoMode(true);
      setCurrentUser(matchedDemo);
      showToast(`Welcome back, ${matchedDemo.full_name}! (${matchedDemo.role.toUpperCase()}). Redirecting...`, 'success');
      window.__ayush_redirect_in_progress = true;
      window.location.replace(matchedDemo.redirect);
      return { success: true, user: matchedDemo };
    }

    // If logging in as admin or in production mode, report exact error and DO NOT fall back to fake session!
    if (role === 'admin' || !isDemoMode()) {
      const errorMsg = err.message === 'Invalid login credentials'
        ? 'Invalid email or password. Please verify your credentials or register a new account.'
        : (err.message || 'Supabase authentication failed.');
      showToast(errorMsg, 'error');
      return { success: false, error: errorMsg };
    }
  }

  // 2. In Demo Mode Only (Non-Admin): Allow Demo Accounts & Local Registered Registry
  if (isDemoMode() && role !== 'admin') {
    const matchedDemo = Object.values(DEMO_USERS).find(
      u => u.email.toLowerCase() === cleanEmail && (u.password === cleanPassword || cleanPassword === 'password123')
    );
    if (matchedDemo) {
      setDemoMode(true);
      setCurrentUser(matchedDemo);
      showToast(`Welcome back, ${matchedDemo.full_name}! (${matchedDemo.role.toUpperCase()}). Redirecting...`, 'success');
      window.__ayush_redirect_in_progress = true;
      window.location.replace(matchedDemo.redirect);
      return { success: true, user: matchedDemo };
    }

    const registry = getRegisteredUsers();
    const regUser = registry[cleanEmail];
    if (regUser && (!regUser.password || regUser.password === cleanPassword)) {
      const targetRole = regUser.role || role || 'student';

      // Check approval status in demo registry for industry / academician
      if (targetRole === 'industry' || targetRole === 'academician') {
        if (regUser.status === 'pending') {
          showToast('Your account is pending administrator approval.', 'warning');
          window.__ayush_redirect_in_progress = true;
          window.location.replace(`/pending-approval.html?status=pending&role=${targetRole}&email=${encodeURIComponent(cleanEmail)}`);
          return { success: false, error: 'account_pending' };
        }
        if (regUser.status === 'rejected') {
          showToast('Your account registration was rejected by the administrator.', 'error');
          window.__ayush_redirect_in_progress = true;
          window.location.replace(`/pending-approval.html?status=rejected&role=${targetRole}&email=${encodeURIComponent(cleanEmail)}`);
          return { success: false, error: 'account_rejected' };
        }
      }

      const redirect = getRedirectForRole(targetRole);
      regUser.redirect = redirect;
      setCurrentUser(regUser);
      showToast(`Welcome back, ${regUser.full_name}! Redirecting to ${targetRole.toUpperCase()} portal...`, 'success');
      window.__ayush_redirect_in_progress = true;
      window.location.replace(redirect);
      return { success: true, user: regUser };
    }
  }

  // Invalid credentials
  const errorMsg = 'Invalid email or password. Please check your credentials or register.';
  showToast(errorMsg, 'error');
  return { success: false, error: errorMsg };
}

/**
 * Handle Social Auth (Google / GitHub) for Login & Registration
 * 
 * Uses real Supabase OAuth flow via signInWithOAuthProvider.
 * Seamlessly handles both new sign-ups and existing user logins without duplicate accounts.
 */
export async function handleSocialAuth(provider, role = null, flowMode = 'login') {
  const providerKey = (provider || 'google').toLowerCase().trim();
  const providerDisplay = providerKey === 'google' ? 'Google' : 'GitHub';

  showToast(`Initiating secure ${providerDisplay} authentication with Supabase...`, 'info');

  if (role) {
    localStorage.setItem('ayush_oauth_pending_role', role);
  }
  localStorage.setItem('ayush_oauth_flow_mode', flowMode);
  sessionStorage.setItem('ayush_oauth_flow_mode', flowMode);

  const result = await signInWithOAuthProvider(providerKey, role, flowMode);
  if (!result.success) {
    const errorMsg = result.error?.message || `Failed to initiate ${providerDisplay} authentication.`;
    console.error(`Supabase ${providerDisplay} OAuth initiation error:`, result.error);
    showToast(`OAuth Notice: ${errorMsg}. Please verify ${providerDisplay} provider is enabled in your Supabase Dashboard.`, 'error');
    return { success: false, error: errorMsg };
  }

  return { success: true, url: result.url };
}

/**
 * Handle Registration
 * Registers user with Supabase Auth, handles roles accurately, and routes to correct portal.
 */
export async function handleRegistration(formData) {
  const cleanEmail = (formData.email || '').trim().toLowerCase();
  const cleanPassword = (formData.password || '').trim();
  const fullName = (formData.name || formData.full_name || 'User').trim();
  const role = formData.role || 'student';

  if (!cleanEmail || !cleanPassword) {
    showToast('Please enter both an email address and a password.', 'error');
    return { success: false, error: 'Missing email or password' };
  }

  if (cleanPassword.length < 6) {
    showToast('Password must be at least 6 characters long.', 'error');
    return { success: false, error: 'Password too short' };
  }

  // Determine redirect based on registered role
  const redirect = getRedirectForRole(role);

  // 1. Await Supabase sign up
  let sbResult = null;
  try {
    sbResult = await signUpUserWithSupabase(cleanEmail, cleanPassword, {
      full_name: fullName,
      role: role
    });
  } catch (err) {
    console.error('Supabase registration error:', err);
    sbResult = { error: err };
  }

  if (sbResult?.error) {
    const err = sbResult.error;
    console.warn('Supabase Auth error details:', err);

    let errorMsg = err.message || 'Supabase registration failed.';
    if (err.code === 'over_email_send_rate_limit' || err.status === 429) {
      errorMsg = 'Notice: Supabase free email rate limit reached. To enable instant registration without rate limits, turn off "Confirm email" in Supabase Auth settings.';
      showToast(errorMsg, 'warning');
    } else if (err.message?.toLowerCase().includes('already registered') || err.message?.toLowerCase().includes('user already exists')) {
      errorMsg = 'This email is already registered in Supabase. Please sign in.';
      showToast(errorMsg, 'error');
      return { success: false, error: 'User already exists' };
    } else {
      showToast(`Supabase: ${errorMsg}`, 'error');
    }

    // In production mode, registration failure in Supabase MUST NOT proceed to fake registration!
    if (!isDemoMode()) {
      return { success: false, error: errorMsg };
    }
  }

  const userId = sbResult?.data?.user?.id || ('usr_' + Date.now());

  const isStudent = (role === 'student');
  const initialStatus = isStudent ? 'active' : 'pending';
  const isApproved = isStudent;
  const isVerified = isStudent;

  // Upsert user profile into Supabase profiles table
  if (sbResult?.data?.user?.id) {
    try {
      await supabase.from('profiles').upsert({
        id: sbResult.data.user.id,
        email: cleanEmail,
        full_name: fullName,
        role: role,
        status: initialStatus,
        is_approved: isApproved,
        is_verified: isVerified,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (profileErr) {
      console.warn('Supabase profiles table upsert error:', profileErr);
    }

    // Initialize role-specific table row
    try {
      if (role === 'student') {
        await supabase.from('student_profiles').upsert({
          profile_id: sbResult.data.user.id,
          college_institution: formData.institution || 'National Institute of Ayurveda',
          career_stage: 'profile',
          updated_at: new Date().toISOString()
        });
      } else if (role === 'industry') {
        await supabase.from('industry_profiles').upsert({
          profile_id: sbResult.data.user.id,
          company_name: formData.company || `${fullName} Healthcare & R&D`,
          is_verified: false,
          updated_at: new Date().toISOString()
        });
      } else if (role === 'academician') {
        await supabase.from('academician_profiles').upsert({
          profile_id: sbResult.data.user.id,
          institution: formData.institution || 'National Institute of Ayurveda',
          is_verified: false,
          updated_at: new Date().toISOString()
        });
      }
    } catch (roleErr) {
      console.warn('Role profile table init note:', roleErr);
    }
  }

  const newUser = {
    id: userId,
    full_name: fullName,
    email: cleanEmail,
    phone: formData.phone || '',
    role: role,
    status: initialStatus,
    is_approved: isApproved,
    is_verified: isVerified,
    avatar: fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AY',
    metadata: { ...formData },
    created_at: new Date().toISOString(),
    auth_provider: 'supabase',
    redirect: isStudent ? redirect : `/pending-approval.html?status=pending&role=${role}&email=${encodeURIComponent(cleanEmail)}`
  };

  // Persist into user registry
  saveRegisteredUser({
    ...newUser,
    password: cleanPassword
  });

  // For Industry & Academician: require admin approval, do NOT grant immediate session
  if (!isStudent) {
    try {
      await signOutUserWithSupabase();
    } catch (e) {}
    localStorage.removeItem('ayush_current_user');

    showToast(
      `Registration submitted! As ${role === 'industry' ? 'an Industry Enterprise' : 'an Academic Institution'}, your account is pending Ministry administrator verification.`,
      'info'
    );

    const pendingRedirect = `/pending-approval.html?status=pending&role=${role}&email=${encodeURIComponent(cleanEmail)}`;
    window.__ayush_redirect_in_progress = true;
    window.location.replace(pendingRedirect);
    return { success: true, pendingApproval: true, user: newUser };
  }

  // For Students: Immediate access
  // Attempt to sign in immediately to ensure active session if signup didn't auto-create one
  if (!sbResult?.data?.session) {
    try {
      const loginRes = await signInUserWithSupabase(cleanEmail, cleanPassword);
      if (loginRes?.data?.session) {
        sbResult.data = sbResult.data || {};
        sbResult.data.session = loginRes.data.session;
      }
    } catch (loginErr) {
      console.warn('Auto sign-in after signup note:', loginErr);
    }
  }

  setCurrentUser(newUser);
  sessionStorage.setItem('ayush_just_logged_in', 'true');
  localStorage.setItem('ayush_just_logged_in', 'true');

  if (sbResult?.data?.user) {
    if (sbResult.data?.session) {
      showToast(`Account successfully registered and signed in! Launching student portal...`, 'success');
    } else {
      showToast(`Account created in Supabase! Launching student portal...`, 'success');
    }
  } else {
    showToast(`Account created for ${fullName}! Launching student portal...`, 'success');
  }

  window.__ayush_redirect_in_progress = true;
  window.location.replace(redirect);

  return { success: true, user: newUser };
}

/**
 * Logout
 */
export async function logout() {
  try {
    await signOutUserWithSupabase();
  } catch (e) {}
  localStorage.removeItem('ayush_current_user');
  localStorage.removeItem('ayush_registered_user');
  sessionStorage.setItem('ayush_logged_out', 'true');
  window.__ayush_redirect_in_progress = true;
  window.location.replace('/login.html');
}

export const handleLogout = logout;

/**
 * Quick Switch Role (SIH 2026 Presentation Tool)
 */
export function switchDemoRole(roleKey) {
  if (DEMO_USERS[roleKey]) {
    setDemoMode(true);
    setCurrentUser(DEMO_USERS[roleKey]);
    showToast(`Switched to demo ${roleKey.toUpperCase()}: ${DEMO_USERS[roleKey].full_name}`, 'success');
    window.__ayush_redirect_in_progress = true;
    setTimeout(() => {
      window.location.href = DEMO_USERS[roleKey].redirect;
    }, 200);
  }
}

if (typeof window !== 'undefined') {
  window.switchDemoRole = switchDemoRole;
}

/**
 * Show Toast Notification
 */
export function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.6rem;">
      <span style="font-weight: 700; color: var(--primary-deep); font-size: 0.9rem;">AYUSH Connect:</span>
      <span style="font-size: 0.85rem; color: var(--text-primary);">${message}</span>
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.1rem;">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Render Header User Badge / Avatar
 */
export function syncUserHeader() {
  const user = getCurrentUser();

  // If on landing page and user is authenticated, update the Login/Register CTA to Dashboard & Sign Out
  if (typeof window !== 'undefined' && isLandingPage(window.location.pathname)) {
    const loginBtn = document.getElementById('btn-login-nav');
    const registerBtn = document.getElementById('btn-register-nav');
    if (user && user.role) {
      if (loginBtn) {
        loginBtn.href = getRedirectForRole(user.role);
        loginBtn.innerHTML = `<i class="fa-solid fa-gauge" style="margin-right: 0.35rem;"></i> Dashboard`;
        loginBtn.className = 'btn btn-primary btn-sm';
      }
      if (registerBtn) {
        registerBtn.href = '#';
        registerBtn.onclick = async (e) => {
          e.preventDefault();
          await logout();
        };
        registerBtn.innerHTML = `<i class="fa-solid fa-arrow-right-from-bracket" style="margin-right: 0.35rem;"></i> Sign Out`;
        registerBtn.className = 'btn btn-secondary btn-sm';
      }

      const heroCta = document.getElementById('hero-cta-primary');
      if (heroCta) {
        heroCta.href = getRedirectForRole(user.role);
        heroCta.innerHTML = `<span>Go to Dashboard</span> <i class="fa-solid fa-arrow-right" style="margin-left: 0.4rem;"></i>`;
      }
      const bottomCta = document.getElementById('cta-create-account');
      if (bottomCta) {
        bottomCta.href = getRedirectForRole(user.role);
        bottomCta.innerHTML = `<span>Open Dashboard</span> <i class="fa-solid fa-arrow-right" style="margin-left: 0.4rem;"></i>`;
      }
      const bottomSignin = document.getElementById('cta-signin');
      if (bottomSignin) {
        bottomSignin.href = getRedirectForRole(user.role);
        bottomSignin.innerHTML = `<span>My Account</span>`;
      }
    }
  }

  if (!user) return;

  const avatarEls = document.querySelectorAll('.user-avatar-circle, .user-avatar-text, #user-avatar, #sidebar-avatar-display');
  avatarEls.forEach(el => {
    if (user.avatar_url && (user.avatar_url.startsWith('http://') || user.avatar_url.startsWith('https://'))) {
      el.innerHTML = `<img src="${user.avatar_url}" alt="${user.full_name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" referrerpolicy="no-referrer">`;
    } else {
      el.textContent = user.avatar || 'AS';
    }
  });

  const nameEls = document.querySelectorAll('.user-name-text');
  nameEls.forEach(el => el.textContent = user.full_name || 'Ayush User');

  const roleEls = document.querySelectorAll('.user-role-text');
  roleEls.forEach(el => {
    el.textContent = (user.role || 'Student').toUpperCase();
  });
}

/**
 * Responsive Navigation & Mobile Sidebar Support
 */
export function initResponsiveNavigation() {
  const sidebar = document.querySelector('.dashboard-sidebar');
  const main = document.querySelector('.dashboard-main');

  if (sidebar && main) {
    // 1. Create or get backdrop
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    // 2. Create or get mobile header inside dashboard-main
    let mobileHeader = main.querySelector('.dashboard-mobile-header');
    if (!mobileHeader) {
      const user = getCurrentUser();
      mobileHeader = document.createElement('div');
      mobileHeader.className = 'dashboard-mobile-header';
      mobileHeader.innerHTML = `
        <button class="mobile-sidebar-toggle" id="sidebar-toggle-btn" aria-label="Toggle Navigation">
          <span>☰</span>
          <span>Menu</span>
        </button>
        <a href="/index.html" style="display: flex; align-items: center;">
          <img src="/assets/icons/ayush-logo.svg" alt="AYUSH CONNECT" style="height: 30px;">
        </a>
        <div class="user-avatar-circle" style="width: 34px; height: 34px; font-size: 0.8rem;">
          ${user.avatar || 'AC'}
        </div>
      `;
      main.insertBefore(mobileHeader, main.firstChild);
    }

    // 3. Attach toggle events
    const toggleBtn = mobileHeader.querySelector('#sidebar-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active', sidebar.classList.contains('open'));
      });
    }

    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
    });

    // Close on navigation link click when on mobile
    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          sidebar.classList.remove('open');
          backdrop.classList.remove('active');
        }
      });
    });
  }

  // Also support landing page mobile menu if present
  const landingToggle = document.getElementById('mobile-menu-toggle');
  const mobileDropdown = document.getElementById('mobile-dropdown');
  if (landingToggle && mobileDropdown) {
    landingToggle.addEventListener('click', () => {
      const isHidden = mobileDropdown.style.display === 'none' || !mobileDropdown.style.display;
      mobileDropdown.style.display = isHidden ? 'block' : 'none';
    });
  }
}

/**
 * Synchronize session from active Supabase auth tokens and perform role redirection if needed
 */
export async function syncSupabaseSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await redirectUserByRole(session.user);
      return getCurrentUser();
    }
  } catch (err) {
    console.warn('Supabase session sync notice:', err);
  }
  return null;
}

// Auto sync and responsive navigation on page load
document.addEventListener('DOMContentLoaded', async () => {
  applyAppMode();
  initGlobalAuthListener();
  await syncSupabaseSession();
  syncUserHeader();
  initResponsiveNavigation();
});
