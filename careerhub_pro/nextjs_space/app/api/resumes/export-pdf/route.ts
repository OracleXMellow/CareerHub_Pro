export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enforceQuota, quotaMessage } from '@/lib/rate-limit';

function buildResumeHTML(r: any): string {
  const isModern = r.template === 'modern';
  const hasExp = (r.experience || []).some((e: any) => e?.title || e?.company);
  const hasEdu = (r.education || []).some((e: any) => e?.degree || e?.school);
  const hasCerts = (r.certifications || []).some((c: any) => c?.name);
  const hasProjects = (r.projects || []).some((p: any) => p?.name);
  const hasVol = (r.volunteering || []).some((v: any) => v?.role || v?.organization);
  const hasAwards = (r.awards || []).some((a: any) => a?.name);
  const hasPubs = (r.publications || []).some((p: any) => p?.title);
  const hasSkills = (r.skills || []).length > 0;
  const hasInterests = (r.interests || []).length > 0;

  const css = isModern ? `
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; margin: 0; padding: 40px; line-height: 1.5; font-size: 13px; }
    .header { border-bottom: 3px solid #0d6b6b; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { font-size: 28px; font-weight: 700; color: #0d6b6b; margin: 0; }
    .target-title { font-size: 15px; color: #0d8f8f; font-weight: 500; margin-top: 4px; }
    .contact { display: flex; gap: 16px; margin-top: 8px; color: #666; font-size: 12px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #0d6b6b; margin: 0 0 8px 0; }
    .entry { margin-bottom: 12px; }
    .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
    .entry-title { font-weight: 600; font-size: 14px; }
    .entry-date { font-size: 11px; color: #888; }
    .entry-subtitle { font-size: 13px; color: #0d8f8f; font-weight: 500; }
    .entry-desc { white-space: pre-line; margin-top: 4px; color: #444; }
    .skills-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-tag { padding: 3px 10px; background: #e6f5f5; color: #0d6b6b; border-radius: 4px; font-size: 11px; font-weight: 500; }
    .interest-tag { padding: 3px 10px; background: #f3f4f6; color: #555; border-radius: 4px; font-size: 11px; font-weight: 500; }
    .inline-entry { font-size: 13px; margin-bottom: 4px; }
    .inline-entry strong { font-weight: 600; }
  ` : `
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; padding: 40px; line-height: 1.5; font-size: 13px; }
    .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .target-title { font-size: 14px; color: #666; font-style: italic; margin-top: 4px; }
    .contact { display: flex; justify-content: center; gap: 12px; margin-top: 8px; color: #666; font-size: 12px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 0 0 8px 0; }
    .entry { margin-bottom: 12px; }
    .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
    .entry-title { font-weight: 700; font-size: 14px; }
    .entry-date { font-size: 11px; color: #888; }
    .entry-subtitle { font-size: 13px; color: #666; font-style: italic; }
    .entry-desc { white-space: pre-line; margin-top: 4px; color: #333; }
    .skills-list { font-size: 13px; }
    .inline-entry { font-size: 13px; margin-bottom: 4px; }
    .inline-entry strong { font-weight: 700; }
  `;

  const section = (title: string, content: string, show: boolean) => {
    if (!show) return '';
    return `<div class="section"><h2>${title}</h2>${content}</div>`;
  };

  const experienceHTML = (r.experience || []).filter((e: any) => e?.title || e?.company).map((exp: any) => `
    <div class="entry">
      <div class="entry-header"><span class="entry-title">${exp.title || ''}</span><span class="entry-date">${exp.startDate || ''} – ${exp.endDate || 'Present'}</span></div>
      <div class="entry-subtitle">${exp.company || ''}</div>
      ${exp.description ? `<div class="entry-desc">${exp.description}</div>` : ''}
    </div>
  `).join('');

  const educationHTML = (r.education || []).filter((e: any) => e?.degree || e?.school).map((edu: any) => `
    <div class="entry">
      <div class="entry-header"><span class="entry-title">${edu.degree || ''}</span><span class="entry-date">${edu.year || ''}</span></div>
      <div class="entry-subtitle">${edu.school || ''}</div>
    </div>
  `).join('');

  const skillsHTML = isModern
    ? `<div class="skills-list">${(r.skills || []).map((s: string) => `<span class="skill-tag">${s}</span>`).join('')}</div>`
    : `<div class="skills-list">${(r.skills || []).join(' • ')}</div>`;

  const certsHTML = (r.certifications || []).filter((c: any) => c?.name).map((c: any) =>
    `<div class="inline-entry"><strong>${c.name}</strong> — ${c.issuer || ''} (${c.year || ''})</div>`
  ).join('');

  const projectsHTML = (r.projects || []).filter((p: any) => p?.name).map((p: any) => `
    <div class="entry"><span class="entry-title">${p.name}</span>${p.url ? ` <a href="${p.url}" style="color:#0d6b6b;font-size:11px;">↗</a>` : ''}${p.description ? `<div class="entry-desc">${p.description}</div>` : ''}</div>
  `).join('');

  const awardsHTML = (r.awards || []).filter((a: any) => a?.name).map((a: any) =>
    `<div class="inline-entry"><strong>${a.name}</strong> — ${a.issuer || ''} (${a.year || ''})</div>`
  ).join('');

  const volHTML = (r.volunteering || []).filter((v: any) => v?.role || v?.organization).map((v: any) => `
    <div class="entry"><span class="entry-title">${v.role || ''}</span> at ${v.organization || ''}${v.description ? `<div class="entry-desc">${v.description}</div>` : ''}</div>
  `).join('');

  const pubsHTML = (r.publications || []).filter((p: any) => p?.title).map((p: any) =>
    `<div class="inline-entry"><strong>${p.title}</strong> — ${p.publisher || ''} (${p.year || ''})</div>`
  ).join('');

  const interestsHTML = isModern
    ? `<div class="skills-list">${(r.interests || []).map((s: string) => `<span class="interest-tag">${s}</span>`).join('')}</div>`
    : `<div class="skills-list">${(r.interests || []).join(' • ')}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
    <div class="header">
      <h1>${r.fullName || 'Your Name'}</h1>
      ${r.targetTitle ? `<div class="target-title">${r.targetTitle}</div>` : ''}
      <div class="contact">
        ${r.email ? `<span>${r.email}</span>` : ''}
        ${r.phone ? `<span>${isModern ? '' : '• '}${r.phone}</span>` : ''}
        ${r.location ? `<span>${isModern ? '' : '• '}${r.location}</span>` : ''}
      </div>
    </div>
    ${section('Professional Summary', `<p style="color:#444;">${r.summary || ''}</p>`, !!r.summary)}
    ${section('Experience', experienceHTML, hasExp)}
    ${section('Education', educationHTML, hasEdu)}
    ${section('Skills', skillsHTML, hasSkills)}
    ${section('Certifications', certsHTML, hasCerts)}
    ${section('Projects', projectsHTML, hasProjects)}
    ${section('Awards & Scholarships', awardsHTML, hasAwards)}
    ${section('Volunteering & Leadership', volHTML, hasVol)}
    ${section('Publications', pubsHTML, hasPubs)}
    ${section('Interests', interestsHTML, hasInterests)}
  </body></html>`;
}

// Starts an async PDF generation job and returns immediately with a
// request_id. The client polls /api/resumes/export-pdf/status for completion.
// Splitting create/poll keeps every request short, avoiding proxy/serverless
// timeouts on large résumés. Quota is enforced here (once per export).
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const __q = await enforceQuota((session.user as any).id, 'pdf');
    if (!__q.ok) return NextResponse.json({ error: quotaMessage('pdf', __q.limit) }, { status: 429 });

    const { resumeData } = await request.json();
    if (!resumeData) {
      return NextResponse.json({ error: 'Resume data is required' }, { status: 400 });
    }

    const htmlContent = buildResumeHTML(resumeData);

    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: htmlContent,
        pdf_options: {
          format: 'A4',
          margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
          print_background: true,
        },
      }),
    });

    if (!createResponse.ok) {
      const err = await createResponse.json().catch(() => ({ error: 'Failed to create PDF' }));
      console.error('PDF create error:', err);
      return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) {
      return NextResponse.json({ error: 'No request ID returned' }, { status: 500 });
    }

    const filename = `${(resumeData.fullName || 'Resume').replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`;
    return NextResponse.json({ request_id, filename });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Failed to export PDF' }, { status: 500 });
  }
}
