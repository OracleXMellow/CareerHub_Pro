export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callLLMJson, aiErrorResponse, type ChatMessage } from "@/lib/ai";
import { enforceQuota, quotaResponse } from "@/lib/rate-limit";
import { readJson, isNonEmptyString } from "@/lib/validate";

const SYSTEM_PROMPT = `You are an expert at extracting structured resume data from LinkedIn profile text content.
The user will paste their LinkedIn profile content (copied from their profile page).

Extract all structured information and return a JSON object with this exact structure:
{
  "fullName": "string",
  "email": "string (if available, otherwise empty)",
  "phone": "string (if available, otherwise empty)",
  "location": "string",
  "targetTitle": "Current or target job title from headline",
  "summary": "Professional summary or headline + about section combined",
  "experience": [
    { "title": "Job Title", "company": "Company Name", "startDate": "Start date", "endDate": "End date or Present", "description": "Key responsibilities and achievements" }
  ],
  "education": [
    { "degree": "Degree name", "school": "Institution name", "year": "Graduation year or date range" }
  ],
  "skills": ["skill1", "skill2"],
  "certifications": [
    { "name": "Certification name", "issuer": "Issuing organization", "year": "Year obtained" }
  ],
  "projects": [
    { "name": "Project name", "description": "Project description", "url": "URL if available" }
  ],
  "volunteering": [
    { "role": "Role title", "organization": "Organization name", "description": "Description" }
  ],
  "awards": [
    { "name": "Award name", "issuer": "Issuing body", "year": "Year" }
  ],
  "publications": [
    { "title": "Publication title", "publisher": "Publisher", "year": "Year" }
  ],
  "interests": ["interest1", "interest2"]
}

Extract ALL information available. If a field is not found, use an empty string or empty array.
Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

type ParsedProfile = Record<string, any>;

function arr(v: any): any[] {
  return Array.isArray(v) ? v : [];
}

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
    const { linkedinText } = body;

    if (!isNonEmptyString(linkedinText)) {
      return new Response(JSON.stringify({ error: "LinkedIn profile content is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Here is the LinkedIn profile content:\n\n${linkedinText}` }
    ];

    const parsed = await callLLMJson<ParsedProfile>({ messages, maxTokens: 4000 });

    const safe = {
      fullName: parsed.fullName || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      location: parsed.location || '',
      targetTitle: parsed.targetTitle || '',
      summary: parsed.summary || '',
      experience: arr(parsed.experience),
      education: arr(parsed.education),
      skills: arr(parsed.skills),
      certifications: arr(parsed.certifications),
      projects: arr(parsed.projects),
      volunteering: arr(parsed.volunteering),
      awards: arr(parsed.awards),
      publications: arr(parsed.publications),
      interests: arr(parsed.interests),
    };

    return new Response(JSON.stringify(safe), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('LinkedIn parse error:', error);
    return aiErrorResponse(error);
  }
}
