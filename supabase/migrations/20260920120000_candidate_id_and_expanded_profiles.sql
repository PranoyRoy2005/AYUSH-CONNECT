-- ==============================================================================
-- AYUSH CONNECT — Candidate ID & Expanded Profile Columns Migration
-- ==============================================================================

-- 1. Ensure candidate_id exists on profiles and role tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS candidate_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_candidate_id ON public.profiles(candidate_id) WHERE candidate_id IS NOT NULL;

ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS candidate_id TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS graduation_year TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS preferred_location TEXT;
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}';

ALTER TABLE public.industry_profiles ADD COLUMN IF NOT EXISTS candidate_id TEXT;
ALTER TABLE public.industry_profiles ADD COLUMN IF NOT EXISTS work_email TEXT;
ALTER TABLE public.industry_profiles ADD COLUMN IF NOT EXISTS work_phone TEXT;
ALTER TABLE public.industry_profiles ADD COLUMN IF NOT EXISTS hiring_domains TEXT[] DEFAULT '{}';
ALTER TABLE public.industry_profiles ADD COLUMN IF NOT EXISTS company_address TEXT;

ALTER TABLE public.academician_profiles ADD COLUMN IF NOT EXISTS candidate_id TEXT;
ALTER TABLE public.academician_profiles ADD COLUMN IF NOT EXISTS experience_years NUMERIC DEFAULT 0;
ALTER TABLE public.academician_profiles ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}';

-- 2. Candidate ID sequence & generator function
CREATE SEQUENCE IF NOT EXISTS seq_ayush_stu_id START WITH 100001;
CREATE SEQUENCE IF NOT EXISTS seq_ayush_ind_id START WITH 100001;
CREATE SEQUENCE IF NOT EXISTS seq_ayush_aca_id START WITH 100001;

CREATE OR REPLACE FUNCTION generate_ayush_candidate_id(user_role TEXT)
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
BEGIN
  IF lower(user_role) = 'student' THEN
    new_id := 'AYU-STU-' || LPAD(nextval('seq_ayush_stu_id')::TEXT, 6, '0');
  ELSIF lower(user_role) = 'industry' THEN
    new_id := 'AYU-IND-' || LPAD(nextval('seq_ayush_ind_id')::TEXT, 6, '0');
  ELSIF lower(user_role) = 'academician' THEN
    new_id := 'AYU-ACA-' || LPAD(nextval('seq_ayush_aca_id')::TEXT, 6, '0');
  ELSE
    new_id := 'AYU-USR-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
  END IF;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign candidate_id if missing upon profile completion
CREATE OR REPLACE FUNCTION trg_set_candidate_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.profile_completed = TRUE AND (NEW.candidate_id IS NULL OR NEW.candidate_id = '') THEN
    NEW.candidate_id := generate_ayush_candidate_id(NEW.role);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_candidate_id ON public.profiles;
CREATE TRIGGER trigger_set_candidate_id
  BEFORE INSERT OR UPDATE OF profile_completed ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_candidate_id();
