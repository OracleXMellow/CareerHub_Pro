import { PageHeader } from '@/components/layouts/page-header';
import { AIToolsContent } from './_components/ai-tools-content';

export default function AIToolsPage() {
  return (
    <div>
      <PageHeader title="AI Tools" description="Leverage AI to optimize your resume and analyze job descriptions" />
      <AIToolsContent />
    </div>
  );
}
