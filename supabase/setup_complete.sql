-- ==============================================================================
-- AYUSH CONNECT — Complete Supabase PostgreSQL Schema & Seed Data
-- Project: ayush-connect (dfadvmweedgllzwifbth)
-- Run this script in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Profiles Table (Base user identity synced with Supabase Auth or public accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
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
  profile_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  profile_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  industry_sector TEXT NOT NULL,
  company_website TEXT,
  is_verified BOOLEAN DEFAULT FALSE
);

-- 4. Academician Profiles
CREATE TABLE IF NOT EXISTS public.academician_profiles (
  profile_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- 6. Student Skills
CREATE TABLE IF NOT EXISTS public.student_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  student_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  score_pct INT NOT NULL,
  skill_breakdown JSONB,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Opportunities (Jobs, Internships, Projects, Hackathons)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Applications Tracking
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES public.opportunities(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Applied' CHECK (status IN ('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected')),
  match_pct INT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  interview_date TIMESTAMPTZ
);

-- 11. Student Projects / Portfolio
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  technologies TEXT[],
  github_url TEXT,
  live_demo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- Permissive policies for read and write with anon key and authenticated users
CREATE POLICY "Allow read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update profiles" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Allow read skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Allow insert skills" ON public.skills FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read opportunities" ON public.opportunities FOR SELECT USING (true);
CREATE POLICY "Allow insert opportunities" ON public.opportunities FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow read applications" ON public.applications FOR SELECT USING (true);
CREATE POLICY "Allow insert applications" ON public.applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update applications" ON public.applications FOR UPDATE USING (true);

CREATE POLICY "Allow read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow insert projects" ON public.projects FOR INSERT WITH CHECK (true);

-- Insert Core Skills
INSERT INTO public.skills (name, category, description) VALUES
('Herbal Pharmacology (Dravyaguna)', 'Domain / Technical', 'Classical and modern pharmacological mechanisms of Ayurvedic botanicals'),
('Ayurvedic Pharmacopoeia & QC', 'Domain / Technical', 'Monographs, HPTLC, TLC fingerprinting and heavy metal testing'),
('Clinical Data Analytics & Python', 'Technical Skills', 'Data wrangling, bio-statistics and machine learning models on health records'),
('Biostatistics & SQL', 'Technical Skills', 'Relational querying and hypothesis testing for clinical trial datasets'),
('Yoga Biomechanics & Posture AI', 'Technical Skills', 'Computer vision pose-estimation and kinematics for therapeutic yoga'),
('Pharmacovigilance (ASU Drugs)', 'Regulatory / Clinical', 'ADR monitoring, causality assessment, and WHO-UMC signal detection')
ON CONFLICT (name) DO NOTHING;

-- Insert Seed Opportunities
INSERT INTO public.opportunities (title, company_name, type, description, location, stipend_salary, deadline, eligibility, openings, featured) VALUES
('Ayurvedic Clinical Informatics Intern', 'Dabur India R&D Centre', 'Internship', 'Curate classical formulation taxonomies and model bio-activity metrics.', 'Ghaziabad / Hybrid', '₹28,000 / month', '2026-10-30', 'BAMS / Bioinformatics', 3, true),
('Herbal Formulation Quality Analyst', 'Himalaya Wellness Company', 'Job', 'Standardize extracts and establish certificates of analysis for global batches.', 'Bengaluru, Karnataka', '₹7.2 - 9.0 LPA', '2026-11-15', 'BAMS / B.Pharm Ayurveda', 2, true),
('Yoga Computer Vision Fellow', 'S-VYASA Yoga University', 'Project', 'Develop pose-estimation datasets for therapeutic asana biomechanics.', 'Bengaluru / Remote', '₹35,000 / month', '2026-10-15', 'BNYS / HealthTech Interdisciplinary', 4, false),
('National AYUSH Hackathon & Clinical Datathon 2026', 'Ministry of AYUSH & AICTE', 'Hackathon', 'Nationwide challenge to solve real-world problem statements in supply chain tracing of medicinal plants.', 'New Delhi (Grand Finale)', '₹2,50,000 Prize Pool', '2026-10-25', 'Open to all Indian College Students', 100, true),
('Pharmacovigilance Officer (ASU Drugs)', 'Patanjali Research Foundation', 'Job', 'Track adverse drug reactions (ADRs), conduct signal detection in clinical registries.', 'Haridwar, Uttarakhand', '₹6.5 - 8.2 LPA', '2026-11-01', 'BAMS / MD (Ayurveda)', 5, false)
ON CONFLICT DO NOTHING;
