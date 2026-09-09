'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle, AlertCircle, Info, CheckCircle2, ShieldCheck, XCircle, Lightbulb, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { ResumeData } from './resumes-content';

/* ---------- Types ---------- */
interface ATSIssue {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestion: string;
}

interface ATSCategory {
  name: string;
  score: number;
  maxScore: number;
  issueCount: number;
  issues: ATSIssue[];
}

interface TailoredSuggestion {
  section: string;
  original: string;
  suggested: string;
  reason: string;
}

interface ATSResult {
  overallScore: number;
  mode: 'generic' | 'jobspec';
  categories: ATSCategory[];
  matchedKeywords: string[];
  missingKeywords: string[];
  topRecommendations: string[];
  tailoredSuggestions: TailoredSuggestion[];
}

/* ---------- Helpers ---------- */
const scoreColor = (score: number) => {
  if (score < 40) return 'text-red-500';
  if (score < 60) return 'text-yellow-500';
  if (score < 80) return 'text-blue-500';
  return 'text-green-500';
};

const scoreRingColor = (score: number) => {
  if (score < 40) return 'stroke-red-500';
  if (score < 60) return 'stroke-yellow-500';
  if (score < 80) return 'stroke-blue-500';
  return 'stroke-green-500';
};

const barColor = (pct: number) => {
  if (pct < 40) return 'bg-red-500';
  if (pct < 60) return 'bg-yellow-500';
  if (pct < 80) return 'bg-blue-500';
  return 'bg-green-500';
};

const barTextColor = (pct: number) => {
  if (pct < 40) return 'text-red-600';
  if (pct < 60) return 'text-yellow-600';
  if (pct < 80) return 'text-blue-600';
  return 'text-green-600';
};

/* ---------- Score Ring ---------- */
function ScoreRing({ score, label }: { score: number; label?: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="8" strokeLinecap="round"
          className={`${scoreRingColor(score)} transition-all duration-1000`}
          strokeDasharray={circumference} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}%</span>
        <span className="text-xs text-muted-foreground font-medium">{label || 'ATS Score'}</span>
      </div>
    </div>
  );
}

/* =================================================================== */
export function ATSChecker({ resume }: { resume: ResumeData }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [jobDesc, setJobDesc] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);

  const toggleCat = (i: number) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const runCheck = async () => {
    setLoading(true);
    setResult(null);
    setExpandedCats(new Set());
    setShowSuggestions(false);
    try {
      const payload: any = { resumeData: resume };
      if (jobDesc.trim().length > 20) payload.jobDescription = jobDesc.trim();
      const res = await fetch('/api/ai/ats-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data?.error || 'ATS check failed'); return; }
      setResult(data);
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Initial State ---------- */
  if (!result && !loading) {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-14 w-14 text-primary/30 mx-auto" />
          <p className="text-lg font-semibold">ATS Compatibility Analysis</p>
          <p className="text-sm text-muted-foreground">Score your resume the way real Applicant Tracking Systems do — modeled on BambooHR, Greenhouse, and Workable.</p>
        </div>

        {/* Optional job description */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">Paste a job description <span className="font-normal text-muted-foreground">(recommended)</span></p>
          </div>
          <p className="text-xs text-muted-foreground">Adding a job description unlocks job-specific keyword matching, gap analysis, and tailored rewrite suggestions — like a Greenhouse scorecard for this role.</p>
          <Textarea
            value={jobDesc}
            onChange={e => setJobDesc(e.target.value)}
            placeholder="Paste the full job description here for a tailored analysis..."
            rows={5}
            className="resize-none text-sm"
          />
        </div>

        <Button onClick={runCheck} className="w-full">
          <ShieldCheck className="mr-2 h-4 w-4" />
          {jobDesc.trim().length > 20 ? 'Run Job-Tailored ATS Analysis' : 'Run General ATS Analysis'}
        </Button>
      </div>
    );
  }

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="text-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">
          {jobDesc.trim().length > 20
            ? 'Running job-specific ATS analysis with keyword matching...'
            : 'Analyzing your resume for ATS compatibility...'}
        </p>
      </div>
    );
  }

  if (!result) return null;
  const isJobSpec = result.mode === 'jobspec';

  /* ---------- Results ---------- */
  return (
    <div className="space-y-6">
      {/* Score Ring + Mode Badge */}
      <div className="text-center space-y-2">
        <ScoreRing score={result.overallScore} label={isJobSpec ? 'Job Match Score' : 'ATS Score'} />
        <Badge variant={isJobSpec ? 'default' : 'secondary'} className="text-xs">
          {isJobSpec ? 'Job-Specific Analysis' : 'General ATS Check'}
        </Badge>
        {!isJobSpec && (
          <p className="text-xs text-muted-foreground">Tip: Add a job description for keyword matching and tailored suggestions.</p>
        )}
      </div>

      {/* Scorecard: Category Bars */}
      <div className="space-y-3">
        {(result.categories ?? []).map((cat, i) => {
          const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0;
          const isExpanded = expandedCats.has(i);
          return (
            <div key={i} className="rounded-lg border border-border/60 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                onClick={() => toggleCat(i)}
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{cat.name}</span>
                    <span className={`text-xs font-bold tabular-nums ${barTextColor(pct)}`}>
                      {cat.score}/{cat.maxScore}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  {cat.issueCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {cat.issueCount} issue{cat.issueCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && cat.issues.length > 0 && (
                <div className="px-4 pb-3 space-y-2 border-t border-border/40">
                  {cat.issues.map((issue, ii) => (
                    <div key={ii} className="flex items-start gap-2 pt-2">
                      {issue.severity === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                      {issue.severity === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />}
                      {issue.severity === 'info' && <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{issue.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{issue.suggestion}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{issue.severity}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Keywords (always shown if present, especially for job-spec) */}
      {(result.matchedKeywords.length > 0 || result.missingKeywords.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {result.matchedKeywords.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900 p-3">
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Matched Keywords ({result.matchedKeywords.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {result.matchedKeywords.map((kw, i) => (
                  <Badge key={i} variant="outline" className="bg-green-100/60 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800 text-[11px]">{kw}</Badge>
                ))}
              </div>
            </div>
          )}
          {result.missingKeywords.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900 p-3">
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2 text-red-700 dark:text-red-400">
                <XCircle className="h-3.5 w-3.5" /> Missing Keywords ({result.missingKeywords.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {result.missingKeywords.map((kw, i) => (
                  <Badge key={i} variant="outline" className="bg-red-100/60 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 text-[11px]">{kw}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Recommendations */}
      {(result.topRecommendations ?? []).length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary mb-2">Top Recommendations</p>
          <ul className="space-y-2">
            {result.topRecommendations.map((rec, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tailored Rewrite Suggestions (job-spec mode) */}
      {isJobSpec && result.tailoredSuggestions.length > 0 && (
        <div>
          <Button variant="outline" onClick={() => setShowSuggestions(!showSuggestions)} className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Tailored Rewrite Suggestions ({result.tailoredSuggestions.length})
            </span>
            <ArrowRight className={`h-4 w-4 transition-transform ${showSuggestions ? 'rotate-90' : ''}`} />
          </Button>
          {showSuggestions && (
            <div className="mt-3 space-y-3">
              {result.tailoredSuggestions.map((s, i) => (
                <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{s.section}</Badge>
                    {s.reason && <span className="text-xs text-muted-foreground">— {s.reason}</span>}
                  </div>
                  {s.original && (
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-0.5">Current:</p>
                      <p className="text-sm text-muted-foreground line-through">{s.original}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] text-green-600 mb-0.5">Suggested:</p>
                    <p className="text-sm">{s.suggested}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Re-run */}
      <Button variant="outline" className="w-full" onClick={() => { setResult(null); }}>
        {isJobSpec ? 'Analyse Again' : 'Run Another Check'}
      </Button>
    </div>
  );
}
