-- ==============================================================================
-- AYUSH CONNECT — Admin Auth & Role-Based Approval Workflow Migration
-- Smart India Hackathon (SIH) 2026 & Ministry of AYUSH
-- ==============================================================================

-- 1. Add is_approved and rejection_reason columns to public.profiles if not present
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Ensure status column has proper check constraint
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_status_check 
  CHECK (status IN ('active', 'pending', 'approved', 'rejected', 'suspended'));

-- 3. Backfill existing profiles:
-- Students and Admins are active and approved by default
UPDATE public.profiles 
SET is_approved = TRUE, status = 'active', is_verified = TRUE 
WHERE role IN ('student', 'admin') AND (is_approved IS NULL OR is_approved = FALSE);

-- Industry and Academician profiles with status 'approved' have is_approved = true
UPDATE public.profiles 
SET is_approved = TRUE, is_verified = TRUE 
WHERE role IN ('industry', 'academician') AND status = 'approved';

-- Industry and Academician profiles with status 'pending' have is_approved = false
UPDATE public.profiles 
SET is_approved = FALSE, is_verified = FALSE 
WHERE role IN ('industry', 'academician') AND (status IS NULL OR status = 'pending');

-- 4. Update automated trigger on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  user_name TEXT;
  user_avatar TEXT;
  initial_status TEXT;
  initial_approved BOOLEAN;
BEGIN
  -- Extract metadata safely
  assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );
  user_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );

  -- Students are immediately active; Industry and Academician need admin approval
  IF assigned_role = 'student' THEN
    initial_status := 'active';
    initial_approved := TRUE;
  ELSIF assigned_role = 'admin' THEN
    initial_status := 'active';
    initial_approved := TRUE;
  ELSE
    initial_status := 'pending';
    initial_approved := FALSE;
  END IF;

  -- Insert Base Profile
  INSERT INTO public.profiles (
    id, 
    role, 
    full_name, 
    email, 
    avatar_url, 
    status, 
    is_approved, 
    is_verified
  )
  VALUES (
    NEW.id,
    assigned_role,
    user_name,
    NEW.email,
    user_avatar,
    initial_status,
    initial_approved,
    initial_approved
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

  -- Initialize Role Subtable
  IF assigned_role = 'student' THEN
    INSERT INTO public.student_profiles (profile_id, college_institution, course, year, graduation_year)
    VALUES (NEW.id, 'National Institute of Ayurveda', 'BAMS (Ayurvedic Medicine & Surgery)', '3rd Year', '2027')
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF assigned_role = 'industry' THEN
    INSERT INTO public.industry_profiles (profile_id, company_name, designation, industry_sector, is_verified)
    VALUES (NEW.id, user_name || ' Enterprises', 'Talent Lead', 'Ayurvedic Healthcare & R&D', FALSE)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF assigned_role = 'academician' THEN
    INSERT INTO public.academician_profiles (profile_id, institution, department, designation, is_verified)
    VALUES (NEW.id, 'National Institute of Ayurveda', 'Department of Clinical Pharmacology', 'Professor', FALSE)
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF assigned_role = 'admin' THEN
    INSERT INTO public.admin_profiles (profile_id, ministry_department, designation)
    VALUES (NEW.id, 'Ministry of AYUSH Central Directorate', 'Administrator')
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Strict Security Trigger: Only Admins can modify status, is_approved, or role
CREATE OR REPLACE FUNCTION public.check_profile_update_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- If updating user is NOT an admin, forbid altering sensitive fields
  IF NOT public.is_admin(auth.uid()) THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access Denied: Only Ministry Administrators can modify user roles.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Access Denied: Only Ministry Administrators can update account approval status.';
    END IF;
    IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
      RAISE EXCEPTION 'Access Denied: Only Ministry Administrators can update account approval status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_admin_profile_updates ON public.profiles;
CREATE TRIGGER tr_enforce_admin_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_update_permission();

-- 6. Row Level Security Policies for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users modify own profile" ON public.profiles;
CREATE POLICY "Users modify own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins approve or reject profiles" ON public.profiles;
CREATE POLICY "Admins approve or reject profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin(auth.uid()));
