import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';

interface LandingPageProps {
  navigate?: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ navigate: propNavigate }) => {
  // Requirement 3d: Show a brief loading spinner while check is happening
  // so the user never sees the landing page flash before redirecting
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Router navigation helper: uses prop if passed, fallback to window.location.replace
  const navigate = propNavigate || ((targetUrl: string) => {
    window.location.replace(targetUrl);
  });

  // Requirement 2 & 5: On component mount (using useEffect), check for session
  // Runs every time this Landing Page component mounts
  useEffect(() => {
    let isMounted = true;

    async function checkSessionAndRedirect() {
      try {
        console.log('[Landing Page] Checking for existing Supabase session...');
        // Requirement 2: Call supabase.auth.getSession()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.warn('[Landing Page] Error getting session:', sessionError);
          if (isMounted) setIsLoading(false);
          return;
        }

        // Requirement 3: If a session exists
        if (session?.user) {
          // Requirement 4: Console log session found
          console.log('[Landing Page] Session found for user:', session.user.id, session.user.email);

          // Requirement 3a & 4: Fetch user's row from profiles table using session user id
          console.log('[Landing Page] Fetching profile from "profiles" table for user id:', session.user.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.warn('[Landing Page] Error fetching profile:', profileError);
          }

          const rawRole = profile?.role?.toLowerCase()?.trim();

          // Requirement 3b: If a role exists, immediately redirect to matching dashboard
          if (rawRole && ['student', 'industry', 'academician', 'admin'].includes(rawRole)) {
            let targetDashboard = '/student/dashboard.html';
            if (rawRole === 'industry') targetDashboard = '/industry/dashboard.html';
            else if (rawRole === 'academician') targetDashboard = '/academician/dashboard.html';
            else if (rawRole === 'admin') targetDashboard = '/admin/dashboard.html';

            // Requirement 4: Console log role found and redirect target
            console.log('[Landing Page] Role found in profile:', rawRole);
            console.log('[Landing Page] Redirect target:', targetDashboard);
            console.log('[Landing Page] Immediately redirecting to:', targetDashboard);

            navigate(targetDashboard);
            return; // Keep loading spinner active during redirect
          }

          // Requirement 3c: If no profiles row exists yet, redirect to "Complete your profile"
          console.log('[Landing Page] No profile row or role found for user:', session.user.id);
          console.log('[Landing Page] Redirect target: /auth/callback.html (Complete your profile)');
          console.log('[Landing Page] Immediately redirecting to: /auth/callback.html');

          navigate('/auth/callback.html');
          return;
        }

        // No active session found: Reveal the public landing page
        console.log('[Landing Page] No active session found. Displaying public landing page.');
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Landing Page] Unexpected error during session check:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    // Execute check on mount
    checkSessionAndRedirect();

    // Requirement 5: Also handle OAuth URL hash processing / state changes dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('[Landing Page] onAuthStateChange detected:', event, newSession?.user?.email);
      if (newSession?.user) {
        await checkSessionAndRedirect();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Requirement 3d: Loading spinner preventing flash of landing page
  if (isLoading) {
    return (
      <div
        id="landing-auth-spinner-container"
        className="min-h-screen w-full flex flex-col items-center justify-center bg-stone-50 text-stone-800"
        style={{ minHeight: '100vh', backgroundColor: '#fafaf9' }}
      >
        <div
          className="w-12 h-12 rounded-full animate-spin border-4 border-emerald-800 border-t-transparent"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '4px solid #e7e5e4',
            borderTopColor: '#065f46',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '16px',
          }}
        />
        <h2
          className="text-lg font-bold text-stone-800 tracking-tight"
          style={{ fontSize: '18px', fontWeight: 700, color: '#1c1917', margin: 0 }}
        >
          Verifying AYUSH Connect Session...
        </h2>
        <p
          className="text-sm text-stone-500 mt-1"
          style={{ fontSize: '13px', color: '#78716c', marginTop: '6px' }}
        >
          Connecting to your authenticated role workspace
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Public Landing Page content rendered ONLY when confirmed that no session exists
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/index.html" className="flex items-center gap-2 text-emerald-800 font-bold text-lg">
              <span className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center text-sm font-black">
                AC
              </span>
              AYUSH CONNECT
            </a>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <a href="/index.html" className="text-emerald-800 font-semibold">Home</a>
            <a href="/student/opportunities.html" className="hover:text-emerald-800 transition">Opportunities</a>
            <a href="#how-it-works" className="hover:text-emerald-800 transition">How It Works</a>
            <a href="#ecosystem" className="hover:text-emerald-800 transition">Ecosystem</a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/login.html"
              id="btn-nav-login"
              className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-emerald-800 transition"
            >
              Sign In
            </a>
            <a
              href="/register.html"
              id="btn-nav-register"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm transition"
            >
              Register
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-6">
                <span>NATIONAL DIGITAL WORKFORCE PLATFORM</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
                AYUSH <span className="text-emerald-700">CONNECT</span>
              </h1>

              <p className="mt-3 text-lg font-semibold text-amber-600">
                "Connecting Skills, Opportunities & Careers"
              </p>

              <p className="mt-4 text-base text-stone-600 leading-relaxed max-w-xl">
                Empowering students to discover their skills, connect with industry leaders like Dabur, Himalaya, and Patanjali, and build meaningful career opportunities — bridging classical AYUSH wisdom with modern health analytics.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="/register.html"
                  id="hero-get-started"
                  className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-medium rounded-lg shadow-sm transition"
                >
                  Get Started Free
                </a>
                <a
                  href="/login.html"
                  id="hero-sign-in"
                  className="px-6 py-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium rounded-lg transition"
                >
                  Sign In to Dashboard
                </a>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-200 flex items-center gap-6 text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Ayurveda (BAMS)
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                  Yoga & Naturopathy
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  Unani & Siddha
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                  Homoeopathy
                </div>
              </div>
            </div>

            {/* Showcase Visual Card */}
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-stone-200">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
                <span className="text-xs font-mono text-stone-400">ayush-connect.gov.in</span>
              </div>
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-800 text-sm">Verified Skill Assessment</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Ayurvedic Pharmacopoeia & QC (HPTLC)</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
                    Score: 92%
                  </span>
                </div>
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-800 text-sm">Industry Internship Match</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Dabur India R&D • ₹28,000 / mo</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                    95% Match
                  </span>
                </div>
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-800 text-sm">Ministry Accreditation</h3>
                    <p className="text-xs text-stone-500 mt-0.5">National Institute of Ayurveda (NIA)</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded bg-sky-100 text-sky-800">
                    Verified
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-8 text-center text-xs text-stone-500">
        <p>&copy; 2026 AYUSH CONNECT. All rights reserved. Connecting traditional medicine with modern health informatics.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
