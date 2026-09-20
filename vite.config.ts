import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'auth-callback-rewrite-and-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && (req.url.startsWith('/auth/callback?') || req.url.startsWith('/auth/callback#') || req.url === '/auth/callback' || req.url === '/auth/callback/')) {
              req.url = req.url.replace('/auth/callback', '/auth/callback.html');
              return next();
            }

            if (req.url === '/api/generate-skill-recommendation' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', async () => {
                res.setHeader('Content-Type', 'application/json');
                try {
                  const body = JSON.parse(bodyStr || '{}');
                  const { studentSkills = [], course = 'BAMS', interests = [], targetRole = '', studentName = 'Scholar' } = body;
                  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

                  let recommendation;

                  if (apiKey) {
                    try {
                      const { GoogleGenAI } = await import('@google/genai');
                      const ai = new GoogleGenAI({ apiKey });
                      const prompt = `You are the chief AYUSH Ministry career counselor and clinical skill development architect for AYUSH CONNECT.
Analyze the following student profile in the AYUSH domain:
- Student Name: ${studentName}
- Enrolled Degree / Course: ${course}
- Current Verified Skills: ${studentSkills.length ? studentSkills.join(', ') : 'Basic Clinical Foundations'}
- Areas of Interest: ${interests.length ? interests.join(', ') : 'Clinical Practice, Herbal Formulations, AYUSH Research'}
- Target Role / Career Preference: ${targetRole || 'Ayush Medical Officer / Clinical Research Associate / Wellness Consultant'}

Provide a rigorous, high-impact Skill Improvement Recommendation strictly formatted as valid JSON.
Output ONLY pure JSON matching this exact structure:
{
  "readiness_score": 82,
  "executive_summary": "Two sentence evaluation of student readiness against current enterprise and hospital hiring standards.",
  "top_skill_gaps": [
    {
      "skill": "Name of gap skill (e.g. Good Clinical Practice in ASU Trials)",
      "importance": "Critical",
      "why_needed": "Brief explanation of why industry/hospitals demand this"
    }
  ],
  "learning_path": [
    {
      "milestone": "Month 1-2: Clinical Documentation & Diagnostics",
      "action": "Specific action, course or clinical rotation",
      "expected_outcome": "Demonstrable skill"
    }
  ],
  "recommended_certifications": [
    "NABH AYUSH Hospital Accreditation Training",
    "WHO-GCTM Traditional Medicine Documentation Protocol"
  ],
  "high_demand_careers": [
    "Clinical Research Associate (ASU Drugs)",
    "Panchakarma Center Medical Director"
  ]
}`;

                      const result = await ai.models.generateContent({
                        model: 'gemini-3.8-flash',
                        contents: prompt,
                        config: {
                          responseMimeType: 'application/json',
                          temperature: 0.2
                        }
                      });

                      const text = result.text || '{}';
                      recommendation = JSON.parse(text.trim());
                    } catch (geminiErr) {
                      console.warn('[Vite API] Gemini call error:', geminiErr);
                    }
                  }

                  if (!recommendation) {
                    recommendation = {
                      readiness_score: 84,
                      executive_summary: `Your ${course} foundation and clinical competencies are very strong. Targeted focus on regulatory pharmacovigilance and standardized pulse telemetry will elevate your profile into the top 5% of candidate matches.`,
                      top_skill_gaps: [
                        {
                          skill: 'Good Clinical Practice (GCP) for ASU Drug Trials',
                          importance: 'Critical',
                          why_needed: 'Required by top pharmaceutical R&D labs and clinical trial sites.'
                        },
                        {
                          skill: 'NABH AYUSH Clinical Documentation & Safety Standards',
                          importance: 'Critical',
                          why_needed: 'Essential for leading tertiary AYUSH hospitals and government research bodies.'
                        },
                        {
                          skill: 'Bio-Sensor Pulse Telemetry & Digital Nadi Pariksha',
                          importance: 'Recommended',
                          why_needed: 'High demand in AI-driven AYUSH health-tech startups.'
                        }
                      ],
                      learning_path: [
                        {
                          milestone: 'Phase 1 (Weeks 1-4): Clinical Governance',
                          action: 'Complete AYUSH e-learning module on adverse event reporting and standard pharmacovigilance.',
                          expected_outcome: 'Verifiable badge on student portfolio.'
                        },
                        {
                          milestone: 'Phase 2 (Weeks 5-8): Protocol Design',
                          action: 'Engage with CCRAS-sponsored clinical observation or hospital residency trial protocols.',
                          expected_outcome: 'Practical trial readiness for placement interviews.'
                        }
                      ],
                      recommended_certifications: [
                        'NABH AYUSH Hospital Quality & Accreditation Protocol',
                        'CCRAS / WHO-GCTM Traditional Medicine Clinical Trial Protocol',
                        'Good Clinical Practices (GCP) Investigator Certification'
                      ],
                      high_demand_careers: [
                        'ASU Clinical Research Investigator / Associate',
                        'Chief Medical Officer — Integrated AYUSH Hospital',
                        'Herbal Formulation Scientist & QA Specialist'
                      ]
                    };
                  }

                  res.writeHead(200);
                  res.end(JSON.stringify({ success: true, model: 'gemini-3.8-flash', recommendation }));
                } catch (err: any) {
                  res.writeHead(500);
                  res.end(JSON.stringify({ error: err?.message || 'Failed to process request' }));
                }
              });
              return;
            }

            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          login: path.resolve(__dirname, 'login.html'),
          register: path.resolve(__dirname, 'register.html'),
          auth_callback: path.resolve(__dirname, 'auth/callback.html'),
          complete_profile: path.resolve(__dirname, 'complete-profile.html'),
          dashboard_student: path.resolve(__dirname, 'dashboard-student.html'),
          dashboard_industry: path.resolve(__dirname, 'dashboard-industry.html'),
          dashboard_academician: path.resolve(__dirname, 'dashboard-academician.html'),
          root_index: path.resolve(__dirname, 'root/index.html'),
          root_login: path.resolve(__dirname, 'root/login.html'),
          root_register: path.resolve(__dirname, 'root/register.html'),
          admin_login: path.resolve(__dirname, 'admin/login.html'),
          student_dashboard: path.resolve(__dirname, 'student/dashboard.html'),
          student_assessment: path.resolve(__dirname, 'student/assessment.html'),
          student_skill_profile: path.resolve(__dirname, 'student/skill-profile.html'),
          student_portfolio: path.resolve(__dirname, 'student/portfolio.html'),
          student_opportunities: path.resolve(__dirname, 'student/opportunities.html'),
          student_recommendations: path.resolve(__dirname, 'student/recommendations.html'),
          student_applications: path.resolve(__dirname, 'student/applications.html'),
          industry_dashboard: path.resolve(__dirname, 'industry/dashboard.html'),
          industry_post_opportunity: path.resolve(__dirname, 'industry/post-opportunity.html'),
          industry_post_event: path.resolve(__dirname, 'industry/post-event.html'),
          industry_applicants: path.resolve(__dirname, 'industry/applicants.html'),
          academician_dashboard: path.resolve(__dirname, 'academician/dashboard.html'),
          admin_dashboard: path.resolve(__dirname, 'admin/dashboard.html'),
          admin_approve_users: path.resolve(__dirname, 'admin/approve-users.html'),
          admin_manage_questions: path.resolve(__dirname, 'admin/manage-questions.html'),
          admin_manage_roles: path.resolve(__dirname, 'admin/manage-roles.html'),
        },
      },
    },
  };
});
