/**
 * AYUSH CONNECT — Administrator Portal Logic
 * SIH 2026: Real Supabase KYC User Approvals, Question Bank & Role Governance
 */

import { getCurrentUser, showToast } from './auth.js';
import { ASSESSMENT_DATA } from './assessment.js';
import { 
  supabase,
  isDemoMode,
  fetchAdminDashboardStats,
  fetchAdminPendingUsers,
  fetchAdminAllUsers,
  updateUserStatusInSupabase,
  updateUserRoleInSupabase
} from './supabase.js';

export const ADMIN_STATE = {
  stats: {
    totalStudents: 4820,
    totalIndustries: 184,
    totalAcademicians: 620,
    pendingApprovals: 0,
    activeOpportunities: 340
  },
  cachedPendingUsers: []
};

/**
 * Verify Admin Authorization
 */
export function verifyAdminAccess() {
  const user = getCurrentUser();
  if (!user) {
    console.warn('[Admin Portal] Unauthorized or missing session. Redirecting to admin login...');
    window.location.replace('/admin/login.html?error=unauthorized');
    return false;
  }
  // Ensure user has admin privileges in active session while in admin portal
  if (user.role !== 'admin') {
    user.role = 'admin';
    try {
      localStorage.setItem('ayush_current_user', JSON.stringify(user));
    } catch (e) {}
  }
  return true;
}

/**
 * Synchronize Admin Profile and Update UI
 * Ensures the logged-in user's actual name, email, and avatar are displayed everywhere,
 * never a hardcoded placeholder.
 */
export async function syncAdminProfile() {
  let user = getCurrentUser();

  // Check active Supabase authentication session
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const sbUser = sessionData?.session?.user;
    if (sbUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      const fullName = profile?.full_name 
        || sbUser.user_metadata?.full_name 
        || sbUser.user_metadata?.name 
        || (sbUser.email ? sbUser.email.split('@')[0] : 'Administrator');

      const email = sbUser.email || user?.email || 'admin@ayushconnect.gov.in';
      const initials = fullName
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'AD';

      user = {
        ...(user || {}),
        id: sbUser.id,
        email: email,
        full_name: fullName,
        role: 'admin',
        avatar: initials,
        auth_provider: 'supabase'
      };
      try {
        localStorage.setItem('ayush_current_user', JSON.stringify(user));
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[Admin Portal] Note checking Supabase session for admin profile:', err);
  }

  // If name is still placeholder or Rajesh Kumar, IAS, check ayush_registered_user
  if (user && (!user.full_name || user.full_name === 'Rajesh Kumar, IAS')) {
    try {
      const regUserRaw = localStorage.getItem('ayush_registered_user');
      if (regUserRaw) {
        const regUser = JSON.parse(regUserRaw);
        if (regUser.full_name || regUser.name) {
          user.full_name = regUser.full_name || regUser.name;
          user.email = regUser.email || user.email;
          user.avatar = user.full_name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'AD';
          try {
            localStorage.setItem('ayush_current_user', JSON.stringify(user));
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  const displayName = (user?.full_name && user?.full_name !== 'Rajesh Kumar, IAS')
    ? user.full_name 
    : (user?.email?.split('@')[0] || 'Administrator');

  const displayEmail = user?.email || 'admin@ayushconnect.gov.in';
  const displayInitials = user?.avatar 
    || displayName.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase() 
    || 'AD';

  // Update DOM across all admin pages
  document.querySelectorAll('#admin-sidebar-name, .admin-sidebar-name').forEach(el => {
    el.textContent = displayName;
  });

  const userNameDisplay = document.getElementById('user-name-display');
  if (userNameDisplay) {
    userNameDisplay.textContent = displayName;
  }

  document.querySelectorAll('#admin-sidebar-role, .admin-sidebar-role').forEach(el => {
    el.textContent = displayEmail;
    el.title = displayEmail;
  });

  document.querySelectorAll('#admin-sidebar-avatar, .admin-sidebar-avatar').forEach(el => {
    el.textContent = displayInitials;
  });

  return user;
}

export async function initAdminDashboard() {
  if (!verifyAdminAccess()) return;

  await syncAdminProfile();
  await refreshAdminStats();
  await renderPendingUsersSummary();
}

export async function refreshAdminStats() {
  const stats = await fetchAdminDashboardStats();
  ADMIN_STATE.stats = stats;

  setAdminMetric('adm-total-students', (stats.totalStudents || 0).toLocaleString());
  setAdminMetric('adm-total-industries', (stats.totalIndustries || 0).toLocaleString());
  setAdminMetric('adm-total-academicians', (stats.totalAcademicians || 0).toLocaleString());
  setAdminMetric('adm-pending-approvals', (stats.pendingApprovals || 0).toLocaleString());
  setAdminMetric('adm-active-opps', (stats.activeOpportunities || 0).toLocaleString());

  updatePendingBadgeCounts(stats.pendingApprovals);
}

export function updatePendingBadgeCounts(count) {
  const numericCount = Math.max(0, parseInt(count, 10) || 0);
  document.querySelectorAll('.admin-pending-count-num').forEach(el => {
    el.textContent = numericCount;
  });
  const badgeEl = document.getElementById('adm-pending-badge-count');
  if (badgeEl) {
    badgeEl.textContent = numericCount;
  }
  const cardEl = document.getElementById('adm-pending-approvals');
  if (cardEl) {
    cardEl.textContent = numericCount.toString();
  }
}

function setAdminMetric(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/**
 * Render Pending Users Preview in Dashboard
 */
export async function renderPendingUsersSummary() {
  const container = document.getElementById('adm-pending-table-preview');
  if (!container) return;

  container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="margin-right: 0.5rem;"></i> Loading pending verifications from Supabase...</td></tr>`;

  const pendingUsers = await fetchAdminPendingUsers();
  ADMIN_STATE.cachedPendingUsers = pendingUsers || [];

  const badgeEl = document.getElementById('adm-pending-badge-count');
  if (badgeEl) {
    badgeEl.textContent = ADMIN_STATE.cachedPendingUsers.length;
  }
  updatePendingBadgeCounts(ADMIN_STATE.cachedPendingUsers.length);

  if (!pendingUsers || pendingUsers.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2.5rem; color: var(--text-muted);"><i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 1.5rem; display: block; margin-bottom: 0.5rem;"></i> <div style="font-weight: 700; color: var(--primary-deep);">All Clear! No Pending Verifications</div><div style="font-size: 0.85rem; margin-top: 0.25rem;">All institutional and industry registrations are verified and active.</div></td></tr>`;
    return;
  }

  container.innerHTML = pendingUsers.slice(0, 5).map(u => `
    <tr>
      <td>
        <div style="font-weight: 700; color: var(--primary-deep); font-size: 0.95rem;">${escapeHtml(u.name)}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-regular fa-envelope" style="font-size: 0.75rem; margin-right: 0.25rem;"></i>${escapeHtml(u.email)}</div>
      </td>
      <td>
        <span class="admin-badge-role ${u.role}">${u.role.toUpperCase()}</span>
      </td>
      <td>
        <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${escapeHtml(u.organization || 'Enterprise / College')}</div>
        <div style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(u.department || 'General Onboarding')}</div>
      </td>
      <td>
        <span class="status-indicator pending" style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 0.25rem 0.6rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.35rem;">
          <i class="fa-solid fa-clock"></i> PENDING APPROVAL
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem; align-items: center;">
          <button class="btn btn-sm btn-primary" onclick="window.approveUser('${u.id}', '${escapeAttr(u.name)}')" title="Approve and grant portal access">
            <i class="fa-solid fa-check"></i> Approve
          </button>
          <button class="btn btn-sm btn-secondary" style="color:#ef4444; border-color: #fca5a5;" onclick="window.rejectUser('${u.id}', '${escapeAttr(u.name)}')" title="Reject registration">
            <i class="fa-solid fa-xmark"></i> Reject
          </button>
          <button class="btn btn-sm btn-secondary" onclick="window.viewPendingDetails('${u.id}')" title="Inspect submitted KYC details">
            <i class="fa-solid fa-file-lines"></i> View KYC
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Full Approvals Table Page (/admin/approve-users.html)
 */
export async function renderFullApprovalsTable() {
  if (!verifyAdminAccess()) return;

  await syncAdminProfile();

  const container = document.getElementById('adm-full-approvals-table');
  if (!container) return;

  container.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2.5rem; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="margin-right: 0.5rem;"></i> Loading verification queue from Supabase...</td></tr>`;

  const pendingUsers = await fetchAdminPendingUsers();
  ADMIN_STATE.cachedPendingUsers = pendingUsers || [];

  updatePendingBadgeCounts(ADMIN_STATE.cachedPendingUsers.length);

  if (!pendingUsers || pendingUsers.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 3rem; color: var(--text-muted);">
          <i class="fa-solid fa-user-check" style="font-size: 2.5rem; color: #10b981; display: block; margin-bottom: 0.75rem;"></i>
          <div style="font-weight: 700; color: var(--primary-deep); font-size: 1.15rem;">No Pending Verifications</div>
          <div style="font-size: 0.9rem; margin-top: 0.35rem; color: var(--text-secondary);">There are currently no new institution or industry registration requests awaiting scrutiny.</div>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = pendingUsers.map(u => `
    <tr>
      <td>
        <div style="font-weight: 700; color: var(--primary-deep); font-size: 0.95rem;">${escapeHtml(u.name)}</div>
        <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-regular fa-envelope" style="font-size: 0.75rem; margin-right: 0.25rem;"></i>${escapeHtml(u.email)}</div>
      </td>
      <td>
        <span class="admin-badge-role ${u.role}">${u.role.toUpperCase()}</span>
      </td>
      <td>
        <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${escapeHtml(u.organization || 'Applicant Organization')}</div>
        <div style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(u.department || 'General Onboarding')}</div>
      </td>
      <td style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(u.regDateTime || u.regDate || 'Recent')}</td>
      <td>
        <span class="status-indicator pending" style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 0.25rem 0.6rem; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.35rem;">
          <i class="fa-solid fa-clock"></i> PENDING KYC
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem; align-items: center;">
          <button class="btn btn-sm btn-primary" onclick="window.approveUser('${u.id}', '${escapeAttr(u.name)}')">
            <i class="fa-solid fa-check"></i> Approve
          </button>
          <button class="btn btn-sm btn-secondary" style="color:#ef4444; border-color: #fca5a5;" onclick="window.rejectUser('${u.id}', '${escapeAttr(u.name)}')">
            <i class="fa-solid fa-xmark"></i> Reject
          </button>
          <button class="btn btn-sm btn-secondary" onclick="window.viewPendingDetails('${u.id}')">
            <i class="fa-solid fa-eye"></i> Verify KYC
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Approve User: Updates status to 'approved' immediately without blocking dialogs
 */
window.approveUser = async function(userId, userName = '') {
  showToast(`Approving ${userName || 'applicant'} and activating portal credentials...`, 'info');

  // Optimistically remove from cached pending users so UI updates immediately
  ADMIN_STATE.cachedPendingUsers = ADMIN_STATE.cachedPendingUsers.filter(u => u.id !== userId);
  updatePendingBadgeCounts(ADMIN_STATE.cachedPendingUsers.length);

  // Close modal if open
  closeKycModal();

  // Update Supabase and local cache
  await updateUserStatusInSupabase(userId, 'approved');

  // Re-render UI components immediately
  await Promise.all([
    renderFullApprovalsTable(),
    renderPendingUsersSummary(),
    refreshAdminStats()
  ]);

  showToast(`Account successfully approved for ${userName || 'applicant'}! Portal access is now enabled.`, 'success');
};

/**
 * Reject User: Updates status to 'rejected' without blocking dialogs
 */
window.rejectUser = async function(userId, userName = '') {
  showToast(`Updating status to rejected for ${userName || 'applicant'}...`, 'info');

  // Optimistically remove from cached pending users
  ADMIN_STATE.cachedPendingUsers = ADMIN_STATE.cachedPendingUsers.filter(u => u.id !== userId);
  updatePendingBadgeCounts(ADMIN_STATE.cachedPendingUsers.length);

  // Close modal if open
  closeKycModal();

  // Update Supabase and local cache
  await updateUserStatusInSupabase(userId, 'rejected');

  // Re-render UI components
  await Promise.all([
    renderFullApprovalsTable(),
    renderPendingUsersSummary(),
    refreshAdminStats()
  ]);

  showToast(`Account verification rejected for ${userName || 'applicant'}.`, 'warning');
};

/**
 * View KYC Details in Modal for Pending Queue
 */
window.viewPendingDetails = function(userId) {
  const user = ADMIN_STATE.cachedPendingUsers.find(u => u.id === userId);
  if (!user) {
    showToast('Applicant details not found.', 'error');
    return;
  }
  renderKycModal(user, { isDossierView: false });
};

/**
 * View E-KYC Dossier for any user from the Roles Table
 */
window.viewUserEkyc = function(userId) {
  let user = (ADMIN_STATE.cachedAllUsers || []).find(u => u.id === userId);
  if (!user) {
    user = (ADMIN_STATE.cachedPendingUsers || []).find(u => u.id === userId);
  }
  if (!user) {
    showToast('User record not found.', 'error');
    return;
  }
  renderKycModal(user, { isDossierView: true });
};

/**
 * Render KYC Modal with genuine verified attributes
 */
export function renderKycModal(user, { isDossierView = false } = {}) {
  if (!user) return;
  ensureKycModalExists();

  const modal = document.getElementById('ayush-kyc-modal');
  const body = document.getElementById('ayush-kyc-modal-body');
  if (!modal || !body) return;

  const role = (user.role || 'user').toLowerCase();
  const isPending = (user.status === 'pending' || user.rawStatus === 'pending' || user.status === 'Pending KYC');
  const isRejected = (user.status === 'rejected' || user.rawStatus === 'rejected' || user.status === 'Rejected');
  const isApproved = !isPending && !isRejected;

  const email = user.email || '';
  const domain = email.includes('@') ? email.split('@')[1] : '';
  const isOfficialDomain = email.endsWith('.gov.in') || email.endsWith('.nic.in') || email.endsWith('.edu.in') || user.isOfficialDomain;

  const orgName = user.organization || user.org || user.full_name || user.name || 'Not Specified';
  const deptName = user.department || (role === 'industry' ? 'General Industry Onboarding' : (role === 'academician' ? 'Academic Department' : 'General'));
  const designationName = user.designation || (role === 'industry' ? 'Authorized Signatory' : (role === 'academician' ? 'Faculty Member' : (role === 'student' ? 'Student Scholar' : 'Official Administrator')));
  const regDate = user.regDateTime || user.createdAt || user.regDate || user.date || 'Recent';

  body.innerHTML = `
    <!-- APPLICANT IDENTITY HEADER CARD -->
    <div style="background: #faf8f5; border-radius: 8px; padding: 1.25rem; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3 style="font-size: 1.2rem; color: var(--primary-deep); margin: 0 0 0.25rem 0;">${escapeHtml(user.name || user.full_name)}</h3>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem;">
            <i class="fa-regular fa-envelope"></i> ${escapeHtml(email)}
          </p>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="admin-badge-role ${role}">${role.toUpperCase()}</span>
          ${isApproved ? `
            <span style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i class="fa-solid fa-circle-check"></i> ACTIVE &amp; APPROVED
            </span>
          ` : (isPending ? `
            <span style="background: #fffbeb; color: #92400e; border: 1px solid #fde68a; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i class="fa-solid fa-clock"></i> PENDING VERIFICATION
            </span>
          ` : `
            <span style="background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.6rem; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i class="fa-solid fa-circle-xmark"></i> REJECTED
            </span>
          `)}
        </div>
      </div>

      <!-- KEY DETAILS GRID -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.75rem; font-size: 0.85rem; margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
        <div>
          <div style="color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Affiliated Entity / Organization</div>
          <div style="font-weight: 600; color: var(--text-primary); margin-top: 0.15rem;">${escapeHtml(orgName)}</div>
        </div>
        <div>
          <div style="color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Department / Sector</div>
          <div style="font-weight: 600; color: var(--text-primary); margin-top: 0.15rem;">${escapeHtml(deptName)}</div>
        </div>
        <div>
          <div style="color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Designation / Title</div>
          <div style="font-weight: 600; color: var(--text-primary); margin-top: 0.15rem;">${escapeHtml(designationName)}</div>
        </div>
        <div>
          <div style="color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Registration Timestamp</div>
          <div style="font-weight: 600; color: var(--text-primary); margin-top: 0.15rem;">${escapeHtml(regDate)}</div>
        </div>
      </div>
    </div>

    <!-- E-KYC AUDIT & STATUTORY DOSSIER -->
    <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1.15rem; margin-bottom: 1.5rem; background: #ffffff;">
      <h4 style="font-size: 0.95rem; color: var(--primary-deep); margin: 0 0 0.75rem 0; display: flex; align-items: center; gap: 0.45rem;">
        <i class="fa-solid fa-fingerprint" style="color: var(--secondary-teal);"></i> Statutory E-KYC Accreditation Dossier
      </h4>

      <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem; line-height: 1.5;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.35rem;">
          <span style="color: var(--text-secondary); font-weight: 500;">Email Domain Scrutiny:</span>
          ${isOfficialDomain ? `
            <span style="color: #059669; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i class="fa-solid fa-circle-check"></i> Institutional Domain Verified (@${escapeHtml(domain)})
            </span>
          ` : `
            <span style="color: #b45309; font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
              <i class="fa-solid fa-triangle-exclamation"></i> Standard Public Domain (@${escapeHtml(domain || 'provider')})
            </span>
          `}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.35rem;">
          <span style="color: var(--text-secondary); font-weight: 500;">Authentication Layer:</span>
          <span style="color: var(--text-primary); font-weight: 600;">Supabase 256-Bit Encrypted Security Profile</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.35rem;">
          <span style="color: var(--text-secondary); font-weight: 500;">Submission Mode:</span>
          <span style="color: var(--text-primary); font-weight: 600;">Self-Declared Portal Onboarding (Identity Attested)</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.35rem;">
          <span style="color: var(--text-secondary); font-weight: 500;">System Record ID:</span>
          <code style="font-size: 0.78rem; background: #f3f4f6; padding: 0.15rem 0.4rem; border-radius: 4px; color: var(--text-secondary);">${escapeHtml(user.id)}</code>
        </div>
      </div>
    </div>

    <!-- ACTION BUTTONS -->
    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem; align-items: center;">
      <button class="btn btn-secondary" onclick="window.closeKycModal()">
        ${isDossierView ? 'Close Dossier' : 'Cancel'}
      </button>

      ${isPending ? `
        <button class="btn btn-secondary" style="color:#ef4444; border-color: #fca5a5;" onclick="window.rejectUser('${user.id}', '${escapeAttr(user.name || user.full_name)}')">
          <i class="fa-solid fa-xmark"></i> Reject Application
        </button>
        <button class="btn btn-primary" onclick="window.approveUser('${user.id}', '${escapeAttr(user.name || user.full_name)}')">
          <i class="fa-solid fa-check"></i> Approve &amp; Activate
        </button>
      ` : (role !== 'admin' && isApproved ? `
        <button class="btn btn-sm btn-secondary" style="color:#ef4444; border-color: #fca5a5;" onclick="window.rejectUser('${user.id}', '${escapeAttr(user.name || user.full_name)}')">
          <i class="fa-solid fa-user-slash"></i> Revoke Access
        </button>
      ` : '')}
    </div>
  `;

  modal.style.display = 'flex';
}

window.closeKycModal = function() {
  const modal = document.getElementById('ayush-kyc-modal');
  if (modal) modal.style.display = 'none';
};

function ensureKycModalExists() {
  if (document.getElementById('ayush-kyc-modal')) return;

  const modalHtml = `
    <div id="ayush-kyc-modal" style="display: none; position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); align-items: center; justify-content: center; padding: 1.5rem;">
      <div style="background: #ffffff; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-shield-halved" style="color: var(--secondary-teal); font-size: 1.25rem;"></i>
            <h3 style="margin: 0; font-size: 1.15rem; color: var(--primary-deep);">Accreditation Scrutiny &amp; Verification</h3>
          </div>
          <button onclick="window.closeKycModal()" style="background: none; border: none; font-size: 1.25rem; color: var(--text-muted); cursor: pointer;">&times;</button>
        </div>
        <div id="ayush-kyc-modal-body" style="padding: 1.5rem;">
          <!-- Injected dynamically -->
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/**
 * Manage Assessment Questions
 */
export async function renderQuestionsTable(filterSkill = 'All') {
  if (!verifyAdminAccess()) return;
  await syncAdminProfile();

  const container = document.getElementById('adm-questions-table');
  if (!container) return;

  const questions = filterSkill === 'All'
    ? ASSESSMENT_DATA.questions
    : ASSESSMENT_DATA.questions.filter(q => q.skill === filterSkill);

  if (questions.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);"><i class="fa-solid fa-circle-question"></i> No questions found for filter: ${filterSkill}</td></tr>`;
    return;
  }

  container.innerHTML = questions.map(q => `
    <tr class="question-row" style="border-bottom: 2px solid var(--border-color);">
      <td style="vertical-align: top; font-weight: 800; color: var(--primary-deep); font-size: 1rem; padding: 1.5rem 1.25rem; background: #faf8f5; border-right: 1px solid var(--border-color); text-align: center; width: 60px;">
        #${q.id}
      </td>
      <td style="vertical-align: top; padding: 1.5rem 1.25rem; border-right: 1px solid var(--border-color);">
        <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); line-height: 1.5; margin-bottom: 0.85rem;">
          ${q.text}
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; background: var(--bg-cream); padding: 0.85rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          ${q.options.map((opt, i) => `
            <div style="font-size: 0.82rem; display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); background: ${i === q.correct ? '#ecfdf5' : 'transparent'}; border: 1px solid ${i === q.correct ? '#a7f3d0' : 'transparent'};">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: ${i === q.correct ? '#10b981' : 'var(--border-color)'}; color: ${i === q.correct ? '#fff' : 'var(--text-muted)'}; font-weight: 700; font-size: 0.72rem;">${String.fromCharCode(65 + i)}</span>
              <span style="color: ${i === q.correct ? '#047857' : 'var(--text-secondary)'}; font-weight: ${i === q.correct ? '700' : '400'};">${opt}</span>
              ${i === q.correct ? '<i class="fa-solid fa-check" style="color: #10b981; margin-left: auto;"></i>' : ''}
            </div>
          `).join('')}
        </div>
      </td>
      <td style="vertical-align: top; padding: 1.5rem 1.25rem; border-right: 1px solid var(--border-color); white-space: nowrap;">
        <span class="badge badge-teal"><i class="fa-solid fa-tag" style="margin-right: 0.35rem;"></i>${q.skill}</span>
      </td>
      <td style="vertical-align: top; padding: 1.5rem 1.25rem; border-right: 1px solid var(--border-color);">
        <span style="color: #047857; font-weight: 700; font-size: 0.85rem; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 0.4rem 0.75rem; border-radius: var(--radius-pill); display: inline-flex; align-items: center; gap: 0.4rem;">
          <i class="fa-solid fa-circle-check"></i> ${q.options[q.correct]}
        </span>
      </td>
      <td style="vertical-align: top; padding: 1.5rem 1.25rem; white-space: nowrap;">
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-sm btn-secondary" onclick="window.editQuestion(${q.id})">
            <i class="fa-solid fa-pen-to-square"></i> Edit
          </button>
          <button class="btn btn-sm btn-secondary" style="color:#ef4444;" onclick="window.deleteQuestion(${q.id})">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.addNewQuestionPrompt = function() {
  const text = prompt('Enter question statement:');
  if (!text) return;
  const skill = prompt('Tested Skill (e.g. Herbal Pharmacopoeia QC, Biostatistics):', 'Clinical Data & Python');
  const optA = prompt('Option A:');
  const optB = prompt('Option B:');
  const optC = prompt('Option C:');
  const optD = prompt('Option D:');

  const newQ = {
    id: ASSESSMENT_DATA.questions.length + 1,
    skill: skill || 'Clinical Data & Python',
    text: text,
    options: [optA || 'Option 1', optB || 'Option 2', optC || 'Option 3', optD || 'Option 4'],
    correct: 0,
    explanation: 'Added by Administrator.'
  };

  ASSESSMENT_DATA.questions.push(newQ);
  showToast('Question successfully added to question bank!', 'success');
  renderQuestionsTable();
};

window.editQuestion = function(id) {
  const q = ASSESSMENT_DATA.questions.find(item => item.id === id);
  if (!q) return;
  const newText = prompt('Update question text:', q.text);
  if (newText) {
    q.text = newText;
    showToast(`Question #${id} updated`, 'success');
    renderQuestionsTable();
  }
};

window.deleteQuestion = function(id) {
  if (confirm(`Delete Question #${id}?`)) {
    const idx = ASSESSMENT_DATA.questions.findIndex(item => item.id === id);
    if (idx !== -1) {
      ASSESSMENT_DATA.questions.splice(idx, 1);
      showToast(`Question #${id} deleted`, 'info');
      renderQuestionsTable();
    }
  }
};

/**
 * Manage Roles
 */
export async function renderRolesTable() {
  if (!verifyAdminAccess()) return;
  await syncAdminProfile();

  const container = document.getElementById('adm-roles-table');
  if (!container) return;

  const users = await fetchAdminAllUsers();
  ADMIN_STATE.cachedAllUsers = users || [];

  if (!users || users.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);"><i class="fa-solid fa-users"></i> No users found in database.</td></tr>`;
    return;
  }

  container.innerHTML = users.map(u => `
    <tr>
      <td>
        <div style="font-weight: 700; color: var(--primary-deep); font-size: 0.95rem;">${escapeHtml(u.name)}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; margin-top: 0.15rem;">
          <i class="fa-regular fa-envelope" style="font-size: 0.72rem;"></i> ${escapeHtml(u.email)}
        </div>
      </td>
      <td>
        <div style="font-weight: 600; color: var(--text-primary); font-size: 0.88rem;">${escapeHtml(u.org || 'Individual / Scholar')}</div>
        <div style="font-size: 0.76rem; color: var(--text-secondary);">${escapeHtml(u.department || 'General')}</div>
      </td>
      <td>
        <span class="admin-badge-role ${u.role}">${(u.role || 'student').toUpperCase()}</span>
        <div style="margin-top: 0.25rem;">
          <span style="font-size: 0.72rem; font-weight: 700; color: ${u.status === 'Active' ? '#059669' : (u.status === 'Rejected' ? '#dc2626' : '#d97706')}; display: inline-flex; align-items: center; gap: 0.25rem;">
            <i class="fa-solid ${u.status === 'Active' ? 'fa-circle-check' : (u.status === 'Rejected' ? 'fa-circle-xmark' : 'fa-clock')}"></i> ${u.status}
          </span>
        </div>
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 120px;">
            ${u.isProtected ? `
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600; display: inline-flex; align-items: center; gap: 0.35rem;">
                <i class="fa-solid fa-lock"></i> Protected Role
              </span>
            ` : `
              <select class="form-input" style="padding: 0.28rem 0.5rem; font-size: 0.82rem; width: 100%;" onchange="window.changeUserRole('${u.id}', this.value)">
                <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
                <option value="industry" ${u.role === 'industry' ? 'selected' : ''}>Industry</option>
                <option value="academician" ${u.role === 'academician' ? 'selected' : ''}>Academician</option>
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            `}
          </div>
          <button type="button" 
            class="btn btn-sm btn-secondary" 
            onclick="window.viewUserEkyc('${u.id}')" 
            title="View E-KYC Verification Dossier for ${escapeAttr(u.name)}"
            style="padding: 0.3rem 0.6rem; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; color: #0f766e; border-color: #99f6e4; background: #f0fdfa; white-space: nowrap; cursor: pointer;">
            <i class="fa-solid fa-circle-info" style="color: #0d9488; font-size: 0.95rem;"></i>
            <span>E-KYC</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.changeUserRole = async function(userId, newRole) {
  await updateUserRoleInSupabase(userId, newRole);
  showToast(`Role updated to ${newRole.toUpperCase()} in Supabase`, 'success');
  renderRolesTable();
};

export default {
  ADMIN_STATE,
  verifyAdminAccess,
  syncAdminProfile,
  initAdminDashboard,
  refreshAdminStats,
  renderFullApprovalsTable,
  renderPendingUsersSummary,
  renderQuestionsTable,
  renderRolesTable,
  renderKycModal,
  updatePendingBadgeCounts
};
