/**
 * AYUSH CONNECT — Student Portal Logic
 * SIH 2026: Career Pathway, Skill Taxonomy & Application Tracker
 */

import { getCurrentUser, showToast, computeUserInitials } from './auth.js';
import { 
  MOCK_DB, 
  isDemoMode, 
  fetchStudentDashboardMetrics, 
  fetchStudentSkillsData, 
  fetchStudentProjectsData, 
  fetchStudentApplicationsData,
  fetchOpportunitiesData,
  calculateMatch,
  saveProjectToSupabase,
  saveSkillToSupabase
} from './supabase.js';

export const STUDENT_STATE = {
  profileCompletion: 78,
  skillScore: 82,
  applicationsCount: 6,
  recommendationsCount: 12,
  skills: [
    { id: 'sk_01', name: 'Herbal Pharmacology (Dravyaguna)', category: 'Domain / Technical', level: 'Advanced', pct: 92, blocks: 9 },
    { id: 'sk_02', name: 'Ayurvedic Pharmacopoeia & QC', category: 'Domain / Technical', level: 'Advanced', pct: 88, blocks: 9 },
    { id: 'sk_03', name: 'Clinical Data Analytics & Python', category: 'Technical Skills', level: 'Intermediate', pct: 78, blocks: 7 },
    { id: 'sk_04', name: 'Yoga Biomechanics & Posture AI', category: 'Technical Skills', level: 'Intermediate', pct: 72, blocks: 7 },
    { id: 'sk_05', name: 'Biostatistics & SQL', category: 'Technical Skills', level: 'Intermediate', pct: 65, blocks: 6 },
    { id: 'sk_06', name: 'Pharmacovigilance (ASU Drugs)', category: 'Regulatory / Clinical', level: 'Intermediate', pct: 70, blocks: 7 },
    { id: 'sk_07', name: 'Clinical Communication & Patient Counseling', category: 'Soft Skills', level: 'Advanced', pct: 90, blocks: 9 },
    { id: 'sk_08', name: 'Research Methodology & Protocol Writing', category: 'Soft Skills', level: 'Advanced', pct: 85, blocks: 8 }
  ],
  skillsToImprove: [
    { name: 'Biostatistics & SQL', current: 'Intermediate (65%)', target: 'Advanced (85%+)', reason: 'Crucial for clinical trial EDC data management at Dabur & CCRAS' },
    { name: 'Regulatory Affairs (USFDA Botanical Guidance)', current: 'Beginner (45%)', target: 'Intermediate', reason: 'High demand in export-oriented AYUSH manufacturers like Himalaya' },
    { name: 'Bioinformatics & Molecular Docking', current: 'Novice (30%)', target: 'Intermediate', reason: 'Required for advanced herbal phytocompound target prediction' }
  ]
};

/**
 * Initialize Student Dashboard
 */
export async function initStudentDashboard() {
  const user = getCurrentUser();
  const greetingEl = document.getElementById('student-greeting');
  if (greetingEl) {
    const rawName = user?.full_name || (isDemoMode() ? 'Ayush' : 'Student');
    const firstName = rawName.split(' ')[0];
    greetingEl.textContent = `Welcome back, ${firstName}!`;
  }

  const userNameEl = document.getElementById('user-name-display');
  if (userNameEl) {
    userNameEl.textContent = user?.full_name || (isDemoMode() ? 'Ayush Sharma' : 'Student Scholar');
  }
  const userAvatarSide = document.getElementById('user-avatar');
  if (userAvatarSide) {
    const initials = computeUserInitials(user?.full_name, user?.role);
    const savedPhoto = localStorage.getItem('ayush_candidate_photo') || user?.avatar_url;
    if (savedPhoto && (savedPhoto.startsWith('data:image') || savedPhoto.startsWith('http://') || savedPhoto.startsWith('https://'))) {
      userAvatarSide.innerHTML = `<img src="${savedPhoto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      userAvatarSide.textContent = initials;
    }
  }

  // Fetch metrics: from live Supabase in production, or isolated mock in demo mode
  const metrics = await fetchStudentDashboardMetrics(user?.id);

  // Populate counters
  setMetric('metric-profile-completion', `${metrics.profileCompletion}%`);
  setMetric('metric-skill-score', `${metrics.skillScore}/100`);
  setMetric('metric-applications', `${metrics.applicationsCount}`);
  setMetric('metric-recommendations', `${metrics.recommendationsCount}`);

  // Update subtitles if elements exist
  const subRank = document.getElementById('metric-sub-rank');
  if (subRank && metrics.rankText) subRank.textContent = metrics.rankText;
  const subApps = document.getElementById('metric-sub-apps');
  if (subApps && metrics.interviewAppsText) subApps.textContent = metrics.interviewAppsText;
  const subRecs = document.getElementById('metric-sub-recs');
  if (subRecs && metrics.matchScoreText) subRecs.textContent = metrics.matchScoreText;

  // Animate progress bars
  const progressBar = document.getElementById('profile-progress-bar');
  if (progressBar) {
    setTimeout(() => {
      progressBar.style.width = `${metrics.profileCompletion}%`;
    }, 200);
  }

  // Initialize Candidate Photo Upload Section
  initCandidatePhoto(user);

  // Render Top Matched Opportunities
  await renderStudentTopOpps(user?.id);

  // Render Recent Applications Pipeline
  await renderStudentRecentPipeline(user?.id);

  // Render Targeted Skills to Improve
  await renderStudentSkillsToImprove(user?.id);

  // Render Journey Steps
  renderStudentJourneySteps(metrics);

  // Live listeners for automatic dashboard refresh
  if (typeof window !== 'undefined' && !window._ayushDashboardListenersBound) {
    window._ayushDashboardListenersBound = true;
    const refreshDashboard = async () => {
      const u = getCurrentUser();
      const updatedMetrics = await fetchStudentDashboardMetrics(u?.id);
      setMetric('metric-profile-completion', `${updatedMetrics.profileCompletion}%`);
      setMetric('metric-skill-score', `${updatedMetrics.skillScore}/100`);
      setMetric('metric-applications', `${updatedMetrics.applicationsCount}`);
      setMetric('metric-recommendations', `${updatedMetrics.recommendationsCount}`);
      renderStudentJourneySteps(updatedMetrics);
      await renderStudentTopOpps(u?.id);
      await renderStudentRecentPipeline(u?.id);
      await renderStudentSkillsToImprove(u?.id);
    };

    window.addEventListener('ayush:skills-updated', refreshDashboard);
    window.addEventListener('ayush:application-submitted', refreshDashboard);
  }
}

/**
 * Render Top Matched Opportunities on Student Dashboard
 */
export async function renderStudentTopOpps(userId) {
  const container = document.getElementById('student-top-matched-opps');
  if (!container) return;

  const opps = await fetchOpportunitiesData();

  if (!opps || opps.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.75rem; text-align: center; color: var(--text-muted); background: var(--bg-cream); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
        <i class="fa-solid fa-compass" style="font-size: 1.75rem; color: var(--secondary-teal); margin-bottom: 0.5rem; display: block;"></i>
        <strong style="color: var(--primary-deep); font-size: 0.95rem; display: block;">No Opportunity Matches Found</strong>
        <p style="font-size: 0.82rem; margin: 0.25rem 0 0.75rem;">Log more skills or take the assessment to unlock automated industry matches.</p>
        <a href="/student/skill-profile.html" class="btn btn-sm btn-primary">Update Skills</a>
      </div>
    `;
    return;
  }

  // Calculate real match percentages for each opportunity
  const scoredOpps = [];
  for (const opp of opps) {
    const matchRes = await calculateMatch(userId, opp.id);
    scoredOpps.push({
      ...opp,
      matchPct: matchRes.match_percentage,
      matchedSkills: matchRes.matched
    });
  }

  // Sort by match percentage descending
  scoredOpps.sort((a, b) => b.matchPct - a.matchPct);

  // Take top 2 opportunities
  container.innerHTML = scoredOpps.slice(0, 2).map((opp, idx) => {
    const skillsText = opp.matchedSkills && opp.matchedSkills.length > 0
      ? opp.matchedSkills.slice(0, 2).map(s => typeof s === 'string' ? s : s.name).join(' • ')
      : ((opp.required_skills || []).slice(0, 2).join(' • ') || 'Core Competencies');

    return `
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: ${idx === 0 ? '0.85rem' : '0'}; background: var(--bg-cream);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span class="badge ${idx === 0 ? 'badge-teal' : 'badge-primary'}">${opp.company_name || 'AYUSH Enterprise'}</span>
            <h4 style="color: var(--primary-dark); font-size: 1.05rem; margin-top: 0.25rem;">${opp.title}</h4>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
              <i class="fa-solid fa-location-dot"></i> ${opp.location || 'Pan-India'} &bull; ${opp.stipend || 'Competitive'}
            </div>
          </div>
          <span class="match-score-badge"><i class="fa-solid fa-star"></i> ${opp.matchPct}% Match</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.85rem; font-size: 0.8rem;">
          <span style="color: #166534; font-weight: 600;"><i class="fa-solid fa-check"></i> ${skillsText}</span>
          <a href="/student/recommendations.html" class="btn btn-sm btn-accent">Apply (${opp.matchPct}%)</a>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Student Recent Applications Pipeline on Dashboard
 */
export async function renderStudentRecentPipeline(userId) {
  const container = document.getElementById('student-recent-apps-pipeline');
  const trackLink = document.getElementById('pipeline-track-all-link');
  if (!container) return;

  const apps = await fetchStudentApplicationsData(userId);

  if (trackLink) {
    trackLink.innerHTML = `Track All (${apps.length}) <i class="fa-solid fa-arrow-right"></i>`;
  }

  if (!apps || apps.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.75rem; text-align: center; color: var(--text-muted); background: var(--bg-cream); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
        <i class="fa-solid fa-folder-open" style="font-size: 1.75rem; color: var(--accent-saffron); margin-bottom: 0.5rem; display: block;"></i>
        <strong style="color: var(--primary-deep); font-size: 0.95rem; display: block;">No Applications Submitted Yet</strong>
        <p style="font-size: 0.82rem; margin: 0.25rem 0 0.75rem;">Explore curated AYUSH research, internship, and job openings to apply.</p>
        <a href="/student/opportunities.html" class="btn btn-sm btn-accent">Explore Openings</a>
      </div>
    `;
    return;
  }

  container.innerHTML = apps.slice(0, 2).map((app, idx) => {
    const isInterview = (app.status || '').toLowerCase() === 'interview';
    const isShortlisted = (app.status || '').toLowerCase() === 'shortlisted';
    const badgeClass = isInterview ? 'badge-saffron' : (isShortlisted ? 'badge-teal' : 'badge-primary');
    
    return `
      <div style="${idx === 0 ? 'border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem; margin-bottom: 0.85rem;' : ''}">
        <div style="display: flex; justify-content: space-between;">
          <strong style="color: var(--primary-deep); font-size: 0.95rem;">${app.position || 'Application'}</strong>
          <span class="badge ${badgeClass}">${app.status || 'Applied'}</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
          ${app.company || 'Enterprise'} &bull; Applied ${app.applied_date || 'Recently'}
        </div>
        <div style="font-size: 0.78rem; color: ${isInterview ? '#b45309' : 'var(--secondary-teal)'}; margin-top: 0.35rem; font-weight: 600;">
          <i class="fa-solid ${isInterview ? 'fa-calendar-days' : 'fa-check'}"></i> 
          ${isInterview ? 'Interview stage in progress' : 'Application under institutional review'}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Student Targeted Skills to Improve on Dashboard
 */
export async function renderStudentSkillsToImprove(userId) {
  const container = document.getElementById('skills-to-improve-list');
  if (!container) return;

  const { skillsToImprove } = await fetchStudentSkillsData(userId);

  if (!skillsToImprove || skillsToImprove.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.75rem; text-align: center; color: var(--text-muted); background: var(--bg-cream); border: 1px dashed var(--border-color); border-radius: var(--radius-md); grid-column: 1 / -1;">
        <i class="fa-solid fa-check-circle" style="font-size: 1.75rem; color: #10b981; margin-bottom: 0.5rem; display: block;"></i>
        <strong style="color: var(--primary-deep); font-size: 0.95rem; display: block;">No Critical Skill Deficits</strong>
        <p style="font-size: 0.82rem; margin: 0.25rem 0 0.75rem;">Your logged competencies match current industry hiring requirements.</p>
        <a href="/student/assessment.html" class="btn btn-sm btn-secondary">Take New Assessment</a>
      </div>
    `;
    return;
  }

  container.innerHTML = skillsToImprove.map(item => `
    <div class="skill-improve-card">
      <div style="font-weight: 700; color: var(--primary-deep); font-size: 0.95rem;">${item.name}</div>
      <div style="font-size: 0.82rem; color: var(--text-secondary); margin: 0.35rem 0;">
        Current: <strong style="color: #ea580c;">${item.current}</strong> &rarr; Target: <strong style="color: #059669;">${item.target}</strong>
      </div>
      <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4;">${item.reason}</div>
    </div>
  `).join('');
}

/**
 * Render Student Career Journey Steps
 */
export function renderStudentJourneySteps(metrics) {
  const stageBadge = document.getElementById('journey-stage-badge');
  const subProfile = document.getElementById('journey-sub-profile');
  const subSkills = document.getElementById('journey-sub-skills');
  const subAssessment = document.getElementById('journey-sub-assessment');
  const subApps = document.getElementById('journey-sub-apps');

  const profileDone = (metrics.profileCompletion || 0) >= 70;
  const skillsDone = (metrics.skillScore || 0) > 0 || (metrics.skillsCount || 0) > 0;
  const assessDone = (metrics.skillScore || 0) > 0;
  const appsDone = (metrics.applicationsCount || 0) > 0;

  if (subProfile) {
    subProfile.textContent = profileDone ? 'Verified' : `${metrics.profileCompletion || 0}%`;
  }
  if (subSkills) {
    subSkills.textContent = skillsDone ? 'Logged' : 'Pending';
  }
  if (subAssessment) {
    subAssessment.textContent = assessDone ? `Score: ${metrics.skillScore}/100` : 'Take Quiz';
  }
  if (subApps) {
    subApps.textContent = `${metrics.applicationsCount || 0} Active`;
  }

  let stage = 1;
  if (profileDone) stage = 2;
  if (skillsDone) stage = 3;
  if (assessDone) stage = 4;
  if (appsDone) stage = 5;

  if (stageBadge) {
    stageBadge.textContent = `Stage ${stage} of 6`;
  }

  const container = document.getElementById('journey-steps-container');
  if (container) {
    const stepEls = container.querySelectorAll('.journey-step');
    stepEls.forEach((el, idx) => {
      const stepNum = idx + 1;
      el.classList.remove('done', 'active', 'pending');
      const circle = el.querySelector('.journey-step-circle');
      if (stepNum < stage) {
        el.classList.add('done');
        if (circle) circle.innerHTML = '<i class="fa-solid fa-check"></i>';
      } else if (stepNum === stage) {
        el.classList.add('active');
        if (circle) circle.textContent = `${stepNum}`;
      } else {
        el.classList.add('pending');
        if (circle) circle.textContent = `${stepNum}`;
      }
    });
  }
}

/**
 * Handle Candidate Photo Upload & Persistence
 */
export function initCandidatePhoto(user) {
  const fileInput = document.getElementById('candidate-photo-input');
  const photoImg = document.getElementById('candidate-photo-img');
  const initialsFallback = document.getElementById('candidate-avatar-initials');
  const userAvatarSide = document.getElementById('user-avatar');
  const removeBtn = document.getElementById('btn-remove-photo');
  const candidateCardName = document.getElementById('candidate-card-name');

  if (candidateCardName && user && user.full_name) {
    candidateCardName.textContent = user.full_name;
  }

  const initials = computeUserInitials(user?.full_name, user?.role);
  if (initialsFallback) {
    initialsFallback.textContent = initials;
  }

  const savedPhoto = localStorage.getItem('ayush_candidate_photo') || user?.avatar_url;
  if (savedPhoto) {
    if (photoImg) {
      photoImg.src = savedPhoto;
      photoImg.style.display = 'block';
    }
    if (initialsFallback) initialsFallback.style.display = 'none';
    if (userAvatarSide) {
      userAvatarSide.innerHTML = `<img src="${savedPhoto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
    if (removeBtn) removeBtn.style.display = 'inline-flex';
  } else {
    if (initialsFallback) initialsFallback.style.display = 'block';
    if (userAvatarSide) {
      userAvatarSide.textContent = initials;
    }
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        showToast('Image size exceeds 5MB. Please choose a smaller image.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        try {
          localStorage.setItem('ayush_candidate_photo', dataUrl);
          if (photoImg) {
            photoImg.src = dataUrl;
            photoImg.style.display = 'block';
          }
          if (initialsFallback) initialsFallback.style.display = 'none';
          if (userAvatarSide) {
            userAvatarSide.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
          }
          if (removeBtn) removeBtn.style.display = 'inline-flex';
          showToast('Candidate photo updated and verified!', 'success');
        } catch (err) {
          showToast('Failed to save image. Please select a lighter image.', 'error');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  window.removeCandidatePhoto = function() {
    localStorage.removeItem('ayush_candidate_photo');
    if (photoImg) {
      photoImg.src = '';
      photoImg.style.display = 'none';
    }
    if (initialsFallback) {
      initialsFallback.textContent = initials;
      initialsFallback.style.display = 'block';
    }
    if (userAvatarSide) {
      userAvatarSide.textContent = initials;
    }
    if (removeBtn) removeBtn.style.display = 'none';
    showToast('Candidate photo removed.', 'info');
  };
}

function setMetric(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Render Skill Profile Page
 */
export async function renderSkillProfile(containerId = 'skills-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const user = getCurrentUser();
  const { skills, skillsToImprove } = await fetchStudentSkillsData(user?.id);

  if (!skills || skills.length === 0) {
    container.innerHTML = `
      <div class="ayush-card" style="text-align: center; padding: 3rem 1.5rem; grid-column: 1 / -1;">
        <div style="font-size: 2.5rem; color: var(--secondary-teal); margin-bottom: 0.75rem;"><i class="fa-solid fa-graduation-cap"></i></div>
        <h3 style="color: var(--primary-deep); font-size: 1.25rem;">No Verified Skills Logged Yet</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 480px; margin: 0.5rem auto 1.25rem;">
          Add your AYUSH clinical competencies or take an assessment to benchmark your proficiency against industry standards.
        </p>
        <button class="btn btn-primary" onclick="window.addSkillPrompt()"><i class="fa-solid fa-plus"></i> Add First Skill</button>
      </div>
    `;
  } else {
    container.innerHTML = skills.map(skill => {
      const filledBlocks = Math.round(skill.pct / 10);
      const emptyBlocks = 10 - filledBlocks;
      
      let blocksHtml = '';
      for (let i = 0; i < filledBlocks; i++) {
        blocksHtml += '<div class="skill-block filled"></div>';
      }
      for (let i = 0; i < emptyBlocks; i++) {
        blocksHtml += '<div class="skill-block"></div>';
      }

      return `
        <div class="skill-level-card" id="skill-card-${skill.id}">
          <div class="skill-card-top">
            <div>
              <div class="skill-name">${skill.name}</div>
              <span class="badge badge-teal" style="margin-top: 4px;">${skill.category}</span>
            </div>
            <div style="text-align: right;">
              <div class="skill-level-tag">${skill.level}</div>
              <div class="skill-pct-label">${skill.pct}%</div>
            </div>
          </div>
          <div class="skill-visual-bar" style="margin-top: 0.75rem;">
            <div class="skill-blocks-track">${blocksHtml}</div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.85rem;">
            <button class="btn btn-sm btn-secondary" onclick="window.editSkillPrompt('${skill.name}', ${skill.pct})">Edit</button>
            <button class="btn btn-sm btn-secondary" style="color: #ef4444;" onclick="window.removeSkill('${skill.id}')">Remove</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Skills to Improve
  const improveContainer = document.getElementById('skills-to-improve-list');
  if (improveContainer) {
    if (!skillsToImprove || skillsToImprove.length === 0) {
      improveContainer.innerHTML = `
        <div class="ayush-card" style="text-align: center; padding: 2rem 1.5rem; color: var(--text-muted);">
          <i class="fa-solid fa-circle-check" style="font-size: 1.5rem; color: var(--secondary-teal); display: block; margin-bottom: 0.5rem;"></i>
          <div style="font-weight: 600; color: var(--primary-deep);">No Skill Gaps Identified</div>
          <div style="font-size: 0.85rem; margin-top: 0.25rem;">Complete an assessment or log domain competencies to discover personalized upskilling pathways.</div>
          <a href="/student/assessment.html" class="btn btn-sm btn-primary" style="margin-top: 1rem;">Take Skill Assessment</a>
        </div>
      `;
    } else {
      improveContainer.innerHTML = skillsToImprove.map(item => `
        <div class="skill-improve-card">
          <div>
            <div style="font-weight: 700; color: var(--primary-deep); font-size: 0.95rem;">${item.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
              Current: <strong>${item.current}</strong> &bull; Recommended: <span style="color: var(--accent-saffron); font-weight: 700;">${item.target}</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${item.reason}</div>
          </div>
          <a href="/student/assessment.html" class="btn btn-sm btn-accent">Take Assessment</a>
        </div>
      `).join('');
    }
  }
}

/**
 * Add / Edit / Remove Skill handlers
 */
window.addSkillPrompt = async function() {
  const skillName = prompt('Enter new AYUSH or Technical Skill:');
  if (!skillName) return;
  const level = prompt('Select level: Beginner, Intermediate, or Advanced', 'Intermediate');
  const pct = level.toLowerCase().includes('adv') ? 88 : level.toLowerCase().includes('int') ? 70 : 50;

  const user = getCurrentUser();
  const newSkill = {
    id: 'sk_' + Date.now(),
    student_id: user?.id || 'usr_student_01',
    name: skillName,
    category: 'Domain Skill',
    level: level || 'Intermediate',
    proficiency_pct: pct,
    proficiency_score: pct
  };

  await saveSkillToSupabase(newSkill);
  await renderSkillProfile();
  showToast(`Added skill: "${skillName}"`, 'success');
};

window.editSkillPrompt = async function(name, currentPct) {
  const newPct = prompt(`Update proficiency percentage for ${name} (0-100):`, currentPct);
  if (newPct !== null) {
    const parsed = Math.min(100, Math.max(10, parseInt(newPct) || currentPct));
    const level = parsed >= 85 ? 'Advanced' : parsed >= 60 ? 'Intermediate' : 'Beginner';
    const user = getCurrentUser();

    await saveSkillToSupabase({
      student_id: user?.id || 'usr_student_01',
      name: name,
      category: 'Domain Skill',
      level: level,
      proficiency_pct: parsed,
      proficiency_score: parsed
    });

    await renderSkillProfile();
    showToast(`Updated ${name} to ${parsed}% (${level})`, 'success');
  }
};

window.removeSkill = async function(id) {
  if (confirm('Are you sure you want to remove this skill from your profile?')) {
    const user = getCurrentUser();
    const effectiveUserId = user?.id || 'usr_student_01';

    if (MOCK_DB.student_skills) {
      MOCK_DB.student_skills = MOCK_DB.student_skills.filter(s => s.id !== id && s.skill_id !== id);
    }

    if (!isDemoMode() && !String(effectiveUserId).startsWith('usr_')) {
      try {
        const { supabase } = await import('./supabase.js');
        await supabase.from('student_skills').delete().eq('id', id);
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ayush:skills-updated', {
        detail: { studentId: effectiveUserId }
      }));
    }

    await renderSkillProfile();
    showToast('Skill removed', 'info');
  }
};

/**
 * Render Student Portfolio
 */
export async function renderPortfolio() {
  const projContainer = document.getElementById('portfolio-projects-grid');
  if (!projContainer) return;

  const user = getCurrentUser();
  const projects = await fetchStudentProjectsData(user?.id);

  if (!projects || projects.length === 0) {
    projContainer.innerHTML = `
      <div class="ayush-card" style="text-align: center; padding: 3rem 1.5rem; grid-column: 1 / -1;">
        <div style="font-size: 2.5rem; color: var(--secondary-teal); margin-bottom: 0.75rem;"><i class="fa-solid fa-folder-open"></i></div>
        <h3 style="color: var(--primary-deep); font-size: 1.25rem;">No Projects in Portfolio Yet</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 480px; margin: 0.5rem auto 1.25rem;">
          Add your clinical studies, phytochemistry research, AI models, or AYUSH health informatics projects.
        </p>
        <button class="btn btn-primary" onclick="window.addProjectPrompt()"><i class="fa-solid fa-plus"></i> Add Project</button>
      </div>
    `;
    return;
  }

  projContainer.innerHTML = projects.map(p => `
    <div class="ayush-card" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem;">
          <h4 style="font-size: 1.05rem; color: var(--primary-deep);">${p.title}</h4>
          <span class="badge badge-primary">${p.date || '2026'}</span>
        </div>
        <p style="font-size: 0.875rem; line-height: 1.5; margin-bottom: 1rem;">${p.description || ''}</p>
        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1.25rem;">
          ${(p.technologies || []).map(t => `<span class="badge badge-teal">${t}</span>`).join('')}
        </div>
      </div>
      <div style="display: flex; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem;">
        <a href="${p.github_url || '#'}" target="_blank" class="btn btn-sm btn-secondary">
          GitHub Repo
        </a>
        <a href="${p.live_demo_url || '#'}" target="_blank" class="btn btn-sm btn-primary">
          Live Demo
        </a>
      </div>
    </div>
  `).join('');
}

/**
 * Render Student Applications Tracking
 */
export async function renderApplications(filterStatus = 'All') {
  const container = document.getElementById('applications-list');
  if (!container) return;

  const user = getCurrentUser();
  const applications = await fetchStudentApplicationsData(user?.id, filterStatus);

  // Update count pills if on applications page
  const allApps = await fetchStudentApplicationsData(user?.id, 'All');
  const interviewApps = allApps.filter(a => (a.status || '').toLowerCase() === 'interview');
  const shortlistedApps = allApps.filter(a => (a.status || '').toLowerCase() === 'shortlisted');
  const appliedApps = allApps.filter(a => (a.status || '').toLowerCase() === 'applied');

  const filterContainer = document.getElementById('app-filter-pills');
  if (filterContainer) {
    filterContainer.innerHTML = `
      <button class="badge ${filterStatus === 'All' ? 'badge-primary' : 'badge-teal'}" style="padding: 0.4rem 0.9rem; font-size: 0.85rem; cursor: pointer;" onclick="window.filterApps('All')">All Applications (${allApps.length})</button>
      <button class="badge ${filterStatus === 'Interview' ? 'badge-primary' : 'badge-teal'}" style="padding: 0.4rem 0.9rem; font-size: 0.85rem; cursor: pointer;" onclick="window.filterApps('Interview')">Interview (${interviewApps.length})</button>
      <button class="badge ${filterStatus === 'Shortlisted' ? 'badge-primary' : 'badge-teal'}" style="padding: 0.4rem 0.9rem; font-size: 0.85rem; cursor: pointer;" onclick="window.filterApps('Shortlisted')">Shortlisted (${shortlistedApps.length})</button>
      <button class="badge ${filterStatus === 'Applied' ? 'badge-primary' : 'badge-teal'}" style="padding: 0.4rem 0.9rem; font-size: 0.85rem; cursor: pointer;" onclick="window.filterApps('Applied')">Applied (${appliedApps.length})</button>
    `;
  }

  if (!applications || applications.length === 0) {
    container.innerHTML = `
      <div class="ayush-card" style="text-align: center; padding: 3rem 1.5rem;">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--secondary-teal);"><i class="fa-solid fa-inbox"></i></div>
        <h4 style="color: var(--primary-deep); font-size: 1.25rem;">${filterStatus === 'All' ? 'No Applications Submitted Yet' : `No applications in status: ${filterStatus}`}</h4>
        <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-secondary); max-width: 480px; margin-left: auto; margin-right: auto;">
          Explore active AYUSH clinical internships, R&D fellow positions, and national research calls.
        </p>
        <a href="/student/opportunities.html" class="btn btn-primary" style="margin-top: 1.25rem;"><i class="fa-solid fa-compass"></i> Browse Opportunities</a>
      </div>
    `;
    return;
  }

  container.innerHTML = applications.map(app => {
    // Stages: Applied -> Under Review -> Shortlisted -> Interview -> Selected
    const stages = ['Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected'];
    const currentIdx = stages.indexOf(app.status);

    const timelineNodes = stages.map((st, idx) => {
      const isDone = idx < currentIdx;
      const isCurrent = idx === currentIdx;
      const nodeClass = isDone ? 'done' : isCurrent ? 'current' : 'pending';

      return `
        <div class="timeline-node ${nodeClass}">
          <div class="timeline-dot" style="display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;">
            ${isDone ? '<i class="fa-solid fa-check"></i>' : isCurrent ? '<i class="fa-solid fa-circle" style="font-size: 7px; color: #fff;"></i>' : ''}
          </div>
          <span>${st}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="ayush-card" style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span class="badge badge-teal">${app.company}</span>
            <h3 style="font-size: 1.15rem; color: var(--primary-dark); margin-top: 0.35rem;">${app.position}</h3>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
              Applied on <strong>${app.applied_date}</strong> &bull; Match Score: <strong style="color: var(--secondary-teal);">${app.match_pct}%</strong>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span class="badge ${app.status === 'Interview' ? 'badge-saffron' : 'badge-primary'}" style="font-size: 0.85rem; padding: 0.4rem 0.9rem;">
              Status: ${app.status}
            </span>
            <button class="btn btn-sm btn-secondary" onclick="window.viewApplicationDetails('${app.id}')">View Details</button>
          </div>
        </div>

        ${app.interview_date ? `
          <div style="background: var(--accent-subtle); border-left: 3px solid var(--accent-saffron); padding: 0.6rem 0.85rem; border-radius: 4px; margin-top: 0.85rem; font-size: 0.85rem; color: #b45309; display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fa-solid fa-calendar-check" style="margin-right: 0.35rem;"></i> <strong>Interview Scheduled:</strong> ${app.interview_date}</span>
            <a href="#" onclick="alert('Interview link copied to clipboard!'); return false;" style="font-weight: 700; text-decoration: underline;">Join Link</a>
          </div>
        ` : ''}

        <!-- Visual Application Timeline -->
        <div class="app-timeline">
          ${timelineNodes}
        </div>
      </div>
    `;
  }).join('');
}

window.addProjectPrompt = async function() {
  const title = prompt('Enter Project / Study Title:');
  if (!title) return;
  const description = prompt('Enter Project Description:', 'Clinical protocol and AYUSH bioinformatics analysis pipeline.');
  const technologiesStr = prompt('Enter Technologies / AYUSH Domains (comma-separated):', 'Ayurveda, Python, Clinical Trials');
  const github_url = prompt('GitHub or Repository URL:', 'https://github.com/ayush-connect');
  const live_demo_url = prompt('Demo or Paper Publication URL:', 'https://ayushconnect.gov.in');

  const user = getCurrentUser();
  const newProj = {
    id: 'proj_' + Date.now(),
    student_id: user?.id || 'usr_student_01',
    title,
    description,
    date: new Date().getFullYear().toString(),
    technologies: (technologiesStr || '').split(',').map(s => s.trim()).filter(Boolean),
    github_url,
    live_demo_url
  };

  if (isDemoMode()) {
    MOCK_DB.projects.push(newProj);
  } else {
    await saveProjectToSupabase(newProj);
  }

  await renderPortfolio();
  showToast(`Added project "${title}" to your portfolio!`, 'success');
};

window.filterApps = function(status) {
  renderApplications(status);
};

window.viewApplicationDetails = function(appId) {
  const user = getCurrentUser();
  fetchStudentApplicationsData(user?.id, 'All').then(apps => {
    const app = apps.find(a => a.id === appId);
    if (!app) return;
    alert(`Application ID: ${app.id}\nRole: ${app.position}\nCompany: ${app.company}\nStatus: ${app.status}\nMatch Score: ${app.match_pct}%\nInterview/Remarks: ${app.interview_date || 'Application is progressing through institutional verification'}`);
  });
};

export default {
  STUDENT_STATE,
  initStudentDashboard,
  renderSkillProfile,
  renderPortfolio,
  renderApplications
};
