-- ==============================================================================
-- AYUSH CONNECT — Supabase Storage Buckets & Row Level Security (RLS) Policies
-- Buckets:
--   1. "avatars"         (Public: true)  — Path: avatars/{user_id}/profile.{ext}
--   2. "resumes"         (Public: false) — Path: resumes/{user_id}/resume.pdf
--   3. "portfolio-files" (Public: false) — Path: portfolio-files/{user_id}/{project_id}/{filename}
-- ==============================================================================

-- 1. Schema Extensions for tracking file storage paths
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS resume_path TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS file_size INT;

-- 2. Create Storage Buckets in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('resumes', 'resumes', false, 5242880, ARRAY['application/pdf']),
  ('portfolio-files', 'portfolio-files', false, 26214400, NULL)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any previous conflicting policies for these three buckets
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

DROP POLICY IF EXISTS "Users can view own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own resume" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own resume" ON storage.objects;

DROP POLICY IF EXISTS "Users can view own portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own portfolio files" ON storage.objects;

-- ==============================================================================
-- BUCKET 1: "avatars" POLICIES
-- - Public SELECT (read) access for all files
-- - Authenticated users can INSERT, UPDATE, DELETE only within their own user_id folder
-- Paths supported: avatars/{user_id}/* OR {user_id}/*
-- ==============================================================================
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

-- ==============================================================================
-- BUCKET 2: "resumes" POLICIES
-- - Private bucket: Authenticated user can SELECT, INSERT, UPDATE, DELETE only within their own user_id folder
-- Paths supported: resumes/{user_id}/* OR {user_id}/*
-- ==============================================================================
CREATE POLICY "Users can view own resume"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'resumes' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

CREATE POLICY "Users can upload own resume"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'resumes' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

CREATE POLICY "Users can update own resume"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'resumes' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

CREATE POLICY "Users can delete own resume"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resumes' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'resumes' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

-- ==============================================================================
-- BUCKET 3: "portfolio-files" POLICIES
-- - Private bucket: Authenticated user can SELECT, INSERT, UPDATE, DELETE only within their own user_id folder
-- Paths supported: portfolio-files/{user_id}/* OR {user_id}/*
-- ==============================================================================
CREATE POLICY "Users can view own portfolio files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'portfolio-files' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'portfolio-files' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

CREATE POLICY "Users can upload own portfolio files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-files' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'portfolio-files' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

CREATE POLICY "Users can update own portfolio files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'portfolio-files' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'portfolio-files' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );

CREATE POLICY "Users can delete own portfolio files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio-files' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      ((storage.foldername(name))[1] = 'portfolio-files' AND (storage.foldername(name))[2] = auth.uid()::text)
    )
  );
