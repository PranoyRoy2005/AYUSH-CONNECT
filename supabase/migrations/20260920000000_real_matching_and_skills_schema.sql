-- ==============================================================================
-- AYUSH CONNECT — Real Matching & Skills Database Schema
-- SIH 2026: Official National AYUSH Skills & Opportunity Marketplace Engine
-- ==============================================================================

-- 1. SKILLS MASTER TABLE
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT DEFAULT 'Domain / Technical' CHECK (category IN ('Domain / Technical', 'Technical Skills', 'Regulatory / Clinical', 'Soft Skills')),
  domain TEXT DEFAULT 'Ayurveda',
  description TEXT,
  standard_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. ASSESSMENT QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT NOT NULL, -- e.g. 'A', 'B', 'C', 'D'
  options JSONB, -- Optional legacy array
  correct_option_index INT, -- Optional legacy index (0-3)
  difficulty TEXT DEFAULT 'Intermediate' CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. STUDENT SKILLS TABLE (Verified Competencies)
CREATE TABLE IF NOT EXISTS public.student_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency_score INT NOT NULL CHECK (proficiency_score BETWEEN 0 AND 100),
  proficiency_pct INT GENERATED ALWAYS AS (proficiency_score) STORED,
  level TEXT DEFAULT 'Intermediate' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  verified_by_assessment BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, skill_id)
);

-- 4. OPPORTUNITY REQUIREMENTS TABLE
CREATE TABLE IF NOT EXISTS public.opportunity_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  importance TEXT NOT NULL DEFAULT 'required' CHECK (importance IN ('required', 'preferred')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(opportunity_id, skill_id)
);

-- 5. MATCH RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  match_percentage INT NOT NULL CHECK (match_percentage BETWEEN 0 AND 100),
  calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, opportunity_id)
);

-- 6. APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected', 'Offer')),
  match_pct INT DEFAULT 0 CHECK (match_pct BETWEEN 0 AND 100),
  notes TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, opportunity_id)
);

-- Enable RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Public read assessment_questions" ON public.assessment_questions FOR SELECT USING (true);

CREATE POLICY "Students manage own skills" ON public.student_skills
  FOR ALL USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Public read opportunity_requirements" ON public.opportunity_requirements FOR SELECT USING (true);

CREATE POLICY "Students view and update own match_results" ON public.match_results
  FOR ALL USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students view and create own applications" ON public.applications
  FOR ALL USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
