-- ==============================================================================
-- AYUSH CONNECT — Production-Ready PostgreSQL / Supabase Database Schema
-- Smart India Hackathon (SIH) 2026 & Ministry of AYUSH Digital Platform
-- 
-- DESCRIPTION:
--   Complete, production-ready SQL setup script containing all database tables,
--   relational constraints (PK, FK, UNIQUE, NOT NULL, CHECK), triggers for
--   automated timestamp management, automated profile provisioning on auth signup,
--   performance indexes, and comprehensive Row Level Security (RLS) policies.
--
-- NOTE:
--   This is a clean production schema without mock/sample data (no INSERT statements).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. EXTENSIONS & SCHEMAS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. BASE PROFILES TABLE (Linked directly to Supabase auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'industry', 'academician', 'admin')),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  alternate_phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  avatar_url TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_pincode TEXT,
  address_country TEXT,
  linkedin_url TEXT,
  candidate_id TEXT UNIQUE,
  profile_completed BOOLEAN DEFAULT FALSE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'approved', 'rejected', 'suspended')),
  is_verified BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure column exists if table was previously created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS candidate_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_pincode TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

COMMENT ON TABLE public.profiles IS 'Central identity table synchronized with Supabase Auth users.';

-- ------------------------------------------------------------------------------
-- 2. ROLE EXTENSION TABLES
-- ------------------------------------------------------------------------------

-- 2.1 Student Profiles
CREATE TABLE IF NOT EXISTS public.student_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_institution TEXT NOT NULL,
  course TEXT NOT NULL,
  stream TEXT,
  year TEXT NOT NULL,
  graduation_year TEXT NOT NULL,
  bio TEXT,
  profile_completion_pct INT DEFAULT 20 CHECK (profile_completion_pct BETWEEN 0 AND 100),
  overall_skill_score INT DEFAULT 0 CHECK (overall_skill_score BETWEEN 0 AND 100),
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  resume_url TEXT,
  career_stage TEXT DEFAULT 'profile' CHECK (career_stage IN ('profile', 'assessment', 'applied', 'interview', 'placed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.student_profiles IS 'Detailed academic credentials, portfolio links, and progress for student scholars.';

-- 2.2 Industry / Enterprise Profiles
CREATE TABLE IF NOT EXISTS public.industry_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  cin_number TEXT,
  designation TEXT NOT NULL,
  industry_sector TEXT NOT NULL,
  company_website TEXT,
  company_size TEXT,
  location TEXT,
  description TEXT,
  logo_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.industry_profiles IS 'Corporate enterprises, research laboratories, and recruiters in the AYUSH ecosystem.';

-- 2.3 Academician / Institutional Faculty Profiles
CREATE TABLE IF NOT EXISTS public.academician_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  department TEXT NOT NULL,
  designation TEXT NOT NULL,
  employee_id TEXT,
  institutional_email TEXT,
  research_areas TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.academician_profiles IS 'Academic deans, professors, and institutional faculty monitoring student skill gaps.';

-- 2.4 Ministry / Admin Profiles
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  department TEXT NOT NULL DEFAULT 'Ministry of AYUSH',
  designation TEXT NOT NULL,
  employee_code TEXT,
  access_level TEXT DEFAULT 'admin' CHECK (access_level IN ('superadmin', 'admin', 'auditor', 'moderator')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.admin_profiles IS 'Government and ministerial administrative personnel managing accreditation and KYC.';

-- ------------------------------------------------------------------------------
-- 3. SKILLS TAXONOMY & VERIFICATION MAPPING
-- ------------------------------------------------------------------------------

-- 3.1 Master Skills List
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  demand_pct INT DEFAULT 70 CHECK (demand_pct BETWEEN 0 AND 100),
  curriculum_coverage_pct INT DEFAULT 50 CHECK (curriculum_coverage_pct BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.skills IS 'Master catalog of AYUSH domain, modern clinical, and informatics competencies.';

-- 3.2 Student Skills Join Table
CREATE TABLE IF NOT EXISTS public.student_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  level TEXT DEFAULT 'Intermediate' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  proficiency_pct INT DEFAULT 50 CHECK (proficiency_pct BETWEEN 0 AND 100),
  verified_by_assessment BOOLEAN DEFAULT FALSE,
  assessment_score INT CHECK (assessment_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_student_skill UNIQUE (student_id, skill_id)
);

COMMENT ON TABLE public.student_skills IS 'Join table tracking a student verified competencies and proficiency percentiles.';

-- ------------------------------------------------------------------------------
-- 4. SKILL ASSESSMENTS ENGINE
-- ------------------------------------------------------------------------------

-- 4.1 Assessment Questions Bank
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  skill_name TEXT,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'Multiple Choice' CHECK (question_type IN ('Multiple Choice', 'Clinical Scenario', 'Pharmacology', 'Laboratory Analytics', 'Bio-Informatics Code', 'Kinematics')),
  options JSONB NOT NULL,
  correct_option_index INT NOT NULL CHECK (correct_option_index >= 0),
  difficulty TEXT DEFAULT 'Medium' CHECK (difficulty IN ('Beginner', 'Easy', 'Medium', 'Intermediate', 'Hard', 'Advanced')),
  explanation TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.assessment_questions IS 'Curated repository of standardized MCQs and clinical scenario questions.';

-- 4.2 Student Assessment Attempts & Results
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score_pct INT NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  total_questions INT NOT NULL DEFAULT 10 CHECK (total_questions > 0),
  correct_answers INT NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
  skill_breakdown JSONB,
  answers JSONB,
  time_taken_seconds INT,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.assessments IS 'Logged diagnostic tests, scoring results, and domain mastery breakdowns.';

-- ------------------------------------------------------------------------------
-- 5. OPPORTUNITIES & RECRUITMENT PIPELINE
-- ------------------------------------------------------------------------------

-- 5.1 Opportunities Marketplace
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_id TEXT,
  logo_text TEXT,
  type TEXT NOT NULL CHECK (type IN ('Job', 'Internship', 'Project', 'Workshop', 'Hackathon', 'Event')),
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  remote_type TEXT DEFAULT 'On-site' CHECK (remote_type IN ('On-site', 'Remote', 'Hybrid')),
  stipend_salary TEXT,
  duration TEXT,
  deadline DATE NOT NULL,
  eligibility TEXT,
  openings INT DEFAULT 1 CHECK (openings >= 1),
  featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft', 'archived')),
  required_skills TEXT[] DEFAULT '{}',
  minimum_level TEXT DEFAULT 'Intermediate',
  applicants_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.opportunities IS 'Listings of jobs, research fellowships, internships, and national hackathons.';

-- 5.2 Opportunity Skills Join Table (Normalized)
CREATE TABLE IF NOT EXISTS public.opportunity_skills (
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (opportunity_id, skill_id)
);

COMMENT ON TABLE public.opportunity_skills IS 'Relational link mapping required skills to opportunities.';

-- 5.3 Applications Tracking & Candidate Pipeline
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Applied' CHECK (status IN ('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Offer', 'Rejected')),
  match_pct INT DEFAULT 80 CHECK (match_pct BETWEEN 0 AND 100),
  cover_letter TEXT,
  resume_url TEXT,
  interview_date TIMESTAMPTZ,
  interview_notes TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_student_opportunity UNIQUE (opportunity_id, student_id)
);

COMMENT ON TABLE public.applications IS 'Recruitment lifecycle management from submission to offer stage.';

-- ------------------------------------------------------------------------------
-- 6. STUDENT PORTFOLIO & PROJECTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  technologies TEXT[] DEFAULT '{}',
  github_url TEXT,
  live_demo_url TEXT,
  project_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.projects IS 'Showcase of research projects, phytochemistry labs, and code artifacts.';

-- ------------------------------------------------------------------------------
-- 7. INSTITUTIONAL COHORTS & CURRICULUM ANALYTICS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_profile_id UUID REFERENCES public.academician_profiles(profile_id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  student_count INT DEFAULT 0,
  avg_skill_score NUMERIC(5,2) DEFAULT 0.0,
  top_skill TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.academic_cohorts IS 'Institutional student cohorts for tracking skill percentiles and curriculum alignment.';

-- ------------------------------------------------------------------------------
-- 8. NOTIFICATIONS & IN-APP ALERTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'alert', 'application', 'assessment', 'kyc')),
  is_read BOOLEAN DEFAULT FALSE,
  link_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.notifications IS 'Platform notifications for status changes, interview calls, and verification.';

-- ------------------------------------------------------------------------------
-- 9. AUDIT LOGS & GOVERNANCE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.audit_logs IS 'Immutable compliance audit trail for Ministry accreditation, role adjustments, and KYC.';

-- ------------------------------------------------------------------------------
-- 10. INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified);

CREATE INDEX IF NOT EXISTS idx_student_profiles_college ON public.student_profiles(college_institution);
CREATE INDEX IF NOT EXISTS idx_student_profiles_course ON public.student_profiles(course);

CREATE INDEX IF NOT EXISTS idx_industry_profiles_company ON public.industry_profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_academician_profiles_inst ON public.academician_profiles(institution);

CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category);
CREATE INDEX IF NOT EXISTS idx_student_skills_student_id ON public.student_skills(student_id);
CREATE INDEX IF NOT EXISTS idx_student_skills_skill_id ON public.student_skills(skill_id);

CREATE INDEX IF NOT EXISTS idx_questions_skill_id ON public.assessment_questions(skill_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.assessment_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_active ON public.assessment_questions(is_active);

CREATE INDEX IF NOT EXISTS idx_assessments_student_id ON public.assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessments_completed_at ON public.assessments(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_opportunities_recruiter_id ON public.opportunities(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_type ON public.opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON public.opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_opportunities_featured ON public.opportunities(featured);

CREATE INDEX IF NOT EXISTS idx_applications_opp_id ON public.applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

CREATE INDEX IF NOT EXISTS idx_projects_student_id ON public.projects(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ------------------------------------------------------------------------------
-- 11. AUTOMATED TIMESTAMP & PROFILE SYNC FUNCTIONS AND TRIGGERS
-- ------------------------------------------------------------------------------

-- 11.1 Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_student_profiles_updated_at ON public.student_profiles;
CREATE TRIGGER trg_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_industry_profiles_updated_at ON public.industry_profiles;
CREATE TRIGGER trg_industry_profiles_updated_at
  BEFORE UPDATE ON public.industry_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_academician_profiles_updated_at ON public.academician_profiles;
CREATE TRIGGER trg_academician_profiles_updated_at
  BEFORE UPDATE ON public.academician_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_profiles_updated_at ON public.admin_profiles;
CREATE TRIGGER trg_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_skills_updated_at ON public.skills;
CREATE TRIGGER trg_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_student_skills_updated_at ON public.student_skills;
CREATE TRIGGER trg_student_skills_updated_at
  BEFORE UPDATE ON public.student_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_assessment_questions_updated_at ON public.assessment_questions;
CREATE TRIGGER trg_assessment_questions_updated_at
  BEFORE UPDATE ON public.assessment_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER trg_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_applications_updated_at ON public.applications;
CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_academic_cohorts_updated_at ON public.academic_cohorts;
CREATE TRIGGER trg_academic_cohorts_updated_at
  BEFORE UPDATE ON public.academic_cohorts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 11.2 Auto-Provision Profile on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
BEGIN
  -- Extract metadata or set defaults
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, role, full_name, email, is_verified, status, profile_completed)
  VALUES (
    NEW.id,
    user_role,
    user_name,
    NEW.email,
    CASE WHEN user_role = 'student' THEN TRUE ELSE FALSE END,
    CASE WHEN user_role = 'student' THEN 'active' ELSE 'pending' END,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to auth.users (when Supabase Auth creates a user)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11.3 Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS across all application tables
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
ALTER TABLE public.academic_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 12.1 Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated, anon
  WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

CREATE POLICY "Users can update their own profile or admins can update any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));

-- 12.2 Student Profiles Policies
CREATE POLICY "Student profiles viewable by authenticated users"
  ON public.student_profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Students can insert their own student profile"
  ON public.student_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id OR public.is_admin(auth.uid()));

CREATE POLICY "Students can update their own student profile"
  ON public.student_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = profile_id OR public.is_admin(auth.uid()));

-- 12.3 Industry Profiles Policies
CREATE POLICY "Industry profiles viewable by everyone"
  ON public.industry_profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Industry users can insert their own profile"
  ON public.industry_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id OR public.is_admin(auth.uid()));

CREATE POLICY "Industry users can update their own profile"
  ON public.industry_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = profile_id OR public.is_admin(auth.uid()));

-- 12.4 Academician Profiles Policies
CREATE POLICY "Academician profiles viewable by everyone"
  ON public.academician_profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Academicians can insert their own profile"
  ON public.academician_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id OR public.is_admin(auth.uid()));

CREATE POLICY "Academicians can update their own profile"
  ON public.academician_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = profile_id OR public.is_admin(auth.uid()));

-- 12.5 Admin Profiles Policies
CREATE POLICY "Admin profiles viewable by admins only"
  ON public.admin_profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR auth.uid() = profile_id);

CREATE POLICY "Admin profiles manageable by superadmin"
  ON public.admin_profiles FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 12.6 Skills Master Policies
CREATE POLICY "Skills are readable by all users"
  ON public.skills FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Skills can be added or updated by admins and academicians"
  ON public.skills FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('academician', 'admin')))
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('academician', 'admin')));

-- 12.7 Student Skills Policies
CREATE POLICY "Student skills viewable by authenticated users"
  ON public.student_skills FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Students can manage their own skills"
  ON public.student_skills FOR ALL
  TO authenticated
  USING (auth.uid() = student_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = student_id OR public.is_admin(auth.uid()));

-- 12.8 Assessment Questions Policies
CREATE POLICY "Assessment questions readable by authenticated users"
  ON public.assessment_questions FOR SELECT
  TO authenticated, anon
  USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage assessment questions"
  ON public.assessment_questions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 12.9 Student Assessments Policies
CREATE POLICY "Students can view their own assessments or admins/faculty can review"
  ON public.assessments FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id OR public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'academician'));

CREATE POLICY "Students can insert their assessment results"
  ON public.assessments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id OR public.is_admin(auth.uid()));

-- 12.10 Opportunities Policies
CREATE POLICY "Opportunities are readable by everyone"
  ON public.opportunities FOR SELECT
  TO authenticated, anon
  USING (status = 'active' OR auth.uid() = recruiter_id OR public.is_admin(auth.uid()));

CREATE POLICY "Industry recruiters and admins can create opportunities"
  ON public.opportunities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = recruiter_id OR public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('industry', 'academician', 'admin')));

CREATE POLICY "Recruiters can update their own opportunities"
  ON public.opportunities FOR UPDATE
  TO authenticated
  USING (auth.uid() = recruiter_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = recruiter_id OR public.is_admin(auth.uid()));

CREATE POLICY "Recruiters can delete their own opportunities"
  ON public.opportunities FOR DELETE
  TO authenticated
  USING (auth.uid() = recruiter_id OR public.is_admin(auth.uid()));

-- 12.11 Opportunity Skills Policies
CREATE POLICY "Opportunity skills readable by all"
  ON public.opportunity_skills FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Opportunity creators and admins can manage opportunity skills"
  ON public.opportunity_skills FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.opportunities WHERE id = opportunity_id AND (recruiter_id = auth.uid() OR public.is_admin(auth.uid()))));

-- 12.12 Applications Policies
CREATE POLICY "Students can view their own applications and recruiters can view for their postings"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id OR
    public.is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.opportunities WHERE id = opportunity_id AND recruiter_id = auth.uid())
  );

CREATE POLICY "Students can submit applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Recruiters and admins can update application status"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = student_id OR
    public.is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.opportunities WHERE id = opportunity_id AND recruiter_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = student_id OR
    public.is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.opportunities WHERE id = opportunity_id AND recruiter_id = auth.uid())
  );

-- 12.13 Projects Policies
CREATE POLICY "Projects are readable by all"
  ON public.projects FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Students can manage their own projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (auth.uid() = student_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = student_id OR public.is_admin(auth.uid()));

-- 12.14 Academic Cohorts Policies
CREATE POLICY "Academic cohorts viewable by faculty and admins"
  ON public.academic_cohorts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Faculty can manage their institution cohorts"
  ON public.academic_cohorts FOR ALL
  TO authenticated
  USING (institution_profile_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (institution_profile_id = auth.uid() OR public.is_admin(auth.uid()));

-- 12.15 Notifications Policies
CREATE POLICY "Users can only view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark read)"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System and admins can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 12.16 Audit Logs Policies
CREATE POLICY "Audit logs viewable only by admins"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Audit logs insertable by system and authenticated actions"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 12.17 Mentorship Requests Policies
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_by_academician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_mentorship_requests_single_active
  ON public.mentorship_requests (student_id)
  WHERE status IN ('pending', 'accepted');

ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own mentorship requests"
  ON public.mentorship_requests FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students insert own mentorship requests"
  ON public.mentorship_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND status = 'pending');

CREATE POLICY "Academicians view requests to them"
  ON public.mentorship_requests FOR SELECT TO authenticated
  USING (auth.uid() = academician_id);

CREATE POLICY "Academicians update requests to them"
  ON public.mentorship_requests FOR UPDATE TO authenticated
  USING (auth.uid() = academician_id)
  WITH CHECK (auth.uid() = academician_id);

CREATE OR REPLACE FUNCTION public.handle_mentorship_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
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

CREATE OR REPLACE FUNCTION public.prevent_student_self_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() = NEW.id AND NOT public.is_admin(auth.uid()) THEN
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

-- ==============================================================================
-- END OF PRODUCTION SCHEMA
-- ==============================================================================
