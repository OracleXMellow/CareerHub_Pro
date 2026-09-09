import { PageHeader } from '@/components/layouts/page-header';
import { ResumesContent } from './_components/resumes-content';

export default function ResumesPage() {
  return (
    <div>
      <PageHeader title="Resumes" description="Build and manage multiple resume versions" />
      <ResumesContent />
    </div>
  );
}
