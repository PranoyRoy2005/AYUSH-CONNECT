/**
 * AYUSH CONNECT — Academician Portal Logic
 * SIH 2026: Academic & Institutional Analytics, Skill Gaps & Curriculum Alignments
 */

import { getCurrentUser, setCurrentUser, computeUserInitials, showToast, syncUserHeader } from './auth.js';
import { isDemoMode, fetchAcademicianData, uploadUserAvatar, supabase } from './supabase.js';

export const ACADEMIC_STATE = {
  institution: 'National Institute of Ayurveda (NIA), Jaipur',
  enrolledStudentsCount: 412,
  skillGapsIdentifiedCount: 14,
  completedAssessmentsCount: 320,
  averageSkillScore: '78.4%',
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
      title: 'National AYUSH Research Methodology & Pharmacovigilance Module',
      rationale: 'Students with verified research micro-credentials achieve high interview conversion rates for research coordinator roles.',
      urgency: 'High Priority',
      action: 'Integrate Pre-internship Research Module'
    }
  ],
  studentCohorts: [
    { batch: 'BAMS 2022-2027 (4th Year)', students: 125, avgScore: 82, topSkill: 'Herbal QC & Formulation', status: 'Placement Active' },
    { batch: 'MD Dravyaguna (Postgraduate)', students: 38, avgScore: 89, topSkill: 'Pharmacovigilance & Phytochemistry', status: 'Research Fellows' },
    { batch: 'BAMS 2023-2028 (3rd Year)', students: 130, avgScore: 74, topSkill: 'Clinical Diagnostics', status: 'Internship Preparation' },
    { batch: 'M.Sc AYUSH Biostatistics', students: 24, avgScore: 86, topSkill: 'Clinical Python & R', status: 'Industry Sponsored' }
  ]
};

export async function initAcademicianDashboard() {
  const user = getCurrentUser();
  const data = await fetchAcademicianData(user?.id);

  const instName = user?.college || user?.organization || data.institution;

  const instEl = document.getElementById('acad-institution-name');
  if (instEl) instEl.textContent = instName;

  const userNameEl = document.getElementById('user-name-display');
  if (userNameEl) {
    userNameEl.textContent = user?.full_name || (isDemoMode() ? 'Prof. Ananya Sen' : 'Academic Dean');
  }

  // Sync Sidebar Avatar and Credentials
  const sideAvatar = document.getElementById('sidebar-avatar-display');
  const sideName = document.getElementById('acad-sidebar-name') || document.getElementById('acad-user-name');
  const sideDesig = document.getElementById('acad-sidebar-desig');

  const savedPhoto = localStorage.getItem('ayush_candidate_photo') || user?.avatar_url;
  const initials = computeUserInitials(user?.full_name, 'academician');

  if (sideAvatar) {
    if (savedPhoto && (savedPhoto.startsWith('http') || savedPhoto.startsWith('data:image'))) {
      sideAvatar.innerHTML = `<img src="${savedPhoto}" alt="${user?.full_name || 'User'}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.onerror=null; this.parentElement.textContent='${initials}';">`;
    } else {
      sideAvatar.textContent = initials;
    }
  }

  if (sideName && user?.full_name) sideName.textContent = user.full_name;
  if (sideDesig && user?.designation) sideDesig.textContent = user.designation;

  const studentsEl = document.getElementById('acad-students-count');
  const gapsEl = document.getElementById('acad-gaps-count');
  const assessEl = document.getElementById('acad-assessments-count');
  const avgScoreEl = document.getElementById('acad-avg-score');

  if (studentsEl) studentsEl.textContent = data.enrolledStudentsCount;
  if (gapsEl) gapsEl.textContent = data.skillGapsIdentifiedCount;
  if (assessEl) assessEl.textContent = data.completedAssessmentsCount;
  if (avgScoreEl) avgScoreEl.textContent = data.averageSkillScore;

  const studentsSub = document.getElementById('acad-students-sub');
  const gapsSub = document.getElementById('acad-gaps-sub');
  const assessSub = document.getElementById('acad-assessments-sub');
  const avgSub = document.getElementById('acad-avg-sub');

  if (studentsSub && data.studentsSub) studentsSub.textContent = data.studentsSub;
  if (gapsSub && data.gapsSub) gapsSub.textContent = data.gapsSub;
  if (assessSub && data.assessmentsSub) assessSub.textContent = data.assessmentsSub;
  if (avgSub && data.scoreSub) avgSub.textContent = data.scoreSub;

  renderSkillDemandBars(data.demandedSkills);
  renderCurriculumGaps(data.gapRecommendations);
  renderCohortTable(data.studentCohorts);
}

function renderSkillDemandBars(demandedSkills = ACADEMIC_STATE.demandedSkills) {
  const container = document.getElementById('acad-skill-demand-container');
  if (!container) return;

  if (!demandedSkills || demandedSkills.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <i class="fa-solid fa-chart-line" style="font-size: 1.5rem; color: var(--secondary-teal); margin-bottom: 0.5rem; display: block;"></i>
        No industry demand telemetry logged for this institution yet.
      </div>
    `;
    return;
  }

  container.innerHTML = demandedSkills.map(s => `
    <div class="demand-bar-row" style="margin-bottom: 1.15rem;">
      <div class="demand-meta">
        <span style="color: var(--primary-deep); font-weight: 700;">${s.name}</span>
        <span>
          <span style="color: ${s.color}; font-weight: 800;">${s.demandPct}% Industry Demand</span>
          <span style="color: var(--text-muted); font-size: 0.78rem;">(${s.curriculumCoveragePct}% Covered)</span>
        </span>
      </div>
      <div class="demand-bar-bg" style="display: flex;">
        <div style="width: ${s.demandPct}%; background: ${s.color}; height: 100%; border-radius: var(--radius-pill);"></div>
      </div>
    </div>
  `).join('');
}

function renderCurriculumGaps(gapRecommendations = ACADEMIC_STATE.gapRecommendations) {
  const container = document.getElementById('acad-gap-recommendations');
  if (!container) return;

  if (!gapRecommendations || gapRecommendations.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <i class="fa-solid fa-circle-check" style="font-size: 1.5rem; color: var(--secondary-teal); margin-bottom: 0.5rem; display: block;"></i>
        All curriculum pathways are currently aligned with AYUSH industry benchmarks.
      </div>
    `;
    return;
  }

  container.innerHTML = gapRecommendations.map(gap => `
    <div class="gap-recommendation-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.35rem;">
        <h4 style="font-size: 0.98rem; color: var(--primary-deep); font-weight: 700;">${gap.title}</h4>
        <span class="badge ${gap.urgency.includes('High') ? 'badge-saffron' : 'badge-teal'}">${gap.urgency}</span>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.6rem;">${gap.rationale}</p>
      <div style="font-size: 0.8rem; color: var(--primary-deep); font-weight: 600;">
        <i class="fa-solid fa-thumbtack" style="color: var(--accent-saffron); margin-right: 0.35rem;"></i> Recommended Institutional Action: <span style="color: var(--secondary-dark);">${gap.action}</span>
      </div>
    </div>
  `).join('');
}

function renderCohortTable(studentCohorts = ACADEMIC_STATE.studentCohorts) {
  const container = document.getElementById('acad-cohort-table');
  if (!container) return;

  if (!studentCohorts || studentCohorts.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);"><i class="fa-solid fa-graduation-cap"></i> No student cohorts registered yet.</td></tr>`;
    return;
  }

  container.innerHTML = studentCohorts.map(c => `
    <tr>
      <td><strong style="color: var(--primary-deep);">${c.batch}</strong></td>
      <td>${c.students} Students</td>
      <td>
        <span style="color: var(--secondary-teal); font-weight: 700;">${c.avgScore}/100</span>
      </td>
      <td><span class="badge badge-primary">${c.topSkill}</span></td>
      <td><span class="badge badge-success">${c.status}</span></td>
    </tr>
  `).join('');
}

/* ==========================================================================
   ACADEMICIAN PORTFOLIO & SPECIFICATIONS LOGIC
   ========================================================================== */

export const DEFAULT_ACADEMICIAN_PORTFOLIO = {
  id: 'usr_acad_01',
  full_name: 'Dr. V. S. Ramaswamy',
  academic_title: 'Prof. Dr.',
  designation: 'Dean of Research & Academic Affairs',
  department: 'Department of Dravyaguna & Clinical Pharmacology',
  institution: 'National Institute of Ayurveda (NIA), Jaipur',
  system_of_medicine: 'Ayurveda & Integrative Pharmacology',
  faculty_id: 'AYU-FAC-2026-8941',
  experience_years: '18+ Years',
  highest_degree: 'Ph.D. in Phytochemistry & Botanical QC (BHU)',
  qualifications: [
    { degree: 'Ph.D. in Phytochemistry & Botanical QC', institute: 'Banaras Hindu University (BHU), Varanasi', year: '2012', honors: 'Dean’s Research Gold Medal' },
    { degree: 'M.D. (Ayurveda) in Dravyaguna Vigyana', institute: 'IPGT&RA, Gujarat Ayurved University, Jamnagar', year: '2007', honors: 'First Class with Distinction' },
    { degree: 'B.A.M.S. (Ayurvedacharya)', institute: 'Kerala University of Health Sciences', year: '2003', honors: 'University Gold Medalist' }
  ],
  is_verified: true,
  email: 'vs.ramaswamy@nia.edu.in',
  phone: '+91 (0141) 2635812',
  office_location: "Dean's Office, Academic Wing, 3rd Floor, NIA Campus, Jorawar Singh Gate, Amer Road, Jaipur 302002",
  bio: "Dedicated to bridging ancient classical Ayurvedic pharmacopoeia with modern molecular chromatography, metabolomics, and evidence-based reverse pharmacology. Over the past 18 years, I have supervised 14 Postgraduate theses, 6 Doctoral scholars, and directed multi-centric clinical trials recognized by the Ministry of AYUSH and WHO Collaborating Centres. My academic vision centers on empowering the next generation of AYUSH scholars with high-precision analytical acumen, clinical biostatistics, and regulatory compliance standards.",
  specializations: [
    'HPTLC Fingerprinting & Phytochemical Profiling',
    'Ayurvedic Pharmacopoeia of India (API) Monograph Development',
    'Heavy Metal & Pesticide Residue QC (ICP-MS)',
    'Reverse Pharmacology & ASU Clinical Trial Protocols',
    'Traditional Knowledge Digital Library (TKDL) Prior Art',
    'ASU Pharmacovigilance & Adverse Drug Reaction Monitoring',
    'NCISM Competency-Based Curriculum Design'
  ],
  courses_taught: [
    'Advanced Dravyaguna Vigyana (Postgraduate MD Yr 1 & 2)',
    'AYUSH Research Methodology, Biostatistics & GCP (Ph.D. Coursework)',
    'Ayurvedic Pharmacopoeia & Standardization (BAMS Final Year)'
  ],
  scholars_guided: '14 Postgraduates & 6 Ph.D. Scholars',
  orcid_id: '0000-0002-1849-9214',
  google_scholar_url: 'https://scholar.google.com/citations?user=ayush_ramaswamy_2026',
  researchgate_url: 'https://researchgate.net/profile/VS-Ramaswamy',
  linkedin_url: 'https://linkedin.com/in/dr-vs-ramaswamy-ayush',
  avatar_url: null,
  publications: [
    {
      id: 'pub_01',
      title: 'HPTLC-Densitometric Quantification of Withanolide A and Withaferin A in Commercial Formulations of Ashwagandha (Withania somnifera)',
      journal: 'Journal of Ayurveda and Integrative Medicine (Elsevier)',
      year: '2025',
      doi: '10.1016/j.jaim.2025.100842',
      citations: 38,
      impact_factor: '2.8'
    },
    {
      id: 'pub_02',
      title: 'Safety and Heavy Metal Profile of Classical Bhasma Preparations: A 90-Day Repeated Dose Toxicity Evaluation in Wistar Rats',
      journal: 'Phytomedicine (Elsevier)',
      year: '2024',
      doi: '10.1016/j.phymed.2024.155120',
      citations: 54,
      impact_factor: '6.7'
    },
    {
      id: 'pub_03',
      title: 'Integrating FHIR and NAMASTE Terminologies into Electronic Health Records for AYUSH Teaching Hospitals',
      journal: 'International Journal of Medical Informatics',
      year: '2023',
      doi: '10.1016/j.ijmedinf.2023.105210',
      citations: 29,
      impact_factor: '4.9'
    },
    {
      id: 'pub_04',
      title: 'Botanical Quality Standards for Himalayan Medicinal Plants: Monograph Review on Picrorhiza kurroa (Kutki)',
      journal: 'Indian Council of Medical Research (ICMR) Bulletin',
      year: '2022',
      doi: '10.5530/pj.2022.14.88',
      citations: 19,
      impact_factor: '1.9'
    }
  ],
  research_projects: [
    {
      id: 'grant_01',
      title: 'National Multi-Centric EMR Grant: Standardization and Metabolomic Fingerprinting of Endangered Himalayan Medicinal Herbs',
      sponsor: 'Ministry of AYUSH (Extra-Mural Research Scheme)',
      role: 'Principal Investigator (PI)',
      duration: '2024–2027',
      status: 'Active'
    },
    {
      id: 'grant_02',
      title: 'Evaluation of Polyherbal Formulation NIA-DIA-04 in Pre-Diabetic Cohorts: Phase II Double-Blind Randomized Controlled Trial',
      sponsor: 'CCRAS & Industry Research Consortium',
      role: 'Co-Principal Investigator',
      duration: '2023–2025',
      status: 'Active'
    },
    {
      id: 'grant_03',
      title: 'Establishment of High-Throughput LC-MS/MS Botanical Identification Facility at NIA Jaipur',
      sponsor: 'Central Council for Research in Ayurvedic Sciences (CCRAS)',
      role: 'Project Coordinator',
      duration: '2022–2024',
      status: 'Completed'
    }
  ],
  awards: [
    { title: 'National Dhanwantari Ayurveda Research Award', issuer: 'Ministry of AYUSH, Govt. of India', year: '2024' },
    { title: 'Outstanding Faculty Mentorship Award', issuer: 'National Institute of Ayurveda, Jaipur', year: '2023' },
    { title: 'Member, National Board of Studies & Syllabus Committee', issuer: 'NCISM, New Delhi', year: '2022–Present' }
  ]
};

/**
 * Fetch full academician portfolio data merging Supabase tables, local cache and defaults.
 */
export async function fetchAcademicianPortfolioData(userId) {
  const user = getCurrentUser() || {};
  const effectiveId = userId || user.id || 'usr_acad_01';
  const cacheKey = `ayush_academician_portfolio_${effectiveId}`;
  
  let cached = null;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) cached = JSON.parse(raw);
  } catch (e) {}

  let sbProfile = null;
  let sbAcadProfile = null;

  if (effectiveId && !String(effectiveId).startsWith('usr_')) {
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', effectiveId).maybeSingle();
      if (p) sbProfile = p;

      const { data: ap } = await supabase.from('academician_profiles').select('*').eq('profile_id', effectiveId).maybeSingle();
      if (ap) sbAcadProfile = ap;
    } catch (err) {
      console.warn('Note on live academician profile fetch:', err);
    }
  }

  // Merge priority: Supabase Live > Local Cached Edits > User Object > Default Portfolio
  const merged = {
    ...DEFAULT_ACADEMICIAN_PORTFOLIO,
    ...(cached || {}),
    ...(user || {}),
    ...(sbProfile || {}),
    ...(sbAcadProfile ? {
      institution: sbAcadProfile.institution || cached?.institution || user.institution || DEFAULT_ACADEMICIAN_PORTFOLIO.institution,
      designation: sbAcadProfile.designation || cached?.designation || user.designation || DEFAULT_ACADEMICIAN_PORTFOLIO.designation,
      department: sbAcadProfile.department || cached?.department || user.department || DEFAULT_ACADEMICIAN_PORTFOLIO.department,
      is_verified: sbAcadProfile.is_verified ?? true
    } : {})
  };

  // Ensure arrays are preserved
  merged.specializations = (cached && cached.specializations) || merged.specializations || DEFAULT_ACADEMICIAN_PORTFOLIO.specializations;
  merged.qualifications = (cached && cached.qualifications) || merged.qualifications || DEFAULT_ACADEMICIAN_PORTFOLIO.qualifications;
  merged.publications = (cached && cached.publications) || merged.publications || DEFAULT_ACADEMICIAN_PORTFOLIO.publications;
  merged.research_projects = (cached && cached.research_projects) || merged.research_projects || DEFAULT_ACADEMICIAN_PORTFOLIO.research_projects;
  merged.awards = (cached && cached.awards) || merged.awards || DEFAULT_ACADEMICIAN_PORTFOLIO.awards;

  // Resolve avatar URL
  const savedPhoto = localStorage.getItem('ayush_candidate_photo');
  merged.avatar_url = savedPhoto || sbProfile?.avatar_url || user.avatar_url || cached?.avatar_url || null;

  return merged;
}

/**
 * Save academician portfolio data to local storage and sync to Supabase.
 */
export async function saveAcademicianPortfolioData(userId, portfolioData) {
  const user = getCurrentUser() || {};
  const effectiveId = userId || user.id || 'usr_acad_01';
  const cacheKey = `ayush_academician_portfolio_${effectiveId}`;

  // 1. Save in local cache
  try {
    localStorage.setItem(cacheKey, JSON.stringify(portfolioData));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }

  // 2. Update current user in auth session
  const updatedUser = {
    ...user,
    full_name: portfolioData.full_name || user.full_name,
    designation: portfolioData.designation || user.designation,
    institution: portfolioData.institution || user.institution,
    department: portfolioData.department || user.department,
    phone: portfolioData.phone || user.phone,
    avatar_url: portfolioData.avatar_url || user.avatar_url
  };
  setCurrentUser(updatedUser);

  // 3. Persist to Supabase if real user ID
  if (effectiveId && !String(effectiveId).startsWith('usr_')) {
    try {
      // Update profiles
      await supabase.from('profiles').update({
        full_name: portfolioData.full_name,
        phone: portfolioData.phone,
        linkedin_url: portfolioData.linkedin_url,
        updated_at: new Date().toISOString()
      }).eq('id', effectiveId);

      // Update or upsert academician_profiles
      await supabase.from('academician_profiles').upsert({
        profile_id: effectiveId,
        institution: portfolioData.institution,
        designation: portfolioData.designation,
        department: portfolioData.department,
        updated_at: new Date().toISOString()
      }, { onConflict: 'profile_id' });
    } catch (err) {
      console.warn('Note on Supabase academician sync:', err);
    }
  }

  return portfolioData;
}

/**
 * Initialize the Academician Portfolio page
 */
export async function initAcademicianPortfolio() {
  const user = getCurrentUser();
  const portfolio = await fetchAcademicianPortfolioData(user?.id);

  // Render specifications on page
  renderAcademicianProfileHeader(portfolio);
  renderAcademicianSpecifications(portfolio);
  renderAcademicianPublications(portfolio.publications);
  renderAcademicianGrants(portfolio.research_projects);
  renderAcademicianCompletion(portfolio);

  // Bind Photo Upload & Avatar interactions
  bindAcademicianPhotoUpload(user, portfolio);

  // Bind Modals
  bindAcademicianModals(user, portfolio);
}

/**
 * Render Header Banner with Name, Title, Institution, Verification & Avatar
 */
function renderAcademicianProfileHeader(portfolio) {
  const nameEl = document.getElementById('acad-card-name');
  if (nameEl) nameEl.textContent = portfolio.full_name || 'Prof. Dr. Academician';

  const titleEl = document.getElementById('acad-designation-badge');
  if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-graduation-cap" style="color: var(--secondary-teal);"></i> ${portfolio.designation || 'Dean of Research'} &bull; ${portfolio.department || 'Ayurvedic Pharmacology'}`;
  }

  const instEl = document.getElementById('acad-institution-badge');
  if (instEl) {
    instEl.innerHTML = `<i class="fa-solid fa-building-columns"></i> ${portfolio.institution || 'National Institute of Ayurveda'}`;
  }

  const idEl = document.getElementById('acad-faculty-id-display');
  if (idEl) idEl.textContent = portfolio.faculty_id || 'AYU-FAC-2026-8941';

  // Sidebar sync
  const sideName = document.getElementById('acad-sidebar-name');
  if (sideName) sideName.textContent = portfolio.full_name;

  const sideDesig = document.getElementById('acad-sidebar-desig');
  if (sideDesig) sideDesig.textContent = portfolio.designation || 'Dean / Faculty';
}

/**
 * Render All Detailed Specification Cards
 */
function renderAcademicianSpecifications(portfolio) {
  // Bio
  const bioEl = document.getElementById('acad-display-bio');
  if (bioEl) bioEl.textContent = portfolio.bio || 'Academician specifications statement.';

  // Institutional & Teaching Specs
  const specFields = {
    'spec-highest-degree': portfolio.highest_degree || 'Ph.D. in AYUSH Medicine',
    'spec-experience': portfolio.experience_years || '18+ Years',
    'spec-department': portfolio.department || 'Department of Dravyaguna',
    'spec-system': portfolio.system_of_medicine || 'Ayurveda',
    'spec-institution': portfolio.institution || 'National Institute of Ayurveda',
    'spec-scholars': portfolio.scholars_guided || '14 Postgraduates & 6 Ph.D. Scholars',
    'spec-email': portfolio.email || 'faculty@nia.edu.in',
    'spec-phone': portfolio.phone || '+91 (0141) 2635812',
    'spec-office': portfolio.office_location || "Dean's Office, Academic Block, NIA Jaipur",
    'spec-orcid': portfolio.orcid_id || '0000-0002-1849-9214'
  };

  for (const [id, val] of Object.entries(specFields)) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // Links
  const scholarLink = document.getElementById('spec-scholar-link');
  if (scholarLink) {
    scholarLink.href = portfolio.google_scholar_url || '#';
    scholarLink.textContent = portfolio.google_scholar_url ? 'View Google Scholar Profile' : 'Not Linked';
  }

  const linkedinLink = document.getElementById('spec-linkedin-link');
  if (linkedinLink) {
    linkedinLink.href = portfolio.linkedin_url || '#';
    linkedinLink.textContent = portfolio.linkedin_url ? 'View LinkedIn Profile' : 'Not Linked';
  }

  const researchGateLink = document.getElementById('spec-researchgate-link');
  if (researchGateLink) {
    researchGateLink.href = portfolio.researchgate_url || '#';
    researchGateLink.textContent = portfolio.researchgate_url ? 'View ResearchGate' : 'Not Linked';
  }

  // Specialization Badges
  const specContainer = document.getElementById('acad-specializations-container');
  if (specContainer) {
    const specs = Array.isArray(portfolio.specializations) ? portfolio.specializations : [];
    if (specs.length === 0) {
      specContainer.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">No specializations logged yet.</span>`;
    } else {
      specContainer.innerHTML = specs.map((s, idx) => {
        const colors = ['spec-badge', 'spec-badge-teal', 'spec-badge-saffron', 'spec-badge-purple'];
        const chosen = colors[idx % colors.length];
        return `<span class="spec-badge ${chosen}"><i class="fa-solid fa-certificate"></i> ${s}</span>`;
      }).join(' ');
    }
  }

  // Courses Taught
  const coursesContainer = document.getElementById('acad-courses-container');
  if (coursesContainer) {
    const courses = Array.isArray(portfolio.courses_taught) ? portfolio.courses_taught : [];
    coursesContainer.innerHTML = courses.map(c => `
      <div style="padding: 0.6rem 0.85rem; background: #fafaf9; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
        <i class="fa-solid fa-book-open" style="color: var(--secondary-teal);"></i>
        <strong>${c}</strong>
      </div>
    `).join('');
  }

  // Qualifications Timeline
  const qualContainer = document.getElementById('acad-qualifications-container');
  if (qualContainer) {
    const quals = Array.isArray(portfolio.qualifications) ? portfolio.qualifications : [];
    qualContainer.innerHTML = quals.map(q => `
      <div style="display: flex; gap: 0.75rem; align-items: flex-start; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.75rem;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-subtle); display: flex; align-items: center; justify-content: center; color: var(--primary-deep); flex-shrink: 0;">
          <i class="fa-solid fa-user-graduate" style="font-size: 0.85rem;"></i>
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 700; color: var(--primary-deep); font-size: 0.9rem;">${q.degree}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${q.institute} &bull; <strong style="color: var(--secondary-teal);">${q.year}</strong></div>
          ${q.honors ? `<div style="font-size: 0.75rem; color: #b45309; font-weight: 600; margin-top: 0.15rem;"><i class="fa-solid fa-award"></i> ${q.honors}</div>` : ''}
        </div>
      </div>
    `).join('');
  }
}

/**
 * Render Peer-Reviewed Publications with Add/Edit/Delete
 */
export function renderAcademicianPublications(publications = []) {
  const container = document.getElementById('acad-publications-container');
  const countBadge = document.getElementById('acad-publications-count');
  if (countBadge) countBadge.textContent = `${publications.length} Papers`;
  if (!container) return;

  if (publications.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted); background: #fafaf9; border-radius: 8px; border: 1px dashed var(--border-color);">
        <i class="fa-solid fa-newspaper" style="font-size: 1.75rem; color: var(--secondary-teal); margin-bottom: 0.5rem; display: block;"></i>
        No research papers listed yet. Click "Add Publication" to feature your peer-reviewed work.
      </div>
    `;
    return;
  }

  container.innerHTML = publications.map((pub, idx) => `
    <div class="publication-item">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 260px;">
          <div style="font-weight: 700; color: var(--primary-deep); font-size: 0.95rem; line-height: 1.4;">
            ${pub.title}
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.25rem;">
            <i class="fa-solid fa-book-bookmark" style="color: var(--secondary-teal); margin-right: 0.3rem;"></i>
            <strong>${pub.journal}</strong> &bull; <span>${pub.year}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
          ${pub.citations ? `<span class="badge badge-teal" title="Citations count"><i class="fa-solid fa-quote-right"></i> ${pub.citations} Citations</span>` : ''}
          ${pub.impact_factor ? `<span class="badge badge-saffron" title="Impact Factor">IF: ${pub.impact_factor}</span>` : ''}
          <button type="button" class="btn btn-xs btn-outline-danger" onclick="window.deletePublication('${pub.id || idx}')" title="Delete publication" style="padding: 0.25rem 0.5rem; color: #ef4444; border: 1px solid #fecaca; background: #fff5f5; border-radius: 4px; cursor: pointer;">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
      ${pub.doi ? `
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">
          <span>DOI / Link:</span>
          <a href="https://doi.org/${pub.doi.replace(/^https?:\/\/doi.org\//, '')}" target="_blank" rel="noopener noreferrer" style="color: var(--secondary-teal); text-decoration: underline; font-family: monospace;">
            ${pub.doi} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.7rem;"></i>
          </a>
        </div>
      ` : ''}
    </div>
  `).join('');
}

/**
 * Render Research Grants & Projects
 */
export function renderAcademicianGrants(grants = []) {
  const container = document.getElementById('acad-grants-container');
  const countBadge = document.getElementById('acad-grants-count');
  if (countBadge) countBadge.textContent = `${grants.length} Grants`;
  if (!container) return;

  if (grants.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted); background: #fafaf9; border-radius: 8px; border: 1px dashed var(--border-color);">
        <i class="fa-solid fa-hand-holding-dollar" style="font-size: 1.75rem; color: var(--primary-deep); margin-bottom: 0.5rem; display: block;"></i>
        No research grants or clinical trials recorded yet. Click "Add Project / Grant" to log your funded research.
      </div>
    `;
    return;
  }

  container.innerHTML = grants.map((g, idx) => `
    <div class="grant-item">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 260px;">
          <h4 style="font-size: 0.98rem; color: var(--primary-deep); font-weight: 700; margin: 0 0 0.35rem 0;">${g.title}</h4>
          <div style="font-size: 0.82rem; color: var(--text-secondary); display: flex; gap: 1rem; flex-wrap: wrap;">
            <span><i class="fa-solid fa-landmark" style="color: var(--accent-saffron);"></i> Sponsoring Agency: <strong>${g.sponsor}</strong></span>
            <span><i class="fa-solid fa-user-tag" style="color: var(--secondary-teal);"></i> Role: <strong>${g.role}</strong></span>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0; display: flex; align-items: center; gap: 0.5rem;">
          <span class="badge ${g.status === 'Active' ? 'badge-teal' : 'badge-primary'}">${g.duration} &bull; ${g.status}</span>
          <button type="button" class="btn btn-xs btn-outline-danger" onclick="window.deleteGrant('${g.id || idx}')" title="Delete grant" style="padding: 0.25rem 0.5rem; color: #ef4444; border: 1px solid #fecaca; background: #fff5f5; border-radius: 4px; cursor: pointer;">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Render Dynamic Profile Completion Score & Checklist
 */
function renderAcademicianCompletion(portfolio) {
  let score = 0;
  const checks = {
    identity: false,
    photo: false,
    academic: false,
    specs: false,
    publications: false,
    grants: false
  };

  if (portfolio.full_name && portfolio.email) { score += 20; checks.identity = true; }
  if (portfolio.avatar_url) { score += 20; checks.photo = true; }
  if (portfolio.institution && portfolio.department && portfolio.designation) { score += 20; checks.academic = true; }
  if (portfolio.specializations && portfolio.specializations.length > 0) { score += 15; checks.specs = true; }
  if (portfolio.publications && portfolio.publications.length > 0) { score += 15; checks.publications = true; }
  if (portfolio.research_projects && portfolio.research_projects.length > 0) { score += 10; checks.grants = true; }

  const numEl = document.getElementById('acad-completion-num');
  const barEl = document.getElementById('acad-completion-bar');
  if (numEl) numEl.textContent = `${score}%`;
  if (barEl) barEl.style.width = `${score}%`;

  const checklistMap = {
    'step-acad-identity': checks.identity,
    'step-acad-photo': checks.photo,
    'step-acad-institution': checks.academic,
    'step-acad-specs': checks.specs,
    'step-acad-pubs': checks.publications,
    'step-acad-grants': checks.grants
  };

  for (const [id, isDone] of Object.entries(checklistMap)) {
    const el = document.getElementById(id);
    if (el) {
      const icon = el.querySelector('i');
      if (icon) {
        icon.className = isDone ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle';
        icon.style.color = isDone ? '#10b981' : 'var(--text-muted)';
      }
    }
  }
}

/**
 * Bind Photo Upload, Live Cropping/Preview & Supabase Avatars Sync
 */
function bindAcademicianPhotoUpload(user, portfolio) {
  const fileInput = document.getElementById('acad-photo-input');
  const photoImg = document.getElementById('acad-photo-img');
  const fallback = document.getElementById('acad-avatar-initials');
  const removeBtn = document.getElementById('btn-remove-acad-photo');
  const sidebarAvatar = document.getElementById('sidebar-avatar-display');

  const initials = computeUserInitials(portfolio.full_name || user?.full_name, 'academician');
  if (fallback) fallback.textContent = initials;

  function updateAvatarVisuals(url) {
    if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
      if (photoImg) {
        photoImg.src = url;
        photoImg.style.display = 'block';
      }
      if (fallback) fallback.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'inline-flex';
      if (sidebarAvatar) {
        sidebarAvatar.innerHTML = `<img src="${url}" alt="${portfolio.full_name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.onerror=null; this.parentElement.textContent='${initials}';">`;
      }
    } else {
      if (photoImg) {
        photoImg.src = '';
        photoImg.style.display = 'none';
      }
      if (fallback) fallback.style.display = 'block';
      if (removeBtn) removeBtn.style.display = 'none';
      if (sidebarAvatar) sidebarAvatar.textContent = initials;
    }
  }

  // Initial load
  updateAvatarVisuals(portfolio.avatar_url);

  if (photoImg) {
    photoImg.onerror = function() {
      console.warn('Academician avatar failed to load, falling back to initials');
      updateAvatarVisuals(null);
    };
  }

  // File input change handler
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        showToast('Please upload a valid image file (JPEG, PNG, WebP).', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('Image size exceeds 10MB limit.', 'error');
        return;
      }

      try {
        showToast('Uploading profile image to Supabase avatars...', 'info');
        const uploadRes = await uploadUserAvatar(user?.id || portfolio.id, file);
        const publicUrl = uploadRes?.publicUrl;

        if (publicUrl) {
          portfolio.avatar_url = publicUrl;
          await saveAcademicianPortfolioData(user?.id || portfolio.id, portfolio);
          updateAvatarVisuals(publicUrl);
          renderAcademicianCompletion(portfolio);
          showToast('Profile image updated successfully across AYUSH Connect!', 'success');
          if (typeof syncUserHeader === 'function') syncUserHeader();
        }
      } catch (err) {
        console.error('Academician photo upload error:', err);
        showToast('Photo upload error: ' + (err.message || 'Storage error'), 'error');
      }
    });
  }

  // Remove Photo handler
  window.removeAcademicianPhoto = async function() {
    localStorage.removeItem('ayush_candidate_photo');
    portfolio.avatar_url = null;
    await saveAcademicianPortfolioData(user?.id || portfolio.id, portfolio);
    updateAvatarVisuals(null);
    renderAcademicianCompletion(portfolio);
    showToast('Profile photo removed.', 'info');
    if (typeof syncUserHeader === 'function') syncUserHeader();
  };
}

/**
 * Bind Specifications Editing Modal and Action Handlers
 */
function bindAcademicianModals(user, portfolio) {
  // 1. EDIT SPECIFICATIONS MODAL
  window.openAcademicianEditModal = function() {
    const modal = document.getElementById('acad-edit-modal-backdrop');
    if (!modal) return;

    // Populate modal inputs with current specs
    document.getElementById('edit-acad-fullname').value = portfolio.full_name || '';
    document.getElementById('edit-acad-designation').value = portfolio.designation || '';
    document.getElementById('edit-acad-dept').value = portfolio.department || '';
    document.getElementById('edit-acad-institution').value = portfolio.institution || '';
    document.getElementById('edit-acad-system').value = portfolio.system_of_medicine || 'Ayurveda';
    document.getElementById('edit-acad-exp').value = portfolio.experience_years || '';
    document.getElementById('edit-acad-degree').value = portfolio.highest_degree || '';
    document.getElementById('edit-acad-scholars').value = portfolio.scholars_guided || '';
    document.getElementById('edit-acad-faculty-id').value = portfolio.faculty_id || '';
    document.getElementById('edit-acad-email').value = portfolio.email || '';
    document.getElementById('edit-acad-phone').value = portfolio.phone || '';
    document.getElementById('edit-acad-office').value = portfolio.office_location || '';
    document.getElementById('edit-acad-orcid').value = portfolio.orcid_id || '';
    document.getElementById('edit-acad-scholar-url').value = portfolio.google_scholar_url || '';
    document.getElementById('edit-acad-linkedin-url').value = portfolio.linkedin_url || '';
    document.getElementById('edit-acad-researchgate-url').value = portfolio.researchgate_url || '';
    document.getElementById('edit-acad-bio').value = portfolio.bio || '';
    document.getElementById('edit-acad-specs').value = (portfolio.specializations || []).join(', ');

    modal.classList.add('active');
  };

  window.closeAcademicianEditModal = function() {
    const modal = document.getElementById('acad-edit-modal-backdrop');
    if (modal) modal.classList.remove('active');
  };

  window.saveAcademicianSpecifications = async function() {
    const fullName = document.getElementById('edit-acad-fullname').value.trim();
    if (!fullName) {
      showToast('Please enter your full academic name.', 'warning');
      return;
    }

    portfolio.full_name = fullName;
    portfolio.designation = document.getElementById('edit-acad-designation').value.trim();
    portfolio.department = document.getElementById('edit-acad-dept').value.trim();
    portfolio.institution = document.getElementById('edit-acad-institution').value.trim();
    portfolio.system_of_medicine = document.getElementById('edit-acad-system').value.trim();
    portfolio.experience_years = document.getElementById('edit-acad-exp').value.trim();
    portfolio.highest_degree = document.getElementById('edit-acad-degree').value.trim();
    portfolio.scholars_guided = document.getElementById('edit-acad-scholars').value.trim();
    portfolio.faculty_id = document.getElementById('edit-acad-faculty-id').value.trim();
    portfolio.email = document.getElementById('edit-acad-email').value.trim();
    portfolio.phone = document.getElementById('edit-acad-phone').value.trim();
    portfolio.office_location = document.getElementById('edit-acad-office').value.trim();
    portfolio.orcid_id = document.getElementById('edit-acad-orcid').value.trim();
    portfolio.google_scholar_url = document.getElementById('edit-acad-scholar-url').value.trim();
    portfolio.linkedin_url = document.getElementById('edit-acad-linkedin-url').value.trim();
    portfolio.researchgate_url = document.getElementById('edit-acad-researchgate-url').value.trim();
    portfolio.bio = document.getElementById('edit-acad-bio').value.trim();

    const rawSpecs = document.getElementById('edit-acad-specs').value;
    portfolio.specializations = rawSpecs.split(',').map(s => s.trim()).filter(Boolean);

    await saveAcademicianPortfolioData(user?.id || portfolio.id, portfolio);

    // Refresh UI
    renderAcademicianProfileHeader(portfolio);
    renderAcademicianSpecifications(portfolio);
    renderAcademicianCompletion(portfolio);

    window.closeAcademicianEditModal();
    showToast('Academician specifications updated and saved to database!', 'success');
  };

  // 2. ADD PUBLICATION MODAL
  window.openAddPublicationModal = function() {
    const modal = document.getElementById('acad-pub-modal-backdrop');
    if (!modal) return;
    document.getElementById('pub-input-title').value = '';
    document.getElementById('pub-input-journal').value = '';
    document.getElementById('pub-input-year').value = new Date().getFullYear().toString();
    document.getElementById('pub-input-doi').value = '';
    document.getElementById('pub-input-citations').value = '';
    document.getElementById('pub-input-if').value = '';
    modal.classList.add('active');
  };

  window.closeAddPublicationModal = function() {
    const modal = document.getElementById('acad-pub-modal-backdrop');
    if (modal) modal.classList.remove('active');
  };

  window.saveAcademicianPublication = async function() {
    const title = document.getElementById('pub-input-title').value.trim();
    const journal = document.getElementById('pub-input-journal').value.trim();
    const year = document.getElementById('pub-input-year').value.trim() || '2026';
    const doi = document.getElementById('pub-input-doi').value.trim();
    const citations = parseInt(document.getElementById('pub-input-citations').value.trim() || '0', 10);
    const impactFactor = document.getElementById('pub-input-if').value.trim();

    if (!title || !journal) {
      showToast('Please enter both publication title and journal name.', 'warning');
      return;
    }

    const newPub = {
      id: 'pub_' + Date.now(),
      title,
      journal,
      year,
      doi,
      citations,
      impact_factor: impactFactor || null
    };

    if (!Array.isArray(portfolio.publications)) portfolio.publications = [];
    portfolio.publications.unshift(newPub);

    await saveAcademicianPortfolioData(user?.id || portfolio.id, portfolio);
    renderAcademicianPublications(portfolio.publications);
    renderAcademicianCompletion(portfolio);
    window.closeAddPublicationModal();
    showToast('Publication added to your academic portfolio!', 'success');
  };

  window.deletePublication = async function(id) {
    if (!confirm('Are you sure you want to remove this publication from your portfolio?')) return;
    portfolio.publications = (portfolio.publications || []).filter((p, idx) => p.id !== id && String(idx) !== String(id));
    await saveAcademicianPortfolioData(user?.id || portfolio.id, portfolio);
    renderAcademicianPublications(portfolio.publications);
    renderAcademicianCompletion(portfolio);
    showToast('Publication removed.', 'info');
  };

  // 3. ADD GRANT / RESEARCH PROJECT MODAL
  window.openAddGrantModal = function() {
    const modal = document.getElementById('acad-grant-modal-backdrop');
    if (!modal) return;
    document.getElementById('grant-input-title').value = '';
    document.getElementById('grant-input-sponsor').value = '';
    document.getElementById('grant-input-role').value = 'Principal Investigator (PI)';
    document.getElementById('grant-input-duration').value = '2025–2028';
    document.getElementById('grant-input-status').value = 'Active';
    modal.classList.add('active');
  };

  window.closeAddGrantModal = function() {
    const modal = document.getElementById('acad-grant-modal-backdrop');
    if (modal) modal.classList.remove('active');
  };

  window.saveAcademicianGrant = async function() {
    const title = document.getElementById('grant-input-title').value.trim();
    const sponsor = document.getElementById('grant-input-sponsor').value.trim();
    const role = document.getElementById('grant-input-role').value.trim() || 'Principal Investigator (PI)';
    const duration = document.getElementById('grant-input-duration').value.trim() || '2026–2028';
    const status = document.getElementById('grant-input-status').value || 'Active';

    if (!title || !sponsor) {
      showToast('Please specify project title and sponsoring agency.', 'warning');
      return;
    }

    const newGrant = {
      id: 'grant_' + Date.now(),
      title,
      sponsor,
      role,
      duration,
      status
    };

    if (!Array.isArray(portfolio.research_projects)) portfolio.research_projects = [];
    portfolio.research_projects.unshift(newGrant);

    await saveAcademicianPortfolioData(user?.id || portfolio.id, portfolio);
    renderAcademicianGrants(portfolio.research_projects);
    renderAcademicianCompletion(portfolio);
    window.closeAddGrantModal();
    showToast('Funded research grant added to your portfolio!', 'success');
  };

  window.deleteGrant = async function(id) {
    if (!confirm('Are you sure you want to remove this research project from your portfolio?')) return;
    portfolio.research_projects = (portfolio.research_projects || []).filter((g, idx) => g.id !== id && String(idx) !== String(id));
    await saveAcademicianPortfolioData(user?.id || portfolio.id, portfolio);
    renderAcademicianGrants(portfolio.research_projects);
    renderAcademicianCompletion(portfolio);
    showToast('Research project removed.', 'info');
  };
}

export default {
  ACADEMIC_STATE,
  initAcademicianDashboard,
  DEFAULT_ACADEMICIAN_PORTFOLIO,
  fetchAcademicianPortfolioData,
  saveAcademicianPortfolioData,
  initAcademicianPortfolio
};
