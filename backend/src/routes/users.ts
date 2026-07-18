import { IRequest, Env } from '../types';

export async function getUserProfile(request: IRequest, env: Env) {
  const supabase = request.supabase!;
  const userId = request.user.id;

  const { data, error } = await supabase
    .from('users')
    .select(`
      id, full_name, email, role,
      student_profiles ( education, location, interests, preferred_domain, skills, resume_url ),
      companies ( id, company_name, description )
    `)
    .eq('id', userId)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

export async function updateStudentProfile(request: IRequest, env: Env) {
  const supabase = request.supabase!;
  const userId = request.user.id;
  const body = await request.json() as any;

  const { error } = await supabase
    .from('student_profiles')
    .update({
      education: body.education,
      location: body.location,
      interests: body.interests,
      preferred_domain: body.preferred_domain,
      skills: body.skills
    })
    .eq('user_id', userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
