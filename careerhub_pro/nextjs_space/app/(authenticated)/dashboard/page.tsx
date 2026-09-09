import { PageHeader } from '@/components/layouts/page-header';
import { DashboardContent } from './_components/dashboard-content';

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Your career management overview at a glance" />
      <DashboardContent />
    </div>
  );
}
