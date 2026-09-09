export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [totalJobs, resumeCount, documentCount, coverLetterCount, jobsByStatus, recentJobs, recentResumes] = await Promise.all([
      prisma.job.count({ where: { userId } }),
      prisma.resume.count({ where: { userId } }),
      prisma.document.count({ where: { userId } }),
      prisma.coverLetter.count({ where: { userId } }),
      prisma.job.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
      prisma.job.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 5 }),
      prisma.resume.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 3 }),
    ]);

    const statusCounts: Record<string, number> = {};
    (jobsByStatus ?? []).forEach((s: any) => {
      statusCounts[s?.status ?? 'unknown'] = s?._count?._all ?? 0;
    });

    return NextResponse.json({
      totalJobs,
      resumeCount,
      documentCount,
      coverLetterCount,
      statusCounts,
      recentJobs: recentJobs ?? [],
      recentResumes: recentResumes ?? [],
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
