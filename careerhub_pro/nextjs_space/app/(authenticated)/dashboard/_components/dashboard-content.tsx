'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn, SlideIn, Stagger, StaggerItem } from '@/components/ui/animate';
import { Briefcase, FileText, FolderOpen, Mail, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';

const DashboardChart = dynamic(() => import('./dashboard-chart').then((m: any) => m.DashboardChart), { ssr: false, loading: () => <Skeleton className="h-[250px] w-full" /> }) as any;

interface DashboardData {
  totalJobs: number;
  resumeCount: number;
  documentCount: number;
  coverLetterCount: number;
  statusCounts: Record<string, number>;
  recentJobs: any[];
  recentResumes: any[];
}

const statusColors: Record<string, string> = {
  wishlist: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  applied: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  interview: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  offer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let start = 0;
    const end = value ?? 0;
    if (end === 0) { setDisplay(0); return; }
    const duration = 800;
    const step = Math.max(1, Math.floor(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span ref={ref} className="font-mono">{display}</span>;
}

export function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r: any) => r.json())
      .then((d: any) => setData(d))
      .catch((e: any) => console.error('Dashboard fetch error:', e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i: number) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Applications', value: data?.totalJobs ?? 0, icon: Briefcase, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Resumes', value: data?.resumeCount ?? 0, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Cover Letters', value: data?.coverLetterCount ?? 0, icon: Mail, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Documents', value: data?.documentCount ?? 0, icon: FolderOpen, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-6 p-6">
      <Stagger staggerDelay={0.1}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((s: any, i: number) => (
            <StaggerItem key={i}>
              <Card className="border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="mt-1 text-3xl font-bold"><AnimatedNumber value={s.value} /></p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.bg}`}>
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </div>
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-3">
        <FadeIn delay={0.2}>
          <Card className="lg:col-span-2 border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Application Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardChart statusCounts={data?.statusCounts ?? {}} />
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.3}>
          <Card className="border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Recent Activity
              </CardTitle>
              <Link href="/jobs"><Button variant="ghost" size="sm">View All <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.recentJobs ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No applications yet. Start tracking your job search!</p>
                ) : (
                  (data?.recentJobs ?? []).map((job: any) => (
                    <div key={job?.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{job?.position ?? 'Unknown'}</p>
                        <p className="truncate text-xs text-muted-foreground">{job?.company ?? ''}</p>
                      </div>
                      <Badge variant="secondary" className={`ml-2 text-xs ${statusColors[job?.status] ?? ''}`}>
                        {job?.status ?? 'unknown'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <FadeIn delay={0.4}>
        <Card className="border-border/50" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/resumes"><Button variant="outline" className="w-full justify-start"><FileText className="mr-2 h-4 w-4" /> Create Resume</Button></Link>
              <Link href="/jobs"><Button variant="outline" className="w-full justify-start"><Briefcase className="mr-2 h-4 w-4" /> Add Application</Button></Link>
              <Link href="/ai-tools"><Button variant="outline" className="w-full justify-start"><TrendingUp className="mr-2 h-4 w-4" /> AI Analysis</Button></Link>
              <Link href="/cover-letters"><Button variant="outline" className="w-full justify-start"><Mail className="mr-2 h-4 w-4" /> Write Cover Letter</Button></Link>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
