/**
 * AYUSH CONNECT — Opportunities Marketplace
 * SIH 2026: Industry Opportunities, Filtering & Application Flow
 */

import { 
  MOCK_DB, 
  isDemoMode,
  fetchOpportunitiesData,
  fetchStudentApplicationsData,
  calculateMatch,
  applyForOpportunity 
} from './supabase.js';
import { showToast, getCurrentUser } from './auth.js';

export class OpportunitiesMarketplace {
  constructor() {
    this.opportunities = isDemoMode() ? [...MOCK_DB.opportunities] : [];
    this.appliedIds = [];
    this.filters = {
      search: '',
      type: 'All',
      location: 'All',
      skill: 'All'
    };

    // Listen for live updates from Supabase
    if (typeof window !== 'undefined') {
      window.addEventListener('ayush:opportunities-updated', (e) => {
        if (e.detail && Array.isArray(e.detail)) {
          this.opportunities = [...e.detail];
          this.renderOpportunityList();
        }
      });
    }
  }

  async init() {
    this.bindSearchAndFilters();

    // Fetch opportunities from Supabase or DEMO_MODE
    const liveData = await fetchOpportunitiesData();
    this.opportunities = liveData || [];

    // Fetch student's applied opportunities
    const user = getCurrentUser();
    if (user?.id) {
      const myApps = await fetchStudentApplicationsData(user.id, 'All');
      this.appliedIds = (myApps || []).map(a => a.opportunity_id);
    }

    this.renderOpportunityList();
  }

  getFilteredOpportunities() {
    return this.opportunities.filter(opp => {
      // Search text
      if (this.filters.search) {
        const query = this.filters.search.toLowerCase();
        const matchesTitle = (opp.title || '').toLowerCase().includes(query);
        const matchesCompany = (opp.company_name || '').toLowerCase().includes(query);
        const matchesSkills = (opp.required_skills || []).some(s => s.toLowerCase().includes(query));
        if (!matchesTitle && !matchesCompany && !matchesSkills) return false;
      }

      // Opportunity Type
      if (this.filters.type !== 'All') {
        if ((opp.type || '').toLowerCase() !== this.filters.type.toLowerCase()) return false;
      }

      // Location
      if (this.filters.location !== 'All') {
        if (!(opp.location || '').toLowerCase().includes(this.filters.location.toLowerCase())) return false;
      }

      // Skill
      if (this.filters.skill !== 'All') {
        const hasSkill = (opp.required_skills || []).some(s => s.toLowerCase().includes(this.filters.skill.toLowerCase()));
        if (!hasSkill) return false;
      }

      return true;
    });
  }

  renderOpportunityList(containerId = 'opportunities-grid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const list = this.getFilteredOpportunities();
    const countEl = document.getElementById('opp-count-badge');
    if (countEl) countEl.textContent = `${list.length} Opportunities Found`;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="ayush-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem; color: var(--secondary-teal);"><i class="fa-solid fa-magnifying-glass"></i></div>
          <h3 style="color: var(--primary-deep);">No opportunities match your filter</h3>
          <p style="margin-top: 0.5rem; color: var(--text-secondary); max-width: 480px; margin-left: auto; margin-right: auto;">
            Try adjusting your search query, resetting filters, or check back later for newly published institutional calls.
          </p>
          <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="window.marketplace.resetFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(opp => {
      const isApplied = this.appliedIds.includes(opp.id);
      const logoText = (opp.company_logo_text || opp.company_name || 'AYU').substring(0, 3).toUpperCase();

      return `
        <div class="opportunity-card" id="opp-card-${opp.id}">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 0.85rem;">
                <div class="opp-company-logo">${logoText}</div>
                <div>
                  <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">${opp.company_name}</div>
                  <h3 style="font-size: 1.15rem; color: var(--primary-dark); font-weight: 700; margin-top: 0.15rem;">${opp.title}</h3>
                </div>
              </div>
              <span class="badge ${opp.type === 'Internship' ? 'badge-teal' : opp.type === 'Hackathon' ? 'badge-saffron' : 'badge-primary'}">${opp.type || 'Opportunity'}</span>
            </div>

            <div style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.825rem; color: var(--text-muted); margin-bottom: 0.85rem;">
              <span><i class="fa-solid fa-location-dot" style="color: var(--secondary-teal); margin-right: 0.2rem;"></i> ${opp.location || 'Pan India'}</span>
              <span><i class="fa-solid fa-indian-rupee-sign" style="color: var(--accent-saffron); margin-right: 0.2rem;"></i> ${opp.stipend || 'Stipend provided'}</span>
              <span><i class="fa-solid fa-clock" style="color: var(--text-muted); margin-right: 0.2rem;"></i> Deadline: ${opp.deadline || 'Rolling'}</span>
            </div>

            <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
              ${opp.description || ''}
            </p>

            <div style="margin-bottom: 1.25rem;">
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.4rem;">Skills Required:</div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.35rem;">
                ${(opp.required_skills || []).map(sk => `<span class="badge badge-primary">${sk}</span>`).join('')}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 1rem; gap: 0.75rem;">
            <button class="btn btn-sm btn-secondary" onclick="window.marketplace.openOpportunityModal('${opp.id}')">
              View Details
            </button>
            <button class="btn btn-sm ${isApplied ? 'btn-secondary' : 'btn-accent'}" 
                    id="apply-btn-${opp.id}" 
                    ${isApplied ? 'disabled' : ''}
                    onclick="window.marketplace.applyForOpportunity('${opp.id}')">
              ${isApplied ? '✓ Applied' : 'Apply Now'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  bindSearchAndFilters() {
    const searchInput = document.getElementById('opp-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value;
        this.renderOpportunityList();
      });
    }

    // Type pills
    const typeButtons = document.querySelectorAll('.type-filter-btn');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        typeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filters.type = btn.dataset.type || 'All';
        this.renderOpportunityList();
      });
    });

    window.marketplace = this;
  }

  filterByType(type) {
    this.filters.type = type;
    this.renderOpportunityList();
  }

  filterByLocation(loc) {
    this.filters.location = loc;
    this.renderOpportunityList();
  }

  resetFilters() {
    this.filters = { search: '', type: 'All', location: 'All', skill: 'All' };
    const searchInput = document.getElementById('opp-search-input');
    if (searchInput) searchInput.value = '';
    const typeButtons = document.querySelectorAll('.type-filter-btn');
    typeButtons.forEach(b => b.classList.remove('active'));
    if (typeButtons[0]) typeButtons[0].classList.add('active');
    this.renderOpportunityList();
  }

  openOpportunityModal(oppId) {
    const opp = this.opportunities.find(o => o.id === oppId);
    if (!opp) return;

    let modal = document.getElementById('opp-detail-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'opp-detail-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <span class="badge badge-teal">${opp.company_name}</span>
            <h2 style="font-size: 1.35rem; color: var(--primary-deep); margin-top: 0.25rem;">${opp.title}</h2>
          </div>
          <button class="modal-close" onclick="document.getElementById('opp-detail-modal').classList.remove('active')">&times;</button>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem; background: var(--bg-cream); padding: 0.85rem; border-radius: var(--radius-md);">
          <div><strong>Type:</strong> ${opp.type}</div>
          <div><strong>Location:</strong> ${opp.location}</div>
          <div><strong>Stipend/CTC:</strong> ${opp.stipend}</div>
          <div><strong>Openings:</strong> ${opp.openings}</div>
        </div>

        <h4 style="font-size: 1rem; color: var(--primary-deep); margin-bottom: 0.5rem;">Role Overview</h4>
        <p style="font-size: 0.9rem; margin-bottom: 1.25rem; line-height: 1.6;">${opp.description}</p>

        <h4 style="font-size: 1rem; color: var(--primary-deep); margin-bottom: 0.5rem;">Required Skills & Competencies</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.25rem;">
          ${opp.required_skills.map(s => `<span class="badge badge-primary">${s}</span>`).join('')}
        </div>

        <h4 style="font-size: 1rem; color: var(--primary-deep); margin-bottom: 0.5rem;">Eligibility</h4>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">${opp.eligibility}</p>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <button class="btn btn-secondary" onclick="document.getElementById('opp-detail-modal').classList.remove('active')">Close</button>
          <button class="btn btn-accent" onclick="window.marketplace.applyForOpportunity('${opp.id}'); document.getElementById('opp-detail-modal').classList.remove('active');">
            Confirm & Apply
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');
  }

  async applyForOpportunity(oppId) {
    const opp = this.opportunities.find(o => o.id === oppId);
    if (!opp) return;

    const user = getCurrentUser();
    const matchRes = await calculateMatch(user?.id, opp.id);
    const res = await applyForOpportunity(user?.id, opp.id, matchRes.match_percentage);

    if (res.success) {
      if (!this.appliedIds.includes(opp.id)) {
        this.appliedIds.push(opp.id);
      }
      showToast(res.message, 'success');
      this.renderOpportunityList();
    } else {
      showToast(res.message, 'info');
    }
  }
}

export default {
  OpportunitiesMarketplace
};
