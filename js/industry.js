/**
 * AYUSH CONNECT — Industry Portal Logic
 * SIH 2026: Recruiter Operations, Job Posting & Talent Pipeline
 */

import { 
  MOCK_DB, 
  isDemoMode,
  fetchIndustryDashboardMetrics,
  fetchIndustryApplicantsData,
  fetchOpportunitiesData,
  saveOpportunityToSupabase 
} from './supabase.js';
import { getCurrentUser, showToast } from './auth.js';

export const INDUSTRY_STATE = {
  activeOpportunitiesCount: 4,
  totalApplicantsCount: 28,
  shortlistedCount: 8,
  upcomingEventsCount: 2,
  applicants: [
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
      status: 'Interview' // Shortlisted, Interview, Selected, Rejected
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
  ],
  availableSkills: [
    'Herbal Pharmacology (Dravyaguna)',
    'Ayurvedic Pharmacopoeia & QC',
    'Clinical Data Analytics & Python',
    'Biostatistics & SQL',
    'Yoga Biomechanics & Posture AI',
    'Pharmacovigilance (ASU Drugs)',
    'HPTLC Fingerprinting',
    'Research Protocol Writing',
    'HL7/FHIR Clinical Standards',
    'Bioinformatics & Molecular Docking'
  ],
  selectedPostSkills: ['Herbal Pharmacology (Dravyaguna)', 'Clinical Data Analytics & Python']
};

/**
 * Initialize Industry Dashboard
 */
export async function initIndustryDashboard() {
  const user = getCurrentUser();

  const indGreeting = document.getElementById('industry-greeting');
  if (indGreeting) {
    const rawName = user?.full_name || (isDemoMode() ? 'Recruiter' : 'Industry Partner');
    const firstName = rawName.split(' ')[0];
    indGreeting.textContent = `Welcome back, ${firstName}!`;
  }

  const userNameEl = document.getElementById('user-name-display');
  if (userNameEl) {
    userNameEl.textContent = user?.full_name || (isDemoMode() ? 'Dr. Rajesh Sharma' : 'Industry Partner');
  }

  const companyEl = document.getElementById('industry-company-display');
  if (companyEl) {
    companyEl.textContent = user?.organization || user?.company || (isDemoMode() ? 'Himalaya Wellness Company' : 'AYUSH Enterprise');
  }

  // Fetch real or demo metrics
  const metrics = await fetchIndustryDashboardMetrics(user?.id);

  const oppCount = document.getElementById('ind-active-opps');
  const appCount = document.getElementById('ind-total-applicants');
  const shortCount = document.getElementById('ind-shortlisted');
  const eventCount = document.getElementById('ind-upcoming-events');

  if (oppCount) oppCount.textContent = metrics.activeOpportunitiesCount;
  if (appCount) appCount.textContent = metrics.totalApplicantsCount;
  if (shortCount) shortCount.textContent = metrics.shortlistedCount;
  if (eventCount) eventCount.textContent = metrics.upcomingEventsCount;

  const indActiveSub = document.getElementById('ind-active-sub');
  const indTotalSub = document.getElementById('ind-total-sub');
  const indShortSub = document.getElementById('ind-shortlisted-sub');
  const indEventsSub = document.getElementById('ind-events-sub');

  if (indActiveSub && metrics.activeSub) indActiveSub.textContent = metrics.activeSub;
  if (indTotalSub && metrics.totalSub) indTotalSub.textContent = metrics.totalSub;
  if (indShortSub && metrics.shortlistedSub) indShortSub.textContent = metrics.shortlistedSub;
  if (indEventsSub && metrics.eventsSub) indEventsSub.textContent = metrics.eventsSub;

  await renderRecentApplicants();
  await renderIndustryActivePostings();
}

/**
 * Render Industry Active Postings Cards
 */
export async function renderIndustryActivePostings(containerId = 'industry-active-postings-list') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const opps = await fetchOpportunitiesData();

  if (!opps || opps.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1.5rem; background: var(--bg-cream); border: 1px dashed var(--border-color); border-radius: var(--radius-md); color: var(--text-muted);">
        <div style="font-size: 2rem; color: var(--secondary-teal); margin-bottom: 0.5rem;"><i class="fa-solid fa-briefcase"></i></div>
        <div style="font-weight: 700; color: var(--primary-deep); font-size: 1.1rem;">No Active Postings Published</div>
        <div style="font-size: 0.85rem; margin: 0.25rem 0 1rem; max-width: 480px; margin-left: auto; margin-right: auto;">
          Publish your first internship, research fellowship, or job opportunity to reach qualified AYUSH candidates.
        </div>
        <a href="/industry/post-opportunity.html" class="btn btn-primary btn-sm"><i class="fa-solid fa-plus"></i> Post Your First Opening</a>
      </div>
    `;
    return;
  }

  container.innerHTML = opps.slice(0, 3).map(opp => `
    <div style="background: var(--bg-cream); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem; transition: border-color 0.2s;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem; flex-wrap: wrap;">
            <span class="badge badge-primary"><i class="fa-solid fa-briefcase"></i> ${opp.type || 'Full-Time Job'}</span>
            <span class="badge badge-teal"><i class="fa-solid fa-location-dot"></i> ${opp.location || 'On-site'}</span>
            <span class="badge badge-saffron"><i class="fa-solid fa-indian-rupee-sign"></i> ${opp.stipend || 'Competitive'}</span>
            <span class="badge badge-success"><i class="fa-solid fa-circle-dot"></i> Active</span>
          </div>
          <h3 style="font-size: 1.25rem; color: var(--primary-deep); margin: 0 0 0.35rem 0;">${opp.title}</h3>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">${opp.company_name || 'AYUSH Enterprise'} &bull; ${opp.eligibility || 'All Qualified Candidates'}</div>
        </div>

        <div style="display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;">
          <a href="/industry/applicants.html" class="btn btn-secondary btn-sm">
            <i class="fa-solid fa-users"></i> Review Applicants
          </a>
          <a href="/industry/post-opportunity.html" class="btn btn-outline-teal btn-sm" title="Edit Posting">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </a>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-secondary);">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Target Qualification</span>
          <strong style="color: var(--primary-deep);">${opp.eligibility || 'BAMS / AYUSH Degree'}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Primary Competencies</span>
          <strong style="color: var(--secondary-teal);">${(opp.required_skills || []).slice(0, 2).join(' • ') || 'Core AYUSH Skills'}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Application Deadline</span>
          <strong style="color: var(--text-primary);"><i class="fa-solid fa-calendar-day"></i> ${opp.deadline || 'Open'}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; text-transform: uppercase; font-weight: 700;">Openings</span>
          <strong style="color: #10b981;"><i class="fa-solid fa-circle-check"></i> ${opp.openings || 1} Position(s)</strong>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Render Recent Applicants Table
 */
/**
 * Render Recent Applicants Table
 */
export async function renderRecentApplicants(containerId = 'recent-applicants-table') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const applicants = await fetchIndustryApplicantsData('All', '', 'all', 'verified_first');

  if (!applicants || applicants.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2.5rem 1.5rem; color: var(--text-muted);">
          <div style="font-size: 1.75rem; color: var(--secondary-teal); margin-bottom: 0.5rem;"><i class="fa-solid fa-users-slash"></i></div>
          <div style="font-weight: 600; color: var(--primary-deep);">No Applications Received Yet</div>
          <div style="font-size: 0.85rem; margin-top: 0.25rem;">Post an opportunity or create an assessment challenge to attract verified AYUSH talent.</div>
          <a href="/industry/post-opportunity.html" class="btn btn-sm btn-primary" style="margin-top: 0.85rem;"><i class="fa-solid fa-plus"></i> Post Opportunity</a>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = applicants.slice(0, 4).map(app => `
    <tr>
      <td style="padding: 1.1rem 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div class="user-avatar-circle" style="width: 38px; height: 38px; font-size: 0.85rem; background: var(--primary-deep); color: #fff; flex-shrink: 0;">
            ${(app.student_name || 'Ayush').split(' ').map(n=>n[0]).join('')}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
              <span style="font-weight: 700; color: var(--primary-deep); font-size: 0.95rem;">${app.student_name}</span>
              ${app.is_verified ? `
                <span class="badge-verified verified-tooltip-wrapper">
                  <i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Verified
                  <i class="fa-solid fa-circle-info verified-tooltip-trigger" data-tooltip="This student is enrolled at a recognized AYUSH institution and has an accepted mentor from that institution's faculty." tabindex="0"></i>
                </span>
              ` : `
                <span class="badge-not-verified"><i class="fa-solid fa-circle-xmark" style="color: #94a3b8;"></i> Not Verified</span>
              `}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.3;">${app.college}</div>
          </div>
        </div>
      </td>
      <td style="padding: 1.1rem 1.25rem;">
        <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); display: block;">${app.role_applied}</span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${app.course}</span>
      </td>
      <td style="padding: 1.1rem 1.25rem;">
        <div class="match-score-badge" style="display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700;">
          <i class="fa-solid fa-star"></i> ${app.match_pct}% Match
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;"><i class="fa-solid fa-clipboard-check"></i> Score: ${app.assessment_score}/100</div>
      </td>
      <td style="padding: 1.1rem 1.25rem;">
        <span class="badge ${app.status === 'Interview' ? 'badge-saffron' : app.status === 'Selected' ? 'badge-success' : 'badge-primary'}">
          <i class="fa-solid ${app.status === 'Interview' ? 'fa-calendar-check' : app.status === 'Selected' ? 'fa-circle-check' : 'fa-hourglass-half'}"></i> ${app.status}
        </span>
      </td>
      <td style="padding: 1.1rem 1.25rem; text-align: right;">
        <button class="btn btn-sm btn-secondary" onclick="window.viewCandidateProfile('${app.id}')">
          <i class="fa-solid fa-user-check"></i> Profile
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * Render Full Applicants Table with Filters & Sorting (TASK 4 & TASK 5)
 */
export async function renderAllApplicants(statusFilter = 'All', search = '', verificationFilter = 'all', sortBy = 'verified_first') {
  const container = document.getElementById('all-applicants-table');
  if (!container) return;

  const list = await fetchIndustryApplicantsData(statusFilter, search, verificationFilter, sortBy);

  if (!list || list.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2.5rem; color: var(--text-muted);"><i class="fa-solid fa-magnifying-glass"></i> No applicants found matching your filter criteria.</td></tr>`;
    return;
  }

  container.innerHTML = list.map(app => `
    <tr>
      <td style="padding: 1.1rem 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div class="user-avatar-circle" style="width: 38px; height: 38px; font-size: 0.85rem; background: var(--primary-deep); color: #fff; flex-shrink: 0;">
            ${(app.student_name || 'Ayush').split(' ').map(n=>n[0]).join('')}
          </div>
          <div>
            <div style="font-weight: 700; color: var(--primary-deep); font-size: 0.95rem;">${app.student_name}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${app.college} &bull; ${app.course}</div>
            <div style="font-size: 0.75rem; font-family: monospace; color: var(--secondary-teal); font-weight: 600;">ID: ${app.candidate_id || 'AYU-STU-000001'}</div>
          </div>
        </div>
      </td>
      <td style="padding: 1.1rem 1.25rem;">
        ${app.is_verified ? `
          <span class="badge-verified verified-tooltip-wrapper">
            <i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Faculty Verified
            <i class="fa-solid fa-circle-info verified-tooltip-trigger" data-tooltip="This student is enrolled at a recognized AYUSH institution and has an accepted mentor from that institution's faculty." tabindex="0"></i>
          </span>
        ` : `
          <span class="badge-not-verified">
            <i class="fa-solid fa-circle-xmark" style="color: #94a3b8;"></i> Not Verified
          </span>
        `}
      </td>
      <td style="padding: 1.1rem 1.25rem;">
        <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary);">${app.role_applied}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem;">
          ${(app.skills || []).map(s => `<span class="badge badge-primary" style="font-size: 0.72rem; padding: 0.15rem 0.5rem;"><i class="fa-solid fa-tag"></i> ${s}</span>`).join('')}
        </div>
      </td>
      <td style="padding: 1.1rem 1.25rem;">
        <div class="match-score-badge" style="display: inline-flex; align-items: center; gap: 0.35rem;">
          <i class="fa-solid fa-star"></i> ${app.match_pct}% Match
        </div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;"><i class="fa-solid fa-clipboard-check"></i> Assessment: ${app.assessment_score}/100</div>
      </td>
      <td style="padding: 1.1rem 1.25rem; font-size: 0.85rem; color: var(--text-secondary);"><i class="fa-solid fa-calendar-day"></i> ${app.applied_date}</td>
      <td style="padding: 1.1rem 1.25rem;">
        <span class="badge ${app.status === 'Interview' ? 'badge-saffron' : app.status === 'Selected' ? 'badge-success' : 'badge-primary'}">
          <i class="fa-solid ${app.status === 'Interview' ? 'fa-calendar-check' : app.status === 'Selected' ? 'fa-circle-check' : 'fa-hourglass-half'}"></i> ${app.status}
        </span>
      </td>
      <td style="padding: 1.1rem 1.25rem;">
        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
          <button class="btn btn-sm btn-secondary" onclick="window.viewCandidateProfile('${app.id}')"><i class="fa-solid fa-id-card"></i> Profile</button>
          <button class="btn btn-sm btn-outline-teal" onclick="window.updateApplicantStatus('${app.id}', 'Interview')"><i class="fa-solid fa-calendar"></i> Interview</button>
          <button class="btn btn-sm btn-primary" onclick="window.updateApplicantStatus('${app.id}', 'Selected')"><i class="fa-solid fa-check"></i> Offer</button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Update Applicant Status
 */
window.updateApplicantStatus = function(appId, newStatus) {
  const applicant = INDUSTRY_STATE.applicants.find(a => a.id === appId);
  if (applicant) {
    applicant.status = newStatus;
    showToast(`Status for ${applicant.student_name} updated to: ${newStatus}`, 'success');
  } else {
    showToast(`Status updated to: ${newStatus}`, 'success');
  }
  renderAllApplicants();
  renderRecentApplicants();
};

window.viewCandidateProfile = function(appId) {
  fetchIndustryApplicantsData('All', '', 'all', 'default').then(applicants => {
    const app = applicants.find(a => a.id === appId);
    if (!app) return;

    const modal = document.getElementById('industry-candidate-modal');
    const body = document.getElementById('industry-modal-body');

    if (modal && body) {
      body.innerHTML = `
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
          <div class="user-avatar-circle" style="width: 58px; height: 58px; font-size: 1.25rem; background: var(--primary-deep); color: #fff;">
            ${(app.student_name || 'Scholar').split(' ').map(n=>n[0]).join('')}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <h2 style="font-size: 1.35rem; color: var(--primary-deep); margin: 0;">${app.student_name}</h2>
              ${app.is_verified ? `
                <span class="badge-verified verified-tooltip-wrapper">
                  <i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Faculty Verified
                  <i class="fa-solid fa-circle-info verified-tooltip-trigger" data-tooltip="This student is enrolled at a recognized AYUSH institution and has an accepted mentor from that institution's faculty." tabindex="0"></i>
                </span>
              ` : `
                <span class="badge-not-verified"><i class="fa-solid fa-circle-xmark" style="color: #94a3b8;"></i> Not Verified</span>
              `}
            </div>
            <div style="font-size: 0.82rem; font-family: monospace; color: var(--secondary-teal); font-weight: 700; margin-top: 0.2rem;">
              Candidate ID: ${app.candidate_id || 'AYU-STU-000001'}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.15rem;">
              ${app.college} &bull; ${app.course}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
          <div style="background: var(--bg-cream); padding: 0.85rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Role Applied</div>
            <div style="font-weight: 700; color: var(--primary-deep); font-size: 0.95rem; margin-top: 0.2rem;">
              ${app.role_applied}
            </div>
          </div>
          <div style="background: var(--bg-cream); padding: 0.85rem; border-radius: 8px;">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Evaluation Score</div>
            <div style="font-weight: 800; color: var(--secondary-teal); font-size: 1.1rem; margin-top: 0.2rem;">
              ${app.match_pct}% Fit &bull; ${app.assessment_score}/100
            </div>
          </div>
        </div>

        <div style="margin-bottom: 1.25rem;">
          <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem;">
            Verified Competencies &amp; Lab Standards
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
            ${(app.skills || []).map(s => `<span class="badge badge-teal" style="font-size: 0.78rem;"><i class="fa-solid fa-tag"></i> ${s}</span>`).join('')}
          </div>
        </div>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 0.85rem; font-size: 0.82rem; color: #166534;">
          <i class="fa-solid fa-shield-check"></i> <strong>Institutional Verification:</strong> ${app.is_verified ? 'This candidate is authenticated by institutional AYUSH faculty with verified academic credentials.' : 'Institutional mentorship verification pending. Candidate can be requested to complete verification.'}
        </div>
      `;
      modal.style.display = 'flex';
      return;
    }

    // Fallback alert
    alert(`Candidate: ${app.student_name}\nVerification: ${app.is_verified ? 'Faculty Verified' : 'Not Verified'}\nInstitution: ${app.college}\nDegree: ${app.course}\nRole Applied: ${app.role_applied}\nAssessment Score: ${app.assessment_score}/100\nMatch Score: ${app.match_pct}%\nVerified Skills:\n- ${(app.skills || []).join('\n- ')}`);
  });
};

/**
 * Initialize Post Opportunity Page
 */
export function initPostOpportunityPage() {
  const skillTagBox = document.getElementById('selectable-skills-container');
  if (skillTagBox) {
    skillTagBox.innerHTML = INDUSTRY_STATE.availableSkills.map(sk => {
      const isSelected = INDUSTRY_STATE.selectedPostSkills.includes(sk);
      return `
        <div class="selectable-skill-pill ${isSelected ? 'selected' : ''}" onclick="window.togglePostSkill('${sk}')">
          ${isSelected ? '✓ ' : '+ '} ${sk}
        </div>
      `;
    }).join('');
  }

  const postForm = document.getElementById('post-opportunity-form');
  if (postForm) {
    postForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('post-title').value;
      const type = document.getElementById('post-type').value;
      const stipend = document.getElementById('post-stipend').value;
      const location = document.getElementById('post-location').value;
      const deadline = document.getElementById('post-deadline').value;

      const user = getCurrentUser();
      const companyName = user?.organization || user?.company || (isDemoMode() ? 'Himalaya Wellness Company' : 'AYUSH Partner Enterprise');
      const companyLogoText = companyName.split(' ')[0].toUpperCase();

      const newOpp = {
        id: 'opp_' + Date.now(),
        title,
        company_name: companyName,
        company_logo_text: companyLogoText,
        location,
        type,
        stipend: stipend || 'Competitive Stipend',
        deadline: deadline || '2026-11-30',
        description: 'New opportunity published via AYUSH CONNECT portal.',
        required_skills: [...INDUSTRY_STATE.selectedPostSkills],
        minimum_level: 'Intermediate',
        eligibility: 'BAMS / Life Sciences graduates',
        openings: 2,
        posted_date: new Date().toISOString().split('T')[0]
      };

      await saveOpportunityToSupabase(newOpp);
      showToast(`Opportunity "${title}" successfully published to AYUSH CONNECT!`, 'success');
      setTimeout(() => {
        window.location.href = '/industry/dashboard.html';
      }, 1000);
    });
  }
}

window.togglePostSkill = function(skill) {
  if (INDUSTRY_STATE.selectedPostSkills.includes(skill)) {
    INDUSTRY_STATE.selectedPostSkills = INDUSTRY_STATE.selectedPostSkills.filter(s => s !== skill);
  } else {
    INDUSTRY_STATE.selectedPostSkills.push(skill);
  }
  initPostOpportunityPage();
};

export default {
  INDUSTRY_STATE,
  initIndustryDashboard,
  renderRecentApplicants,
  renderAllApplicants,
  initPostOpportunityPage
};
