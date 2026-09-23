-- ==============================================================================
-- AYUSH CONNECT — Portfolio Project File Uploads Migration
-- Migration: 20260922120000_portfolio_project_file_uploads.sql
-- Description: Ensures public.projects table has file storage path, name, size, 
--              and type columns for attaching files stored in the private 
--              "portfolio-files" Supabase Storage bucket.
-- ==============================================================================

-- 1. Ensure file columns exist on public.projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS file_size INT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS file_type TEXT;

-- 2. Indexes for efficient lookup of student projects and attachments
CREATE INDEX IF NOT EXISTS idx_projects_student_id ON public.projects(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_file_path ON public.projects(file_path);

-- 3. Row Level Security verification on public.projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Allow public read of project entries (portfolios are publicly viewable by recruiters)
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;
CREATE POLICY "Public can view projects"
  ON public.projects FOR SELECT
  TO public
  USING (true);

-- Allow students to insert their own projects
DROP POLICY IF EXISTS "Students can insert own projects" ON public.projects;
CREATE POLICY "Students can insert own projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = auth.uid() OR
    student_id IN (SELECT profile_id FROM public.student_profiles WHERE profile_id = auth.uid())
  );

-- Allow students to update their own projects
DROP POLICY IF EXISTS "Students can update own projects" ON public.projects;
CREATE POLICY "Students can update own projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid() OR
    student_id IN (SELECT profile_id FROM public.student_profiles WHERE profile_id = auth.uid())
  )
  WITH CHECK (
    student_id = auth.uid() OR
    student_id IN (SELECT profile_id FROM public.student_profiles WHERE profile_id = auth.uid())
  );

-- Allow students to delete their own projects
DROP POLICY IF EXISTS "Students can delete own projects" ON public.projects;
CREATE POLICY "Students can delete own projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (
    student_id = auth.uid() OR
    student_id IN (SELECT profile_id FROM public.student_profiles WHERE profile_id = auth.uid())
  );
