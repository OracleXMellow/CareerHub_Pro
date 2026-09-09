export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callLLMJson, aiErrorResponse, type ChatMessage } from '@/lib/ai';
import { enforceQuota, quotaMessage } from '@/lib/rate-limit';
import { readJson, isNonEmptyString } from '@/lib/validate';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const __q = await enforceQuota((session.user as any).id, 'ai');
    if (!__q.ok) return NextResponse.json({ error: quotaMessage('ai', __q.limit) }, { status: 429 });

    const body = await readJson(request);
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    const { resumeData, jobDescription } = body;
    if (!resumeData || typeof resumeData !== 'object') return NextResponse.json({ error: 'Resume data is required' }, { status: 400 });
    if (!isNonEmptyString(jobDescription)) return NextResponse.json({ error: 'Job description is required' }, { status: 400 });

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert career consultant and professional resume writer. Your task is to tailor an existing resume for a specific job posting.

CRITICAL RULES:
1. ONLY rephrase, reorder, and emphasise content that ALREADY exists in the original resume. NEVER fabricate skills, employers, job titles, metrics, certifications, or any factual information that is not present in the original.
2. Rewrite the professional summary to target the specific role and company.
3. Reorder and rephrase experience bullet points to highlight achievements most relevant to the job requirements.
4. Weave in keywords and phrases from the job description naturally into existing content — but only where they truthfully apply.
5. Reorder the skills list so the most relevant skills for this role appear first.
6. Keep all dates, company names, school names, and factual details exactly as they are.
7. You may tighten or improve the wording of descriptions for clarity and impact, but the underlying facts must remain truthful.
8. The targetTitle should be updated to match the role being applied for.

Return a JSON object with this EXACT structure (all fields required):
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "targetTitle": "string (the job title from the posting)",
  "summary": "string (rewritten for this role)",
  "experience": [{"title": "string", "company": "string", "startDate": "string", "endDate": "string", "description": "string"}],
  "education": [{"degree": "string", "school": "string", "year": "string"}],
  "skills": ["string (reordered, most relevant first)"],
  "certifications": [{"name": "string", "issuer": "string", "year": "string"}],
  "projects": [{"name": "string", "description": "string", "url": "string"}],
  "volunteering": [{"role": "string", "organization": "string", "description": "string"}],
  "awards": [{"name": "string", "issuer": "string", "year": "string"}],
  "publications": [{"title": "string", "publisher": "string", "year": "string"}],
  "interests": ["string"],
  "changesSummary": [
    {"section": "string", "description": "string (brief explanation of what was changed and why)"}
  ]
}

The changesSummary array should list every meaningful change you made, so the user can review what was tailored.`,
      },
      {
        role: 'user',
        content: `Here is the original resume:\n\n${JSON.stringify(resumeData, null, 2)}\n\n---\n\nHere is the job description to tailor for:\n\n${jobDescription}`,
      },
    ];

    const result = await callLLMJson<any>({
      messages,
      maxTokens: 4000,
      timeoutMs: 90000,
    });

    // Ensure we preserve contact info even if LLM omits it
    const tailored = {
      fullName: result.fullName || resumeData.fullName || '',
      email: result.email || resumeData.email || '',
      phone: result.phone || resumeData.phone || '',
      location: result.location || resumeData.location || '',
      targetTitle: result.targetTitle || resumeData.targetTitle || '',
      summary: result.summary || resumeData.summary || '',
      experience: Array.isArray(result.experience) ? result.experience : resumeData.experience || [],
      education: Array.isArray(result.education) ? result.education : resumeData.education || [],
      skills: Array.isArray(result.skills) ? result.skills : resumeData.skills || [],
      certifications: Array.isArray(result.certifications) ? result.certifications : resumeData.certifications || [],
      projects: Array.isArray(result.projects) ? result.projects : resumeData.projects || [],
      volunteering: Array.isArray(result.volunteering) ? result.volunteering : resumeData.volunteering || [],
      awards: Array.isArray(result.awards) ? result.awards : resumeData.awards || [],
      publications: Array.isArray(result.publications) ? result.publications : resumeData.publications || [],
      interests: Array.isArray(result.interests) ? result.interests : resumeData.interests || [],
      changesSummary: Array.isArray(result.changesSummary) ? result.changesSummary : [],
    };

    return NextResponse.json(tailored);
  } catch (err: any) {
    return aiErrorResponse(err);
  }
}
