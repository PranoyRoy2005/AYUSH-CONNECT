-- ==============================================================================
-- AYUSH CONNECT — Supabase Seed Data
-- SIH 2026 Realistic Demo Records
-- ==============================================================================

-- 1. Insert Core Skills
INSERT INTO public.skills (name, category, description) VALUES
('Herbal Pharmacology (Dravyaguna)', 'Domain / Technical', 'Classical and modern pharmacological mechanisms of Ayurvedic botanicals'),
('Ayurvedic Pharmacopoeia & QC', 'Domain / Technical', 'Monographs, HPTLC, TLC fingerprinting and heavy metal testing'),
('Clinical Data Analytics & Python', 'Technical Skills', 'Data wrangling, bio-statistics and machine learning models on health records'),
('Biostatistics & SQL', 'Technical Skills', 'Relational querying and hypothesis testing for clinical trial datasets'),
('Yoga Biomechanics & Posture AI', 'Technical Skills', 'Computer vision pose-estimation and kinematics for therapeutic yoga'),
('Pharmacovigilance (ASU Drugs)', 'Regulatory / Clinical', 'ADR monitoring, causality assessment, and WHO-UMC signal detection');

-- 2. Opportunities Seed
INSERT INTO public.opportunities (title, company_name, type, description, location, stipend_salary, deadline, eligibility, openings) VALUES
('Ayurvedic Clinical Informatics Intern', 'Dabur India R&D Centre', 'Internship', 'Curate classical formulation taxonomies and model bio-activity metrics.', 'Ghaziabad / Hybrid', '₹28,000 / month', '2026-10-30', 'BAMS / Bioinformatics', 3),
('Herbal Formulation Quality Analyst', 'Himalaya Wellness Company', 'Job', 'Standardize extracts and establish certificates of analysis for global batches.', 'Bengaluru, Karnataka', '₹7.2 - 9.0 LPA', '2026-11-15', 'BAMS / B.Pharm Ayurveda', 2),
('Yoga Computer Vision Fellow', 'S-VYASA Yoga University', 'Project', 'Develop pose-estimation datasets for therapeutic asana biomechanics.', 'Bengaluru / Remote', '₹35,000 / month', '2026-10-15', 'BNYS / HealthTech Interdisciplinary', 4);
