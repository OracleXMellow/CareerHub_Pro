'use client';

import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';
import type { ResumeData } from './resumes-content';

function SectionBlock({ title, children, show }: { title: string; children: React.ReactNode; show: boolean }) {
  if (!show) return null;
  return <div className="mb-5"><h2 className="text-sm font-bold uppercase tracking-wider text-teal-700 mb-2">{title}</h2>{children}</div>;
}

function ClassicSection({ title, children, show }: { title: string; children: React.ReactNode; show: boolean }) {
  if (!show) return null;
  return <div className="mb-5"><h2 className="text-base font-bold uppercase border-b border-gray-200 pb-1 mb-2">{title}</h2>{children}</div>;
}

export function ResumePreview({ resume }: { resume: ResumeData }) {
  const r = resume ?? {} as ResumeData;
  const isModern = r?.template === 'modern';

  const hasExp = (r.experience ?? []).some(e => e?.title || e?.company);
  const hasEdu = (r.education ?? []).some(e => e?.degree || e?.school);
  const hasCerts = (r.certifications ?? []).some(c => c?.name);
  const hasProjects = (r.projects ?? []).some(p => p?.name);
  const hasVol = (r.volunteering ?? []).some(v => v?.role || v?.organization);
  const hasAwards = (r.awards ?? []).some(a => a?.name);
  const hasPubs = (r.publications ?? []).some(p => p?.title);
  const hasSkills = (r.skills ?? []).length > 0;
  const hasInterests = (r.interests ?? []).length > 0;

  if (isModern) {
    return (
      <div className="bg-white text-gray-900 p-8 rounded-lg" style={{ fontFamily: 'system-ui, sans-serif', minHeight: '600px' }}>
        <div className="border-b-2 border-teal-600 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-teal-700">{r?.fullName || 'Your Name'}</h1>
          {r?.targetTitle && <p className="text-base text-teal-600 font-medium mt-1">{r.targetTitle}</p>}
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
            {r?.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>}
            {r?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
            {r?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>}
          </div>
        </div>

        <SectionBlock title="Professional Summary" show={!!r?.summary}>
          <p className="text-sm text-gray-700 leading-relaxed">{r.summary}</p>
        </SectionBlock>

        <SectionBlock title="Experience" show={hasExp}>
          {(r.experience ?? []).filter(e => e?.title || e?.company).map((exp, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between items-baseline"><h3 className="font-semibold text-gray-900">{exp.title}</h3><span className="text-xs text-gray-500">{exp.startDate} - {exp.endDate || 'Present'}</span></div>
              <p className="text-sm text-teal-600 font-medium">{exp.company}</p>
              {exp.description && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{exp.description}</p>}
            </div>
          ))}
        </SectionBlock>

        <SectionBlock title="Education" show={hasEdu}>
          {(r.education ?? []).filter(e => e?.degree || e?.school).map((edu, i) => (
            <div key={i} className="mb-2"><div className="flex justify-between"><span className="font-semibold text-gray-900">{edu.degree}</span><span className="text-xs text-gray-500">{edu.year}</span></div><p className="text-sm text-gray-600">{edu.school}</p></div>
          ))}
        </SectionBlock>

        <SectionBlock title="Skills" show={hasSkills}>
          <div className="flex flex-wrap gap-2">{(r.skills ?? []).map((s, i) => <span key={i} className="px-2 py-1 bg-teal-50 text-teal-700 rounded text-xs font-medium">{s}</span>)}</div>
        </SectionBlock>

        <SectionBlock title="Certifications" show={hasCerts}>
          {(r.certifications ?? []).filter(c => c?.name).map((c, i) => (
            <div key={i} className="mb-2"><div className="flex justify-between"><span className="font-semibold text-gray-900 text-sm">{c.name}</span><span className="text-xs text-gray-500">{c.year}</span></div><p className="text-xs text-gray-600">{c.issuer}</p></div>
          ))}
        </SectionBlock>

        <SectionBlock title="Projects" show={hasProjects}>
          {(r.projects ?? []).filter(p => p?.name).map((p, i) => (
            <div key={i} className="mb-3">
              <div className="flex items-center gap-2"><h3 className="font-semibold text-sm text-gray-900">{p.name}</h3>{p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-teal-600"><ExternalLink className="h-3 w-3" /></a>}</div>
              {p.description && <p className="text-sm text-gray-600 mt-0.5">{p.description}</p>}
            </div>
          ))}
        </SectionBlock>

        <SectionBlock title="Awards & Scholarships" show={hasAwards}>
          {(r.awards ?? []).filter(a => a?.name).map((a, i) => (
            <div key={i} className="mb-2"><div className="flex justify-between"><span className="font-semibold text-sm text-gray-900">{a.name}</span><span className="text-xs text-gray-500">{a.year}</span></div><p className="text-xs text-gray-600">{a.issuer}</p></div>
          ))}
        </SectionBlock>

        <SectionBlock title="Volunteering & Leadership" show={hasVol}>
          {(r.volunteering ?? []).filter(v => v?.role || v?.organization).map((v, i) => (
            <div key={i} className="mb-3"><h3 className="font-semibold text-sm text-gray-900">{v.role}</h3><p className="text-sm text-teal-600 font-medium">{v.organization}</p>{v.description && <p className="text-sm text-gray-600 mt-0.5">{v.description}</p>}</div>
          ))}
        </SectionBlock>

        <SectionBlock title="Publications" show={hasPubs}>
          {(r.publications ?? []).filter(p => p?.title).map((p, i) => (
            <div key={i} className="mb-2"><div className="flex justify-between"><span className="font-semibold text-sm text-gray-900">{p.title}</span><span className="text-xs text-gray-500">{p.year}</span></div><p className="text-xs text-gray-600">{p.publisher}</p></div>
          ))}
        </SectionBlock>

        <SectionBlock title="Interests" show={hasInterests}>
          <div className="flex flex-wrap gap-2">{(r.interests ?? []).map((s, i) => <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">{s}</span>)}</div>
        </SectionBlock>
      </div>
    );
  }

  // Classic template
  return (
    <div className="bg-white text-gray-900 p-8 rounded-lg" style={{ fontFamily: 'Georgia, serif', minHeight: '600px' }}>
      <div className="text-center mb-6 pb-4 border-b border-gray-300">
        <h1 className="text-2xl font-bold">{r?.fullName || 'Your Name'}</h1>
        {r?.targetTitle && <p className="text-sm text-gray-600 italic mt-1">{r.targetTitle}</p>}
        <div className="flex flex-wrap justify-center gap-3 mt-2 text-sm text-gray-600">
          {r?.email && <span>{r.email}</span>}
          {r?.phone && <span>• {r.phone}</span>}
          {r?.location && <span>• {r.location}</span>}
        </div>
      </div>

      <ClassicSection title="Summary" show={!!r?.summary}>
        <p className="text-sm leading-relaxed">{r.summary}</p>
      </ClassicSection>

      <ClassicSection title="Experience" show={hasExp}>
        {(r.experience ?? []).filter(e => e?.title || e?.company).map((exp, i) => (
          <div key={i} className="mb-4"><div className="flex justify-between"><div><h3 className="font-bold">{exp.title}</h3><p className="text-sm italic text-gray-600">{exp.company}</p></div><span className="text-xs text-gray-500">{exp.startDate} - {exp.endDate || 'Present'}</span></div>{exp.description && <p className="text-sm mt-1 whitespace-pre-line">{exp.description}</p>}</div>
        ))}
      </ClassicSection>

      <ClassicSection title="Education" show={hasEdu}>
        {(r.education ?? []).filter(e => e?.degree || e?.school).map((edu, i) => (
          <div key={i} className="mb-2 flex justify-between"><div><span className="font-bold">{edu.degree}</span><span className="text-sm text-gray-600"> — {edu.school}</span></div><span className="text-xs text-gray-500">{edu.year}</span></div>
        ))}
      </ClassicSection>

      <ClassicSection title="Skills" show={hasSkills}><p className="text-sm">{(r.skills ?? []).join(' • ')}</p></ClassicSection>

      <ClassicSection title="Certifications" show={hasCerts}>
        {(r.certifications ?? []).filter(c => c?.name).map((c, i) => <div key={i} className="mb-1 text-sm"><span className="font-bold">{c.name}</span> — {c.issuer} ({c.year})</div>)}
      </ClassicSection>

      <ClassicSection title="Projects" show={hasProjects}>
        {(r.projects ?? []).filter(p => p?.name).map((p, i) => <div key={i} className="mb-2"><span className="font-bold text-sm">{p.name}</span>{p.description && <p className="text-sm mt-0.5">{p.description}</p>}</div>)}
      </ClassicSection>

      <ClassicSection title="Awards & Scholarships" show={hasAwards}>
        {(r.awards ?? []).filter(a => a?.name).map((a, i) => <div key={i} className="mb-1 text-sm"><span className="font-bold">{a.name}</span> — {a.issuer} ({a.year})</div>)}
      </ClassicSection>

      <ClassicSection title="Volunteering & Leadership" show={hasVol}>
        {(r.volunteering ?? []).filter(v => v?.role || v?.organization).map((v, i) => <div key={i} className="mb-2"><span className="font-bold text-sm">{v.role}</span> at {v.organization}{v.description && <p className="text-sm mt-0.5">{v.description}</p>}</div>)}
      </ClassicSection>

      <ClassicSection title="Publications" show={hasPubs}>
        {(r.publications ?? []).filter(p => p?.title).map((p, i) => <div key={i} className="mb-1 text-sm"><span className="font-bold">{p.title}</span> — {p.publisher} ({p.year})</div>)}
      </ClassicSection>

      <ClassicSection title="Interests" show={hasInterests}><p className="text-sm">{(r.interests ?? []).join(' • ')}</p></ClassicSection>
    </div>
  );
}
