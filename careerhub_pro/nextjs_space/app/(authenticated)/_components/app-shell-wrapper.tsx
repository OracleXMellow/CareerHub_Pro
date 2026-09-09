'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { AppShell } from '@/components/layouts/app-shell';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, FileText, Briefcase, FolderOpen, Sparkles, Mail, LogOut, User, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/resumes', label: 'Resumes', icon: FileText },
  { href: '/jobs', label: 'Job Tracker', icon: Briefcase },
  { href: '/ai-tools', label: 'AI Tools', icon: Sparkles },
  { href: '/cover-letters', label: 'Cover Letters', icon: Mail },
  { href: '/interview-prep', label: 'Interview Prep', icon: MessageSquare },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
];

export function AppShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession() || {};

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Briefcase className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight">CareerHub Pro</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item: any) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/50 p-3">
        <div className="flex items-center gap-3 px-3 py-2 text-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 truncate">
            <p className="truncate font-medium text-sm">{session?.user?.name ?? 'User'}</p>
            <p className="truncate text-xs text-muted-foreground">{session?.user?.email ?? ''}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="mt-1 w-full justify-start text-muted-foreground" onClick={() => signOut({ callbackUrl: '/' })}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );

  return <AppShell sidebar={sidebar}>{children}</AppShell>;
}
