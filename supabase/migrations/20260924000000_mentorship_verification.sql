-- ==============================================================================
-- AYUSH CONNECT — Mentorship Verification System Migration
-- Smart India Hackathon (SIH) 2026 & Ministry of AYUSH Digital Platform
--
-- Features:
-- 1. Profiles & Student Profiles verified columns (is_verified, verified_by_academician_id, verified_at)
-- 2. Mentorship requests table with status ('pending', 'accepted', 'rejected')
-- 3. Constraint: Only 1 active ('pending' or 'accepted') mentorship request per student
-- 4. Unique constraint: Prevents duplicate requests to the same academician
-- 5. Row Level Security (RLS) policies & SECURITY DEFINER trigger:
--    Students cannot self-verify; verification is triggered strictly by academician approval.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROFILE VERIFICATION COLUMNS
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_by_academician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.is_verified IS 'True when student has been officially verified by an approved AYUSH academician faculty mentor.';
COMMENT ON COLUMN public.profiles.verified_by_academician_id IS 'FK to profiles.id of the academician who verified this student.';
COMMENT ON COLUMN public.profiles.verified_at IS 'Timestamp of when the academician verified the student.';

-- Also add to student_profiles for unified role joins
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_by_academician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- ------------------------------------------------------------------------------
-- 2. MENTORSHIP REQUESTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentorship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  academician_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_student_academician UNIQUE (student_id, academician_id)
);

COMMENT ON TABLE public.mentorship_requests IS 'Mentorship requests connecting AYUSH students with verified institutional academician faculty.';

-- ------------------------------------------------------------------------------
-- 3. SINGLE ACTIVE MENTORSHIP CONSTRAINT
-- Prevents a student from having more than ONE 'pending' or 'accepted' request across all academicians.
-- ------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_mentorship_requests_single_active
  ON public.mentorship_requests (student_id)
  WHERE status IN ('pending', 'accepted');

-- Standard lookup indexes
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_student ON public.mentorship_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_academician ON public.mentorship_requests(academician_id);
CREATE INDEX IF NOT EXISTS idx_mentorship_requests_status ON public.mentorship_requests(status);

-- ------------------------------------------------------------------------------
-- 4. SECURITY DEFINER TRIGGER: AUTOMATIC VERIFICATION ON ACCEPT
-- Ensures students cannot tamper with or self-assign is_verified.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_mentorship_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    -- Verify the student and record the verifying academician
    UPDATE public.profiles
    SET is_verified = TRUE,
        verified_by_academician_id = NEW.academician_id,
        verified_at = COALESCE(NEW.reviewed_at, NOW()),
        updated_at = NOW()
    WHERE id = NEW.student_id;

    UPDATE public.student_profiles
    SET is_verified = TRUE,
        verified_by_academician_id = NEW.academician_id,
        verified_at = COALESCE(NEW.reviewed_at, NOW()),
        updated_at = NOW()
    WHERE profile_id = NEW.student_id;

  ELSIF NEW.status = 'rejected' THEN
    -- Only revoke if this specific academician was the verifier
    UPDATE public.profiles
    SET is_verified = FALSE,
        verified_by_academician_id = NULL,
        verified_at = NULL,
        updated_at = NOW()
    WHERE id = NEW.student_id AND verified_by_academician_id = NEW.academician_id;

    UPDATE public.student_profiles
    SET is_verified = FALSE,
        verified_by_academician_id = NULL,
        verified_at = NULL,
        updated_at = NOW()
    WHERE profile_id = NEW.student_id AND verified_by_academician_id = NEW.academician_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_mentorship_status_change ON public.mentorship_requests;
CREATE TRIGGER trigger_mentorship_status_change
  AFTER UPDATE OF status ON public.mentorship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_mentorship_status_change();

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

-- Students can read their own mentorship requests
DROP POLICY IF EXISTS "Students view own mentorship requests" ON public.mentorship_requests;
CREATE POLICY "Students view own mentorship requests"
  ON public.mentorship_requests
  FOR SELECT
  USING (auth.uid() = student_id);

-- Students can create mentorship requests where student_id = auth.uid()
DROP POLICY IF EXISTS "Students insert own mentorship requests" ON public.mentorship_requests;
CREATE POLICY "Students insert own mentorship requests"
  ON public.mentorship_requests
  FOR INSERT
  WITH CHECK (auth.uid() = student_id AND status = 'pending');

-- Academicians can read mentorship requests directed to them
DROP POLICY IF EXISTS "Academicians view requests to them" ON public.mentorship_requests;
CREATE POLICY "Academicians view requests to them"
  ON public.mentorship_requests
  FOR SELECT
  USING (auth.uid() = academician_id);

-- Academicians can update requests directed to them (to accept or reject)
DROP POLICY IF EXISTS "Academicians update requests to them" ON public.mentorship_requests;
CREATE POLICY "Academicians update requests to them"
  ON public.mentorship_requests
  FOR UPDATE
  USING (auth.uid() = academician_id)
  WITH CHECK (auth.uid() = academician_id);

-- Admins have full access
DROP POLICY IF EXISTS "Admins full mentorship access" ON public.mentorship_requests;
CREATE POLICY "Admins full mentorship access"
  ON public.mentorship_requests
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 6. SECURITY: PREVENT STUDENT SELF-VERIFICATION
-- Direct updates by students to is_verified, verified_by_academician_id,
-- or verified_at are blocked and stripped. These can only be set via the
-- SECURITY DEFINER trigger executed when an academician accepts the request.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_student_self_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- If non-admin user is modifying their own profile record
  IF auth.uid() = NEW.id AND NOT public.is_admin(auth.uid()) THEN
    -- If verification columns are being modified, revert them to old values
    IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified) OR
       (NEW.verified_by_academician_id IS DISTINCT FROM OLD.verified_by_academician_id) OR
       (NEW.verified_at IS DISTINCT FROM OLD.verified_at) THEN
      NEW.is_verified := OLD.is_verified;
      NEW.verified_by_academician_id := OLD.verified_by_academician_id;
      NEW.verified_at := OLD.verified_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_self_verification ON public.profiles;
CREATE TRIGGER trigger_prevent_self_verification
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_student_self_verification();

-- Repeat for student_profiles table
CREATE OR REPLACE FUNCTION public.prevent_student_profiles_self_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() = NEW.profile_id AND NOT public.is_admin(auth.uid()) THEN
    IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified) OR
       (NEW.verified_by_academician_id IS DISTINCT FROM OLD.verified_by_academician_id) OR
       (NEW.verified_at IS DISTINCT FROM OLD.verified_at) THEN
      NEW.is_verified := OLD.is_verified;
      NEW.verified_by_academician_id := OLD.verified_by_academician_id;
      NEW.verified_at := OLD.verified_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_student_profiles_self_verification ON public.student_profiles;
CREATE TRIGGER trigger_prevent_student_profiles_self_verification
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_student_profiles_self_verification();

-- ------------------------------------------------------------------------------
-- 7. INDUSTRY READ-ONLY ACCESS TO APPLICANT VERIFICATION STATUS
-- Industry users can read is_verified for applicants who applied to their jobs,
-- but have zero UPDATE permissions.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Industry view applicant verification" ON public.profiles;
CREATE POLICY "Industry view applicant verification"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.opportunities o ON a.opportunity_id = o.id
      WHERE a.student_id = profiles.id
        AND o.industry_id = auth.uid()
    )
    OR role = 'academician'
    OR id = auth.uid()
    OR public.is_admin(auth.uid())
  );

