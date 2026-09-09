export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callLLMJson, aiErrorResponse } from '@/lib/ai';
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
    if (!resumeData || typeof resumeData !== 'object' || !isNonEmptyString(jobDescription)) {
      return NextResponse.json({ error: 'Resume data and job description are required' }, { status: 400 });
    }

    const resumeText = [
      resumeData.fullName, resumeData.targetTitle, resumeData.summary,
      ...(resumeData.experience || []).map((e: any) => `${e.title} at ${e.company}: ${e.description}`),
      ...(resumeData.education || []).map((e: any) => `${e.degree} from ${e.school}`),
      ...(resumeData.skills || []),
      ...(resumeData.certifications || []).map((c: any) => c.name),
      ...(resumeData.projects || []).map((p: any) => `${p.name}: ${p.description}`),
    ].filter(Boolean).join('\n');

    const result = await callLLMJson({
      temperature: 0.3,
      maxTokens: 3000,
      messages: [
        {
          role: 'system',
          content: `You are an expert ATS and recruitment specialist. Analyze how well a resume matches a job description. Return a JSON object with exactly this structure:
{
  "matchScore": <number 0-100>,
  "matchLevel": "Excellent" | "Good" | "Fair" | "Poor",
  "matchedKeywords": ["keyword1", "keyword2", ...],
  "missingKeywords": ["keyword1", "keyword2", ...],
  "strengths": ["strength description 1", ...],
  "gaps": ["gap description 1", ...],
  "tailoredSuggestions": [
    { "section": "Summary", "original": "current text or empty", "suggested": "improved text that better matches the job" },
    { "section": "Experience Bullet", "original": "current bullet", "suggested": "improved bullet with relevant keywords" }
  ]
}
Return ONLY the JSON object, no markdown or explanation.`,
        },
        {
          role: 'user',
          content: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`,
        },
      ],
    });

    // Normalize so the UI never crashes on missing fields.
    const safe = {
      matchScore: typeof result.matchScore === 'number' ? Math.max(0, Math.min(100, result.matchScore)) : 0,
      matchLevel: result.matchLevel || 'Fair',
      matchedKeywords: Array.isArray(result.matchedKeywords) ? result.matchedKeywords : [],
      missingKeywords: Array.isArray(result.missingKeywords) ? result.missingKeywords : [],
      strengths: Array.isArray(result.strengths) ? result.strengths : [],
      gaps: Array.isArray(result.gaps) ? result.gaps : [],
      tailoredSuggestions: Array.isArray(result.tailoredSuggestions) ? result.tailoredSuggestions : [],
    };

    return NextResponse.json(safe);
  } catch (error) {
    console.error('Job match error:', error);
    return aiErrorResponse(error);
  }
}
