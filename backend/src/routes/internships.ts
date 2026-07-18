import { IRequest, Env } from '../types';
import { AIService } from '../services/ai';

export async function createInternship(request: IRequest, env: Env) {
  const supabase = request.supabase!;
  const userId = request.user.id;
  const body = await request.json() as any;

  // Verify company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (companyError || !company) {
    return new Response(JSON.stringify({ error: 'Company not found for this user' }), { status: 403 });
  }

  // Generate embedding
  const ai = new AIService(env);
  const textToEmbed = `${body.title} ${body.description} ${Array.isArray(body.required_skills) ? body.required_skills.join(' ') : ''}`;
  let embedding;
  try {
    embedding = await ai.generateEmbedding(textToEmbed);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to generate embedding', details: e.message }), { status: 500 });
  }

  // Insert into Supabase to get ID
  const { data: internship, error: insertError } = await supabase
    .from('internships')
    .insert({
      company_id: company.id,
      title: body.title,
      description: body.description,
      required_skills: body.required_skills,
      location: body.location,
      duration: body.duration,
      stipend: body.stipend,
      work_mode: body.work_mode
    })
    .select('id')
    .single();

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 400 });
  }

  // Insert into Vectorize
  try {
    await env.VECTOR_INDEX.upsert([
      {
        id: internship.id,
        values: embedding,
        metadata: {
          title: body.title,
          company_id: company.id
        }
      }
    ]);
  } catch (e: any) {
    // If vectorize fails, might want to rollback supabase insert or queue a retry. For now, log it.
    console.error('Vectorize insert failed:', e);
    // Update supabase to mark vectorize failed if needed, or return warning
  }

  // Update internship with vector_id (using internship id itself)
  await supabase.from('internships').update({ vector_id: internship.id }).eq('id', internship.id);

  return new Response(JSON.stringify({ success: true, id: internship.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}

export async function getRecommendations(request: IRequest, env: Env) {
  const supabase = request.supabase!;
  const userId = request.user.id;

  // Get student profile
  const { data: profile, error: profileError } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
  }

  const ai = new AIService(env);
  const textToEmbed = `${profile.preferred_domain || ''} ${profile.education || ''} ${Array.isArray(profile.skills) ? profile.skills.join(' ') : ''} ${Array.isArray(profile.interests) ? profile.interests.join(' ') : ''}`;

  if (!textToEmbed.trim()) {
    // If profile is empty, fallback to simple fetch
    const { data: recent, error: recentError } = await supabase.from('internships').select('*, companies(company_name)').limit(20).order('created_at', { ascending: false });
    return new Response(JSON.stringify(recent || []), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  let embedding;
  try {
    embedding = await ai.generateEmbedding(textToEmbed);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to generate embedding' }), { status: 500 });
  }

  // Search Vectorize
  let matches;
  try {
    const results = await env.VECTOR_INDEX.query(embedding, { topK: 20 });
    matches = results.matches;
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Vector search failed', details: e.message }), { status: 500 });
  }

  if (!matches || matches.length === 0) {
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Fetch actual data from Supabase
  const matchIds = matches.map((m: any) => m.id);
  const { data: internships, error: internshipsError } = await supabase
    .from('internships')
    .select('*, companies(company_name)')
    .in('id', matchIds);

  if (internshipsError) {
    return new Response(JSON.stringify({ error: internshipsError.message }), { status: 400 });
  }

  // Sort by score
  const sorted = matches.map((m: any) => ({
    ...internships.find((i: any) => i.id === m.id),
    score: m.score
  })).filter((i: any) => i.id);

  return new Response(JSON.stringify(sorted), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export async function getInternships(request: IRequest, env: Env) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get('company_id');

  const supabase = request.supabase!; // Could use admin client for public routes, but this uses authenticated context

  let query = supabase.from('internships').select('*, companies(company_name)');

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) {
     return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
