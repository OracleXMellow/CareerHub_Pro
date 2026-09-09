'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, ArrowRight, Save, Download, ChevronDown, ChevronUp, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportResumePdf } from '@/lib/pdf-export';
import type { ResumeData } from './resumes-content';
import { ResumePreview } from './resume-preview';

interface TailorCVProps {
  resume: ResumeData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface ChangeSummary {
  section: string;
  description: string;
}

type Step = 'input' | 'review';

export function TailorCV({ resume, open, onOpenChange, onSaved }: TailorCVProps) {
  const [step, setStep] = useState<Step>('input');
  const [jobDescription, setJobDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [tailoredResume, setTailoredResume] = useState<ResumeData | null>(null);
  const [changesSummary, setChangesSummary] = useState<ChangeSummary[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [changesOpen, setChangesOpen] = useState(true);

  const reset = () => {
    setStep('input');
    setJobDescription('');
    setTailoredResume(null);
    setChangesSummary([]);
    setShowPreview(false);
    setChangesOpen(true);
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      toast.error('Please paste a job description');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/tailor-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: resume, jobDescription }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || 'Failed to tailor CV');
        return;
      }
      const { changesSummary: changes, ...resumeFields } = data;
      setTailoredResume({
        ...resumeFields,
        title: `${resume.title || resume.fullName || 'Resume'} — ${resumeFields.targetTitle || 'Tailored'}`,
        template: resume.template || 'modern',
      });
      setChangesSummary(changes || []);
      setStep('review');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!tailoredResume) return;
    setSaving(true);
    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tailoredResume),
      });
      if (!res.ok) {
        toast.error('Failed to save tailored resume');
        return;
      }
      toast.success('Tailored resume saved as a new copy!');
      onSaved();
      handleClose(false);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!tailoredResume) return;
    setExporting(true);
    const tid = toast.loading('Starting PDF export…');
    try {
      await exportResumePdf(
        tailoredResume,
        `${(tailoredResume.fullName || 'Resume').replace(/[^a-zA-Z0-9]/g, '_')}_Tailored.pdf`,
        (pct, label) => { toast.loading(`${label} ${pct}%`, { id: tid }); },
      );
      toast.success('Tailored resume exported as PDF!', { id: tid });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to export PDF', { id: tid });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${step === 'review' ? 'max-w-4xl' : 'max-w-lg'}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 'input' ? 'Tailor Resume to Job' : 'Review Tailored Resume'}
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="text-sm font-medium mb-1">Source Resume</p>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">{resume.title || resume.fullName || 'Untitled'}</span>
              </div>
              {resume.targetTitle && (
                <p className="text-xs text-muted-foreground mt-1">Current target: {resume.targetTitle}</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Paste the Job Description</p>
              <p className="text-xs text-muted-foreground mb-3">
                Paste the full job posting — including role title, requirements, and responsibilities.
                The more detail you include, the better the tailoring.
              </p>
              <Textarea
                value={jobDescription}
                onChange={(e: any) => setJobDescription(e.target.value)}
                placeholder={"e.g.\n\nSenior Product Manager at Acme Corp\n\nWe're looking for a Senior PM who...\n\nRequirements:\n- 5+ years product management experience\n- Experience with agile methodologies\n..."}
                rows={12}
                className="resize-none text-sm"
              />
            </div>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Honesty guardrail:</strong> The AI will rephrase and reprioritise your real experience to match the role — it will never invent skills, employers, or achievements you don&apos;t have.
              </p>
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={!jobDescription.trim() || generating}>
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Tailoring your resume&hellip;</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate Tailored Resume</>              )}
            </Button>
          </div>
        )}

        {step === 'review' && tailoredResume && (
          <div className="space-y-4">
            {/* Changes summary */}
            {changesSummary.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5">
                <button
                  type="button"
                  onClick={() => setChangesOpen(!changesOpen)}
                  className="w-full flex items-center justify-between p-3 hover:bg-primary/10 transition-colors rounded-lg"
                >
                  <span className="text-sm font-semibold text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {changesSummary.length} change{changesSummary.length !== 1 ? 's' : ''} made
                  </span>
                  {changesOpen ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-primary" />}
                </button>
                {changesOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {changesSummary.map((c, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <Badge variant="outline" className="shrink-0 text-xs mt-0.5">{c.section}</Badge>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Toggle between preview and info */}
            <div className="flex items-center gap-2">
              <Button
                variant={showPreview ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="mr-1 h-3 w-3" /> Preview
              </Button>
              <Button
                variant={!showPreview ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <FileText className="mr-1 h-3 w-3" /> Details
              </Button>
            </div>

            {showPreview ? (
              <div className="border rounded-lg overflow-hidden">
                <ResumePreview resume={tailoredResume} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-border/50 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Role</p>
                    <p className="text-sm font-medium">{tailoredResume.targetTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tailored Summary</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{tailoredResume.summary}</p>
                  </div>
                  {tailoredResume.skills?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Skills (reordered by relevance)</p>
                      <div className="flex flex-wrap gap-1">
                        {tailoredResume.skills.slice(0, 12).map((s: string, i: number) => (
                          <Badge key={i} variant={i < 5 ? 'default' : 'secondary'} className="text-xs">{s}</Badge>
                        ))}
                        {tailoredResume.skills.length > 12 && (
                          <Badge variant="outline" className="text-xs">+{tailoredResume.skills.length - 12} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {tailoredResume.experience?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Experience ({tailoredResume.experience.length} entries)</p>
                      {tailoredResume.experience.filter((e: any) => e?.title || e?.company).slice(0, 3).map((exp: any, i: number) => (
                        <div key={i} className="mb-2 last:mb-0">
                          <p className="text-sm font-medium">{exp.title} — <span className="text-primary">{exp.company}</span></p>
                          {exp.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground italic">
                  Tip: Use the Preview tab to see the full formatted resume. After saving, you can open it in the editor to make further adjustments.
                </p>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => { setStep('input'); setTailoredResume(null); setChangesSummary([]); }}>
                <ArrowRight className="mr-1 h-3 w-3 rotate-180" /> Back
              </Button>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={handleExportPdf} disabled={exporting}>
                  {exporting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
                  Export PDF
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                  Save as New Resume
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
