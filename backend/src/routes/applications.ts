import { IRequest, Env } from '../types';

export async function createApplication(request: IRequest, env: Env) {
  const supabase = request.supabase!;
  const userId = request.user.id;
  const body = await request.json() as any;

  if (!body.internship_id) {
    return new Response(JSON.stringify({ error: 'internship_id is required' }), { status: 400 });
  }

  const { data, error } = await supabase
    .from('applications')
    .insert({
      student_id: userId,
      internship_id: body.internship_id,
      status: 'Applied'
    })
    .select('id')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true, id: data.id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
}

export async function getApplications(request: IRequest, env: Env) {
  const supabase = request.supabase!;
  const userId = request.user.id;

  // Check if user is student or company
  const { data: user, error: userError } = await supabase.from('users').select('role').eq('id', userId).single();

  if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  if (user.role === 'student') {
    const { data, error } = await supabase
      .from('applications')
      .select('*, internships(*, companies(company_name))')
      .eq('student_id', userId);

    if (error) {
       return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } else {
    // Get company ID
    const { data: company, error: companyError } = await supabase.from('companies').select('id').eq('user_id', userId).single();
    if (companyError || !company) {
       return new Response(JSON.stringify({ error: 'Company not found' }), { status: 404 });
    }

    // Complex query: get applications for internships belonging to this company
    // Supabase JS doesn't support joins like `internships!inner(company_id)` easily for filtering unless we use view or rpc,
    // or we fetch internships first, or use a nested filter if foreign key constraints allow.
    // Given RLS policy allows company owners to read, we can just fetch all applications and RLS will filter,
    // BUT we need to ensure the RLS on applications for SELECT allows company owners to see them.
    // Let's use an inner join filter:

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        internships!inner(*),
        users!applications_student_id_fkey(full_name, email),
        student_profiles!applications_student_id_fkey(*)
      `)
      .eq('internships.company_id', company.id);

    if (error) {
       return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
