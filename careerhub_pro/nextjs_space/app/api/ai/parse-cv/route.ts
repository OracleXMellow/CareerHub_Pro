export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callLLMJson, aiErrorResponse, type ChatMessage } from "@/lib/ai";
import { enforceQuota, quotaResponse } from "@/lib/rate-limit";

const SYSTEM_PROMPT = `You are an expert CV/resume parser. Extract all structured information from the provided resume/CV document.

Return a JSON object with this exact structure:
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "targetTitle": "Target job title if mentioned",
  "summary": "A professional summary based on the CV content",
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

type ParsedCV = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  targetTitle?: string;
  summary?: string;
  experience?: any[];
  education?: any[];
  skills?: any[];
  certifications?: any[];
  projects?: any[];
  volunteering?: any[];
  awards?: any[];
  publications?: any[];
  interests?: any[];
};

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const fileName = file.name.toLowerCase();
    let messages: ChatMessage[];

    if (fileName.endsWith('.pdf')) {
      // PDF: base64-encode and send as file content
      const base64Buffer = await file.arrayBuffer();
      const base64String = Buffer.from(base64Buffer).toString('base64');
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'file', file: { filename: file.name, file_data: `data:application/pdf;base64,${base64String}` } },
            { type: 'text', text: 'Parse this CV/resume and extract all structured information.' }
          ]
        }
      ];
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      // DOCX: use mammoth to extract text
      const mammoth = require('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let extractedText = '';
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } catch {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value;
        } catch (e2: any) {
          return new Response(JSON.stringify({ error: "Failed to parse DOCX file: " + (e2?.message || 'Unknown error') }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }
      if (!extractedText.trim()) {
        return new Response(JSON.stringify({ error: "No text content found in the document" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Here is the content from the CV/resume file:\n\n${extractedText}` }
      ];
    } else {
      return new Response(JSON.stringify({ error: "Unsupported file type. Please upload a PDF or DOCX file." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // PDFs can take longer to process, so allow a larger timeout.
    const parsed = await callLLMJson<ParsedCV>({ messages, maxTokens: 4000, timeoutMs: 90000 });

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
    console.error('CV parse error:', error);
    return aiErrorResponse(error);
  }
}
