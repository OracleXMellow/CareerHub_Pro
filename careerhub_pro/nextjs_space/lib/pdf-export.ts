// Client-side helper for async résumé PDF export.
// Splits the work into a fast "create" request and short polling "status"
// requests so no single network call stays open for the whole render — this
// removes the long-request timeout risk for large résumés and lets the UI
// report live progress.

export type PdfProgress = (pct: number, label: string) => void;

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 120; // ~3 minutes worst case

function base64ToPdfBlob(b64: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'application/pdf' });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Exports a résumé to PDF asynchronously.
 * - Starts the job (quota is enforced here, so a 429 surfaces immediately).
 * - Polls for completion, reporting progress via onProgress.
 * - Downloads the file on success.
 * Throws an Error with a user-friendly message on any failure.
 */
export async function exportResumePdf(
  resumeData: any,
  filename: string,
  onProgress?: PdfProgress,
): Promise<void> {
  onProgress?.(5, 'Preparing your resume…');

  const createRes = await fetch('/api/resumes/export-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeData }),
  });

  if (!createRes.ok) {
    const d = await createRes.json().catch(() => ({}));
    throw new Error(d?.error || 'Failed to start PDF export');
  }

  const { request_id } = await createRes.json();
  if (!request_id) throw new Error('Failed to start PDF export');

  onProgress?.(15, 'Generating PDF…');

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch('/api/resumes/export-pdf/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id }),
    });

    if (!statusRes.ok) {
      const d = await statusRes.json().catch(() => ({}));
      throw new Error(d?.error || 'PDF status check failed');
    }

    const data = await statusRes.json();

    if (data.status === 'SUCCESS') {
      onProgress?.(97, 'Downloading…');
      triggerDownload(base64ToPdfBlob(data.pdf), filename);
      onProgress?.(100, 'Done');
      return;
    }
    if (data.status === 'FAILED') {
      throw new Error('PDF generation failed. Please try again.');
    }

    // Still processing — ramp progress smoothly between 15% and 90%.
    const pct = Math.min(90, 15 + Math.round((attempt / MAX_ATTEMPTS) * 75));
    onProgress?.(pct, 'Generating PDF…');
  }

  throw new Error('PDF generation timed out. Please try again.');
}
