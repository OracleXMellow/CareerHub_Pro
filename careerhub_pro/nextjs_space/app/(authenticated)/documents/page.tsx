import { PageHeader } from '@/components/layouts/page-header';
import { DocumentsContent } from './_components/documents-content';

export default function DocumentsPage() {
  return (
    <div>
      <PageHeader title="Documents" description="Upload and organize your career documents" />
      <DocumentsContent />
    </div>
  );
}
