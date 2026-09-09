export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Lightweight status check for an async PDF export job. The client polls this
// after starting a job at /api/resumes/export-pdf. Each call does a single
// upstream status check and returns quickly. No quota is charged here — the
// quota was already enforced when the job was created.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { request_id } = await request.json();
    if (!request_id) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 });
    }

    const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id, deployment_token: process.env.ABACUSAI_API_KEY }),
    });

    if (!statusResponse.ok) {
      return NextResponse.json({ status: 'PENDING' });
    }

    const statusResult = await statusResponse.json();
    const status = statusResult?.status || 'FAILED';

    if (status === 'SUCCESS') {
      const result = statusResult?.result;
      if (result?.result) {
        return NextResponse.json({ status: 'SUCCESS', pdf: result.result });
      }
      return NextResponse.json({ status: 'FAILED', error: 'PDF completed but no data' });
    }

    if (status === 'FAILED') {
      return NextResponse.json({ status: 'FAILED' });
    }

    return NextResponse.json({ status: 'PENDING' });
  } catch (error) {
    console.error('PDF status error:', error);
    return NextResponse.json({ status: 'PENDING' });
  }
}
