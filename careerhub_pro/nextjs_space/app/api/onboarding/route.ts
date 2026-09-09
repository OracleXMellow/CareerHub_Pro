import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { careerMotivation, jobTimeline, helpArea, targetJobTitles } = await req.json();

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboarded: true,
        careerMotivation: careerMotivation || null,
        jobTimeline: jobTimeline || null,
        helpArea: helpArea || null,
        targetJobTitles: JSON.stringify(targetJobTitles || []),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 });
  }
}
