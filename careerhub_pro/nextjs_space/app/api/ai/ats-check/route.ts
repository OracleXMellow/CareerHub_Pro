export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { callLLMJson, aiErrorResponse, type ChatMessage } from "@/lib/ai";
import { enforceQuota, quotaResponse } from "@/lib/rate-limit";

/* ------------------------------------------------------------------ */
/* GENERIC ATS PROMPT — no job description provided                    */
/* Modeled after BambooHR (parseability) + general ATS best practices */
/* ------------------------------------------------------------------ */
const GENERIC_PROMPT = `You are an expert ATS (Applicant Tracking System) analyst modeled on how platforms like BambooHR, Greenhouse and Workable evaluate resumes.

Analyze the resume against these FIVE scoring dimensions:

1. **Parseability & Structure** (max 25 points)
   BambooHR-style: Can an ATS machine-read this? Check for standard section headings (Experience, Education, Skills), consistent date formatting, no special characters/tables/columns that break parsers, clean single-column structure, proper contact info placement at the top for mobile candidate cards.

2. **Quantified Impact** (max 25 points)
   Greenhouse scorecard-style: Do experience bullets use the STAR method? Look for specific numbers, percentages, dollar amounts, measurable outcomes, and action verbs. Flag vague duty-listing bullets that lack evidence of impact.

3. **Keyword Optimisation** (max 20 points)
   Workable-style: Are industry-standard keywords present? Check for relevant hard skills, tools, technologies, certifications, and soft skills that a recruiter would search for in the ATS database. Evaluate keyword placement — keywords in Summary and Experience sections count more than a standalone Skills list.

4. **Experience & Title Alignment** (max 15 points)
   Does the resume clearly communicate seniority level (entry/mid/senior)? Are job titles recognisable and standard? Is there a logical career progression? Is the target title or professional headline present?

5. **Completeness & Polish** (max 15 points)
   Are all expected sections present (summary, experience, education, skills)? Is the resume an appropriate length? Are there gaps or missing dates? Is the language professional and error-free?

Return a JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "mode": "generic",
  "categories": [
    {
      "name": "Category Name",
      "score": <number>,
      "maxScore": <max for this category>,
      "issues": [
        { "severity": "critical" | "warning" | "info", "message": "Issue", "suggestion": "Fix" }
      ]
    }
  ],
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": [],
  "topRecommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "tailoredSuggestions": []
}

Be thorough, specific, and reference actual content from the resume. The overall score is the sum of category scores.
Respond with raw JSON only.`;

/* ------------------------------------------------------------------ */
/* JOB-SPEC-AWARE PROMPT — job description IS provided                 */
/* Combines Greenhouse scorecards + Workable keyword matching          */
/* ------------------------------------------------------------------ */
const JOBSPEC_PROMPT = `You are an expert ATS (Applicant Tracking System) analyst modeled on how platforms like BambooHR, Greenhouse and Workable evaluate resumes AGAINST a specific job description.

You will receive a RESUME and a JOB DESCRIPTION. Score the resume on how well it matches THIS specific role using these FIVE dimensions:

1. **Parseability & Structure** (max 20 points)
   Can an ATS machine-read this? Standard headings, clean formatting, consistent dates, no tables/graphics, proper section order, contact info at the top.

2. **Keyword & Skills Coverage** (max 30 points)
   This is the most important dimension. Extract EVERY hard skill, tool, technology, certification, and domain keyword from the job description. For each, check if the resume contains it (exact or close synonym). Weight hard requirements ("must have", "required") higher than nice-to-haves. Report matched and missing keywords explicitly.

3. **Quantified Impact & Evidence** (max 20 points)
   Greenhouse scorecard approach: For each key responsibility in the job spec, does the resume provide evidence? Look for STAR-method bullets with numbers, percentages, outcomes. Flag vague descriptions that could have been quantified.

4. **Experience & Title Alignment** (max 15 points)
   Does the candidate's seniority match? Are their job titles relevant? Do years of experience meet the stated requirement? Is career progression logical for this role?

5. **Tailored Fit & Completeness** (max 15 points)
   Does the summary/objective reference the target role or company? Is the resume tailored to this specific job or generic? Are all required sections present?

Return a JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "mode": "jobspec",
  "categories": [
    {
      "name": "Category Name",
      "score": <number>,
      "maxScore": <max for this category>,
      "issues": [
        { "severity": "critical" | "warning" | "info", "message": "Issue", "suggestion": "Fix" }
      ]
    }
  ],
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["missing1", "missing2"],
  "topRecommendations": ["Highest-impact fix 1", "Fix 2", "Fix 3", "Fix 4", "Fix 5"],
  "tailoredSuggestions": [
    {
      "section": "Experience | Summary | Skills | etc.",
      "original": "Current text from the resume (or empty if adding new content)",
      "suggested": "Rewritten text tailored to the job spec",
      "reason": "Why this change improves the match"
    }
  ]
}

The matchedKeywords and missingKeywords lists must be comprehensive — list EVERY relevant keyword from the job description and whether it was found.
The tailoredSuggestions should provide concrete before/after rewrites the user can apply immediately.
The overall score is the sum of category scores.
Be thorough, specific, and reference actual content from both the resume and the job description.
Respond with raw JSON only.`;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const __q = await enforceQuota((session.user as any).id, 'ai');
    if (!__q.ok) return quotaResponse('ai', __q.limit);

    const body = await request.json();
    const { resumeData, jobDescription } = body ?? {};
    if (!resumeData) {
      return new Response(JSON.stringify({ error: "Resume data is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const resumeText = buildResumeText(resumeData);
    const hasJobSpec = typeof jobDescription === 'string' && jobDescription.trim().length > 20;

    let userContent: string;
    if (hasJobSpec) {
      userContent = `=== RESUME ===\n${resumeText}\n\n=== JOB DESCRIPTION ===\n${jobDescription.trim()}`;
    } else {
      userContent = `Analyze this resume for ATS compatibility:\n\n${resumeText}`;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: hasJobSpec ? JOBSPEC_PROMPT : GENERIC_PROMPT },
      { role: 'user', content: userContent },
    ];

    const parsed = await callLLMJson<any>({ messages, maxTokens: 5000 });

    // ---- Normalize ----
    const clamp = (n: any, min: number, max: number) => {
      const num = Number(n);
      if (!Number.isFinite(num)) return min;
      return Math.max(min, Math.min(max, Math.round(num)));
    };

    const rawCats = Array.isArray(parsed?.categories) ? parsed.categories : [];
    const categories = rawCats.map((c: any) => {
      const maxScore = clamp(c?.maxScore, 1, 100);
      const issues = Array.isArray(c?.issues)
        ? c.issues.map((i: any) => ({
            severity: ['critical', 'warning', 'info'].includes(i?.severity) ? i.severity : 'info',
            message: String(i?.message || ''),
            suggestion: String(i?.suggestion || ''),
          }))
        : [];
      return {
        name: String(c?.name || 'Category'),
        score: clamp(c?.score, 0, maxScore),
        maxScore,
        issueCount: issues.length,
        issues,
      };
    });

    const strArr = (v: any) => (Array.isArray(v) ? v.map((x: any) => String(x)).filter(Boolean) : []);

    const tailoredSuggestions = Array.isArray(parsed?.tailoredSuggestions)
      ? parsed.tailoredSuggestions.map((s: any) => ({
          section: String(s?.section || ''),
          original: String(s?.original || ''),
          suggested: String(s?.suggested || ''),
          reason: String(s?.reason || ''),
        }))
      : [];

    const safe = {
      overallScore: clamp(parsed?.overallScore, 0, 100),
      mode: hasJobSpec ? 'jobspec' : 'generic',
      categories,
      matchedKeywords: strArr(parsed?.matchedKeywords),
      missingKeywords: strArr(parsed?.missingKeywords),
      topRecommendations: strArr(parsed?.topRecommendations),
      tailoredSuggestions,
    };

    return new Response(JSON.stringify(safe), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('ATS check error:', error);
    return aiErrorResponse(error);
  }
}

function buildResumeText(r: any): string {
  const sections: string[] = [];

  if (r.targetTitle) sections.push(`TARGET TITLE: ${r.targetTitle}`);
  sections.push(`NAME: ${r.fullName || 'Not provided'}`);
  if (r.email) sections.push(`EMAIL: ${r.email}`);
  if (r.phone) sections.push(`PHONE: ${r.phone}`);
  if (r.location) sections.push(`LOCATION: ${r.location}`);

  if (r.summary) sections.push(`\nPROFESSIONAL SUMMARY:\n${r.summary}`);

  const exp = Array.isArray(r.experience) ? r.experience : [];
  if (exp.length > 0 && exp.some((e: any) => e?.title || e?.company)) {
    sections.push('\nWORK EXPERIENCE:');
    exp.forEach((e: any) => {
      sections.push(`  ${e.title || ''} at ${e.company || ''} (${e.startDate || ''} - ${e.endDate || ''})`);
      if (e.description) sections.push(`  ${e.description}`);
    });
  }

  const edu = Array.isArray(r.education) ? r.education : [];
  if (edu.length > 0 && edu.some((e: any) => e?.degree || e?.school)) {
    sections.push('\nEDUCATION:');
    edu.forEach((e: any) => sections.push(`  ${e.degree || ''} - ${e.school || ''} (${e.year || ''})`));
  }

  const skills = Array.isArray(r.skills) ? r.skills : [];
  if (skills.length > 0) sections.push(`\nSKILLS: ${skills.join(', ')}`);

  const certs = Array.isArray(r.certifications) ? r.certifications : [];
  if (certs.length > 0 && certs.some((c: any) => c?.name)) {
    sections.push('\nCERTIFICATIONS:');
    certs.forEach((c: any) => sections.push(`  ${c.name || ''} - ${c.issuer || ''} (${c.year || ''})`));
  }

  const projs = Array.isArray(r.projects) ? r.projects : [];
  if (projs.length > 0 && projs.some((p: any) => p?.name)) {
    sections.push('\nPROJECTS:');
    projs.forEach((p: any) => {
      sections.push(`  ${p.name || ''}`);
      if (p.description) sections.push(`  ${p.description}`);
    });
  }

  const vol = Array.isArray(r.volunteering) ? r.volunteering : [];
  if (vol.length > 0 && vol.some((v: any) => v?.role || v?.organization)) {
    sections.push('\nVOLUNTEERING & LEADERSHIP:');
    vol.forEach((v: any) => sections.push(`  ${v.role || ''} at ${v.organization || ''}: ${v.description || ''}`));
  }

  const awards = Array.isArray(r.awards) ? r.awards : [];
  if (awards.length > 0 && awards.some((a: any) => a?.name)) {
    sections.push('\nAWARDS & SCHOLARSHIPS:');
    awards.forEach((a: any) => sections.push(`  ${a.name || ''} - ${a.issuer || ''} (${a.year || ''})`));
  }

  const pubs = Array.isArray(r.publications) ? r.publications : [];
  if (pubs.length > 0 && pubs.some((p: any) => p?.title)) {
    sections.push('\nPUBLICATIONS:');
    pubs.forEach((p: any) => sections.push(`  ${p.title || ''} - ${p.publisher || ''} (${p.year || ''})`));
  }

  const interests = Array.isArray(r.interests) ? r.interests : [];
  if (interests.length > 0) sections.push(`\nINTERESTS: ${interests.join(', ')}`);

  return sections.join('\n');
}
