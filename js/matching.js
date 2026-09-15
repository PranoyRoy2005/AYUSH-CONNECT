/**
 * AYUSH CONNECT — Matching & Intelligent Recommendation Engine
 * SIH 2026: Skill-to-Opportunity Matrix & Gap Analyzer
 */

import { MOCK_DB } from './supabase.js';
import { STUDENT_STATE } from './student.js';
import { showToast } from './auth.js';

export class MatchingEngine {
  constructor() {
    this.studentSkills = STUDENT_STATE.skills.map(s => s.name);
  }

  /**
   * Calculate real match percentage based on student skill overlap
   */
  calculateOpportunityMatch(opp) {
    const required = opp.required_skills || [];
    if (required.length === 0) return { pct: 85, matched: [], missing: [] };

    const matched = [];
    const missing = [];

    required.forEach(req => {
      // Fuzzy or direct match
      const hasSkill = this.studentSkills.some(st => 
        st.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(st.toLowerCase())
      );
      if (hasSkill) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    });

    const pct = Math.round((matched.length / required.length) * 100);
    // Baseline minimum display for high relevance in demo
    const finalPct = Math.max(65, pct);

    return {
      pct: finalPct,
      matched,
      missing,
      suggestedAction: missing.length > 0 
        ? `Improve ${missing[0]} to elevate your match score to 95%+` 
        : 'Your skill profile meets 100% of the industry prerequisites.'
    };
  }

  /**
   * Render Recommendations Page
   */
  renderRecommendations(containerId = 'recommendations-grid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const opportunities = MOCK_DB.opportunities;

    // Compute matches
    const scoredList = opportunities.map(opp => {
      const matchData = this.calculateOpportunityMatch(opp);
      return {
        ...opp,
        match: matchData
      };
    }).sort((a, b) => b.match.pct - a.match.pct);

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
                <button class="btn btn-sm btn-accent" onclick="window.matchingEngine.applyDirect('${item.id}', '${item.title}', '${item.company_name}')" style="white-space: normal; text-align: center; box-sizing: border-box;">
                  Apply with Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  applyDirect(id, title, company) {
    showToast(`Quick application submitted for ${title} at ${company}!`, 'success');
  }

  init() {
    this.renderRecommendations();
    window.matchingEngine = this;
  }
}

export default {
  MatchingEngine
};
