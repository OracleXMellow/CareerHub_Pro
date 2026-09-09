'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Stagger, StaggerItem, FadeIn } from '@/components/ui/animate';
import { Plus, Mail, Trash2, Edit, Sparkles, Loader2, Eye, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from 'next-auth/react';

export function CoverLettersContent() {
  const { data: session } = useSession() || {};
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [current, setCurrent] = useState<any>({ title: '', content: '', jobTitle: '', company: '' });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Generation form
  const [genCompany, setGenCompany] = useState('');
  const [genPosition, setGenPosition] = useState('');
  const [genJobDesc, setGenJobDesc] = useState('');
  const [genResumeSummary, setGenResumeSummary] = useState('');
  const [genContent, setGenContent] = useState('');

  const fetchCoverLetters = useCallback(() => {
    fetch('/api/cover-letters').then((r: any) => r.json()).then((d: any) => setCoverLetters(d ?? [])).catch((e: any) => console.error(e)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCoverLetters(); }, [fetchCoverLetters]);

  const handleSave = async () => {
    if (!current?.title) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const method = current?.id ? 'PUT' : 'POST';
      const res = await fetch('/api/cover-letters', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      });
      if (!res.ok) { toast.error('Failed to save'); return; }
      toast.success('Cover letter saved');
      setEditOpen(false);
      fetchCoverLetters();
    } catch { toast.error('Something went wrong'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cover letter?')) return;
    try {
      await fetch(`/api/cover-letters?id=${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      fetchCoverLetters();
    } catch { toast.error('Failed to delete'); }
  };

  const handleGenerate = async () => {
    if (!genJobDesc?.trim()) { toast.error('Job description is required'); return; }
    setGenerating(true);
    setGenContent('');
    try {
      const res = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: genJobDesc,
          resumeSummary: genResumeSummary,
          company: genCompany,
          position: genPosition,
          userName: session?.user?.name ?? '',
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d?.error || 'Generation failed'); setGenerating(false); return; }

      const reader = res.body?.getReader();
      if (!reader) { toast.error('No response'); setGenerating(false); return; }
      const decoder = new TextDecoder();
      let fullText = '';
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
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.delta?.content ?? '';
              fullText += content;
              setGenContent(fullText);
            } catch {}
          }
        }
      }
      setGenerating(false);
    } catch (e: any) {
      console.error(e);
      toast.error('Something went wrong');
      setGenerating(false);
    }
  };

  const handleSaveGenerated = async () => {
    if (!genContent?.trim()) { toast.error('No content to save'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/cover-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Cover Letter - ${genCompany || genPosition || 'Untitled'}`,
          content: genContent,
          jobTitle: genPosition,
          company: genCompany,
        }),
      });
      if (!res.ok) { toast.error('Failed to save'); return; }
      toast.success('Cover letter saved');
      setGenerateOpen(false);
      setGenContent('');
      setGenCompany('');
      setGenPosition('');
      setGenJobDesc('');
      setGenResumeSummary('');
      fetchCoverLetters();
    } catch { toast.error('Something went wrong'); } finally { setSaving(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText?.(text ?? '');
    toast.success('Copied to clipboard');
  };

  if (loading) return <div className="space-y-4 p-6">{[1, 2].map((i: number) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" onClick={() => setGenerateOpen(true)}>
          <Sparkles className="mr-2 h-4 w-4" /> AI Generate
        </Button>
        <Button onClick={() => { setCurrent({ title: '', content: '', jobTitle: '', company: '' }); setEditOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Cover Letter
        </Button>
      </div>

      {(coverLetters ?? []).length === 0 ? (
        <FadeIn>
          <Card className="border-dashed border-2 border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Mail className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-lg font-medium">No cover letters yet</p>
              <p className="text-sm text-muted-foreground">Generate one with AI or create manually</p>
              <Button className="mt-4" onClick={() => setGenerateOpen(true)}>
                <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <Stagger staggerDelay={0.08}>
          <div className="grid gap-4 md:grid-cols-2">
            {(coverLetters ?? []).map((cl: any) => (
              <StaggerItem key={cl?.id}>
                <Card className="border-border/50 transition-all hover:shadow-md" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <CardContent className="p-5">
                    <h3 className="font-semibold truncate">{cl?.title ?? 'Untitled'}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {cl?.company && `${cl.company}`}{cl?.jobTitle && ` • ${cl.jobTitle}`}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{cl?.content ?? ''}</p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setCurrent(cl); setViewOpen(true); }}><Eye className="mr-1 h-3 w-3" /> View</Button>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(cl?.content ?? '')}><Copy className="mr-1 h-3 w-3" /> Copy</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setCurrent(cl); setEditOpen(true); }}><Edit className="mr-1 h-3 w-3" /> Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(cl?.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </div>
        </Stagger>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{current?.id ? 'Edit' : 'New'} Cover Letter</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={current?.title ?? ''} onChange={(e: any) => setCurrent((p: any) => ({ ...(p ?? {}), title: e.target.value }))} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Company</Label><Input value={current?.company ?? ''} onChange={(e: any) => setCurrent((p: any) => ({ ...(p ?? {}), company: e.target.value }))} /></div>
              <div><Label>Position</Label><Input value={current?.jobTitle ?? ''} onChange={(e: any) => setCurrent((p: any) => ({ ...(p ?? {}), jobTitle: e.target.value }))} /></div>
            </div>
            <div><Label>Content</Label><Textarea rows={10} value={current?.content ?? ''} onChange={(e: any) => setCurrent((p: any) => ({ ...(p ?? {}), content: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{current?.title ?? ''}</DialogTitle></DialogHeader>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{current?.content ?? ''}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => copyToClipboard(current?.content ?? '')}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Cover Letter Generator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Company</Label><Input value={genCompany} onChange={(e: any) => setGenCompany(e.target.value)} placeholder="e.g. Google" /></div>
              <div><Label>Position</Label><Input value={genPosition} onChange={(e: any) => setGenPosition(e.target.value)} placeholder="e.g. Software Engineer" /></div>
            </div>
            <div><Label>Job Description *</Label><Textarea rows={5} value={genJobDesc} onChange={(e: any) => setGenJobDesc(e.target.value)} placeholder="Paste the job description..." /></div>
            <div><Label>Your Background (optional)</Label><Textarea rows={3} value={genResumeSummary} onChange={(e: any) => setGenResumeSummary(e.target.value)} placeholder="Brief summary of your experience and skills..." /></div>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Cover Letter</>}
            </Button>
            {genContent && (
              <div className="rounded-lg bg-muted/50 p-4">
                <Label className="mb-2 block">Generated Cover Letter</Label>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{genContent}</div>
              </div>
            )}
          </div>
          {genContent && (
            <DialogFooter>
              <Button variant="outline" onClick={() => copyToClipboard(genContent)}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
              <Button onClick={handleSaveGenerated} loading={saving}>Save Cover Letter</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
