import { Router } from 'itty-router';
import { Env, IRequest } from './types';
import { withAuth } from './middleware/auth';
import { getUserProfile, updateStudentProfile } from './routes/users';
import { createInternship, getRecommendations, getInternships } from './routes/internships';
import { createApplication, getApplications } from './routes/applications';
import { parseResume } from './routes/resume';

const router = Router();

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS requests for CORS
router.options('*', () => new Response(null, { headers: corsHeaders }));

// Middleware to apply CORS headers to all responses
const withCors = (response: Response | void) => {
  if (response instanceof Response) {
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      newHeaders.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
  return response;
};

// Public routes
router.get('/api/v1/health', () => new Response(JSON.stringify({ status: 'ok' }), { headers: { 'Content-Type': 'application/json' } }));
router.get('/api/v1/internships', async (req: IRequest, env: Env) => {
  // Use a temporary anon client for public read
  const { createClient } = await import('@supabase/supabase-js');
  req.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  return getInternships(req, env);
});

// Protected routes
router.get('/api/v1/users/me', withAuth, getUserProfile);
router.put('/api/v1/users/profile', withAuth, updateStudentProfile);

router.post('/api/v1/internships', withAuth, createInternship);
router.get('/api/v1/recommendations', withAuth, getRecommendations);

router.post('/api/v1/applications', withAuth, createApplication);
router.get('/api/v1/applications', withAuth, getApplications);

router.post('/api/v1/resume/parse', withAuth, parseResume);

// Fallback
router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const response = await router.handle(request, env).catch((err: any) => {
      console.error(err);
      return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    return withCors(response) as Response;
  },
};
