/**
 * AYUSH CONNECT — Academician Portal Logic
 * SIH 2026: Academic & Institutional Analytics, Skill Gaps & Curriculum Alignments
 */

import { getCurrentUser } from './auth.js';
import { isDemoMode, fetchAcademicianData } from './supabase.js';

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

export default {
  ACADEMIC_STATE,
  initAcademicianDashboard
};
