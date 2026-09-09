'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { FadeIn, Stagger, StaggerItem } from '@/components/ui/animate';
import { Loader2, MessageSquare, ChevronDown, ChevronUp, Lightbulb, Target, Brain, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: number;
  category: string;
  difficulty: string;
  question: string;
  whyAsked: string;
  suggestedAnswer: string;
  tips: string[];
}

interface ResumeOption {
  id: string;
  title: string;
  fullName: string;
  targetTitle: string;
}

const categoryIcons: Record<string, any> = {
  Behavioral: Users,
  Technical: Brain,
  Situational: Target,
  'Culture Fit': Sparkles,
};

const difficultyColors: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  Hard: 'bg-red-100 text-red-700',
};

export function InterviewPrepContent() {
  const [jobDesc, setJobDesc] = useState('');
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [selectedResume, setSelectedResume] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/resumes').then(r => r.json()).then(data => {
      const list = (data || []).map((r: any) => ({ id: r.id, title: r.title, fullName: r.fullName, targetTitle: r.targetTitle }));
      setResumes(list);
    }).catch(() => {});
  }, []);

  const generate = async () => {
    if (!jobDesc.trim()) { toast.error('Enter a job description first'); return; }
    setLoading(true);
    setQuestions([]);
    setExpanded(new Set());
    try {
      let resumeData = null;
      if (selectedResume && selectedResume !== 'none') {
        const res = await fetch(`/api/resumes?id=${selectedResume}`);
        if (res.ok) {
          const allResumes = await res.json();
          resumeData = Array.isArray(allResumes) ? allResumes.find((r: any) => r.id === selectedResume) : allResumes;
        }
      }
      const res = await fetch('/api/ai/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData, jobDescription: jobDesc }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data?.error || 'Failed to generate interview questions'); return; }
      setQuestions(data.questions || []);
    } catch {
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <FadeIn>
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display tracking-tight">AI Interview Prep</h1>
          <p className="text-muted-foreground mt-1">Generate role-specific interview questions with expert-crafted suggested answers</p>
        </div>
      </FadeIn>

      {questions.length === 0 ? (
        <FadeIn delay={0.1}>
          <Card>
            <CardContent className="p-6 space-y-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Job Description *</label>
                <Textarea
                  value={jobDesc}
                  onChange={e => setJobDesc(e.target.value)}
                  placeholder="Paste the job description here to generate tailored interview questions..."
                  rows={8}
                  className="resize-none"
                />
              </div>

              {resumes.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Link a Resume (optional)</label>
                  <Select value={selectedResume} onValueChange={setSelectedResume}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a resume for personalized answers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No resume</SelectItem>
                      {resumes.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.title || r.fullName || 'Untitled'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Linking a resume personalizes suggested answers to your experience</p>
                </div>
              )}

              <Button onClick={generate} disabled={loading} className="w-full" size="lg">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating Questions...</> : <><MessageSquare className="h-4 w-4 mr-2" /> Generate Interview Questions</>}
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className="text-sm">{questions.length} Questions</Badge>
              <div className="flex gap-1.5 flex-wrap">
                {['Behavioral', 'Technical', 'Situational', 'Culture Fit'].map(cat => {
                  const count = questions.filter(q => q.category === cat).length;
                  if (count === 0) return null;
                  return <Badge key={cat} variant="secondary" className="text-xs">{cat}: {count}</Badge>;
                })}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setQuestions([]); }}>
              New Session
            </Button>
          </div>

          <Stagger staggerDelay={0.05}>
            {questions.map(q => {
              const isOpen = expanded.has(q.id);
              const Icon = categoryIcons[q.category] || MessageSquare;
              return (
                <StaggerItem key={q.id}>
                  <Card className={`transition-all ${isOpen ? 'ring-1 ring-primary/20' : ''}`}>
                    <CardContent className="p-0">
                      <button
                        type="button"
                        onClick={() => toggle(q.id)}
                        className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors rounded-lg"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">{q.category}</Badge>
                            <Badge variant="outline" className={`text-xs ${difficultyColors[q.difficulty] || ''}`}>{q.difficulty}</Badge>
                          </div>
                          <p className="font-medium text-sm">{q.question}</p>
                        </div>
                        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4 ml-11">
                          <div>
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Why This Is Asked</h5>
                            <p className="text-sm text-muted-foreground">{q.whyAsked}</p>
                          </div>
                          <div>
                            <h5 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Suggested Answer</h5>
                            <p className="text-sm whitespace-pre-line bg-primary/5 p-3 rounded-lg">{q.suggestedAnswer}</p>
                          </div>
                          {q.tips?.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pro Tips</h5>
                              <ul className="space-y-1">
                                {q.tips.map((tip, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                    <span className="text-primary font-bold">•</span>{tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      )}
    </div>
  );
}
