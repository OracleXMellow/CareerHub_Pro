'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Stagger, StaggerItem, FadeIn } from '@/components/ui/animate';
import { Plus, FileText, Trash2, Edit, Eye, LayoutTemplate, Upload, Linkedin, Loader2, Sparkles, FileUp, ChevronDown, ChevronUp, ShieldCheck, Target, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportResumePdf } from '@/lib/pdf-export';
import { Skeleton } from '@/components/ui/skeleton';
import { ResumePreview } from './resume-preview';
import { ATSChecker } from './ats-checker';
import { JobMatcher } from './job-matcher';
import { TailorCV } from './tailor-cv';

interface Experience { title: string; company: string; startDate: string; endDate: string; description: string; }
interface Education { degree: string; school: string; year: string; }
interface Certification { name: string; issuer: string; year: string; }
interface Project { name: string; description: string; url: string; }
interface Volunteering { role: string; organization: string; description: string; }
interface Award { name: string; issuer: string; year: string; }
interface Publication { title: string; publisher: string; year: string; }

export interface ResumeData {
  id?: string; title: string; template: string; fullName: string; email: string; phone: string;
  location: string; targetTitle: string; summary: string;
  experience: Experience[]; education: Education[]; skills: string[];
  certifications: Certification[]; projects: Project[]; volunteering: Volunteering[];
  awards: Award[]; publications: Publication[]; interests: string[];
  updatedAt?: string;
}

const emptyResume: ResumeData = {
  title: '', template: 'modern', fullName: '', email: '', phone: '', location: '', targetTitle: '', summary: '',
  experience: [{ title: '', company: '', startDate: '', endDate: '', description: '' }],
  education: [{ degree: '', school: '', year: '' }],
  skills: [], certifications: [], projects: [], volunteering: [], awards: [], publications: [], interests: [],
};

// Collapsible section wrapper
function Section({ label, children, count, onAdd }: { label: string; children: React.ReactNode; count: number; onAdd: () => void }) {
  const [open, setOpen] = useState(count > 0);
  return (
    <div className="border border-border/50 rounded-lg">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors rounded-lg">
        <span className="font-medium text-sm text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={e => { e.stopPropagation(); onAdd(); setOpen(true); }} className="text-primary hover:text-primary/80"><Plus className="h-4 w-4" /></button>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

export function ResumesContent() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [atsOpen, setAtsOpen] = useState(false);
  const [atsResume, setAtsResume] = useState<ResumeData | null>(null);
  const [current, setCurrent] = useState<ResumeData>({ ...emptyResume });
  const [saving, setSaving] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importTab, setImportTab] = useState<'upload' | 'linkedin'>('upload');
  const [linkedinText, setLinkedinText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [matcherOpen, setMatcherOpen] = useState(false);
  const [matcherResume, setMatcherResume] = useState<ResumeData | null>(null);
  const [tailorOpen, setTailorOpen] = useState(false);
  const [tailorResume, setTailorResume] = useState<ResumeData | null>(null);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);

  const fetchResumes = useCallback(() => {
    fetch('/api/resumes').then((r: any) => r.json()).then((d: any) => setResumes(d ?? [])).catch((e: any) => console.error(e)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchResumes(); }, [fetchResumes]);

  const safeParseArr = (s: string) => { try { return JSON.parse(s ?? '[]'); } catch { return []; } };

  const parseResume = (r: any): ResumeData => ({
    id: r?.id, title: r?.title ?? '', template: r?.template ?? 'modern',
    fullName: r?.fullName ?? '', email: r?.email ?? '', phone: r?.phone ?? '', location: r?.location ?? '',
    targetTitle: r?.targetTitle ?? '', summary: r?.summary ?? '',
    experience: safeParseArr(r?.experience), education: safeParseArr(r?.education), skills: safeParseArr(r?.skills),
    certifications: safeParseArr(r?.certifications), projects: safeParseArr(r?.projects),
    volunteering: safeParseArr(r?.volunteering), awards: safeParseArr(r?.awards),
    publications: safeParseArr(r?.publications), interests: safeParseArr(r?.interests),
    updatedAt: r?.updatedAt,
  });

  const applyParsedData = (parsed: any) => {
    const safeArr = (arr: any, defaults: any) => Array.isArray(arr) && arr.length > 0 ? arr : [defaults];
    setCurrent({
      title: parsed?.fullName ? `${parsed.fullName}'s Resume` : 'Imported Resume',
      template: 'modern', fullName: parsed?.fullName || '', email: parsed?.email || '',
      phone: parsed?.phone || '', location: parsed?.location || '', targetTitle: parsed?.targetTitle || '',
      summary: parsed?.summary || '',
      experience: safeArr(parsed?.experience, { title: '', company: '', startDate: '', endDate: '', description: '' }),
      education: safeArr(parsed?.education, { degree: '', school: '', year: '' }),
      skills: Array.isArray(parsed?.skills) ? parsed.skills.filter((s: any) => s) : [],
      certifications: Array.isArray(parsed?.certifications) ? parsed.certifications : [],
      projects: Array.isArray(parsed?.projects) ? parsed.projects : [],
      volunteering: Array.isArray(parsed?.volunteering) ? parsed.volunteering : [],
      awards: Array.isArray(parsed?.awards) ? parsed.awards : [],
      publications: Array.isArray(parsed?.publications) ? parsed.publications : [],
      interests: Array.isArray(parsed?.interests) ? parsed.interests.filter((s: any) => s) : [],
    });
  };

  const handleCVUpload = async () => {
    if (!selectedFile) { toast.error('Please select a file'); return; }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('/api/ai/parse-cv', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || 'Failed to parse CV'); return; }
      applyParsedData(data); setImportOpen(false); setEditOpen(true); setSelectedFile(null);
      toast.success('CV parsed successfully! Review and edit the extracted information.');
    } catch { toast.error('Failed to parse CV'); } finally { setImporting(false); }
  };

  const handleLinkedinImport = async () => {
    if (!linkedinText.trim()) { toast.error('Please paste your LinkedIn profile content'); return; }
    setImporting(true);
    try {
      const res = await fetch('/api/ai/parse-linkedin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedinText }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error || 'Failed to parse LinkedIn content'); return; }
      applyParsedData(data); setImportOpen(false); setEditOpen(true); setLinkedinText('');
      toast.success('LinkedIn profile parsed! Review and edit the extracted information.');
    } catch { toast.error('Failed to parse LinkedIn content'); } finally { setImporting(false); }
  };

  const handleSave = async () => {
    if (!current?.title) { toast.error('Resume title is required'); return; }
    setSaving(true);
    try {
      const method = current?.id ? 'PUT' : 'POST';
      const res = await fetch('/api/resumes', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
      if (!res.ok) { toast.error('Failed to save resume'); return; }
      toast.success(current?.id ? 'Resume updated' : 'Resume created');
      setEditOpen(false); fetchResumes();
    } catch { toast.error('Something went wrong'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this resume?')) return;
    try { await fetch(`/api/resumes?id=${id}`, { method: 'DELETE' }); toast.success('Resume deleted'); fetchResumes(); } catch { toast.error('Failed to delete'); }
  };

  const addSkill = () => { if (skillInput?.trim()) { setCurrent(p => ({ ...p, skills: [...(p.skills ?? []), skillInput.trim()] })); setSkillInput(''); } };
  const removeSkill = (idx: number) => { setCurrent(p => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) })); };
  const addInterest = () => { if (interestInput?.trim()) { setCurrent(p => ({ ...p, interests: [...(p.interests ?? []), interestInput.trim()] })); setInterestInput(''); } };
  const removeInterest = (idx: number) => { setCurrent(p => ({ ...p, interests: p.interests.filter((_, i) => i !== idx) })); };

  if (loading) return <div className="space-y-4 p-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-end gap-3">
        <Button variant="outline" onClick={() => { setImportTab('upload'); setSelectedFile(null); setLinkedinText(''); setImportOpen(true); }}>
          <FileUp className="mr-2 h-4 w-4" /> Import CV
        </Button>
        <Button onClick={() => { setCurrent({ ...emptyResume }); setEditOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Resume
        </Button>
      </div>

      {(resumes ?? []).length === 0 ? (
        <FadeIn>
          <Card className="border-dashed border-2 border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-lg font-medium">No resumes yet</p>
              <p className="text-sm text-muted-foreground mb-6">Create your first resume or import from an existing CV</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setImportTab('upload'); setSelectedFile(null); setLinkedinText(''); setImportOpen(true); }}><FileUp className="mr-2 h-4 w-4" /> Import CV</Button>
                <Button onClick={() => { setCurrent({ ...emptyResume }); setEditOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Create Resume</Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <Stagger staggerDelay={0.08}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(resumes ?? []).map((r: any) => {
              const parsed = parseResume(r);
              return (
                <StaggerItem key={r?.id}>
                  <Card className="border-border/50 transition-all hover:shadow-md" style={{ boxShadow: 'var(--shadow-sm)' }}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold">{r?.title ?? 'Untitled'}</h3>
                          <p className="text-xs text-muted-foreground">{parsed?.fullName || 'No name set'}</p>
                          {parsed?.targetTitle && <p className="text-xs text-primary font-medium mt-0.5">{parsed.targetTitle}</p>}
                        </div>
                        <Badge variant="secondary" className="ml-2 text-xs"><LayoutTemplate className="mr-1 h-3 w-3" />{r?.template ?? 'modern'}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(parsed?.skills ?? []).slice(0, 4).map((s: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{s}</Badge>)}
                        {(parsed?.skills?.length ?? 0) > 4 && <Badge variant="outline" className="text-xs">+{(parsed.skills.length) - 4}</Badge>}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setCurrent(parsed); setPreviewOpen(true); }}><Eye className="mr-1 h-3 w-3" /> Preview</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setCurrent(parsed); setEditOpen(true); }}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setAtsResume(parsed); setAtsOpen(true); }}><ShieldCheck className="mr-1 h-3 w-3" /> ATS Check</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setMatcherResume(parsed); setMatcherOpen(true); }}><Target className="mr-1 h-3 w-3" /> Job Match</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setTailorResume(parsed); setTailorOpen(true); }}><Sparkles className="mr-1 h-3 w-3" /> Tailor</Button>
                        <Button variant="ghost" size="sm" disabled={exportingPdf === r?.id} onClick={async () => {
                          setExportingPdf(r?.id);
                          const tid = toast.loading('Starting PDF export…');
                          try {
                            await exportResumePdf(parsed, `${(parsed.fullName || 'Resume').replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`, (pct, label) => {
                              toast.loading(`${label} ${pct}%`, { id: tid });
                            });
                            toast.success('Resume exported as PDF!', { id: tid });
                          } catch (e: any) { toast.error(e?.message || 'Failed to export PDF', { id: tid }); } finally { setExportingPdf(null); }
                        }}>{exportingPdf === r?.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />} PDF</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(r?.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}
          </div>
        </Stagger>
      )}

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Import & Auto-Fill Resume</DialogTitle></DialogHeader>
          <div className="flex bg-muted rounded-xl p-1 mb-4">
            <button onClick={() => setImportTab('upload')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${importTab === 'upload' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Upload className="h-4 w-4" /> Upload CV</button>
            <button onClick={() => setImportTab('linkedin')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${importTab === 'linkedin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Linkedin className="h-4 w-4" /> LinkedIn Import</button>
          </div>
          {importTab === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Upload your existing CV/resume and we&apos;ll automatically extract all your information using AI.</p>
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="h-10 w-10 text-primary mx-auto" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button onClick={() => setSelectedFile(null)} className="text-xs text-destructive hover:underline">Remove</button>
                  </div>
                ) : (<><Upload className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" /><p className="text-sm text-muted-foreground mb-1">Drag and drop or click to select</p><p className="text-xs text-muted-foreground">.pdf or .docx, up to 50 MB</p></>)}
                <label className="block mt-4 cursor-pointer"><span className="inline-block px-4 py-2 bg-background border rounded-lg text-sm font-medium hover:bg-muted transition-colors">{selectedFile ? 'Change File' : 'Browse File'}</span><input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) setSelectedFile(file); }} /></label>
              </div>
              <Button className="w-full" onClick={handleCVUpload} disabled={!selectedFile || importing}>
                {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Parsing CV with AI...</> : <><Sparkles className="mr-2 h-4 w-4" /> Extract & Auto-Fill</>}
              </Button>
            </div>
          )}
          {importTab === 'linkedin' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Copy your LinkedIn profile content and paste it below. We&apos;ll extract your professional information using AI.</p>
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground">How to get your LinkedIn content:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to your LinkedIn profile page</li>
                  <li>Select all content (Ctrl+A / Cmd+A)</li>
                  <li>Copy (Ctrl+C / Cmd+C) and paste below</li>
                </ol>
              </div>
              <Textarea value={linkedinText} onChange={(e: any) => setLinkedinText(e.target.value)} placeholder="Paste your LinkedIn profile content here..." rows={10} className="resize-none text-sm" />
              <Button className="w-full" onClick={handleLinkedinImport} disabled={!linkedinText.trim() || importing}>
                {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting from LinkedIn...</> : <><Sparkles className="mr-2 h-4 w-4" /> Extract & Auto-Fill</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{current?.id ? 'Edit Resume' : 'Create Resume'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!current?.id && !current?.fullName && (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                <FileUp className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium">Have an existing CV?</p><p className="text-xs text-muted-foreground">Upload your CV or paste LinkedIn content to auto-fill all fields.</p></div>
                <Button variant="outline" size="sm" onClick={() => { setEditOpen(false); setImportTab('upload'); setSelectedFile(null); setLinkedinText(''); setImportOpen(true); }}>Import</Button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Resume Title</Label><Input value={current?.title ?? ''} onChange={(e: any) => setCurrent(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Software Engineer Resume" /></div>
              <div><Label>Template</Label><div className="flex gap-2 mt-1">{['modern', 'classic'].map(t => <Button key={t} variant={current?.template === t ? 'default' : 'outline'} size="sm" onClick={() => setCurrent(p => ({ ...p, template: t }))}>{t.charAt(0).toUpperCase() + t.slice(1)}</Button>)}</div></div>
            </div>

            {/* Contact Info */}
            <Section label="Contact Information" count={1} onAdd={() => {}}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-xs">Full Name</Label><Input value={current?.fullName ?? ''} onChange={(e: any) => setCurrent(p => ({ ...p, fullName: e.target.value }))} /></div>
                <div><Label className="text-xs">Email</Label><Input type="email" value={current?.email ?? ''} onChange={(e: any) => setCurrent(p => ({ ...p, email: e.target.value }))} /></div>
                <div><Label className="text-xs">Phone</Label><Input value={current?.phone ?? ''} onChange={(e: any) => setCurrent(p => ({ ...p, phone: e.target.value }))} /></div>
                <div><Label className="text-xs">Location</Label><Input value={current?.location ?? ''} onChange={(e: any) => setCurrent(p => ({ ...p, location: e.target.value }))} /></div>
              </div>
            </Section>

            {/* Target Title */}
            <Section label="Target Title" count={current?.targetTitle ? 1 : 0} onAdd={() => {}}>
              <Input value={current?.targetTitle ?? ''} onChange={(e: any) => setCurrent(p => ({ ...p, targetTitle: e.target.value }))} placeholder="e.g. Senior Software Engineer" />
            </Section>

            {/* Professional Summary */}
            <Section label="Professional Summary" count={current?.summary ? 1 : 0} onAdd={() => {}}>
              <Textarea rows={3} value={current?.summary ?? ''} onChange={(e: any) => setCurrent(p => ({ ...p, summary: e.target.value }))} placeholder="Write a compelling professional summary..." />
            </Section>

            {/* Experience */}
            <Section label="Work Experience" count={current?.experience?.length ?? 0} onAdd={() => setCurrent(p => ({ ...p, experience: [...p.experience, { title: '', company: '', startDate: '', endDate: '', description: '' }] }))}>
              {(current?.experience ?? []).map((exp, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-3 space-y-2">
                  <div className="flex justify-between"><span className="text-xs text-muted-foreground">Position {i + 1}</span><Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => setCurrent(p => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }))}><Trash2 className="h-3 w-3" /></Button></div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Job Title" value={exp?.title ?? ''} onChange={(e: any) => { const u = [...current.experience]; u[i] = { ...u[i], title: e.target.value }; setCurrent(p => ({ ...p, experience: u })); }} />
                    <Input placeholder="Company" value={exp?.company ?? ''} onChange={(e: any) => { const u = [...current.experience]; u[i] = { ...u[i], company: e.target.value }; setCurrent(p => ({ ...p, experience: u })); }} />
                    <Input placeholder="Start Date" value={exp?.startDate ?? ''} onChange={(e: any) => { const u = [...current.experience]; u[i] = { ...u[i], startDate: e.target.value }; setCurrent(p => ({ ...p, experience: u })); }} />
                    <Input placeholder="End Date" value={exp?.endDate ?? ''} onChange={(e: any) => { const u = [...current.experience]; u[i] = { ...u[i], endDate: e.target.value }; setCurrent(p => ({ ...p, experience: u })); }} />
                  </div>
                  <Textarea placeholder="Description / achievements" rows={2} value={exp?.description ?? ''} onChange={(e: any) => { const u = [...current.experience]; u[i] = { ...u[i], description: e.target.value }; setCurrent(p => ({ ...p, experience: u })); }} />
                </div>
              ))}
            </Section>

            {/* Education */}
            <Section label="Education" count={current?.education?.length ?? 0} onAdd={() => setCurrent(p => ({ ...p, education: [...p.education, { degree: '', school: '', year: '' }] }))}>
              {(current?.education ?? []).map((edu, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-3">
                  <div className="flex justify-between mb-2"><span className="text-xs text-muted-foreground">Education {i + 1}</span><Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => setCurrent(p => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }))}><Trash2 className="h-3 w-3" /></Button></div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Degree" value={edu?.degree ?? ''} onChange={(e: any) => { const u = [...current.education]; u[i] = { ...u[i], degree: e.target.value }; setCurrent(p => ({ ...p, education: u })); }} />
                    <Input placeholder="School" value={edu?.school ?? ''} onChange={(e: any) => { const u = [...current.education]; u[i] = { ...u[i], school: e.target.value }; setCurrent(p => ({ ...p, education: u })); }} />
                    <Input placeholder="Year" value={edu?.year ?? ''} onChange={(e: any) => { const u = [...current.education]; u[i] = { ...u[i], year: e.target.value }; setCurrent(p => ({ ...p, education: u })); }} />
                  </div>
                </div>
              ))}
            </Section>

            {/* Skills & Interests */}
            <Section label="Skills & Interests" count={(current?.skills?.length ?? 0) + (current?.interests?.length ?? 0)} onAdd={() => {}}>
              <div><Label className="text-xs">Skills</Label><div className="flex gap-2 mt-1"><Input placeholder="Add a skill" value={skillInput} onChange={(e: any) => setSkillInput(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} /><Button variant="outline" size="sm" onClick={addSkill}>Add</Button></div>
              <div className="mt-2 flex flex-wrap gap-1">{(current?.skills ?? []).map((s, i) => <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(i)}>{s} ×</Badge>)}</div></div>
              <div className="mt-3"><Label className="text-xs">Interests</Label><div className="flex gap-2 mt-1"><Input placeholder="Add an interest" value={interestInput} onChange={(e: any) => setInterestInput(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }} /><Button variant="outline" size="sm" onClick={addInterest}>Add</Button></div>
              <div className="mt-2 flex flex-wrap gap-1">{(current?.interests ?? []).map((s, i) => <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeInterest(i)}>{s} ×</Badge>)}</div></div>
            </Section>

            {/* Certifications */}
            <Section label="Certifications" count={current?.certifications?.length ?? 0} onAdd={() => setCurrent(p => ({ ...p, certifications: [...p.certifications, { name: '', issuer: '', year: '' }] }))}>
              {(current?.certifications ?? []).map((cert, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-3">
                  <div className="flex justify-between mb-2"><span className="text-xs text-muted-foreground">Certification {i + 1}</span><Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => setCurrent(p => ({ ...p, certifications: p.certifications.filter((_, idx) => idx !== i) }))}><Trash2 className="h-3 w-3" /></Button></div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Name" value={cert?.name ?? ''} onChange={(e: any) => { const u = [...current.certifications]; u[i] = { ...u[i], name: e.target.value }; setCurrent(p => ({ ...p, certifications: u })); }} />
                    <Input placeholder="Issuer" value={cert?.issuer ?? ''} onChange={(e: any) => { const u = [...current.certifications]; u[i] = { ...u[i], issuer: e.target.value }; setCurrent(p => ({ ...p, certifications: u })); }} />
                    <Input placeholder="Year" value={cert?.year ?? ''} onChange={(e: any) => { const u = [...current.certifications]; u[i] = { ...u[i], year: e.target.value }; setCurrent(p => ({ ...p, certifications: u })); }} />
                  </div>
                </div>
              ))}
            </Section>

            {/* Awards */}
            <Section label="Awards & Scholarships" count={current?.awards?.length ?? 0} onAdd={() => setCurrent(p => ({ ...p, awards: [...p.awards, { name: '', issuer: '', year: '' }] }))}>
              {(current?.awards ?? []).map((award, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-3">
                  <div className="flex justify-between mb-2"><span className="text-xs text-muted-foreground">Award {i + 1}</span><Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => setCurrent(p => ({ ...p, awards: p.awards.filter((_, idx) => idx !== i) }))}><Trash2 className="h-3 w-3" /></Button></div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Award Name" value={award?.name ?? ''} onChange={(e: any) => { const u = [...current.awards]; u[i] = { ...u[i], name: e.target.value }; setCurrent(p => ({ ...p, awards: u })); }} />
                    <Input placeholder="Issuer" value={award?.issuer ?? ''} onChange={(e: any) => { const u = [...current.awards]; u[i] = { ...u[i], issuer: e.target.value }; setCurrent(p => ({ ...p, awards: u })); }} />
                    <Input placeholder="Year" value={award?.year ?? ''} onChange={(e: any) => { const u = [...current.awards]; u[i] = { ...u[i], year: e.target.value }; setCurrent(p => ({ ...p, awards: u })); }} />
                  </div>
                </div>
              ))}
            </Section>

            {/* Projects */}
            <Section label="Projects" count={current?.projects?.length ?? 0} onAdd={() => setCurrent(p => ({ ...p, projects: [...p.projects, { name: '', description: '', url: '' }] }))}>
              {(current?.projects ?? []).map((proj, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-3 space-y-2">
                  <div className="flex justify-between"><span className="text-xs text-muted-foreground">Project {i + 1}</span><Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => setCurrent(p => ({ ...p, projects: p.projects.filter((_, idx) => idx !== i) }))}><Trash2 className="h-3 w-3" /></Button></div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Project Name" value={proj?.name ?? ''} onChange={(e: any) => { const u = [...current.projects]; u[i] = { ...u[i], name: e.target.value }; setCurrent(p => ({ ...p, projects: u })); }} />
                    <Input placeholder="URL (optional)" value={proj?.url ?? ''} onChange={(e: any) => { const u = [...current.projects]; u[i] = { ...u[i], url: e.target.value }; setCurrent(p => ({ ...p, projects: u })); }} />
                  </div>
                  <Textarea placeholder="Description" rows={2} value={proj?.description ?? ''} onChange={(e: any) => { const u = [...current.projects]; u[i] = { ...u[i], description: e.target.value }; setCurrent(p => ({ ...p, projects: u })); }} />
                </div>
              ))}
            </Section>

            {/* Volunteering */}
            <Section label="Volunteering & Leadership" count={current?.volunteering?.length ?? 0} onAdd={() => setCurrent(p => ({ ...p, volunteering: [...p.volunteering, { role: '', organization: '', description: '' }] }))}>
              {(current?.volunteering ?? []).map((vol, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-3 space-y-2">
                  <div className="flex justify-between"><span className="text-xs text-muted-foreground">Entry {i + 1}</span><Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => setCurrent(p => ({ ...p, volunteering: p.volunteering.filter((_, idx) => idx !== i) }))}><Trash2 className="h-3 w-3" /></Button></div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Role" value={vol?.role ?? ''} onChange={(e: any) => { const u = [...current.volunteering]; u[i] = { ...u[i], role: e.target.value }; setCurrent(p => ({ ...p, volunteering: u })); }} />
                    <Input placeholder="Organization" value={vol?.organization ?? ''} onChange={(e: any) => { const u = [...current.volunteering]; u[i] = { ...u[i], organization: e.target.value }; setCurrent(p => ({ ...p, volunteering: u })); }} />
                  </div>
                  <Textarea placeholder="Description" rows={2} value={vol?.description ?? ''} onChange={(e: any) => { const u = [...current.volunteering]; u[i] = { ...u[i], description: e.target.value }; setCurrent(p => ({ ...p, volunteering: u })); }} />
                </div>
              ))}
            </Section>

            {/* Publications */}
            <Section label="Publications" count={current?.publications?.length ?? 0} onAdd={() => setCurrent(p => ({ ...p, publications: [...p.publications, { title: '', publisher: '', year: '' }] }))}>
              {(current?.publications ?? []).map((pub, i) => (
                <div key={i} className="rounded-lg border border-border/40 p-3">
                  <div className="flex justify-between mb-2"><span className="text-xs text-muted-foreground">Publication {i + 1}</span><Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => setCurrent(p => ({ ...p, publications: p.publications.filter((_, idx) => idx !== i) }))}><Trash2 className="h-3 w-3" /></Button></div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Title" value={pub?.title ?? ''} onChange={(e: any) => { const u = [...current.publications]; u[i] = { ...u[i], title: e.target.value }; setCurrent(p => ({ ...p, publications: u })); }} />
                    <Input placeholder="Publisher" value={pub?.publisher ?? ''} onChange={(e: any) => { const u = [...current.publications]; u[i] = { ...u[i], publisher: e.target.value }; setCurrent(p => ({ ...p, publications: u })); }} />
                    <Input placeholder="Year" value={pub?.year ?? ''} onChange={(e: any) => { const u = [...current.publications]; u[i] = { ...u[i], year: e.target.value }; setCurrent(p => ({ ...p, publications: u })); }} />
                  </div>
                </div>
              ))}
            </Section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Resume</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Resume Preview: {current?.title ?? ''}</DialogTitle></DialogHeader>
          <ResumePreview resume={current} />
        </DialogContent>
      </Dialog>

      {/* ATS Checker Dialog */}
      <Dialog open={atsOpen} onOpenChange={setAtsOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> ATS Resume Analyzer</DialogTitle></DialogHeader>
          {atsResume && <ATSChecker resume={atsResume} />}
        </DialogContent>
      </Dialog>

      {/* Job Matcher Dialog */}
      {matcherResume && <JobMatcher resume={matcherResume} open={matcherOpen} onOpenChange={setMatcherOpen} />}

      {/* Tailor CV Dialog */}
      {tailorResume && <TailorCV resume={tailorResume} open={tailorOpen} onOpenChange={setTailorOpen} onSaved={fetchResumes} />}
    </div>
  );
}
