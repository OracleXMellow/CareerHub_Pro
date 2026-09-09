'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Stagger, StaggerItem, FadeIn } from '@/components/ui/animate';
import { Plus, Briefcase, Trash2, Edit, ExternalLink, MapPin, DollarSign, Calendar, StickyNote, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'] as const;

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  wishlist: { label: 'Wishlist', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  applied: { label: 'Applied', color: 'text-yellow-700 dark:text-yellow-300', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  interview: { label: 'Interview', color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  offer: { label: 'Offer', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30' },
  rejected: { label: 'Rejected', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' },
};

interface JobData {
  id?: string;
  company: string;
  position: string;
  location: string;
  url: string;
  salary: string;
  status: string;
  notes: string;
  description: string;
  appliedDate: string | null;
}

const emptyJob: JobData = {
  company: '', position: '', location: '', url: '', salary: '', status: 'wishlist', notes: '', description: '', appliedDate: null,
};

export function JobsContent() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<JobData>({ ...emptyJob });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchJobs = useCallback(() => {
    fetch('/api/jobs').then((r: any) => r.json()).then((d: any) => setJobs(d ?? [])).catch((e: any) => console.error(e)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleSave = async () => {
    if (!current?.company || !current?.position) { toast.error('Company and position are required'); return; }
    setSaving(true);
    try {
      const method = current?.id ? 'PUT' : 'POST';
      const res = await fetch('/api/jobs', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      });
      if (!res.ok) { toast.error('Failed to save'); return; }
      toast.success(current?.id ? 'Job updated' : 'Job added');
      setEditOpen(false);
      fetchJobs();
    } catch { toast.error('Something went wrong'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this job?')) return;
    try {
      await fetch(`/api/jobs?id=${id}`, { method: 'DELETE' });
      toast.success('Job deleted');
      fetchJobs();
    } catch { toast.error('Failed to delete'); }
  };

  const handleStatusChange = async (job: any, newStatus: string) => {
    try {
      await fetch('/api/jobs', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: job?.id, status: newStatus }),
      });
      toast.success(`Moved to ${statusConfig[newStatus]?.label ?? newStatus}`);
      fetchJobs();
    } catch { toast.error('Failed to update status'); }
  };

  const filteredJobs = (jobs ?? []).filter((j: any) => {
    const matchesSearch = !search || (j?.company ?? '').toLowerCase().includes(search.toLowerCase()) || (j?.position ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'all' || j?.status === activeTab;
    return matchesSearch && matchesTab;
  });

  if (loading) return <div className="space-y-4 p-6">{[1, 2, 3].map((i: number) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search jobs..." value={search} onChange={(e: any) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => { setCurrent({ ...emptyJob }); setEditOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Job
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({(jobs ?? []).length})</TabsTrigger>
          {STATUSES.map((s: string) => (
            <TabsTrigger key={s} value={s}>
              {statusConfig[s]?.label ?? s} ({(jobs ?? []).filter((j: any) => j?.status === s).length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          {filteredJobs.length === 0 ? (
            <FadeIn>
              <Card className="border-dashed border-2 border-border/60">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Briefcase className="h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-lg font-medium">No jobs found</p>
                  <p className="text-sm text-muted-foreground">Add your first job application to start tracking</p>
                </CardContent>
              </Card>
            </FadeIn>
          ) : (
            <Stagger staggerDelay={0.06}>
              <div className="space-y-3">
                {filteredJobs.map((job: any) => (
                  <StaggerItem key={job?.id}>
                    <Card className="border-border/50 transition-all hover:shadow-md" style={{ boxShadow: 'var(--shadow-sm)' }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{job?.position ?? 'Unknown Position'}</h3>
                              <Badge className={`text-xs ${statusConfig[job?.status]?.bg ?? ''} ${statusConfig[job?.status]?.color ?? ''}`}>
                                {statusConfig[job?.status]?.label ?? job?.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{job?.company ?? ''}</p>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                              {job?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                              {job?.salary && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{job.salary}</span>}
                              {job?.appliedDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(job.appliedDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>}
                            </div>
                            {job?.notes && <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1"><StickyNote className="h-3 w-3 mt-0.5 shrink-0" /><span className="line-clamp-2">{job.notes}</span></p>}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {job?.url && <a href={job.url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="h-3.5 w-3.5" /></Button></a>}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrent({ ...job, appliedDate: job?.appliedDate ? new Date(job.appliedDate).toISOString().split('T')[0] : null }); setEditOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(job?.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        {/* Status quick actions */}
                        <div className="mt-3 flex flex-wrap gap-1 border-t border-border/30 pt-3">
                          <span className="text-xs text-muted-foreground mr-2 self-center">Move to:</span>
                          {STATUSES.filter((s: string) => s !== job?.status).map((s: string) => (
                            <Button key={s} variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => handleStatusChange(job, s)}>
                              {statusConfig[s]?.label ?? s}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </StaggerItem>
                ))}
              </div>
            </Stagger>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{current?.id ? 'Edit Job' : 'Add Job'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Company *</Label><Input value={current?.company ?? ''} onChange={(e: any) => setCurrent((p: JobData) => ({ ...p, company: e.target.value }))} /></div>
              <div><Label>Position *</Label><Input value={current?.position ?? ''} onChange={(e: any) => setCurrent((p: JobData) => ({ ...p, position: e.target.value }))} /></div>
              <div><Label>Location</Label><Input value={current?.location ?? ''} onChange={(e: any) => setCurrent((p: JobData) => ({ ...p, location: e.target.value }))} /></div>
              <div><Label>Salary</Label><Input value={current?.salary ?? ''} onChange={(e: any) => setCurrent((p: JobData) => ({ ...p, salary: e.target.value }))} /></div>
              <div><Label>Job URL</Label><Input value={current?.url ?? ''} onChange={(e: any) => setCurrent((p: JobData) => ({ ...p, url: e.target.value }))} /></div>
              <div><Label>Applied Date</Label><Input type="date" value={current?.appliedDate ?? ''} onChange={(e: any) => setCurrent((p: JobData) => ({ ...p, appliedDate: e.target.value || null }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {STATUSES.map((s: string) => (
                  <Button key={s} variant={current?.status === s ? 'default' : 'outline'} size="sm" onClick={() => setCurrent((p: JobData) => ({ ...p, status: s }))}>
                    {statusConfig[s]?.label ?? s}
                  </Button>
                ))}
              </div>
            </div>
            <div><Label>Job Description</Label><Textarea rows={3} value={current?.description ?? ''} onChange={(e: any) => setCurrent((p: JobData) => ({ ...p, description: e.target.value }))} placeholder="Paste the job description here..." /></div>
            <div><Label>Notes</Label><Textarea rows={2} value={current?.notes ?? ''} onChange={(e: any) => setCurrent((p: JobData) => ({ ...p, notes: e.target.value }))} placeholder="Your personal notes..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{current?.id ? 'Update' : 'Add Job'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
