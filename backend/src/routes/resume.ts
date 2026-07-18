import { IRequest, Env } from '../types';
import { AIService } from '../services/ai';

export async function parseResume(request: IRequest, env: Env) {
  const supabase = request.supabase!;
  const userId = request.user.id;
  const body = await request.json() as any;
  const resumeUrl = body.resume_url;

  if (!resumeUrl) {
    return new Response(JSON.stringify({ error: 'resume_url is required' }), { status: 400 });
  }

  // Download the resume text (assuming it's a PDF parsed to text or raw text uploaded to storage)
  // For this implementation, let's assume the frontend sends the raw text extracted, or we extract it here.
  // Actually, Cloudflare Workers can't easily parse PDFs without a library like pdf.js.
  // Let's assume the frontend sends `resume_text` for AI extraction.

  if (!body.resume_text) {
     return new Response(JSON.stringify({ error: 'resume_text is required for parsing' }), { status: 400 });
  }

  const ai = new AIService(env);

  let extracted;
  try {
    extracted = await ai.extractProfileFromResume(body.resume_text);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Failed to extract profile', details: e.message }), { status: 500 });
  }

  // Update profile
  const { error } = await supabase
    .from('student_profiles')
    .update({
      education: extracted.education,
      skills: extracted.skills,
      interests: extracted.interests,
      preferred_domain: extracted.preferred_domain,
      resume_url: resumeUrl
    })
    .eq('user_id', userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ success: true, extracted }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
