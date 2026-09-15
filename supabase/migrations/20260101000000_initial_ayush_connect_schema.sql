-- ==============================================================================
-- AYUSH CONNECT — Supabase PostgreSQL Schema
-- Smart India Hackathon (SIH) 2026
-- ==============================================================================

-- 1. Profiles Table (Base user identity synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'industry', 'academician', 'admin')),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Student Profiles
CREATE TABLE IF NOT EXISTS public.student_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  college_institution TEXT NOT NULL,
  course TEXT NOT NULL,
  year TEXT NOT NULL,
  graduation_year TEXT NOT NULL,
  bio TEXT,
  profile_completion_pct INT DEFAULT 20,
  overall_skill_score INT DEFAULT 0,
  github_url TEXT,
  linkedin_url TEXT,
  resume_url TEXT,
  career_stage TEXT DEFAULT 'profile'
);

-- 3. Industry Profiles
CREATE TABLE IF NOT EXISTS public.industry_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  industry_sector TEXT NOT NULL,
  company_website TEXT,
  is_verified BOOLEAN DEFAULT FALSE
);

-- 4. Academician Profiles
CREATE TABLE IF NOT EXISTS public.academician_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  department TEXT NOT NULL,
  designation TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE
);

-- 5. Skills Master Table
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT
);

-- 6. Student Skills (Taxonomy & Levels)
CREATE TABLE IF NOT EXISTS public.student_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.student_profiles(profile_id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  level TEXT CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  proficiency_pct INT CHECK (proficiency_pct BETWEEN 0 AND 100),
  verified_by_assessment BOOLEAN DEFAULT FALSE
);

-- 7. Assessment Questions Bank
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES public.skills(id),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  explanation TEXT
);

-- 8. Student Assessments & Results
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.student_profiles(profile_id) ON DELETE CASCADE,
  score_pct INT NOT NULL,
  skill_breakdown JSONB,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Opportunities (Jobs, Internships, Projects, Hackathons)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES public.industry_profiles(profile_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  type TEXT CHECK (type IN ('Job', 'Internship', 'Project', 'Workshop', 'Hackathon')),
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  remote_type TEXT DEFAULT 'On-site',
  stipend_salary TEXT,
  deadline DATE NOT NULL,
  eligibility TEXT,
  openings INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Opportunity Skills Link
CREATE TABLE IF NOT EXISTS public.opportunity_skills (
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (opportunity_id, skill_id)
);

-- 11. Applications Tracking
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.student_profiles(profile_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Applied' CHECK (status IN ('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected')),
  match_pct INT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  interview_date TIMESTAMPTZ
);

-- 12. Student Projects / Portfolio
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.student_profiles(profile_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  technologies TEXT[],
  github_url TEXT,
  live_demo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
