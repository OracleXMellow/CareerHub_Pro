'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stagger, StaggerItem, FadeIn } from '@/components/ui/animate';
import { Upload, FolderOpen, Trash2, Download, FileText, File, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const docTypes = [
  { value: 'resume', label: 'Resume' },
  { value: 'cover_letter', label: 'Cover Letter' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'other', label: 'Other' },
];

const typeIcons: Record<string, any> = {
  resume: FileText,
  cover_letter: FileText,
  certificate: File,
  portfolio: ImageIcon,
  other: File,
};

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + (sizes[i] ?? 'B');
}

export function DocumentsContent() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('other');
  const [filterType, setFilterType] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(() => {
    fetch('/api/documents').then((r: any) => r.json()).then((d: any) => setDocuments(d ?? [])).catch((e: any) => console.error(e)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error('File too large. Maximum 100MB.');
      return;
    }

    setUploading(true);
    try {
      // Get presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          isPublic: false,
        }),
      });
      if (!presignedRes.ok) { toast.error('Failed to get upload URL'); return; }
      const { uploadUrl, cloud_storage_path } = await presignedRes.json();

      // Upload to S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!uploadRes.ok) { toast.error('Upload failed'); return; }

      // Complete upload
      const completeRes = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudStoragePath: cloud_storage_path,
          isPublic: false,
          name: file.name,
          type: uploadType,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
        }),
      });
      if (!completeRes.ok) { toast.error('Failed to save document'); return; }

      toast.success('Document uploaded successfully');
      fetchDocuments();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
      toast.success('Document deleted');
      fetchDocuments();
    } catch { toast.error('Failed to delete'); }
  };

  const handleDownload = (url: string | null, name: string) => {
    if (!url) { toast.error('Download URL not available'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = name ?? 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredDocs = (documents ?? []).filter((d: any) => filterType === 'all' || d?.type === filterType);

  if (loading) return <div className="space-y-4 p-6">{[1, 2, 3].map((i: number) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {docTypes.map((t: any) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3">
          <Select value={uploadType} onValueChange={setUploadType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {docTypes.map((t: any) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.webp" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="mr-2 h-4 w-4" /> Upload</>}
          </Button>
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <FadeIn>
          <Card className="border-dashed border-2 border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-lg font-medium">No documents yet</p>
              <p className="text-sm text-muted-foreground">Upload your career documents to keep them organized</p>
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <Stagger staggerDelay={0.06}>
          <div className="space-y-3">
            {filteredDocs.map((doc: any) => {
              const Icon = typeIcons[doc?.type] ?? File;
              return (
                <StaggerItem key={doc?.id}>
                  <Card className="border-border/50 transition-all hover:shadow-md" style={{ boxShadow: 'var(--shadow-sm)' }}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm">{doc?.name ?? 'Untitled'}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs capitalize">{(doc?.type ?? 'other').replace('_', ' ')}</Badge>
                            <span>{formatFileSize(doc?.fileSize ?? 0)}</span>
                            <span>{new Date(doc?.createdAt ?? '').toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc?.downloadUrl, doc?.name)}><Download className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(doc?.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}
          </div>
        </Stagger>
      )}
    </div>
  );
}
