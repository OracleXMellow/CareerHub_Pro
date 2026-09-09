'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { Briefcase, FileText, Target, Sparkles, ArrowRight, Shield } from 'lucide-react';

export function LandingContent() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Briefcase className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">CareerHub Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden">
        <div className="mx-auto max-w-[1200px] px-4 py-24 text-center md:py-32">
          <FadeIn>
            <div className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="mr-2 h-4 w-4" /> AI-Powered Career Management
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Land Your <span className="text-primary">Dream Job</span><br /> with Confidence
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Build stunning resumes, track applications, and leverage AI to optimize your career journey — all in one powerful platform.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1200px] px-4 py-20">
        <FadeIn>
          <h2 className="text-center font-display text-3xl font-bold tracking-tight">Everything You Need to <span className="text-primary">Succeed</span></h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">Powerful tools designed to accelerate your career growth.</p>
        </FadeIn>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: FileText, title: "Resume Builder", desc: "Create professional resumes with beautiful templates and multiple versions." },
            { icon: Target, title: "Job Tracker", desc: "Organize applications through pipeline stages from wishlist to offer." },
            { icon: Sparkles, title: "AI Content Suggestions", desc: "Get intelligent recommendations to improve your resume bullet points." },
            { icon: Briefcase, title: "Job Analysis", desc: "AI-powered analysis to extract key requirements from job descriptions." },
            { icon: FileText, title: "Cover Letter Generator", desc: "Generate tailored cover letters based on job descriptions instantly." },
            { icon: Shield, title: "Document Storage", desc: "Securely upload and organize all your career documents in one place." },
          ].map((f: any, i: number) => (
            <SlideIn key={i} from="bottom" delay={i * 0.1}>
              <div className="group rounded-xl border border-border/50 bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-md" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </SlideIn>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-[1200px] px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Briefcase className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold">CareerHub Pro</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2026 CareerHub Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
