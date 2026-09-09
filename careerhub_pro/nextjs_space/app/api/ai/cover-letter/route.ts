export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchLLMStream, aiErrorResponse } from "@/lib/ai";
import { enforceQuota, quotaResponse } from "@/lib/rate-limit";
import { readJson, isNonEmptyString } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const __q = await enforceQuota((session.user as any).id, 'ai');
    if (!__q.ok) return quotaResponse('ai', __q.limit);
    const body = await readJson(request);
    if (!body) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const { jobDescription, resumeSummary, company, position, userName } = body;
    if (!isNonEmptyString(jobDescription)) {
      return new Response(JSON.stringify({ error: "jobDescription required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are an expert cover letter writer. Write a professional, compelling cover letter tailored to the job description. The letter should be 3-4 paragraphs, highlight relevant skills and experience, show enthusiasm for the role, and end with a strong call to action. Write in first person. Do not use markdown formatting, just plain text with paragraph breaks.'
      },
      {
        role: 'user',
        content: `Write a cover letter for this position:\n\nCompany: ${company ?? 'the company'}\nPosition: ${position ?? 'the position'}\nApplicant Name: ${userName ?? 'the applicant'}\n\nJob Description:\n${jobDescription}\n\n${resumeSummary ? `Resume Summary/Background:\n${resumeSummary}` : ''}`
      }
    ];

    const response = await fetchLLMStream({ messages, maxTokens: 2000 });

    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (error: any) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Cover letter generation error:', error);
    return aiErrorResponse(error);
  }
}
