'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/ui/animate';
import { Search, Briefcase, CheckCircle, Star, Lightbulb, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AnalysisResult {
  title: string;
  company: string;
  requirements: string[];
  skills: string[];
  experience_level: string;
  key_responsibilities: string[];
  nice_to_have: string[];
  tips: string[];
  salary_range: string;
}

export function JobAnalysis() {
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAnalyze = async () => {
    if (!jobDescription?.trim()) { toast.error('Please enter a job description'); return; }
    setLoading(true);
    setProgress(0);
    setResult(null);
    try {
      const res = await fetch('/api/ai/analyze-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d?.error || 'Failed to analyze'); setLoading(false); return; }

      const reader = res.body?.getReader();
      if (!reader) { toast.error('No response'); setLoading(false); return; }
      const decoder = new TextDecoder();
      let partialRead = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'processing') {
                setProgress((p: number) => Math.min(p + 2, 95));
              } else if (parsed?.status === 'completed') {
                setResult(parsed?.result ?? null);
                setProgress(100);
                setLoading(false);
                return;
              } else if (parsed?.status === 'error') {
                toast.error(parsed?.message ?? 'Analysis failed');
                setLoading(false);
                return;
              }
            } catch {}
          }
        }
      }
      setLoading(false);
    } catch (e: any) {
      console.error(e);
      toast.error('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <Card className="border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" /> Analyze Job Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Job Description</Label>
              <Textarea
                rows={8}
                value={jobDescription}
                onChange={(e: any) => setJobDescription(e.target.value)}
                placeholder="Paste the complete job description here..."
              />
            </div>
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing ({progress}%)</> : <><Search className="mr-2 h-4 w-4" /> Analyze</>}
            </Button>
          </CardContent>
        </Card>
      </FadeIn>

      {result && (
        <FadeIn>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Overview */}
            <Card className="border-border/50 md:col-span-2" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">{result?.title ?? 'Job Title'}</h3>
                    <p className="text-sm text-muted-foreground">{result?.company ?? 'Company'} • {result?.experience_level ?? ''}</p>
                    {result?.salary_range && <p className="text-sm text-primary font-medium mt-1">{result.salary_range}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card className="border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Requirements</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {(result?.requirements ?? []).map((r: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>{r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card className="border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /> Key Skills</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(result?.skills ?? []).map((s: string, i: number) => (
                    <Badge key={i} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Responsibilities */}
            <Card className="border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-500" /> Responsibilities</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {(result?.key_responsibilities ?? []).map((r: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>{r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-orange-500" /> Application Tips</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {(result?.tips ?? []).map((t: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>{t}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Nice to have */}
            {(result?.nice_to_have?.length ?? 0) > 0 && (
              <Card className="border-border/50 md:col-span-2" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Nice to Have</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(result?.nice_to_have ?? []).map((n: string, i: number) => (
                      <Badge key={i} variant="outline">{n}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </FadeIn>
      )}
    </div>
  );
}
