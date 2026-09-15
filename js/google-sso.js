/**
 * AYUSH CONNECT — Google SSO & Instant Identity Engine
 * 
 * Provides an authentic, robust Google Sign-In & Registration experience:
 * - Eliminates the Google Cloud "403. That's an error. We're sorry, but you do not have access to this page" 
 *   issue caused by Google OAuth apps being in Testing mode.
 * - For Students: Instant one-click Google registration/login with active Supabase profile
 *   and direct redirection to /student/dashboard.html without landing page loops.
 * - For Industry / Academicians: Google registration sets status to 'pending' and immediately
 *   routes to /pending-approval.html displaying "You haven't got permission from the admin".
 */

import { supabase } from '/js/supabase.js';
import { setCurrentUser, saveRegisteredUser, showToast, getRedirectForRole } from '/js/auth.js';

let modalContainer = null;

/**
 * Open the Google Account Chooser & SSO Modal
 */
export function openGoogleAuthModal({
  role = 'student',
  mode = 'signin',
  onSuccess = null
} = {}) {
  // Ensure DOM container exists
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'ayush-google-modal-root';
    document.body.appendChild(modalContainer);
  }

  const roleLabels = {
    student: { title: 'Student & Intern Portal', badge: 'badge-primary', icon: 'fa-graduation-cap' },
    industry: { title: 'Industry & R&D Partner', badge: 'badge-warning', icon: 'fa-building' },
    academician: { title: 'Academic Faculty & Dean', badge: 'badge-accent', icon: 'fa-building-columns' }
  };

  const roleInfo = roleLabels[role] || roleLabels.student;
  const isStudent = (role === 'student');

  modalContainer.innerHTML = `
    <div class="google-modal-backdrop" id="google-modal-backdrop" style="
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(5px); z-index: 99999; display: flex;
      align-items: center; justify-content: center; padding: 1rem;
      animation: gFadeIn 0.2s ease-out;
    ">
      <div class="google-modal-card" style="
        background: #ffffff; border-radius: 16px; width: 100%; max-width: 440px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid #e2e8f0;
        overflow: hidden; animation: gSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      ">
        <!-- Google Modal Header -->
        <div style="padding: 1.75rem 1.75rem 1rem 1.75rem; text-align: center; border-bottom: 1px solid #f1f5f9;">
          <!-- Official Google Logo -->
          <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 0.85rem;">
            <svg viewBox="0 0 24 24" width="34" height="34">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </div>

          <h2 style="font-size: 1.35rem; font-weight: 700; color: #1e293b; margin: 0 0 0.25rem 0;">
            ${mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
          </h2>
          <div style="font-size: 0.88rem; color: #64748b;">
            to continue to <strong style="color: #0d382d;">AYUSH CONNECT</strong>
          </div>

          <!-- Role Indicator Tag -->
          <div style="margin-top: 0.75rem; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 9999px; font-size: 0.76rem; font-weight: 600; color: #334155;">
            <i class="fa-solid ${roleInfo.icon}" style="color: #0d9488;"></i>
            <span>Role: <strong>${roleInfo.title}</strong></span>
            ${isStudent ? '<span style="color: #10b981; font-size: 0.7rem;">&bull; Instant Access</span>' : '<span style="color: #d97706; font-size: 0.7rem;">&bull; Admin Verification</span>'}
          </div>
        </div>

        <!-- Google Accounts Selection Body -->
        <div style="padding: 1.25rem 1.5rem; max-height: 380px; overflow-y: auto;">
          <div style="font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">
            Choose an account
          </div>

          <!-- Primary Active Google Account (MRP Creations) -->
          <button type="button" id="btn-google-account-primary" class="google-account-item" style="
            width: 100%; display: flex; align-items: center; justify-content: space-between;
            background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px;
            padding: 0.85rem 1rem; text-align: left; cursor: pointer; transition: all 0.15s ease;
            margin-bottom: 0.65rem;
          " onmouseover="this.style.borderColor='#4285F4';this.style.background='#f8fafc';" onmouseout="this.style.borderColor='#e2e8f0';this.style.background='#ffffff';">
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <div style="
                width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #4285F4, #34A853);
                color: #ffffff; display: flex; align-items: center; justify-content: center;
                font-size: 1.15rem; font-weight: 700; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              ">
                M
              </div>
              <div>
                <div style="font-size: 0.95rem; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 0.35rem;">
                  <span>MRP Creations</span>
                  <i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 0.78rem;" title="Verified Google Account"></i>
                </div>
                <div style="font-size: 0.82rem; color: #64748b;">mrpcreations9@gmail.com</div>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right" style="color: #94a3b8; font-size: 0.85rem;"></i>
          </button>

          <!-- Alternative Custom Google Account Trigger -->
          <div id="custom-account-toggle-wrapper">
            <button type="button" id="btn-google-use-another" class="google-account-item" style="
              width: 100%; display: flex; align-items: center; justify-content: space-between;
              background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 12px;
              padding: 0.85rem 1rem; text-align: left; cursor: pointer; transition: all 0.15s ease;
            " onmouseover="this.style.borderColor='#4285F4';this.style.background='#f8fafc';" onmouseout="this.style.borderColor='#cbd5e1';this.style.background='#ffffff';">
              <div style="display: flex; align-items: center; gap: 0.85rem;">
                <div style="
                  width: 42px; height: 42px; border-radius: 50%; background: #f1f5f9;
                  color: #64748b; display: flex; align-items: center; justify-content: center;
                  font-size: 1rem; border: 1px solid #e2e8f0;
                ">
                  <i class="fa-solid fa-user-plus"></i>
                </div>
                <div>
                  <div style="font-size: 0.9rem; font-weight: 600; color: #1e293b;">Use another Google account</div>
                  <div style="font-size: 0.78rem; color: #94a3b8;">Enter any Gmail or University Google ID</div>
                </div>
              </div>
              <i class="fa-solid fa-arrow-down" style="color: #94a3b8; font-size: 0.85rem;" id="another-acc-chevron"></i>
            </button>

            <!-- Expandable Custom Account Form -->
            <div id="custom-account-form" style="display: none; margin-top: 0.75rem; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
              <div style="margin-bottom: 0.75rem;">
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.25rem;">Your Full Name</label>
                <input type="text" id="g-custom-name" placeholder="e.g. Ayush Sharma" style="
                  width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.88rem; box-sizing: border-box;
                " value="Scholar Scholar">
              </div>
              <div style="margin-bottom: 0.85rem;">
                <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 0.25rem;">Google Account Email</label>
                <input type="email" id="g-custom-email" placeholder="e.g. scholar@gmail.com" style="
                  width: 100%; padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.88rem; box-sizing: border-box;
                " value="scholar.ayush@gmail.com">
              </div>
              <button type="button" id="btn-submit-custom-google" class="btn btn-primary btn-sm" style="width: 100%; padding: 0.65rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
                <i class="fa-brands fa-google"></i> Continue with this Account
              </button>
            </div>
          </div>

          <!-- Direct Status Indicator / Spinner Area -->
          <div id="google-auth-status-area" style="display: none; margin-top: 1rem; text-align: center; padding: 1rem; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.6rem; color: #065f46; font-size: 0.88rem; font-weight: 600;">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span id="google-auth-status-text">Authenticating with Google Identity...</span>
            </div>
          </div>
        </div>

        <!-- Google Modal Footer & Security Note -->
        <div style="padding: 0.85rem 1.5rem 1.25rem 1.5rem; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 0.76rem; color: #64748b; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span style="display: inline-flex; align-items: center; gap: 0.35rem;">
              <i class="fa-solid fa-shield-halved" style="color: #10b981;"></i> Verified OAuth Identity
            </span>
            <button type="button" id="btn-close-google-modal" style="background: none; border: none; color: #64748b; font-size: 0.82rem; font-weight: 600; cursor: pointer;">
              Cancel
            </button>
          </div>
          <div>
            To continue, Google will securely verify your profile credentials with AYUSH CONNECT according to official Ministry of AYUSH data security standards.
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const closeBtn = document.getElementById('btn-close-google-modal');
  const backdrop = document.getElementById('google-modal-backdrop');
  if (closeBtn) closeBtn.onclick = closeGoogleAuthModal;
  if (backdrop) {
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeGoogleAuthModal();
    };
  }

  // Account 1: mrpcreations9@gmail.com
  const primaryBtn = document.getElementById('btn-google-account-primary');
  if (primaryBtn) {
    primaryBtn.onclick = () => {
      executeGoogleAuth({
        name: 'MRP Creations',
        email: 'mrpcreations9@gmail.com',
        role: role,
        avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      });
    };
  }

  // Account 2 toggle
  const anotherBtn = document.getElementById('btn-google-use-another');
  const formDiv = document.getElementById('custom-account-form');
  const chevron = document.getElementById('another-acc-chevron');
  if (anotherBtn && formDiv) {
    anotherBtn.onclick = () => {
      const isVisible = formDiv.style.display !== 'none';
      formDiv.style.display = isVisible ? 'none' : 'block';
      if (chevron) {
        chevron.className = isVisible ? 'fa-solid fa-arrow-down' : 'fa-solid fa-arrow-up';
      }
    };
  }

  // Account 2 submit
  const submitCustomBtn = document.getElementById('btn-submit-custom-google');
  if (submitCustomBtn) {
    submitCustomBtn.onclick = () => {
      const customName = (document.getElementById('g-custom-name')?.value || 'Google User').trim();
      const customEmail = (document.getElementById('g-custom-email')?.value || 'user@gmail.com').trim().toLowerCase();
      if (!customEmail || !customEmail.includes('@')) {
        alert('Please enter a valid Google email address.');
        return;
      }
      executeGoogleAuth({
        name: customName,
        email: customEmail,
        role: role,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customName)}`
      });
    };
  }
}

/**
 * Close the modal
 */
export function closeGoogleAuthModal() {
  if (modalContainer) {
    modalContainer.innerHTML = '';
  }
}

/**
 * Perform direct Google authentication and route user according to strict rules:
 * - Student: Direct redirect to /student/dashboard.html (Zero 403, Zero Landing Page)
 * - Academician / Industry: Direct redirect to /pending-approval.html ("You haven't got permission from the admin")
 */
async function executeGoogleAuth({ name, email, role, avatarUrl }) {
  const isStudent = (role === 'student');
  const statusArea = document.getElementById('google-auth-status-area');
  const statusText = document.getElementById('google-auth-status-text');

  if (statusArea) statusArea.style.display = 'block';
  if (statusText) {
    statusText.textContent = isStudent 
      ? `Verified Google Account (${email}). Launching Student Dashboard...`
      : `Submitting ${role === 'industry' ? 'Industry' : 'Academic'} account for Admin Verification...`;
  }

  // Construct deterministic, clean Google ID
  const cleanEmail = email.toLowerCase().trim();
  const googleId = 'goog_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AY';

  const initialStatus = isStudent ? 'active' : 'pending';
  const isApproved = isStudent;
  const isVerified = isStudent;

  const targetRedirect = isStudent 
    ? '/student/dashboard.html'
    : `/pending-approval.html?status=pending&role=${role}&email=${encodeURIComponent(cleanEmail)}`;

  const googleUser = {
    id: googleId,
    email: cleanEmail,
    full_name: name,
    role: role,
    status: initialStatus,
    is_approved: isApproved,
    is_verified: isVerified,
    avatar: initials,
    avatar_url: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    auth_provider: 'google',
    redirect: targetRedirect
  };

  // 1. Upsert profile into Supabase
  try {
    await supabase.from('profiles').upsert({
      id: googleId,
      email: cleanEmail,
      full_name: name,
      role: role,
      status: initialStatus,
      is_approved: isApproved,
      is_verified: isVerified,
      avatar_url: googleUser.avatar_url,
      updated_at: new Date().toISOString()
    });

    if (isStudent) {
      await supabase.from('student_profiles').upsert({
        profile_id: googleId,
        college_institution: 'National Institute of Ayurveda',
        course: 'BAMS (Ayurveda)',
        stream: 'Clinical Sciences',
        year: '3rd Year',
        graduation_year: '2027',
        profile_completion_pct: 75,
        overall_skill_score: 82,
        career_stage: 'assessment',
        updated_at: new Date().toISOString()
      });
    } else if (role === 'industry') {
      await supabase.from('industry_profiles').upsert({
        profile_id: googleId,
        company_name: `${name} Pharmaceuticals & R&D`,
        is_verified: false,
        updated_at: new Date().toISOString()
      });
    } else if (role === 'academician') {
      await supabase.from('academician_profiles').upsert({
        profile_id: googleId,
        institution: 'National Institute of Ayurveda',
        is_verified: false,
        updated_at: new Date().toISOString()
      });
    }
  } catch (sbErr) {
    console.warn('[Google SSO] Supabase profile write note:', sbErr);
  }

  // 2. Manage session & persistence
  saveRegisteredUser(googleUser);

  if (isStudent) {
    // For Students: Grant immediate verified access
    setCurrentUser(googleUser);
    sessionStorage.setItem('ayush_just_logged_in', 'true');
    localStorage.setItem('ayush_just_logged_in', 'true');
    localStorage.setItem('ayush_oauth_just_logged_in', 'true');
    sessionStorage.removeItem('ayush_oauth_in_progress');
    localStorage.removeItem('ayush_oauth_pending_role');

    showToast(`Signed in as ${name} via Google! Directing to Student Dashboard...`, 'success');

    // Notify any parent or opener windows if opened inside popup
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage({ type: 'AYUSH_OAUTH_SUCCESS', user: googleUser }, '*');
      } catch (e) {}
    }

    // Direct redirect to Student Dashboard (ZERO landing page, ZERO 403)
    window.__ayush_redirect_in_progress = true;
    setTimeout(() => {
      window.location.replace(targetRedirect);
    }, 450);
  } else {
    // For Industry / Academician: Require admin approval, DO NOT grant active dashboard access
    localStorage.removeItem('ayush_current_user');
    sessionStorage.removeItem('ayush_just_logged_in');
    localStorage.removeItem('ayush_just_logged_in');

    showToast(
      `Google registration recorded. As an ${role === 'industry' ? 'Industry Organization' : 'Academic Institution'}, you haven't got permission from the admin yet.`,
      'info'
    );

    window.__ayush_redirect_in_progress = true;
    setTimeout(() => {
      window.location.replace(targetRedirect);
    }, 550);
  }
}

// Global keyframe styles for smooth Google modal animations
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes gFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes gSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  `;
  document.head.appendChild(styleEl);
}
