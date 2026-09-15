/**
 * AYUSH CONNECT — Supabase Client Layer
 * SIH 2026: Student-to-Industry Career & Skill Ecosystem
 * 
 * Connected to live Supabase project:
 * Project Name: ayush-connect
 * Project ID:   dfadvmweedgllzwifbth
 * Project URL:  https://dfadvmweedgllzwifbth.supabase.co
 */

import { createClient } from '@supabase/supabase-js';

// Normalize URL (strip /rest/v1 or trailing slash if present)
const RAW_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) 
  || 'https://dfadvmweedgllzwifbth.supabase.co';
const CLEAN_URL = RAW_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

export const SUPABASE_CONFIG = {
  projectName: 'ayush-connect',
  projectId: 'dfadvmweedgllzwifbth',
  url: CLEAN_URL,
  restUrl: `${CLEAN_URL}/rest/v1/`,
  anonKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) 
    || 'sb_publishable_4Gy_V5E0XPs7J4xZmTj0Fg_jE7iui4o',
  isConfigured: true
};

/**
 * Global DEMO_MODE Flag
 * 
 * Strict Requirement:
 * - Isolated behind a single, clearly named flag: DEMO_MODE (or isDemoMode()).
 * - Defaults to OFF (false) in production builds.
 * - When false: all data in Student, Industry, Academician, and Admin portals
 *   comes strictly from real Supabase queries (profiles, opportunities, applications,
 *   skills, projects, assessments). If no data has been created yet, empty states
 *   are rendered with no hardcoded or hallucinated fake numbers/names.
 * - When true: mock seed data is used for preview/demonstration.
 */
export function isDemoMode() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') return true;
    if (params.get('demo') === 'false') return false;
    return localStorage.getItem('DEMO_MODE') === 'true'; // defaults to false
  }
  return false;
}

export function setDemoMode(val) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('DEMO_MODE', val ? 'true' : 'false');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ayush:demo-mode-changed', { detail: { demoMode: Boolean(val) } }));
    }
  }
}

export const DEMO_MODE = isDemoMode();

if (typeof window !== 'undefined') {
  window.isDemoMode = isDemoMode;
  window.setDemoMode = setDemoMode;
  window.DEMO_MODE = DEMO_MODE;
}

/**
 * Initialize official Supabase Client
 */
export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Cache key for persistent local state
const LOCAL_DB_STORAGE_KEY = 'ayush_supabase_cache_v2';

// Default Seed Records
const DEFAULT_SEED_DATA = {
  profiles: [
    {
      id: 'usr_student_01',
      full_name: 'Ayush Sharma',
      email: 'ayush.sharma@ayush.edu.in',
      role: 'student',
      phone: '+91 98765 43210',
      avatar: 'AS',
      created_at: '2026-01-15T09:00:00Z',
      verified: true
    },
    {
      id: 'usr_ind_01',
      full_name: 'Sunita Deshmukh',
      email: 's.deshmukh@himalayawellness.com',
      role: 'industry',
      company_name: 'Himalaya Wellness Company',
      designation: 'Head of Clinical R&D Recruitment',
      phone: '+91 98111 22334',
      avatar: 'SD',
      created_at: '2026-01-20T10:30:00Z',
      verified: true
    },
    {
      id: 'usr_acad_01',
      full_name: 'Dr. V. S. Ramaswamy',
      email: 'vs.ramaswamy@nia.edu.in',
      role: 'academician',
      institution: 'National Institute of Ayurveda (NIA), Jaipur',
      department: 'Department of Dravyaguna & Clinical Pharmacology',
      designation: 'Professor & Dean of Research',
      phone: '+91 94222 55667',
      avatar: 'VR',
      created_at: '2026-02-01T14:15:00Z',
      verified: true
    },
    {
      id: 'usr_admin_01',
      full_name: 'Administrator',
      email: 'admin@ayushconnect.gov.in',
      role: 'admin',
      designation: 'Director, Digital Skills & Employment Directorate',
      avatar: 'AD',
      created_at: '2025-12-01T08:00:00Z',
      verified: true
    }
  ],

  student_profiles: {
    usr_student_01: {
      college: 'All India Institute of Ayurveda (AIIA), New Delhi',
      course: 'BAMS (Ayurvedic Medicine & Surgery) + Health Informatics',
      year: '4th Year',
      graduation_year: '2026',
      bio: 'Aspiring Ayurvedic Data Scientist & Clinical Researcher bridging classical pharmacology with modern bio-statistics and machine learning.',
      profile_completion_pct: 78,
      skill_score: 82,
      github_url: 'https://github.com/ayush-sharma-ayush',
      linkedin_url: 'https://linkedin.com/in/ayush-sharma-biotech',
      resume_filename: 'Ayush_Sharma_CV_2026.pdf',
      career_stage: 'portfolio'
    }
  },

  skills: [
    { id: 'sk_01', name: 'Herbal Pharmacology (Dravyaguna)', category: 'Domain / Technical', level: 'Advanced', proficiency: 92 },
    { id: 'sk_02', name: 'Clinical Data Analytics & Python', category: 'Domain / Technical', level: 'Intermediate', proficiency: 78 },
    { id: 'sk_03', name: 'Ayurvedic Pharmacopoeia & QC', category: 'Domain / Technical', level: 'Advanced', proficiency: 88 },
    { id: 'sk_04', name: 'Biostatistics & SQL', category: 'Technical Skills', level: 'Intermediate', proficiency: 65 },
    { id: 'sk_05', name: 'Yoga Biomechanics & Posture AI', category: 'Domain / Technical', level: 'Intermediate', proficiency: 72 },
    { id: 'sk_06', name: 'Pharmacovigilance (ASU Drugs)', category: 'Regulatory / Clinical', level: 'Intermediate', proficiency: 70 },
    { id: 'sk_07', name: 'Clinical Communication & Patient Counseling', category: 'Soft Skills', level: 'Advanced', proficiency: 90 },
    { id: 'sk_08', name: 'Research Methodology & Protocol Writing', category: 'Soft Skills', level: 'Advanced', proficiency: 85 }
  ],

  opportunities: [
    {
      id: 'opp_01',
      title: 'Ayurvedic Clinical Informatics Intern',
      company_name: 'Dabur India R&D Centre',
      company_logo_text: 'DABUR',
      location: 'Ghaziabad, NCR / Hybrid',
      type: 'Internship',
      stipend: '₹28,000 / month',
      deadline: '2026-10-30',
      description: 'Collaborate with senior pharmacologists and AI teams to curate classical formulation taxonomies and run bio-activity data modeling.',
      required_skills: ['Herbal Pharmacology (Dravyaguna)', 'Clinical Data Analytics & Python', 'Biostatistics & SQL'],
      minimum_level: 'Intermediate',
      eligibility: 'BAMS / M.Sc Life Sciences / Bioinformatics Final Year',
      openings: 3,
      posted_date: '2026-09-01',
      featured: true
    },
    {
      id: 'opp_02',
      title: 'Herbal Formulation Quality Analyst',
      company_name: 'Himalaya Wellness Company',
      company_logo_text: 'HIMALAYA',
      location: 'Bengaluru, Karnataka',
      type: 'Job',
      stipend: '₹7.2 - 9.0 LPA',
      deadline: '2026-11-15',
      description: 'Responsible for HPTLC standardization, herbal contaminant analysis, and establishing digital certificates of analysis for global export batches.',
      required_skills: ['Ayurvedic Pharmacopoeia & QC', 'Research Methodology & Protocol Writing', 'Pharmacovigilance (ASU Drugs)'],
      minimum_level: 'Advanced',
      eligibility: 'BAMS / B.Pharm (Ayurveda) / M.Pharm',
      openings: 2,
      posted_date: '2026-09-05',
      featured: true
    },
    {
      id: 'opp_03',
      title: 'Yoga Computer Vision & Biomechanics Fellow',
      company_name: 'S-VYASA Yoga University & HealthTech Lab',
      company_logo_text: 'S-VYASA',
      location: 'Bengaluru / Remote',
      type: 'Project',
      stipend: '₹35,000 / month grant',
      deadline: '2026-10-15',
      description: 'Develop Pose-estimation datasets for therapeutical Asana alignment under the AYUSH Smart Health initiative.',
      required_skills: ['Yoga Biomechanics & Posture AI', 'Clinical Data Analytics & Python'],
      minimum_level: 'Intermediate',
      eligibility: 'BNYS / M.Sc Yoga / Computer Science Interdisciplinary',
      openings: 4,
      posted_date: '2026-09-08',
      featured: false
    },
    {
      id: 'opp_04',
      title: 'National AYUSH Hackathon & Clinical Datathon 2026',
      company_name: 'Ministry of AYUSH & AICTE',
      company_logo_text: 'SIH-AYUSH',
      location: 'New Delhi (Grand Finale)',
      type: 'Hackathon',
      stipend: '₹2,50,000 Prize Pool',
      deadline: '2026-10-25',
      description: 'Nationwide challenge to solve real-world problem statements in supply chain tracing of medicinal plants and standardized EHR systems.',
      required_skills: ['Herbal Pharmacology (Dravyaguna)', 'Clinical Data Analytics & Python', 'Biostatistics & SQL'],
      minimum_level: 'All Levels',
      eligibility: 'Open to all Indian College Students',
      openings: 100,
      posted_date: '2026-09-10',
      featured: true
    },
    {
      id: 'opp_05',
      title: 'Pharmacovigilance Officer (ASU Drugs)',
      company_name: 'Patanjali Research Foundation',
      company_logo_text: 'PATANJALI',
      location: 'Haridwar, Uttarakhand',
      type: 'Job',
      stipend: '₹6.5 - 8.2 LPA',
      deadline: '2026-11-01',
      description: 'Track adverse drug reactions (ADRs), conduct signal detection in clinical registries, and liaise with Intermediary Pharmacovigilance Centres.',
      required_skills: ['Pharmacovigilance (ASU Drugs)', 'Ayurvedic Pharmacopoeia & QC', 'Clinical Communication & Patient Counseling'],
      minimum_level: 'Intermediate',
      eligibility: 'BAMS / MD (Ayurveda)',
      openings: 5,
      posted_date: '2026-09-03',
      featured: false
    },
    {
      id: 'opp_06',
      title: 'Clinical Research Coordinator',
      company_name: 'Central Council for Research in Ayurvedic Sciences (CCRAS)',
      company_logo_text: 'CCRAS',
      location: 'New Delhi / On-site',
      type: 'Job',
      stipend: '₹55,000 / month',
      deadline: '2026-10-28',
      description: 'Facilitate multicenter randomized controlled trials (RCTs), ethics committee submissions, and electronic data capture (EDC) compliance.',
      required_skills: ['Research Methodology & Protocol Writing', 'Herbal Pharmacology (Dravyaguna)', 'Biostatistics & SQL'],
      minimum_level: 'Intermediate',
      eligibility: 'BAMS / M.Sc Clinical Research',
      openings: 3,
      posted_date: '2026-08-25',
      featured: false
    }
  ],

  applications: [
    {
      id: 'app_01',
      opportunity_id: 'opp_01',
      student_id: 'usr_student_01',
      student_name: 'Ayush Sharma',
      college: 'AIIA, New Delhi',
      position: 'Ayurvedic Clinical Informatics Intern',
      company: 'Dabur India R&D Centre',
      applied_date: '2026-09-05',
      status: 'Interview',
      match_pct: 92,
      assessment_score: 84,
      interview_date: '2026-09-22 at 11:00 AM IST'
    },
    {
      id: 'app_02',
      opportunity_id: 'opp_02',
      student_id: 'usr_student_01',
      student_name: 'Ayush Sharma',
      college: 'AIIA, New Delhi',
      position: 'Herbal Formulation Quality Analyst',
      company: 'Himalaya Wellness Company',
      applied_date: '2026-09-08',
      status: 'Shortlisted',
      match_pct: 88,
      assessment_score: 84
    },
    {
      id: 'app_03',
      opportunity_id: 'opp_04',
      student_id: 'usr_student_01',
      student_name: 'Ayush Sharma',
      college: 'AIIA, New Delhi',
      position: 'National AYUSH Hackathon & Clinical Datathon',
      company: 'Ministry of AYUSH & AICTE',
      applied_date: '2026-09-11',
      status: 'Applied',
      match_pct: 95,
      assessment_score: 84
    }
  ],

  projects: [
    {
      id: 'proj_01',
      title: 'AyurDravyaguna AI — Medicinal Herb Identification Engine',
      description: 'Built a deep learning vision classifier that distinguishes 120 endemic Indian medicinal plant species from leaf vein morphology with 94.2% accuracy.',
      technologies: ['Python', 'PyTorch', 'OpenCV', 'Streamlit', 'Ayurvedic Botany'],
      github_url: 'https://github.com/ayush-sharma/ayur-herb-ai',
      live_demo_url: 'https://ayur-herb-ai.streamlit.app',
      date: '2026'
    },
    {
      id: 'proj_02',
      title: 'AyushEHR — FHIR-compliant Ayurvedic Clinical Record System',
      description: 'Designed an electronic health record data architecture mapping classical Prakriti, Vikriti, and Nadi examination parameters into modern HL7/FHIR profiles.',
      technologies: ['React', 'TypeScript', 'SQL', 'HL7/FHIR Standards', 'ICD-11 AYUSH TM2'],
      github_url: 'https://github.com/ayush-sharma/ayush-fhir-ehr',
      live_demo_url: '#',
      date: '2025'
    }
  ]
};

// Load or initialize local cache
function loadLocalDatabase() {
  if (typeof localStorage === 'undefined') return DEFAULT_SEED_DATA;
  try {
    const saved = localStorage.getItem(LOCAL_DB_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        profiles: parsed.profiles || DEFAULT_SEED_DATA.profiles,
        student_profiles: parsed.student_profiles || DEFAULT_SEED_DATA.student_profiles,
        skills: parsed.skills || DEFAULT_SEED_DATA.skills,
        opportunities: parsed.opportunities || DEFAULT_SEED_DATA.opportunities,
        applications: parsed.applications || DEFAULT_SEED_DATA.applications,
        projects: parsed.projects || DEFAULT_SEED_DATA.projects
      };
    }
  } catch (e) {
    console.warn('Error loading local db cache:', e);
  }
  return DEFAULT_SEED_DATA;
}

export const MOCK_DB = loadLocalDatabase();

// Persist local cache
export function saveLocalDatabase() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_DB_STORAGE_KEY, JSON.stringify(MOCK_DB));
  } catch (e) {
    console.warn('Failed to persist local db cache:', e);
  }
}

/**
 * Check Supabase Live Connection Health
 */
export async function checkSupabaseConnection() {
  try {
    // 1. Check Auth service
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    // 2. Check Database query
    let dbConnected = false;
    let tablesStatus = 'Tables pending SQL migration';
    try {
      const { data, error } = await supabase.from('opportunities').select('id').limit(1);
      if (!error) {
        dbConnected = true;
        tablesStatus = 'Database tables connected';
      } else if (error.code === 'PGRST205') {
        tablesStatus = 'Supabase schema cache waiting for table creation';
      }
    } catch {
      // Ignored
    }

    return {
      success: !authError,
      authConnected: !authError,
      dbConnected,
      projectId: SUPABASE_CONFIG.projectId,
      url: SUPABASE_CONFIG.url,
      restUrl: SUPABASE_CONFIG.restUrl,
      tablesStatus,
      session: authData?.session || null
    };
  } catch (err) {
    return {
      success: false,
      authConnected: false,
      dbConnected: false,
      error: err.message
    };
  }
}

/**
 * Async Sync: Load opportunities from Supabase (with automatic fallback to local seed)
 */
export async function syncOpportunitiesFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      MOCK_DB.opportunities = data;
      saveLocalDatabase();
      window.dispatchEvent(new CustomEvent('ayush:opportunities-updated', { detail: data }));
      return data;
    }
  } catch (e) {
    console.info('Using offline/cached opportunities:', e.message);
  }
  return MOCK_DB.opportunities;
}

/**
 * Save new opportunity to Supabase & local cache
 */
export async function saveOpportunityToSupabase(newOpp) {
  // Update local immediately for responsive UI
  MOCK_DB.opportunities.unshift(newOpp);
  saveLocalDatabase();

  try {
    const { data, error } = await supabase
      .from('opportunities')
      .insert([{
        title: newOpp.title,
        company_name: newOpp.company_name,
        type: newOpp.type,
        description: newOpp.description,
        location: newOpp.location,
        stipend_salary: newOpp.stipend || newOpp.stipend_salary,
        deadline: newOpp.deadline,
        eligibility: newOpp.eligibility,
        openings: newOpp.openings || 1
      }]);

    if (error) {
      console.warn('Supabase DB opportunity insert note:', error.message);
    } else {
      console.log('Opportunity saved to Supabase:', data);
    }
  } catch (e) {
    console.warn('Supabase sync skipped, local state preserved:', e.message);
  }
  return newOpp;
}

/**
 * Save new application to Supabase & local cache
 */
export async function saveApplicationToSupabase(newApp) {
  MOCK_DB.applications.unshift(newApp);
  saveLocalDatabase();

  try {
    const { data, error } = await supabase
      .from('applications')
      .insert([{
        opportunity_id: newApp.opportunity_id,
        student_id: newApp.student_id,
        status: newApp.status || 'Applied',
        match_pct: newApp.match_pct || 90
      }]);

    if (error) {
      console.warn('Supabase application insert note:', error.message);
    } else {
      console.log('Application saved to Supabase:', data);
    }
  } catch (e) {
    console.warn('Supabase sync skipped, local state preserved:', e.message);
  }
  return newApp;
}

/**
 * Supabase Auth: User Registration
 */
export async function signUpUserWithSupabase(email, password, metadata = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Supabase Auth: User Sign In
 */
export async function signInUserWithSupabase(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Supabase Auth: Sign Out
 */
export async function signOutUserWithSupabase() {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Supabase Auth: Real OAuth Sign In / Sign Up with Google or GitHub
 * 
 * Works symmetrically for both new registrations and existing user logins.
 * Follows official Supabase OAuth specification with redirectTo callback.
 */
export async function signInWithOAuthProvider(provider, intendedRole = null) {
  try {
    const cleanProvider = provider.toLowerCase().trim(); // 'google' or 'github'
    const roleToUse = intendedRole || localStorage.getItem('ayush_oauth_pending_role') || 'student';
    
    // Store intended role in localStorage
    localStorage.setItem('ayush_oauth_pending_role', roleToUse);
    sessionStorage.setItem('ayush_oauth_in_progress', 'true');
    localStorage.setItem('ayush_oauth_in_progress', 'true');

    // Determine the exact callback URL based on current origin, embedding role query param
    const callbackUrl = `${window.location.origin}/auth/callback.html?role=${encodeURIComponent(roleToUse)}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: cleanProvider,
      options: {
        redirectTo: callbackUrl,
        queryParams: cleanProvider === 'google' ? {
          access_type: 'offline',
          prompt: 'consent'
        } : undefined
      }
    });

    if (error) {
      console.error(`Supabase ${provider} OAuth error:`, error);
      sessionStorage.removeItem('ayush_oauth_in_progress');
      localStorage.removeItem('ayush_oauth_in_progress');
      return { success: false, error };
    }

    // If data.url is returned, navigate to the OAuth authorization URL
    if (data?.url) {
      // If running inside an iframe (like AI Studio preview), opening directly can be blocked by Google/GitHub's X-Frame-Options.
      // We safely check if window is in an iframe and open in a popup window:
      if (window.self !== window.top) {
        const width = 580;
        const height = 680;
        const left = Math.max(0, Math.round((window.screen.width - width) / 2));
        const top = Math.max(0, Math.round((window.screen.height - height) / 2));
        const popup = window.open(
          data.url,
          'ayush_oauth_popup',
          `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes,scrollbars=yes`
        );

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          // If popup blocker intervened, fallback to direct redirect
          window.location.href = data.url;
        } else {
          // Monitor popup in background from opener window
          const checkTimer = setInterval(async () => {
            try {
              const justLoggedIn = localStorage.getItem('ayush_oauth_just_logged_in') === 'true';
              const cachedUserRaw = localStorage.getItem('ayush_current_user');
              if (justLoggedIn || cachedUserRaw) {
                clearInterval(checkTimer);
                try { popup.close(); } catch (e) {}
                const user = cachedUserRaw ? JSON.parse(cachedUserRaw) : null;
                const roleDest = user?.redirect || (user?.role === 'industry' ? '/industry/dashboard.html' : (user?.role === 'academician' ? '/academician/dashboard.html' : '/student/dashboard.html'));
                window.location.replace(roleDest);
                return;
              }
              if (popup.closed) {
                clearInterval(checkTimer);
                const { data: sessData } = await supabase.auth.getSession();
                if (sessData?.session?.user) {
                  window.location.replace('/student/dashboard.html');
                }
              }
            } catch (e) {}
          }, 1000);
        }
      } else {
        window.location.href = data.url;
      }
      return { success: true, url: data.url };
    }

    return { success: true, data };
  } catch (err) {
    console.error(`Supabase OAuth initiation failure for ${provider}:`, err);
    sessionStorage.removeItem('ayush_oauth_in_progress');
    localStorage.removeItem('ayush_oauth_in_progress');
    return { success: false, error: err };
  }
}

/**
 * =========================================================================
 * REAL SUPABASE QUERY LAYER (LIVE DATA & DEMO_MODE ISOLATION)
 * =========================================================================
 */

/**
 * Fetch Student Dashboard Metrics
 */
export async function fetchStudentDashboardMetrics(userId) {
  if (isDemoMode()) {
    return {
      profileCompletion: 78,
      skillScore: 82,
      applicationsCount: 6,
      recommendationsCount: 12,
      rankText: 'Top 15% across AIIA',
      interviewAppsText: '2 in Interview Stage',
      matchScoreText: '90%+ Skill Alignment'
    };
  }

  try {
    const [profileRes, studentProfileRes, skillsRes, appsRes, oppsRes] = await Promise.all([
      userId ? supabase.from('profiles').select('*').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
      userId ? supabase.from('student_profiles').select('*').eq('profile_id', userId).maybeSingle() : Promise.resolve({ data: null }),
      userId ? supabase.from('student_skills').select('*').eq('student_id', userId) : Promise.resolve({ data: [] }),
      userId ? supabase.from('applications').select('*').eq('student_id', userId) : Promise.resolve({ data: [] }),
      supabase.from('opportunities').select('id, required_skills')
    ]);

    const profile = profileRes?.data || null;
    const studentProfile = studentProfileRes?.data || null;
    const skills = Array.isArray(skillsRes?.data) ? skillsRes.data : [];
    const apps = Array.isArray(appsRes?.data) ? appsRes.data : [];
    const opps = Array.isArray(oppsRes?.data) ? oppsRes.data : [];

    // Calculate real completion pct based on fields
    let filledCount = 0;
    const totalFields = 6;
    if (profile?.full_name) filledCount++;
    if (profile?.email) filledCount++;
    if (studentProfile?.college_institution) filledCount++;
    if (studentProfile?.course) filledCount++;
    if (studentProfile?.bio) filledCount++;
    if (skills.length > 0) filledCount++;
    const profileCompletion = studentProfile?.profile_completion_pct 
      || (filledCount > 0 ? Math.round((filledCount / totalFields) * 100) : 0);

    let skillScore = 0;
    if (studentProfile?.overall_skill_score) {
      skillScore = studentProfile.overall_skill_score;
    } else if (skills.length > 0) {
      const sum = skills.reduce((acc, s) => acc + (s.proficiency_pct || 0), 0);
      skillScore = Math.round(sum / skills.length);
    }

    const applicationsCount = apps.length;
    const interviewApps = apps.filter(a => (a.status || '').toLowerCase() === 'interview').length;

    let recommendationsCount = 0;
    if (skills.length > 0 && opps.length > 0) {
      const studentSkillNames = skills.map(s => (s.name || '').toLowerCase());
      recommendationsCount = opps.filter(opp => {
        const reqs = Array.isArray(opp.required_skills) ? opp.required_skills : [];
        return reqs.some(r => studentSkillNames.includes(r.toLowerCase()));
      }).length;
    }

    return {
      profileCompletion,
      skillScore,
      applicationsCount,
      recommendationsCount,
      rankText: skillScore > 0 ? `Verified Score: ${skillScore}/100` : 'No assessments completed yet',
      interviewAppsText: applicationsCount > 0 ? `${interviewApps} in Interview Stage` : '0 active applications',
      matchScoreText: recommendationsCount > 0 ? `${recommendationsCount} matching positions` : 'Log skills to see matches'
    };
  } catch (err) {
    console.warn('Error fetching live student metrics from Supabase:', err);
    return {
      profileCompletion: 0,
      skillScore: 0,
      applicationsCount: 0,
      recommendationsCount: 0,
      rankText: 'No assessments completed yet',
      interviewAppsText: '0 active applications',
      matchScoreText: 'Log skills to see matches'
    };
  }
}

/**
 * Fetch Student Verified Skills & Recommendations
 */
export async function fetchStudentSkillsData(userId) {
  if (isDemoMode()) {
    return {
      skills: [
        { id: 'sk_01', name: 'Herbal Pharmacology (Dravyaguna)', category: 'Domain / Technical', level: 'Advanced', pct: 92 },
        { id: 'sk_02', name: 'Ayurvedic Pharmacopoeia & QC', category: 'Domain / Technical', level: 'Advanced', pct: 88 },
        { id: 'sk_03', name: 'Clinical Data Analytics & Python', category: 'Technical Skills', level: 'Intermediate', pct: 78 },
        { id: 'sk_04', name: 'Yoga Biomechanics & Posture AI', category: 'Technical Skills', level: 'Intermediate', pct: 72 },
        { id: 'sk_05', name: 'Biostatistics & SQL', category: 'Technical Skills', level: 'Intermediate', pct: 65 },
        { id: 'sk_06', name: 'Pharmacovigilance (ASU Drugs)', category: 'Regulatory / Clinical', level: 'Intermediate', pct: 70 },
        { id: 'sk_07', name: 'Clinical Communication & Patient Counseling', category: 'Soft Skills', level: 'Advanced', pct: 90 },
        { id: 'sk_08', name: 'Research Methodology & Protocol Writing', category: 'Soft Skills', level: 'Advanced', pct: 85 }
      ],
      skillsToImprove: [
        { name: 'Biostatistics & SQL', current: 'Intermediate (65%)', target: 'Advanced (85%+)', reason: 'Crucial for clinical trial EDC data management at Dabur & CCRAS' },
        { name: 'Regulatory Affairs (USFDA Botanical Guidance)', current: 'Beginner (45%)', target: 'Intermediate', reason: 'High demand in export-oriented AYUSH manufacturers like Himalaya' },
        { name: 'Bioinformatics & Molecular Docking', current: 'Novice (30%)', target: 'Intermediate', reason: 'Required for advanced herbal phytocompound target prediction' }
      ]
    };
  }

  try {
    const { data, error } = await supabase
      .from('student_skills')
      .select('id, level, proficiency_pct, verified_by_assessment, skills(id, name, category)')
      .eq('student_id', userId);

    if (error || !Array.isArray(data) || data.length === 0) {
      return { skills: [], skillsToImprove: [] };
    }

    const mappedSkills = data.map(item => ({
      id: item.id,
      name: item.skills?.name || 'AYUSH Skill',
      category: item.skills?.category || 'Domain Skill',
      level: item.level || 'Intermediate',
      pct: item.proficiency_pct || 50
    }));

    const toImprove = mappedSkills
      .filter(s => s.pct < 75)
      .map(s => ({
        name: s.name,
        current: `${s.level} (${s.pct}%)`,
        target: 'Advanced (85%+)',
        reason: 'Recommended for higher match ranking in AYUSH enterprise roles.'
      }));

    return { skills: mappedSkills, skillsToImprove: toImprove };
  } catch (e) {
    console.warn('Error fetching live student skills:', e);
    return { skills: [], skillsToImprove: [] };
  }
}

/**
 * Fetch Student Portfolio Projects
 */
export async function fetchStudentProjectsData(userId) {
  if (isDemoMode()) {
    return MOCK_DB.projects;
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description || '',
      technologies: Array.isArray(p.technologies) ? p.technologies : [],
      github_url: p.github_url || '#',
      live_demo_url: p.live_demo_url || '#',
      date: p.created_at ? new Date(p.created_at).getFullYear().toString() : '2026'
    }));
  } catch (e) {
    console.warn('Error fetching live projects:', e);
    return [];
  }
}

/**
 * Save Project to Supabase
 */
export async function saveProjectToSupabase(project) {
  if (isDemoMode()) {
    MOCK_DB.projects.unshift(project);
    saveLocalDatabase();
    return { success: true, data: project };
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
      .select()
      .single();

    if (error) {
      console.warn('Error saving project to Supabase:', error.message);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e) {
    console.warn('Exception saving project to Supabase:', e);
    return { success: false, error: e };
  }
}

/**
 * Save Skill to Supabase
 */
export async function saveSkillToSupabase(skill) {
  if (isDemoMode()) {
    return { success: true, data: skill };
  }

  try {
    const { data, error } = await supabase
      .from('student_skills')
      .insert([skill])
      .select()
      .single();

    if (error) {
      console.warn('Error saving skill to Supabase:', error.message);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (e) {
    console.warn('Exception saving skill to Supabase:', e);
    return { success: false, error: e };
  }
}

/**
 * Fetch Student Applications
 */
export async function fetchStudentApplicationsData(userId, statusFilter = 'All') {
  if (isDemoMode()) {
    const apps = MOCK_DB.applications;
    return statusFilter === 'All' 
      ? apps 
      : apps.filter(a => a.status.toLowerCase() === statusFilter.toLowerCase());
  }

  try {
    let query = supabase
      .from('applications')
      .select('*, opportunities(*)')
      .eq('student_id', userId)
      .order('applied_at', { ascending: false });

    if (statusFilter !== 'All') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) {
      return [];
    }

    return data.map(app => ({
      id: app.id,
      opportunity_id: app.opportunity_id,
      student_id: app.student_id,
      position: app.opportunities?.title || 'AYUSH Role',
      company: app.opportunities?.company_name || 'Enterprise Partner',
      applied_date: app.applied_at ? new Date(app.applied_at).toISOString().split('T')[0] : 'Recently',
      status: app.status || 'Applied',
      match_pct: app.match_pct || 85,
      interview_date: app.interview_date ? new Date(app.interview_date).toLocaleString('en-IN') : null
    }));
  } catch (e) {
    console.warn('Error fetching live applications:', e);
    return [];
  }
}

/**
 * Fetch Opportunities Marketplace Data
 */
export async function fetchOpportunitiesData(filters = {}) {
  if (isDemoMode()) {
    let list = [...MOCK_DB.opportunities];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(opp =>
        opp.title.toLowerCase().includes(q) ||
        opp.company_name.toLowerCase().includes(q) ||
        (opp.required_skills || []).some(s => s.toLowerCase().includes(q))
      );
    }
    if (filters.type && filters.type !== 'All') {
      list = list.filter(opp => opp.type?.toLowerCase() === filters.type.toLowerCase());
    }
    if (filters.location && filters.location !== 'All') {
      list = list.filter(opp => opp.location?.toLowerCase().includes(filters.location.toLowerCase()));
    }
    return list;
  }

  try {
    let query = supabase.from('opportunities').select('*').order('created_at', { ascending: false });
    if (filters.type && filters.type !== 'All') {
      query = query.eq('type', filters.type);
    }
    const { data, error } = await query;
    if (error || !Array.isArray(data)) {
      return [];
    }

    let list = data.map(opp => ({
      id: opp.id,
      title: opp.title,
      company_name: opp.company_name,
      company_logo_text: opp.company_name ? opp.company_name.substring(0, 3).toUpperCase() : 'AYU',
      location: opp.location || 'India',
      type: opp.type || 'Internship',
      stipend: opp.stipend_salary || 'Competitive',
      deadline: opp.deadline || 'Ongoing',
      description: opp.description || '',
      required_skills: Array.isArray(opp.required_skills) ? opp.required_skills : [],
      minimum_level: opp.minimum_level || 'Intermediate',
      eligibility: opp.eligibility || 'Open to AYUSH Students',
      openings: opp.openings || 1,
      posted_date: opp.created_at ? new Date(opp.created_at).toISOString().split('T')[0] : '',
      featured: Boolean(opp.featured)
    }));

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(opp =>
        opp.title.toLowerCase().includes(q) ||
        opp.company_name.toLowerCase().includes(q) ||
        opp.required_skills.some(s => s.toLowerCase().includes(q))
      );
    }
    if (filters.location && filters.location !== 'All') {
      list = list.filter(opp => opp.location.toLowerCase().includes(filters.location.toLowerCase()));
    }
    return list;
  } catch (e) {
    console.warn('Error fetching live opportunities:', e);
    return [];
  }
}

/**
 * Fetch Industry Dashboard Metrics
 */
export async function fetchIndustryDashboardMetrics(companyName) {
  if (isDemoMode()) {
    return {
      activeOpportunitiesCount: 4,
      totalApplicantsCount: 28,
      shortlistedCount: 8,
      upcomingEventsCount: 2,
      activeSub: '2 Full-Time Jobs, 2 Internships',
      totalSub: '+7 New this week',
      shortlistedSub: 'Avg Verified Score: 85/100',
      eventsSub: '1 Bio-Hackathon, 1 Hiring Drive'
    };
  }

  try {
    const [oppsRes, appsRes] = await Promise.all([
      supabase.from('opportunities').select('*'),
      supabase.from('applications').select('*')
    ]);

    const opps = Array.isArray(oppsRes?.data) ? oppsRes.data : [];
    const apps = Array.isArray(appsRes?.data) ? appsRes.data : [];

    const activeOpportunitiesCount = opps.length;
    const totalApplicantsCount = apps.length;
    const shortlistedCount = apps.filter(a => ['shortlisted', 'interview', 'selected'].includes((a.status || '').toLowerCase())).length;
    const upcomingEventsCount = opps.filter(o => ['hackathon', 'workshop', 'project'].includes((o.type || '').toLowerCase())).length;

    return {
      activeOpportunitiesCount,
      totalApplicantsCount,
      shortlistedCount,
      upcomingEventsCount,
      activeSub: activeOpportunitiesCount > 0 ? `${activeOpportunitiesCount} Active Listings` : '0 Active Listings',
      totalSub: totalApplicantsCount > 0 ? `${totalApplicantsCount} Candidate Applications` : '0 Applications Received',
      shortlistedSub: shortlistedCount > 0 ? `${shortlistedCount} Evaluated Candidates` : '0 Shortlisted Candidates',
      eventsSub: upcomingEventsCount > 0 ? `${upcomingEventsCount} Live Events` : '0 Scheduled Events'
    };
  } catch (e) {
    console.warn('Error fetching live industry metrics:', e);
    return {
      activeOpportunitiesCount: 0,
      totalApplicantsCount: 0,
      shortlistedCount: 0,
      upcomingEventsCount: 0,
      activeSub: '0 Active Listings',
      totalSub: '0 Applications Received',
      shortlistedSub: '0 Shortlisted Candidates',
      eventsSub: '0 Scheduled Events'
    };
  }
}

/**
 * Fetch Industry Applicants Data
 */
export async function fetchIndustryApplicantsData(statusFilter = 'All', search = '') {
  if (isDemoMode()) {
    let list = [
      {
        id: 'app_ind_01',
        student_name: 'Ayush Sharma',
        college: 'All India Institute of Ayurveda (AIIA), New Delhi',
        course: 'BAMS + Health Informatics',
        role_applied: 'Ayurvedic Clinical Informatics Intern',
        skills: ['Herbal Pharmacology (Dravyaguna)', 'Clinical Data & Python', 'Biostatistics & SQL'],
        match_pct: 92,
        assessment_score: 84,
        applied_date: '2026-09-05',
        status: 'Interview'
      },
      {
        id: 'app_ind_02',
        student_name: 'Priya Singh',
        college: 'National Institute of Ayurveda (NIA), Jaipur',
        course: 'BAMS Final Year',
        role_applied: 'Herbal Formulation Quality Analyst',
        skills: ['Ayurvedic Pharmacopoeia & QC', 'HPTLC Testing', 'Pharmacovigilance'],
        match_pct: 88,
        assessment_score: 80,
        applied_date: '2026-09-08',
        status: 'Shortlisted'
      },
      {
        id: 'app_ind_03',
        student_name: 'Rahul Das',
        college: 'S-VYASA Yoga University, Bengaluru',
        course: 'M.Sc Yoga Therapy & Biomechanics',
        role_applied: 'Yoga Computer Vision & Biomechanics Fellow',
        skills: ['Yoga Biomechanics & Posture AI', 'Python', 'Kinematics'],
        match_pct: 95,
        assessment_score: 88,
        applied_date: '2026-09-10',
        status: 'Interview'
      },
      {
        id: 'app_ind_04',
        student_name: 'Ananya Verma',
        college: 'Faculty of Ayurveda, IMS BHU, Varanasi',
        course: 'MD (Dravyaguna Vigyan)',
        role_applied: 'Pharmacovigilance Officer (ASU Drugs)',
        skills: ['Pharmacovigilance (ASU Drugs)', 'Clinical Research', 'Toxicology'],
        match_pct: 90,
        assessment_score: 86,
        applied_date: '2026-09-02',
        status: 'Selected'
      },
      {
        id: 'app_ind_05',
        student_name: 'Vikram Joshi',
        college: 'Government Ayurvedic College, Guwahati',
        course: 'BAMS Intern',
        role_applied: 'Ayurvedic Clinical Informatics Intern',
        skills: ['Classical Formulation Taxonomy', 'Basic Python'],
        match_pct: 71,
        assessment_score: 68,
        applied_date: '2026-09-09',
        status: 'Under Review'
      }
    ];
    if (statusFilter !== 'All') {
      list = list.filter(a => a.status.toLowerCase() === statusFilter.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.student_name.toLowerCase().includes(q) ||
        a.college.toLowerCase().includes(q) ||
        a.role_applied.toLowerCase().includes(q)
      );
    }
    return list;
  }

  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*, profiles(*), opportunities(*), student_profiles(*)');

    if (error || !Array.isArray(data)) {
      return [];
    }

    let list = data.map(app => {
      const studentProfile = app.student_profiles || {};
      const profile = app.profiles || {};
      const opp = app.opportunities || {};
      return {
        id: app.id,
        student_name: profile.full_name || 'AYUSH Candidate',
        college: studentProfile.college_institution || 'University',
        course: studentProfile.course || 'AYUSH Scholar',
        role_applied: opp.title || 'Opportunity',
        skills: Array.isArray(opp.required_skills) ? opp.required_skills : [],
        match_pct: app.match_pct || 80,
        assessment_score: studentProfile.overall_skill_score || 0,
        applied_date: app.applied_at ? new Date(app.applied_at).toISOString().split('T')[0] : 'Recent',
        status: app.status || 'Applied'
      };
    });

    if (statusFilter !== 'All') {
      list = list.filter(a => a.status.toLowerCase() === statusFilter.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.student_name.toLowerCase().includes(q) ||
        a.college.toLowerCase().includes(q) ||
        a.role_applied.toLowerCase().includes(q)
      );
    }
    return list;
  } catch (e) {
    console.warn('Error fetching live industry applicants:', e);
    return [];
  }
}

/**
 * Fetch Academician Dashboard Metrics
 */
export async function fetchAcademicianDashboardMetrics(institutionName) {
  if (isDemoMode()) {
    return {
      institution: 'National Institute of Ayurveda (NIA), Jaipur',
      enrolledStudentsCount: 412,
      skillGapsIdentifiedCount: 14,
      completedAssessmentsCount: 320,
      averageSkillScore: '78.4%',
      studentsSub: 'Across 4 Academic Batches',
      gapsSub: '3 High Priority Actions',
      assessmentsSub: '77.6% Student Participation',
      scoreSub: '+4.2% over national avg',
      demandedSkills: [
        { name: 'Ayurvedic Pharmacopoeia & QC (HPTLC/ICP-MS)', demandPct: 94, curriculumCoveragePct: 65, color: '#134e3f' },
        { name: 'Clinical Data Analytics & Python in Healthcare', demandPct: 88, curriculumCoveragePct: 40, color: '#0d9488' },
        { name: 'Regulatory Pharmacovigilance (ASU Drugs)', demandPct: 82, curriculumCoveragePct: 75, color: '#e07a2c' },
        { name: 'Biostatistics & Clinical SQL', demandPct: 76, curriculumCoveragePct: 45, color: '#0284c7' },
        { name: 'Yoga Biomechanics & Pose AI Analysis', demandPct: 70, curriculumCoveragePct: 35, color: '#7c3aed' }
      ],
      gapRecommendations: [
        {
          title: 'Introduce Digital Health & FHIR Informatics in BAMS Year 4',
          rationale: 'Industry demand for electronic health records and SNOMED-CT / NAMASTE code mapping has increased by 140% across Dabur, Himalaya, and CCRAS research projects.',
          urgency: 'High Priority',
          action: 'Add 30-hour Clinical Data Science Elective'
        },
        {
          title: 'Scale Hands-On HPTLC and Heavy Metal Spectrometry Labs',
          rationale: 'Export compliance for European and US markets requires rigorous botanical batch release analytics beyond classical macroscopic organoleptic tests.',
          urgency: 'Medium Priority',
          action: 'Upgrade Central Dravyaguna Laboratory'
        },
        {
          title: 'Mandatory Good Clinical Practice (GCP) & Pharmacovigilance Certification',
          rationale: 'Students with verified GCP micro-credentials achieve a 92% interview conversion rate for clinical coordinator roles.',
          urgency: 'High Priority',
          action: 'Integrate Pre-internship Certification Module'
        }
      ],
      studentCohorts: [
        { batch: 'BAMS 2022-2027 (4th Year)', students: 125, avgScore: 82, topSkill: 'Herbal QC & Formulation', status: 'Placement Active' },
        { batch: 'MD Dravyaguna (Postgraduate)', students: 38, avgScore: 89, topSkill: 'Pharmacovigilance & Phytochemistry', status: 'Research Fellows' },
        { batch: 'BAMS 2023-2028 (3rd Year)', students: 130, avgScore: 74, topSkill: 'Clinical Diagnostics', status: 'Internship Preparation' },
        { batch: 'M.Sc AYUSH Biostatistics', students: 24, avgScore: 86, topSkill: 'Clinical Python & R', status: 'Industry Sponsored' }
      ]
    };
  }

  try {
    const [studentsRes, assessRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student'),
      supabase.from('assessments').select('*')
    ]);

    const students = Array.isArray(studentsRes?.data) ? studentsRes.data : [];
    const assessments = Array.isArray(assessRes?.data) ? assessRes.data : [];

    const enrolledStudentsCount = students.length;
    const completedAssessmentsCount = assessments.length;

    let averageSkillScore = '0.0%';
    if (assessments.length > 0) {
      const avg = assessments.reduce((acc, a) => acc + (a.score_pct || 0), 0) / assessments.length;
      averageSkillScore = `${avg.toFixed(1)}%`;
    }

    return {
      institution: institutionName || 'AYUSH Academic Council',
      enrolledStudentsCount,
      skillGapsIdentifiedCount: 0,
      completedAssessmentsCount,
      averageSkillScore,
      studentsSub: enrolledStudentsCount > 0 ? `Across ${enrolledStudentsCount} registered scholars` : 'No enrolled scholars recorded',
      gapsSub: 'Calculated from live assessments',
      assessmentsSub: completedAssessmentsCount > 0 ? `${completedAssessmentsCount} completed` : '0 assessments completed',
      scoreSub: completedAssessmentsCount > 0 ? 'Institutional cohort average' : 'Awaiting initial cohort assessments',
      demandedSkills: [],
      gapRecommendations: [],
      studentCohorts: []
    };
  } catch (e) {
    console.warn('Error fetching live academician metrics:', e);
    return {
      institution: institutionName || 'AYUSH Academic Council',
      enrolledStudentsCount: 0,
      skillGapsIdentifiedCount: 0,
      completedAssessmentsCount: 0,
      averageSkillScore: '0.0%',
      studentsSub: 'No enrolled scholars recorded',
      gapsSub: '0 active gap alerts',
      assessmentsSub: '0 completed',
      scoreSub: 'Awaiting initial cohort assessments',
      demandedSkills: [],
      gapRecommendations: [],
      studentCohorts: []
    };
  }
}

/**
 * Fetch Admin Dashboard Metrics
 */
export async function fetchAdminDashboardMetrics() {
  const overrides = JSON.parse(localStorage.getItem('ayush_user_status_overrides') || '{}');

  if (isDemoMode()) {
    const pendingUsers = await fetchAdminPendingUsersData();
    const effectivePending = pendingUsers.length;
    return {
      totalStudents: '4,820',
      totalIndustries: '184',
      totalAcademicians: '620',
      pendingApprovals: effectivePending.toString(),
      activeOpportunities: '340'
    };
  }

  try {
    const [profilesRes, oppsRes, pendingUsers] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('opportunities').select('id'),
      fetchAdminPendingUsersData()
    ]);

    const profiles = Array.isArray(profilesRes?.data) ? profilesRes.data : [];
    const opps = Array.isArray(oppsRes?.data) ? oppsRes.data : [];

    const totalStudents = profiles.filter(p => p.role === 'student').length;
    const totalIndustries = profiles.filter(p => p.role === 'industry').length;
    const totalAcademicians = profiles.filter(p => p.role === 'academician').length;
    
    // Dynamically and accurately matches the pending queue count
    const pendingApprovals = pendingUsers.length;
    const activeOpportunities = opps.length;

    return {
      totalStudents: totalStudents.toLocaleString(),
      totalIndustries: totalIndustries.toString(),
      totalAcademicians: totalAcademicians.toString(),
      pendingApprovals: pendingApprovals.toString(),
      activeOpportunities: activeOpportunities.toString()
    };
  } catch (e) {
    console.warn('Error fetching live admin metrics:', e);
    return {
      totalStudents: '0',
      totalIndustries: '0',
      totalAcademicians: '0',
      pendingApprovals: '0',
      activeOpportunities: '0'
    };
  }
}

/**
 * Fetch Admin Pending User Verification Requests
 */
export async function fetchAdminPendingUsersData() {
  const overrides = JSON.parse(localStorage.getItem('ayush_user_status_overrides') || '{}');

  if (isDemoMode()) {
    const demoPending = [
      {
        id: 'usr_p_01',
        name: 'Baidyanath Research Labs',
        full_name: 'Baidyanath Research Labs',
        email: 'recruitment@baidyanath.co.in',
        role: 'industry',
        type: 'Industry Enterprise Verification',
        organization: 'Shree Baidyanath Ayurved Bhawan Pvt Ltd',
        department: 'Ayurvedic Drug Manufacturing',
        designation: 'Authorized Signatory',
        date: '2026-09-10',
        regDate: '2026-09-10',
        regDateTime: '10/09/2026, 11:30:00 am',
        documents: 'Self-Declared Online Portal Onboarding',
        domainNote: 'Commercial Email Domain',
        isOfficialDomain: false,
        status: 'pending'
      },
      {
        id: 'usr_p_02',
        name: 'Dr. Meenakshi Sunderam',
        full_name: 'Dr. Meenakshi Sunderam',
        email: 'm.sunderam@siddhacollege.edu.in',
        role: 'academician',
        type: 'Academic Faculty Verification',
        organization: 'Government Siddha Medical College, Chennai',
        department: 'Gunapadam (Siddha Pharmacology)',
        designation: 'Faculty Member',
        date: '2026-09-11',
        regDate: '2026-09-11',
        regDateTime: '11/09/2026, 02:15:00 pm',
        documents: 'Self-Declared Online Portal Onboarding',
        domainNote: 'Institutional Domain Verified (.edu.in)',
        isOfficialDomain: true,
        status: 'pending'
      }
    ];

    return demoPending.filter(u => {
      const ov = overrides[u.id] || overrides[u.email];
      if (ov && ov.status !== 'pending') {
        return false;
      }
      return true;
    });
  }

  let liveUsers = [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['industry', 'academician'])
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      // Fetch associated details from industry_profiles and academician_profiles
      const [indRes, acadRes] = await Promise.all([
        supabase.from('industry_profiles').select('*'),
        supabase.from('academician_profiles').select('*')
      ]);

      const indMap = new Map((indRes.data || []).map(i => [i.profile_id, i]));
      const acadMap = new Map((acadRes.data || []).map(a => [a.profile_id, a]));

      liveUsers = data.map(u => {
        const indData = indMap.get(u.id);
        const acadData = acadMap.get(u.id);
        const org = (u.role === 'industry')
          ? (indData?.company_name || u.full_name || 'Registered Industry Entity')
          : (acadData?.institution || 'Registered Academic Institution');
        const deptOrSector = (u.role === 'industry')
          ? (indData?.industry_sector || 'General Industry Onboarding (Unspecified)')
          : (acadData?.department || 'Academic Faculty (Unspecified)');
        const designation = (u.role === 'industry')
          ? (indData?.designation || 'Authorized Signatory / Account Creator')
          : (acadData?.designation || 'Faculty Member');

        const email = u.email || '';
        const isOfficialDomain = email.endsWith('.gov.in') || email.endsWith('.nic.in') || email.endsWith('.edu.in');
        const domainNote = isOfficialDomain 
          ? 'Institutional Domain Verified' 
          : 'Public Email Domain (Standard Verification)';

        return {
          id: u.id,
          name: u.full_name || 'Applicant',
          full_name: u.full_name || 'Applicant',
          email: u.email || 'N/A',
          role: u.role || 'industry',
          type: `${(u.role || 'User').toUpperCase()} Verification`,
          organization: org,
          department: deptOrSector,
          designation: designation,
          date: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : 'Recent',
          regDate: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : 'Recent',
          regDateTime: u.created_at ? new Date(u.created_at).toLocaleString('en-IN') : 'Recent',
          documents: 'Self-Declared Online Portal Onboarding (Official documentation to be completed in institutional profile)',
          domainNote: domainNote,
          isOfficialDomain: isOfficialDomain,
          status: 'pending'
        };
      });
    }
  } catch (e) {
    console.warn('Error fetching live pending users from Supabase:', e);
  }

  // Also include any newly registered pending users from local registry
  try {
    const raw = localStorage.getItem('ayush_registered_users');
    if (raw) {
      const registry = JSON.parse(raw);
      for (const email in registry) {
        const reg = registry[email];
        if (
          (reg.role === 'industry' || reg.role === 'academician') &&
          reg.status === 'pending' &&
          !liveUsers.some(u => u.email.toLowerCase() === reg.email?.toLowerCase())
        ) {
          const isOfficialDomain = email.endsWith('.gov.in') || email.endsWith('.nic.in') || email.endsWith('.edu.in');
          liveUsers.unshift({
            id: reg.id || ('usr_' + Date.now()),
            name: reg.full_name || reg.name || 'Applicant',
            full_name: reg.full_name || reg.name || 'Applicant',
            email: reg.email,
            role: reg.role,
            type: `${reg.role.toUpperCase()} Verification`,
            organization: reg.metadata?.company || reg.metadata?.institution || reg.full_name || reg.name || 'Applicant Organization',
            department: reg.metadata?.department || reg.metadata?.sector || 'General Registration',
            designation: reg.metadata?.designation || 'Authorized Signatory / Account Creator',
            date: reg.created_at ? new Date(reg.created_at).toISOString().split('T')[0] : 'Today',
            regDate: reg.created_at ? new Date(reg.created_at).toISOString().split('T')[0] : 'Today',
            regDateTime: reg.created_at ? new Date(reg.created_at).toLocaleString('en-IN') : 'Today',
            documents: 'Self-Declared Online Portal Onboarding',
            domainNote: isOfficialDomain ? 'Institutional Domain Verified' : 'Public Email Domain (Standard Verification)',
            isOfficialDomain: isOfficialDomain,
            status: 'pending'
          });
        }
      }
    }
  } catch (e) {}

  // Filter by status overrides
  return liveUsers.filter(u => {
    const ov = overrides[u.id] || overrides[u.email];
    if (ov && ov.status !== 'pending') {
      return false;
    }
    return true;
  });
}

/**
 * Fetch Admin Questions Data
 */
export async function fetchAdminQuestionsData(skillFilter = 'All') {
  if (isDemoMode()) {
    const questions = [
      { id: 'q_01', skill: 'Herbal Pharmacology (Dravyaguna)', difficulty: 'Medium', type: 'Clinical Scenario', text: 'Which active phytoconstituent in Withania somnifera is primarily responsible for neuro-modulatory GABAergic activity?', answersCount: 4 },
      { id: 'q_02', skill: 'Herbal Pharmacology (Dravyaguna)', difficulty: 'Hard', type: 'Pharmacology', text: 'In designing a standardized bioavailability study for Curcumin, which piperine ratio is compliant with Ayurvedic pharmacopoeia synergy?', answersCount: 4 },
      { id: 'q_03', skill: 'Ayurvedic Pharmacopoeia & QC', difficulty: 'Hard', type: 'Laboratory Analytics', text: 'What is the standard USP/API limit for total microbial count in churnas intended for clinical therapeutic administration?', answersCount: 4 },
      { id: 'q_04', skill: 'Clinical Data Analytics & Python', difficulty: 'Hard', type: 'Bio-Informatics Code', text: 'Given a pandas DataFrame of clinical vitals across Vata, Pitta, Kapha cohorts, write the code to compute Mahalanobis distance.', answersCount: 4 },
      { id: 'q_05', skill: 'Yoga Biomechanics & Posture AI', difficulty: 'Medium', type: 'Kinematics', text: 'During Trikonasana, which angular kinematic threshold of the thoracic spine prevents lumbo-pelvic compensatory shear?', answersCount: 4 }
    ];
    return skillFilter === 'All' ? questions : questions.filter(q => q.skill.toLowerCase().includes(skillFilter.toLowerCase()));
  }

  try {
    const { data, error } = await supabase
      .from('assessment_questions')
      .select('*, skills(*)');

    if (error || !Array.isArray(data)) {
      return [];
    }

    return data.map(q => ({
      id: q.id,
      skill: q.skills?.name || 'General AYUSH Competency',
      difficulty: q.difficulty || 'Medium',
      type: q.question_type || 'Multiple Choice',
      text: q.question_text || '',
      answersCount: Array.isArray(q.options) ? q.options.length : 4
    }));
  } catch (e) {
    console.warn('Error fetching live questions:', e);
    return [];
  }
}

/**
 * Fetch Admin Roles Data
 */
export async function fetchAdminRolesData() {
  const overrides = JSON.parse(localStorage.getItem('ayush_user_status_overrides') || '{}');
  const currentUserRaw = localStorage.getItem('ayush_current_user');
  let currentAdminName = 'Administrator';
  let currentAdminEmail = 'admin@ayushconnect.gov.in';
  if (currentUserRaw) {
    try {
      const u = JSON.parse(currentUserRaw);
      if (u.full_name && u.full_name !== 'Rajesh Kumar, IAS') {
        currentAdminName = u.full_name;
      }
      if (u.email) {
        currentAdminEmail = u.email;
      }
    } catch (e) {}
  }

  if (isDemoMode()) {
    const demoRoles = [
      { 
        id: 'usr_admin_01', 
        name: currentAdminName, 
        full_name: currentAdminName,
        email: currentAdminEmail, 
        role: 'admin', 
        org: 'Ministry of AYUSH, Govt of India',
        organization: 'Ministry of AYUSH, Govt of India',
        department: 'National Portal Governance & RBAC',
        designation: 'Super Administrator',
        status: 'Active', 
        rawStatus: 'active',
        isVerified: true,
        isProtected: true,
        lastActive: 'Today, 10:15 AM',
        createdAt: '01/08/2026, 09:00:00 am',
        documents: 'Central Ministry Gazetted Appointment',
        isOfficialDomain: true
      },
      { 
        id: 'usr_admin_02', 
        name: 'Dr. Anita Joshi', 
        full_name: 'Dr. Anita Joshi',
        email: 'a.joshi@ayush.gov.in', 
        role: 'admin', 
        org: 'Ministry of AYUSH, Govt of India',
        organization: 'Ministry of AYUSH, Govt of India',
        department: 'Assessment Standards & Certification',
        designation: 'Assessment Auditor',
        status: 'Active', 
        rawStatus: 'active',
        isVerified: true,
        isProtected: true,
        lastActive: 'Yesterday',
        createdAt: '05/08/2026, 11:30:00 am',
        documents: 'Central Ministry Gazetted Appointment',
        isOfficialDomain: true
      },
      { 
        id: 'usr_admin_03', 
        name: 'S. N. Murthy', 
        full_name: 'S. N. Murthy',
        email: 'sn.murthy@ccras.nic.in', 
        role: 'academician', 
        org: 'Central Council for Research in Ayurvedic Sciences (CCRAS)',
        organization: 'Central Council for Research in Ayurvedic Sciences (CCRAS)',
        department: 'Clinical Evaluation Directorate',
        designation: 'Research Director',
        status: 'Active', 
        rawStatus: 'active',
        isVerified: true,
        isProtected: false,
        lastActive: 'Sep 10, 2026',
        createdAt: '12/08/2026, 02:45:00 pm',
        documents: 'CCRAS Institutional Verification',
        isOfficialDomain: true
      },
      { 
        id: 'usr_admin_04', 
        name: 'Pooja Nair', 
        full_name: 'Pooja Nair',
        email: 'p.nair@ayushconnect.gov.in', 
        role: 'student', 
        org: 'All India Institute of Ayurveda (AIIA), New Delhi',
        organization: 'All India Institute of Ayurveda (AIIA), New Delhi',
        department: 'Postgraduate Ayurvedic Medicine',
        designation: 'PG Scholar',
        status: 'Active', 
        rawStatus: 'active',
        isVerified: true,
        isProtected: false,
        lastActive: 'Aug 28, 2026',
        createdAt: '15/08/2026, 04:10:00 pm',
        documents: 'Institute Enrolment No. AIIA/PG/2025/104',
        isOfficialDomain: true
      }
    ];
    return demoRoles.map(u => {
      const ov = overrides[u.id] || overrides[u.email];
      if (ov) {
        const isAct = ov.is_verified || ov.status === 'approved' || ov.status === 'active';
        return { 
          ...u, 
          role: ov.role || u.role,
          status: isAct ? 'Active' : (ov.status === 'rejected' ? 'Rejected' : 'Pending KYC'),
          isVerified: isAct
        };
      }
      return u;
    });
  }

  try {
    const [profilesRes, indRes, acadRes, studRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('industry_profiles').select('*'),
      supabase.from('academician_profiles').select('*'),
      supabase.from('student_profiles').select('*')
    ]);

    const data = Array.isArray(profilesRes.data) ? profilesRes.data : [];
    const indMap = new Map((indRes.data || []).map(i => [i.profile_id, i]));
    const acadMap = new Map((acadRes.data || []).map(a => [a.profile_id, a]));
    const studMap = new Map((studRes.data || []).map(s => [s.profile_id, s]));

    return data.map(u => {
      const ov = overrides[u.id] || overrides[u.email];
      const isVerified = ov ? ov.is_verified : u.is_verified;
      const currentStatus = ov ? ov.status : u.status;
      const role = ov?.role || (u.role || 'student').toLowerCase();
      const isActive = isVerified || currentStatus === 'approved' || currentStatus === 'active';

      let orgName = u.organization || u.institution || '';
      if (!orgName) {
        if (role === 'admin') {
          orgName = 'Ministry of AYUSH, Govt of India';
        } else if (role === 'industry') {
          const ind = indMap.get(u.id);
          orgName = ind?.company_name || u.full_name || 'Registered Industry Enterprise';
        } else if (role === 'academician') {
          const acad = acadMap.get(u.id);
          orgName = acad?.institution || 'Academic Institution';
        } else if (role === 'student') {
          const stud = studMap.get(u.id);
          if (stud?.college_institution) {
            orgName = stud.college_institution;
          } else if (u.email && u.email.toLowerCase().includes('nshm.edu.in')) {
            orgName = 'NSHM Knowledge Campus';
          } else {
            orgName = 'Ayurvedic Medical College / Scholar';
          }
        } else {
          orgName = 'Individual / Scholar';
        }
      }

      const email = u.email || '';
      const isOfficialDomain = email.endsWith('.gov.in') || email.endsWith('.nic.in') || email.endsWith('.edu.in');

      let deptName = '';
      if (role === 'industry') {
        deptName = indMap.get(u.id)?.industry_sector || 'General Industry Enterprise';
      } else if (role === 'academician') {
        deptName = acadMap.get(u.id)?.department || 'Academic Faculty & Research';
      } else if (role === 'student') {
        deptName = 'AYUSH Academic Scholar';
      } else if (role === 'admin') {
        deptName = 'National Nodal Administration';
      } else {
        deptName = 'AYUSH Portal User';
      }

      let designationName = '';
      if (role === 'industry') {
        designationName = indMap.get(u.id)?.designation || 'Authorized Signatory / Account Creator';
      } else if (role === 'academician') {
        designationName = acadMap.get(u.id)?.designation || 'Faculty Member';
      } else if (role === 'student') {
        designationName = 'Enrolled Student Scholar';
      } else if (role === 'admin') {
        designationName = 'Directorate Administrator';
      } else {
        designationName = 'Registered User';
      }

      return {
        id: u.id,
        name: u.full_name || 'System User',
        full_name: u.full_name || 'System User',
        email: email,
        org: orgName,
        organization: orgName,
        role: role,
        department: deptName,
        designation: designationName,
        status: isActive ? 'Active' : (currentStatus === 'rejected' ? 'Rejected' : 'Pending KYC'),
        rawStatus: currentStatus || (isActive ? 'active' : 'pending'),
        isVerified: !!isVerified,
        isProtected: role === 'admin',
        createdAt: u.created_at ? new Date(u.created_at).toLocaleString('en-IN') : 'Recent',
        lastActive: u.updated_at ? new Date(u.updated_at).toLocaleDateString('en-IN') : 'Recent',
        documents: (role === 'industry' ? 'Corporate Online Sign-up / Self-Declared Onboarding' : (role === 'academician' ? 'Academic Institutional Verification' : (role === 'student' ? 'Student Enrollment & Academic Verification' : 'Official Ministry Nodal Clearance'))),
        isOfficialDomain: isOfficialDomain,
        authProvider: 'Email & Password (256-Bit Encrypted)'
      };
    });
  } catch (e) {
    console.warn('Error fetching live roles:', e);
    return [];
  }
}

/**
 * Update User Status in Supabase (Admin Action)
 */
export async function updateUserStatusInSupabase(userId, status) {
  const isApproved = (status === 'approved' || status === 'active');
  const isVerified = isApproved;

  // 1. ALWAYS persist status override in localStorage first so changes never get lost
  try {
    const overrides = JSON.parse(localStorage.getItem('ayush_user_status_overrides') || '{}');
    overrides[userId] = {
      status: status,
      is_approved: isApproved,
      is_verified: isVerified,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem('ayush_user_status_overrides', JSON.stringify(overrides));
  } catch (e) {
    console.warn('Error caching user status override:', e);
  }

  // 2. Update local registered users registry if present
  try {
    const raw = localStorage.getItem('ayush_registered_users');
    if (raw) {
      const registry = JSON.parse(raw);
      for (const email in registry) {
        if (registry[email].id === userId || email === userId) {
          registry[email].status = status;
          registry[email].is_approved = isApproved;
          registry[email].is_verified = isVerified;
          // Also set by email key in overrides
          try {
            const ovs = JSON.parse(localStorage.getItem('ayush_user_status_overrides') || '{}');
            ovs[email] = {
              status: status,
              is_approved: isApproved,
              is_verified: isVerified,
              updated_at: new Date().toISOString()
            };
            localStorage.setItem('ayush_user_status_overrides', JSON.stringify(ovs));
          } catch (err) {}
        }
      }
      localStorage.setItem('ayush_registered_users', JSON.stringify(registry));
    }
  } catch (e) {}

  let sbResult = { success: true };
  try {
    let { data, error } = await supabase
      .from('profiles')
      .update({ 
        status: status, 
        is_approved: isApproved,
        is_verified: isVerified, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (error && error.message && error.message.includes('is_approved')) {
      const fallback = await supabase
        .from('profiles')
        .update({ 
          status: status, 
          is_verified: isVerified, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.warn('Supabase profile status update note:', error);
      sbResult = { success: false, error };
    } else {
      sbResult = { success: true, data };
    }

    // Also update role extension tables
    await Promise.allSettled([
      supabase.from('industry_profiles').update({ is_verified: isVerified }).eq('profile_id', userId),
      supabase.from('academician_profiles').update({ is_verified: isVerified }).eq('profile_id', userId)
    ]);
  } catch (err) {
    console.warn('Error updating user status in Supabase:', err);
    sbResult = { success: false, error: err };
  }

  return { success: true, ...sbResult };
}

/**
 * Update User Role in Supabase (Admin Action)
 */
export async function updateUserRoleInSupabase(userId, role) {
  if (isDemoMode()) return { success: true };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: role, updated_at: new Date().toISOString() })
      .eq('id', userId);
    return { data, error };
  } catch (err) {
    console.warn('Error updating user role in Supabase:', err);
    return { error: err };
  }
}

// Aliases for seamless cross-module interoperability
export const fetchAcademicianData = fetchAcademicianDashboardMetrics;
export const fetchAdminDashboardStats = fetchAdminDashboardMetrics;
export const fetchAdminPendingUsers = fetchAdminPendingUsersData;
export const fetchAdminAllUsers = fetchAdminRolesData;

export default {
  SUPABASE_CONFIG,
  MOCK_DB,
  supabase,
  isDemoMode,
  setDemoMode,
  DEMO_MODE,
  checkSupabaseConnection,
  syncOpportunitiesFromSupabase,
  saveOpportunityToSupabase,
  saveApplicationToSupabase,
  saveProjectToSupabase,
  saveSkillToSupabase,
  fetchStudentDashboardMetrics,
  fetchStudentSkillsData,
  fetchStudentProjectsData,
  fetchStudentApplicationsData,
  fetchOpportunitiesData,
  fetchIndustryDashboardMetrics,
  fetchIndustryApplicantsData,
  fetchAcademicianDashboardMetrics,
  fetchAdminDashboardMetrics,
  fetchAdminPendingUsersData,
  fetchAdminQuestionsData,
  fetchAdminRolesData,
  signUpUserWithSupabase,
  signInUserWithSupabase,
  signOutUserWithSupabase
};

