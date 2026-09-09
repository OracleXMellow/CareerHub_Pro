'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Target, CheckCircle2, XCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import type { ResumeData } from './resumes-content';

interface MatchResult {
  matchScore: number;
  matchLevel: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  strengths: string[];
  gaps: string[];
  tailoredSuggestions: { section: string; original: string; suggested: string }[];
}

export function JobMatcher({ resume, open, onOpenChange }: { resume: ResumeData; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [jobDesc, setJobDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const analyze = async () => {
    if (!jobDesc.trim()) { toast.error('Paste a job description first'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/job-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: resume, jobDescription: jobDesc }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data?.error || 'Failed to analyze job match'); return; }
      setResult(data);
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  const circumference = 2 * Math.PI * 54;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Job Match Analyzer
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Paste the job description below to see how well your resume matches and get tailored suggestions.</p>
              <Textarea
                value={jobDesc}
                onChange={e => setJobDesc(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={10}
                className="resize-none"
              />
            </div>
            <Button onClick={analyze} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing Match...</> : <><Target className="h-4 w-4 mr-2" /> Analyze Match</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Score Ring */}
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <svg width="128" height="128" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle
                    cx="64" cy="64" r="54" fill="none"
                    stroke={scoreColor(result.matchScore)}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (result.matchScore / 100) * circumference}
                    transform="rotate(-90 64 64)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: scoreColor(result.matchScore) }}>{result.matchScore}%</span>
                  <span className="text-xs text-muted-foreground">Match</span>
                </div>
              </div>
              <div>
                <Badge variant={result.matchScore >= 70 ? 'default' : 'secondary'} className="text-sm mb-2">{result.matchLevel}</Badge>
                <p className="text-sm text-muted-foreground">
                  {result.matchScore >= 80 ? 'Excellent match! Your resume aligns well with this role.' :
                   result.matchScore >= 60 ? 'Good potential. A few adjustments could boost your match.' :
                   result.matchScore >= 40 ? 'Fair match. Consider tailoring your resume for this role.' :
                   'Low match. This role may require significant resume updates.'}
                </p>
              </div>
            </div>

            {/* Keywords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3"><CheckCircle2 className="h-4 w-4 text-green-500" /> Matched Keywords</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.matchedKeywords.map((kw, i) => (
                      <Badge key={i} variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">{kw}</Badge>
                    ))}
                    {result.matchedKeywords.length === 0 && <p className="text-xs text-muted-foreground">No matching keywords found</p>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3"><XCircle className="h-4 w-4 text-red-500" /> Missing Keywords</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingKeywords.map((kw, i) => (
                      <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">{kw}</Badge>
                    ))}
                    {result.missingKeywords.length === 0 && <p className="text-xs text-muted-foreground">No missing keywords</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Strengths & Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 text-green-700">Strengths</h4>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2 text-amber-700">Areas to Improve</h4>
                <ul className="space-y-1">
                  {result.gaps.map((g, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2"><XCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />{g}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Tailored Suggestions */}
            {result.tailoredSuggestions?.length > 0 && (
              <div>
                <Button variant="outline" onClick={() => setShowSuggestions(!showSuggestions)} className="w-full justify-between">
                  <span className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Tailored Resume Suggestions ({result.tailoredSuggestions.length})</span>
                  <ArrowRight className={`h-4 w-4 transition-transform ${showSuggestions ? 'rotate-90' : ''}`} />
                </Button>
                {showSuggestions && (
                  <div className="mt-3 space-y-3">
                    {result.tailoredSuggestions.map((s, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <Badge variant="secondary" className="mb-2 text-xs">{s.section}</Badge>
                          {s.original && (
                            <div className="mb-2">
                              <p className="text-xs text-muted-foreground mb-0.5">Current:</p>
                              <p className="text-sm text-muted-foreground line-through">{s.original}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-green-600 mb-0.5">Suggested:</p>
                            <p className="text-sm">{s.suggested}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Deep-dive tip */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">Want a full ATS scorecard with 5 dimensions, issue breakdowns, and rewrite suggestions? Use the <strong>ATS Check</strong> button and paste this job description there.</p>
            </div>

            <Button variant="outline" onClick={() => { setResult(null); setJobDesc(''); }} className="w-full">
              Analyze Another Job
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
