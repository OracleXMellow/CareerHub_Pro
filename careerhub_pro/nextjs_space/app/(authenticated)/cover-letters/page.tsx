import { PageHeader } from '@/components/layouts/page-header';
import { CoverLettersContent } from './_components/cover-letters-content';

export default function CoverLettersPage() {
  return (
    <div>
      <PageHeader title="Cover Letters" description="Create and manage AI-generated cover letters" />
      <CoverLettersContent />
    </div>
  );
}
