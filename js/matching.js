/**
 * AYUSH CONNECT — Matching & Intelligent Recommendation Engine
 * SIH 2026: Skill-to-Opportunity Matrix & Gap Analyzer
 */

import { 
  fetchOpportunitiesData,
  fetchStudentSkillsData,
  calculateMatch,
  applyForOpportunity 
} from './supabase.js';
import { getCurrentUser, showToast } from './auth.js';

export class MatchingEngine {
  constructor() {
    this.studentSkills = [];
    this.studentSkillsRaw = [];
  }

  /**
   * Load real student skills from DB
   */
  async loadStudentSkills() {
    const user = getCurrentUser();
    const { skills } = await fetchStudentSkillsData(user?.id);
    this.studentSkillsRaw = skills || [];
    this.studentSkills = this.studentSkillsRaw.map(s => s.name);
  }

  /**
   * Calculate real match percentage based on student skill overlap & weighting formula
   * Weight: 2 for "required", 1 for "preferred"
   * match_percentage = ( Σ(proficiency_score × weight) / Σ(100 × weight) ) × 100
   * Constraint: If a "required" skill is missing/0, cap match_percentage at 50
   */
  async calculateOpportunityMatch(opp) {
    const user = getCurrentUser();
    const result = await calculateMatch(user?.id, opp.id);
    return {
      pct: result.match_percentage,
      matched: result.matched.map(m => typeof m === 'string' ? m : `${m.name} (${m.score}%)`),
      missing: result.missing.map(m => typeof m === 'string' ? m : `${m.name} (${m.importance})`),
      suggestedAction: result.suggestedAction
    };
  }

  /**
   * Render Recommendations Page
   */
  async renderRecommendations(containerId = 'recommendations-grid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    await this.loadStudentSkills();

    // Fetch real opportunities
    const opportunities = await fetchOpportunitiesData();

    if (!opportunities || opportunities.length === 0) {
      container.innerHTML = `
        <div class="ayush-card" style="text-align: center; padding: 3.5rem 1.5rem; border: 1px dashed var(--border-color); background: #fffcf7; border-radius: var(--radius-lg);">
          <div style="width: 64px; height: 64px; margin: 0 auto 1.25rem; border-radius: 50%; background: var(--bg-cream); display: flex; align-items: center; justify-content: center; color: var(--secondary-teal); font-size: 1.75rem; border: 1px solid var(--border-color);">
            <i class="fa-solid fa-briefcase"></i>
          </div>
          <h3 style="font-size: 1.35rem; color: var(--primary-deep); margin: 0 0 0.5rem 0;">No Active Industry Recommendations Found</h3>
          <p style="font-size: 0.92rem; color: var(--text-secondary); max-width: 540px; margin: 0 auto 1.5rem; line-height: 1.6;">
            There are currently no active enterprise opportunities posted in the system. As soon as recruiters post verified internships, fellowships, or positions from the Industry portal, your AI skill recommendations will appear here automatically.
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <a href="/student/skill-profile.html" class="btn btn-secondary btn-sm">
              <i class="fa-solid fa-leaf"></i> Update Verified Skills
            </a>
            <a href="/industry/post-opportunity.html" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-circle-plus"></i> Post an Opportunity (Industry)
            </a>
          </div>
        </div>
      `;
      return;
    }

    // Compute matches using real database formula
    const scoredList = [];
    for (const opp of opportunities) {
      const matchData = await this.calculateOpportunityMatch(opp);
      scoredList.push({
        ...opp,
        match: matchData
      });
    }

    scoredList.sort((a, b) => b.match.pct - a.match.pct);

    container.innerHTML = scoredList.map(item => {
      const match = item.match;

      return `
        <div class="ayush-card" style="margin-bottom: 1.5rem; position: relative; border-left: 4px solid var(--secondary-teal);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
            <div style="flex: 1; min-width: 280px;">
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem;">
                <span class="badge badge-teal">${item.company_name}</span>
                <span class="badge ${item.type === 'Internship' ? 'badge-primary' : 'badge-saffron'}">${item.type}</span>
              </div>
              <h3 style="font-size: 1.25rem; color: var(--primary-deep); font-weight: 700;">${item.title}</h3>
              <div style="font-size: 0.825rem; color: var(--text-muted); margin-top: 0.25rem;">
                <i class="fa-solid fa-location-dot" style="color: var(--secondary-teal); margin-right: 0.2rem;"></i> ${item.location} &bull; <i class="fa-solid fa-indian-rupee-sign" style="color: var(--accent-saffron); margin-right: 0.2rem;"></i> ${item.stipend} &bull; <i class="fa-solid fa-clock" style="color: var(--text-muted); margin-right: 0.2rem;"></i> Deadline: ${item.deadline}
              </div>
            </div>

            <!-- Visual Circular / Badge Match Indicator -->
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div class="match-circle-visual" style="--pct: ${match.pct};">
                <div class="match-circle-inner">${match.pct}%</div>
              </div>
              <span style="font-size: 0.72rem; font-weight: 700; color: var(--secondary-dark); margin-top: 0.3rem;">MATCH SCORE</span>
            </div>
          </div>

          <!-- Matching Breakdown Accordion -->
          <div style="background: var(--bg-cream); border-radius: var(--radius-md); padding: 1.15rem; margin-top: 1.25rem; border: 1px solid var(--border-color);">
            <div class="match-breakdown-columns" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem;">
              <!-- Why this matches -->
              <div>
                <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #166534; margin-bottom: 0.5rem;">
                  <i class="fa-solid fa-check" style="margin-right: 0.25rem;"></i> Why this matches your profile:
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                  ${match.matched.length > 0 ? match.matched.map(m => `
                    <div style="font-size: 0.82rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                      <span style="color: #10b981; font-weight: 800;"><i class="fa-solid fa-circle-check"></i></span> ${m}
                    </div>
                  `).join('') : '<span style="font-size: 0.82rem; color: var(--text-muted);">Baseline academic alignment</span>'}
                </div>
              </div>

              <!-- Missing & Gaps -->
              <div>
                <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #b45309; margin-bottom: 0.5rem;">
                  <i class="fa-solid fa-circle-notch" style="margin-right: 0.25rem;"></i> Skill Gaps to Bridge:
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                  ${match.missing.length > 0 ? match.missing.map(m => `
                    <div style="font-size: 0.82rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.4rem;">
                      <span style="color: var(--accent-saffron); font-weight: 800;"><i class="fa-regular fa-circle"></i></span> ${m}
                    </div>
                  `).join('') : '<span style="font-size: 0.82rem; color: #166534; font-weight: 600;">No critical skill gaps!</span>'}
                </div>
              </div>
            </div>

            <!-- Suggested Action Banner -->
            <div class="match-action-banner" style="margin-top: 1rem; padding-top: 0.85rem; border-top: 1px dashed var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
              <div style="font-size: 0.82rem; color: var(--primary-deep); font-weight: 600; flex: 1; min-width: 200px;">
                <i class="fa-solid fa-lightbulb" style="color: var(--accent-saffron); margin-right: 0.35rem;"></i> <strong>Suggested action:</strong> ${match.suggestedAction}
              </div>
              <div class="match-action-buttons" style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <a href="/student/assessment.html" class="btn btn-sm btn-secondary" style="white-space: normal; text-align: center;">Take Assessment</a>
                <button class="btn btn-sm btn-accent" onclick="window.matchingEngine.applyDirect('${item.id}', '${item.title}', '${item.company_name}', ${match.pct})" style="white-space: normal; text-align: center; box-sizing: border-box;">
                  Apply with Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async applyDirect(id, title, company, matchPct = 85) {
    const user = getCurrentUser();
    const res = await applyForOpportunity(user?.id, id, matchPct);
    if (res.success) {
      showToast(res.message, 'success');
      // Refresh recommendations & pipeline if active
      await this.renderRecommendations();
    } else {
      showToast(res.message, 'info');
    }
  }

  async init() {
    await this.renderRecommendations();
    window.matchingEngine = this;
  }
}

export default {
  MatchingEngine
};
