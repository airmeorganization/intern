import { createClient } from '@supabase/supabase-js';
import { IRequest, Env } from '../types';

export async function withAuth(request: IRequest, env: Env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token', details: error?.message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Attach user and authenticated client to request
  request.user = user;

  // Create an authenticated client
  request.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

export function withSupabaseAdmin(request: IRequest, env: Env) {
  request.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}
