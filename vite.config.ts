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
        name: 'auth-callback-rewrite',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (req.url && (req.url.startsWith('/auth/callback?') || req.url.startsWith('/auth/callback#') || req.url === '/auth/callback' || req.url === '/auth/callback/')) {
              req.url = req.url.replace('/auth/callback', '/auth/callback.html');
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
