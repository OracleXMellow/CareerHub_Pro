'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FadeIn } from '@/components/ui/animate';
import { Sparkles, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Suggestion {
  original: string;
  improved: string;
  explanation: string;
}

export function ResumeSuggestions() {
  const [bulletPoints, setBulletPoints] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleAnalyze = async () => {
    if (!bulletPoints?.trim()) { toast.error('Please enter bullet points to improve'); return; }
    setLoading(true);
    setProgress(0);
    setSuggestions([]);
    try {
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletPoints, jobTitle }),
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
                setSuggestions(parsed?.result?.suggestions ?? []);
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
              <Sparkles className="h-5 w-5 text-primary" /> Improve Resume Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Job Title (optional, for context)</Label>
              <Input value={jobTitle} onChange={(e: any) => setJobTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" />
            </div>
            <div>
              <Label>Bullet Points / Achievements</Label>
              <Textarea
                rows={6}
                value={bulletPoints}
                onChange={(e: any) => setBulletPoints(e.target.value)}
                placeholder={"Enter your resume bullet points, one per line:\n\n- Managed a team of developers\n- Built a website\n- Improved sales performance"}
              />
            </div>
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing ({progress}%)</> : <><Sparkles className="mr-2 h-4 w-4" /> Get AI Suggestions</>}
            </Button>
          </CardContent>
        </Card>
      </FadeIn>

      {(suggestions?.length ?? 0) > 0 && (
        <FadeIn>
          <Card className="border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-green-500" /> Suggestions ({suggestions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(suggestions ?? []).map((s: Suggestion, i: number) => (
                <div key={i} className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground line-through">{s?.original ?? ''}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s?.improved ?? ''}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-2">{s?.explanation ?? ''}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
