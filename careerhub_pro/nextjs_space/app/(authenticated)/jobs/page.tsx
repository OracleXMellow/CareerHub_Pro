import { PageHeader } from '@/components/layouts/page-header';
import { JobsContent } from './_components/jobs-content';

export default function JobsPage() {
  return (
    <div>
      <PageHeader title="Job Tracker" description="Track your job applications through every stage" />
      <JobsContent />
    </div>
  );
}
