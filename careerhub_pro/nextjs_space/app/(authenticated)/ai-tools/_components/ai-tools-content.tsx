'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Search } from 'lucide-react';
import { ResumeSuggestions } from './resume-suggestions';
import { JobAnalysis } from './job-analysis';

export function AIToolsContent() {
  const [tab, setTab] = useState('suggestions');

  return (
    <div className="p-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="suggestions" className="gap-2">
            <Sparkles className="h-4 w-4" /> Resume Suggestions
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <Search className="h-4 w-4" /> Job Analysis
          </TabsTrigger>
        </TabsList>
        <TabsContent value="suggestions">
          <ResumeSuggestions />
        </TabsContent>
        <TabsContent value="analysis">
          <JobAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
