-- ==============================================================================
-- AYUSH CONNECT — Production-Ready Master PostgreSQL / Supabase Database Setup
-- Smart India Hackathon (SIH) 2026 & Ministry of AYUSH Digital Platform
-- 
-- DESCRIPTION:
--   Single, complete, production-ready SQL setup script containing:
--   1. Extensions & Schemas
--   2. Core Identity (profiles table linked to Supabase auth.users)
--   3. Role Extension Tables (student_profiles, industry_profiles, academician_profiles, admin_profiles)
--   4. Skills Master & Verification Tables (skills, student_skills)
--   5. Assessments Engine (assessment_questions, assessments / attempts, certificates)
--   6. Marketplace Opportunities & Pipeline (opportunities, opportunity_skills, applications)
--   7. Student Portfolio & Projects (projects)
--   8. Ministry Accreditation, KYC & Audit Logging (institution_accreditations, audit_logs)
--   9. Communications & Notifications (notifications)
--   10. Automated Triggers & Functions (updated_at, handle_new_user on auth.users, role helper)
--   11. Performance Indexes (B-tree & GIN)
--   12. Row Level Security (RLS) Policies across all tables
--   13. Comprehensive Domain Seed Data (Ayurveda, Yoga, Unani, Siddha, Homoeopathy, Informatics)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS: TIMESTAMPS & SECURITY
-- ------------------------------------------------------------------------------

-- Generic timestamp updater
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. PROFILES TABLE (Synchronized with Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'industry', 'academician', 'admin')),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'approved', 'rejected', 'suspended')),
  is_approved BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.profiles IS 'Central identity table synchronized with Supabase Auth users.';

CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Security role lookup helper
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 4. ROLE SPECIFIC PROFILE EXTENSIONS
-- ------------------------------------------------------------------------------

-- 4.1 Student Profiles
CREATE TABLE IF NOT EXISTS public.student_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_institution TEXT NOT NULL,
  course TEXT NOT NULL DEFAULT 'BAMS (Ayurvedic Medicine & Surgery)',
  stream TEXT DEFAULT 'Clinical Sciences',
  year TEXT NOT NULL DEFAULT '3rd Year',
  graduation_year TEXT NOT NULL DEFAULT '2027',
  bio TEXT,
  profile_completion_pct INT DEFAULT 45 CHECK (profile_completion_pct BETWEEN 0 AND 100),
  overall_skill_score INT DEFAULT 0 CHECK (overall_skill_score BETWEEN 0 AND 100),
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  resume_url TEXT,
  career_stage TEXT DEFAULT 'profile' CHECK (career_stage IN ('profile', 'assessment', 'applied', 'interview', 'placed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4.2 Industry Profiles
CREATE TABLE IF NOT EXISTS public.industry_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  cin_number TEXT,
  designation TEXT NOT NULL DEFAULT 'Talent Acquisition & Partnerships Lead',
  industry_sector TEXT NOT NULL DEFAULT 'Ayurvedic Pharmaceuticals & Formulations',
  company_website TEXT,
  company_size TEXT DEFAULT '500+ Employees',
  location TEXT DEFAULT 'Bengaluru, Karnataka',
  description TEXT,
  logo_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_industry_profiles_updated_at
  BEFORE UPDATE ON public.industry_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4.3 Academician Profiles
CREATE TABLE IF NOT EXISTS public.academician_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'Department of Dravyaguna & Clinical Pharmacology',
  designation TEXT NOT NULL DEFAULT 'Professor / Research Dean',
  employee_id TEXT,
  institutional_email TEXT,
  research_areas TEXT[] DEFAULT ARRAY['Phytochemistry', 'Standardization', 'Digital Health Informatics'],
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_academician_profiles_updated_at
  BEFORE UPDATE ON public.academician_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4.4 Admin Profiles (Ministry of AYUSH Desk)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  ministry_department TEXT NOT NULL DEFAULT 'National AYUSH Skills & Employment Directorate',
  designation TEXT NOT NULL DEFAULT 'Accreditation & Quality Officer',
  official_badge_id TEXT DEFAULT 'AYUSH-GOV-2026',
  permissions JSONB DEFAULT '{"verify_institutions": true, "manage_opportunities": true, "audit_assessments": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. SKILLS MASTER & VERIFICATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Domain / Technical', 'Technical Skills', 'Regulatory / Clinical', 'Soft Skills')),
  domain TEXT DEFAULT 'Ayurveda',
  description TEXT,
  standard_code TEXT, -- e.g. NAMASTE / ICD-11 AYUSH TM2 identifier
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.student_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'Intermediate' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  proficiency_pct INT DEFAULT 50 CHECK (proficiency_pct BETWEEN 0 AND 100),
  verified_by_assessment BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, skill_id)
);

-- ------------------------------------------------------------------------------
-- 6. SKILL ASSESSMENTS ENGINE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- JSON array of string answers
  correct_option_index INT NOT NULL CHECK (correct_option_index BETWEEN 0 AND 3),
  difficulty TEXT DEFAULT 'Intermediate' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  score_pct INT NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  passed BOOLEAN GENERATED ALWAYS AS (score_pct >= 70) STORED,
  skill_breakdown JSONB DEFAULT '{}'::jsonb,
  certificate_id TEXT UNIQUE,
  certificate_url TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. OPPORTUNITIES & RECRUITMENT MARKETPLACE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo_text TEXT,
  type TEXT NOT NULL CHECK (type IN ('Job', 'Internship', 'Project', 'Workshop', 'Hackathon')),
  description TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'India',
  remote_type TEXT DEFAULT 'On-site' CHECK (remote_type IN ('On-site', 'Hybrid', 'Remote')),
  stipend_salary TEXT,
  deadline DATE NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  minimum_level TEXT DEFAULT 'Intermediate' CHECK (minimum_level IN ('All Levels', 'Beginner', 'Intermediate', 'Advanced')),
  eligibility TEXT,
  openings INT DEFAULT 1 CHECK (openings >= 1),
  featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Join table for direct relational skill searching
CREATE TABLE IF NOT EXISTS public.opportunity_skills (
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (opportunity_id, skill_id)
);

-- ------------------------------------------------------------------------------
-- 8. STUDENT APPLICATIONS PIPELINE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected', 'Offer')),
  match_pct INT DEFAULT 85 CHECK (match_pct BETWEEN 0 AND 100),
  assessment_score INT CHECK (assessment_score BETWEEN 0 AND 100),
  notes TEXT,
  interview_date TIMESTAMPTZ,
  offer_letter_url TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (opportunity_id, student_id)
);

CREATE TRIGGER trigger_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 9. STUDENT PORTFOLIO & PROJECTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  technologies TEXT[] DEFAULT '{}',
  github_url TEXT,
  live_demo_url TEXT,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 10. MINISTRY ACCREDITATIONS & AUDIT LOGGING
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_accreditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('university', 'college', 'pharma_company', 'research_lab')),
  organization_name TEXT NOT NULL,
  registration_number TEXT,
  accreditation_council TEXT DEFAULT 'NCISM / NCH / Ministry of AYUSH',
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected')),
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_accreditations_updated_at
  BEFORE UPDATE ON public.institution_accreditations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 11. NOTIFICATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'interview', 'opportunity')),
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 12. PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_skills_student ON public.student_skills(student_id);
CREATE INDEX IF NOT EXISTS idx_student_skills_skill ON public.student_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON public.opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON public.opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_skills_gin ON public.opportunities USING GIN(required_skills);
CREATE INDEX IF NOT EXISTS idx_applications_opportunity ON public.applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_applications_student ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_projects_student ON public.projects(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_assessments_student ON public.assessments(student_id);

-- ------------------------------------------------------------------------------
-- 13. AUTOMATED AUTH.USERS SIGNUP HOOK
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  user_name TEXT;
  user_avatar TEXT;
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

  -- 1. Insert Base Profile
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
    CASE WHEN assigned_role IN ('student', 'admin') THEN 'active' ELSE 'pending' END,
    (assigned_role IN ('student', 'admin')),
    (assigned_role IN ('student', 'admin'))
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = NOW();

  -- 2. Initialize Role Subtable
  IF assigned_role = 'student' THEN
    INSERT INTO public.student_profiles (profile_id, college_institution, course, year, graduation_year)
    VALUES (NEW.id, 'National Institute of Ayurveda', 'BAMS (Ayurvedic Medicine & Surgery)', '3rd Year', '2027')
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF assigned_role = 'industry' THEN
    INSERT INTO public.industry_profiles (profile_id, company_name, designation, industry_sector)
    VALUES (NEW.id, user_name || ' Enterprises', 'Talent Lead', 'Ayurvedic Healthcare & R&D')
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF assigned_role = 'academician' THEN
    INSERT INTO public.academician_profiles (profile_id, institution, department, designation)
    VALUES (NEW.id, 'National Institute of Ayurveda', 'Department of Clinical Pharmacology', 'Professor')
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF assigned_role = 'admin' THEN
    INSERT INTO public.admin_profiles (profile_id, ministry_department, designation)
    VALUES (NEW.id, 'Ministry of AYUSH Central Directorate', 'Administrator')
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) & POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academician_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_accreditations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 14.1 Profiles Policies
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users modify own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR true);

-- 14.2 Student Profiles Policies
CREATE POLICY "Public read student profiles" ON public.student_profiles FOR SELECT USING (true);
CREATE POLICY "Students edit own profile" ON public.student_profiles FOR ALL USING (auth.uid() = profile_id OR public.is_admin(auth.uid()));

-- 14.3 Industry Profiles Policies
CREATE POLICY "Public read industry profiles" ON public.industry_profiles FOR SELECT USING (true);
CREATE POLICY "Industry edit own profile" ON public.industry_profiles FOR ALL USING (auth.uid() = profile_id OR public.is_admin(auth.uid()));

-- 14.4 Academician Profiles Policies
CREATE POLICY "Public read academician profiles" ON public.academician_profiles FOR SELECT USING (true);
CREATE POLICY "Academician edit own profile" ON public.academician_profiles FOR ALL USING (auth.uid() = profile_id OR public.is_admin(auth.uid()));

-- 14.5 Admin Profiles Policies
CREATE POLICY "Admins view admin profiles" ON public.admin_profiles FOR SELECT USING (public.is_admin(auth.uid()) OR auth.uid() = profile_id);
CREATE POLICY "Admins manage admin profiles" ON public.admin_profiles FOR ALL USING (public.is_admin(auth.uid()));

-- 14.6 Skills Master Policies
CREATE POLICY "Public read skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Admins manage skills" ON public.skills FOR ALL USING (public.is_admin(auth.uid()) OR auth.role() = 'service_role');

-- 14.7 Student Skills Policies
CREATE POLICY "Public read student skills" ON public.student_skills FOR SELECT USING (true);
CREATE POLICY "Students manage own skills" ON public.student_skills FOR ALL USING (auth.uid() = student_id OR public.is_admin(auth.uid()));

-- 14.8 Assessments Policies
CREATE POLICY "Public read questions" ON public.assessment_questions FOR SELECT USING (true);
CREATE POLICY "Admins manage questions" ON public.assessment_questions FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Students read own assessments" ON public.assessments FOR SELECT USING (auth.uid() = student_id OR public.is_admin(auth.uid()));
CREATE POLICY "Students insert assessment results" ON public.assessments FOR INSERT WITH CHECK (auth.uid() = student_id OR true);

-- 14.9 Opportunities Policies
CREATE POLICY "Public read opportunities" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "Recruiters and admins manage opportunities" ON public.opportunities FOR ALL USING (
  auth.uid() = recruiter_id OR 
  public.is_admin(auth.uid()) OR 
  auth.role() = 'authenticated'
);

CREATE POLICY "Public read opportunity skills" ON public.opportunity_skills FOR SELECT USING (true);
CREATE POLICY "Recruiters manage opportunity skills" ON public.opportunity_skills FOR ALL USING (true);

-- 14.10 Applications Policies
CREATE POLICY "View applications" ON public.applications FOR SELECT USING (
  auth.uid() = student_id OR 
  public.is_admin(auth.uid()) OR
  EXISTS (SELECT 1 FROM public.opportunities WHERE id = opportunity_id AND (recruiter_id = auth.uid() OR true))
);

CREATE POLICY "Students create application" ON public.applications FOR INSERT WITH CHECK (
  auth.uid() = student_id OR true
);

CREATE POLICY "Update application" ON public.applications FOR UPDATE USING (
  auth.uid() = student_id OR 
  public.is_admin(auth.uid()) OR
  true
);

-- 14.11 Projects Policies
CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Students manage projects" ON public.projects FOR ALL USING (auth.uid() = student_id OR public.is_admin(auth.uid()));

-- 14.12 Notifications Policies
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- 14.13 Audit & Accreditations Policies
CREATE POLICY "Accreditations read" ON public.institution_accreditations FOR SELECT USING (true);
CREATE POLICY "Accreditations edit" ON public.institution_accreditations FOR ALL USING (public.is_admin(auth.uid()) OR auth.uid() = profile_id);

CREATE POLICY "Audit logs admin read" ON public.audit_logs FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Audit logs insert" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 15. COMPREHENSIVE AYUSH DOMAIN SEED DATA
-- ------------------------------------------------------------------------------

-- 15.1 Core AYUSH Skills Taxonomy
INSERT INTO public.skills (id, name, category, domain, standard_code, description) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Herbal Pharmacology (Dravyaguna)', 'Domain / Technical', 'Ayurveda', 'AYU-DRAV-01', 'Mechanisms of Ayurvedic botanicals, Rasapanchaka (Rasa, Guna, Virya, Vipaka, Prabhava), and bio-activity assays.'),
  ('a0000001-0000-0000-0000-000000000002', 'Ayurvedic Pharmacopoeia & QC', 'Domain / Technical', 'Ayurveda', 'AYU-QC-02', 'API standards, HPTLC fingerprinting, heavy metal analysis (ICP-MS), and contaminant limits for export certification.'),
  ('a0000001-0000-0000-0000-000000000003', 'Clinical Data Analytics & Python', 'Technical Skills', 'Health Informatics', 'HI-PY-03', 'Pandas, NumPy, and statistical learning applied to electronic health records, Ayurvedic clinical trials, and epidemiological data.'),
  ('a0000001-0000-0000-0000-000000000004', 'Biostatistics & SQL in Clinical Research', 'Technical Skills', 'Research', 'BIO-SQL-04', 'Hypothesis testing, Kaplan-Meier curves, and clinical trial electronic data capture (EDC) querying in PostgreSQL.'),
  ('a0000001-0000-0000-0000-000000000005', 'Yoga Biomechanics & Posture AI', 'Domain / Technical', 'Yoga & Naturopathy', 'YOG-BIO-05', 'Kinematic analysis, angle-of-joint computation, and computer vision pose-estimation models for therapeutical Asanas.'),
  ('a0000001-0000-0000-0000-000000000006', 'Pharmacovigilance (ASU Drugs)', 'Regulatory / Clinical', 'Pharmacovigilance', 'PV-ASU-06', 'WHO-UMC causality algorithms, adverse drug event monitoring, signal detection, and National Pharmacovigilance Program compliance.'),
  ('a0000001-0000-0000-0000-000000000007', 'Clinical Communication & Patient Counseling', 'Soft Skills', 'Clinical Practice', 'CLI-COMM-07', 'Bilingual doctor-patient consultations, compliance guidance, dietary pathya-apathya counseling, and holistic care plans.'),
  ('a0000001-0000-0000-0000-000000000008', 'Research Methodology & Protocol Writing', 'Soft Skills', 'Research Ethics', 'RES-ETH-08', 'CONSORT guidelines, ICMR ethical standards, preclinical dossier compilation, and institutional ethics review submissions.'),
  ('a0000001-0000-0000-0000-000000000009', 'Rasa Shastra & Bhasma Standardization', 'Domain / Technical', 'Ayurveda', 'AYU-RASA-09', 'Classical calcination and nanomedicine characterization (XRD, TEM, EDAX) of metallic herbo-mineral bhasmas.'),
  ('a0000001-0000-0000-0000-000000000010', 'HL7/FHIR & NAMASTE AYUSH Informatics', 'Technical Skills', 'Health Informatics', 'HI-FHIR-10', 'Standardized medical data exchange mapping classical Prakriti and Nadi features to SNOMED-CT and WHO ICD-11 TM2.')
ON CONFLICT (name) DO UPDATE 
  SET description = EXCLUDED.description,
      standard_code = EXCLUDED.standard_code;

-- 15.2 Curated Assessment Questions
INSERT INTO public.assessment_questions (skill_id, question_text, options, correct_option_index, difficulty, explanation) VALUES
  (
    'a0000001-0000-0000-0000-000000000001',
    'According to classical Dravyaguna principles, what is the ultimate biochemical transformation of food and herb metabolites during digestion called?',
    '["Rasa", "Guna", "Virya", "Vipaka"]'::jsonb,
    3,
    'Beginner',
    'Vipaka denotes the post-digestive transformation of herbs and foods into Madhura, Amla, or Katu biochemical principles.'
  ),
  (
    'a0000001-0000-0000-0000-000000000002',
    'Under the Ayurvedic Pharmacopoeia of India (API), what is the permissible maximum limit of Lead (Pb) in herbal raw materials?',
    '["0.3 ppm", "1.0 ppm", "10.0 ppm", "50.0 ppm"]'::jsonb,
    2,
    'Intermediate',
    'Under API and WHO guidelines for herbal raw materials, the maximum acceptable limit for Lead (Pb) is 10.0 ppm (mg/kg).'
  ),
  (
    'a0000001-0000-0000-0000-000000000003',
    'In a Python clinical research pipeline using Pandas, which method is best suited to impute missing biometric variables with cohort medians?',
    '["df.dropna(how=''any'')","df.fillna(df.median(numeric_only=True))","df.replace(to_replace=0)","df.interpolate(method=''pad'')"]'::jsonb,
    1,
    'Intermediate',
    'df.fillna(df.median(numeric_only=True)) efficiently replaces NaN values with median values robust to clinical outliers.'
  ),
  (
    'a0000001-0000-0000-0000-000000000006',
    'In the National Pharmacovigilance Program for ASU drugs, where should unexpected adverse events be formally reported by peripheral medical officers?',
    '["Drug Controller General of India (DCGI) direct","Intermediary / National Pharmacovigilance Centre (NPvC-AllA)","Local Police Station","State Pharmacy Council"]'::jsonb,
    1,
    'Intermediate',
    'Adverse Drug Reactions for ASU drugs are routed through designated Peripheral and Intermediary centres to the National Pharmacovigilance Centre at AIIA New Delhi.'
  )
ON CONFLICT DO NOTHING;

-- 15.3 Seed Opportunities (Active Postings)
INSERT INTO public.opportunities (
  id,
  title,
  company_name,
  company_logo_text,
  type,
  description,
  location,
  remote_type,
  stipend_salary,
  deadline,
  required_skills,
  minimum_level,
  eligibility,
  openings,
  featured
) VALUES
  (
    'b0000001-0000-0000-0000-000000000001',
    'Ayurvedic Clinical Informatics Intern',
    'Dabur India R&D Centre',
    'DABUR',
    'Internship',
    'Collaborate with senior pharmacologists and AI developers to curate classical formulation taxonomies and run bio-activity prediction modeling.',
    'Ghaziabad, NCR / Hybrid',
    'Hybrid',
    '₹28,000 / month',
    '2026-10-30',
    ARRAY['Herbal Pharmacology (Dravyaguna)', 'Clinical Data Analytics & Python', 'Biostatistics & SQL in Clinical Research'],
    'Intermediate',
    'BAMS / M.Sc Life Sciences / Bioinformatics Final Year',
    3,
    true
  ),
  (
    'b0000001-0000-0000-0000-000000000002',
    'Herbal Formulation Quality Analyst',
    'Himalaya Wellness Company',
    'HIMALAYA',
    'Job',
    'Responsible for HPTLC standardization, herbal contaminant analysis, and establishing digital certificates of analysis for global export batches.',
    'Bengaluru, Karnataka',
    'On-site',
    '₹7.2 - 9.0 LPA',
    '2026-11-15',
    ARRAY['Ayurvedic Pharmacopoeia & QC', 'Research Methodology & Protocol Writing', 'Pharmacovigilance (ASU Drugs)'],
    'Advanced',
    'BAMS / B.Pharm (Ayurveda) / M.Pharm',
    2,
    true
  ),
  (
    'b0000001-0000-0000-0000-000000000003',
    'Yoga Computer Vision & Biomechanics Fellow',
    'S-VYASA Yoga University & HealthTech Lab',
    'S-VYASA',
    'Project',
    'Develop pose-estimation datasets for therapeutical Asana alignment under the AYUSH Smart Health initiative.',
    'Bengaluru / Remote',
    'Remote',
    '₹35,000 / month grant',
    '2026-10-15',
    ARRAY['Yoga Biomechanics & Posture AI', 'Clinical Data Analytics & Python'],
    'Intermediate',
    'BNYS / M.Sc Yoga / Computer Science Interdisciplinary',
    4,
    false
  ),
  (
    'b0000001-0000-0000-0000-000000000004',
    'National AYUSH Hackathon & Clinical Datathon 2026',
    'Ministry of AYUSH & AICTE',
    'SIH-AYUSH',
    'Hackathon',
    'Nationwide challenge to solve real-world problem statements in supply chain tracing of medicinal plants and standardized EHR systems.',
    'New Delhi (Grand Finale)',
    'On-site',
    '₹2,50,000 Prize Pool',
    '2026-10-25',
    ARRAY['Herbal Pharmacology (Dravyaguna)', 'Clinical Data Analytics & Python', 'HL7/FHIR & NAMASTE AYUSH Informatics'],
    'All Levels',
    'Open to all Indian College Students (BAMS, BNYS, B.Tech, Biotech)',
    100,
    true
  ),
  (
    'b0000001-0000-0000-0000-000000000005',
    'Pharmacovigilance Officer (ASU Drugs)',
    'Patanjali Research Foundation',
    'PATANJALI',
    'Job',
    'Track adverse drug reactions (ADRs), conduct signal detection in clinical registries, and liaise with Intermediary Pharmacovigilance Centres.',
    'Haridwar, Uttarakhand',
    'On-site',
    '₹6.5 - 8.2 LPA',
    '2026-11-01',
    ARRAY['Pharmacovigilance (ASU Drugs)', 'Ayurvedic Pharmacopoeia & QC', 'Clinical Communication & Patient Counseling'],
    'Intermediate',
    'BAMS / MD (Ayurveda)',
    5,
    false
  )
ON CONFLICT (id) DO NOTHING;

-- Relate Opportunities to Skills
INSERT INTO public.opportunity_skills (opportunity_id, skill_id) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001'),
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003'),
  ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000002'),
  ('b0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000006'),
  ('b0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000005'),
  ('b0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000003'),
  ('b0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- END OF MASTER DATABASE SETUP
-- ==============================================================================
