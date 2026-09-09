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
    const { resumeData, jobDescription, questionCount = 8 } = body;
    if (!isNonEmptyString(jobDescription)) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    const resumeContext = resumeData ? [
      resumeData.fullName, resumeData.targetTitle, resumeData.summary,
      ...(resumeData.experience || []).map((e: any) => `${e.title} at ${e.company}: ${e.description}`),
      ...(resumeData.skills || []),
    ].filter(Boolean).join('\n') : '';

    const result = await callLLMJson<{ questions?: any[] } | any[]>({
      temperature: 0.5,
      maxTokens: 4000,
      messages: [
        {
          role: 'system',
          content: `You are an expert interview coach. Generate ${questionCount} interview questions tailored to the job description and candidate's background. Mix behavioral, technical, and situational questions. Return a JSON object with a "questions" array using this structure:
{ "questions": [
  {
    "id": 1,
    "category": "Behavioral" | "Technical" | "Situational" | "Culture Fit",
    "difficulty": "Easy" | "Medium" | "Hard",
    "question": "The interview question",
    "whyAsked": "Brief explanation of what the interviewer is looking for",
    "suggestedAnswer": "A strong suggested answer using STAR method where applicable, personalized to the candidate's experience if resume provided",
    "tips": ["tip 1", "tip 2"]
  }
] }
Return ONLY the JSON object, no markdown or explanation.`,
        },
        {
          role: 'user',
          content: `JOB DESCRIPTION:\n${jobDescription}${resumeContext ? `\n\nCANDIDATE RESUME:\n${resumeContext}` : ''}`,
        },
      ],
    });

    // Accept either { questions: [...] } or a bare array.
    let questions: any[] = Array.isArray(result) ? result : (result?.questions || []);
    questions = (questions || []).map((q: any, i: number) => ({
      id: q?.id ?? i + 1,
      category: q?.category || 'Behavioral',
      difficulty: q?.difficulty || 'Medium',
      question: q?.question || '',
      whyAsked: q?.whyAsked || '',
      suggestedAnswer: q?.suggestedAnswer || '',
      tips: Array.isArray(q?.tips) ? q.tips : [],
    })).filter((q: any) => q.question);

    if (questions.length === 0) {
      return NextResponse.json({ error: 'The AI could not generate questions for this description. Try adding more detail.' }, { status: 502 });
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Interview prep error:', error);
    return aiErrorResponse(error);
  }
}
