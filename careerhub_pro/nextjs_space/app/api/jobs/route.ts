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
    const jobs = await prisma.job.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(jobs ?? []);
  } catch (error: any) {
    console.error("Get jobs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const job = await prisma.job.create({
      data: {
        userId,
        company: body?.company ?? '',
        position: body?.position ?? '',
        location: body?.location ?? '',
        url: body?.url ?? '',
        salary: body?.salary ?? '',
        status: body?.status ?? 'wishlist',
        notes: body?.notes ?? '',
        description: body?.description ?? '',
        appliedDate: body?.appliedDate ? new Date(body.appliedDate) : null,
      },
    });
    return NextResponse.json(job);
  } catch (error: any) {
    console.error("Create job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    if (!body?.id) return NextResponse.json({ error: "Job ID required" }, { status: 400 });

    const existing = await prisma.job.findFirst({ where: { id: body.id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const job = await prisma.job.update({
      where: { id: body.id },
      data: {
        company: body.company ?? existing.company,
        position: body.position ?? existing.position,
        location: body.location ?? existing.location,
        url: body.url ?? existing.url,
        salary: body.salary ?? existing.salary,
        status: body.status ?? existing.status,
        notes: body.notes ?? existing.notes,
        description: body.description ?? existing.description,
        appliedDate: body.appliedDate !== undefined ? (body.appliedDate ? new Date(body.appliedDate) : null) : existing.appliedDate,
      },
    });
    return NextResponse.json(job);
  } catch (error: any) {
    console.error("Update job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existing = await prisma.job.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.job.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
