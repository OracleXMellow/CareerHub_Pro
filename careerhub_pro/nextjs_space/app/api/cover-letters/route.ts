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
    const coverLetters = await prisma.coverLetter.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(coverLetters ?? []);
  } catch (error: any) {
    console.error("Get cover letters error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const cl = await prisma.coverLetter.create({
      data: {
        userId,
        title: body?.title ?? 'Untitled Cover Letter',
        content: body?.content ?? '',
        jobTitle: body?.jobTitle ?? '',
        company: body?.company ?? '',
      },
    });
    return NextResponse.json(cl);
  } catch (error: any) {
    console.error("Create cover letter error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    if (!body?.id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const existing = await prisma.coverLetter.findFirst({ where: { id: body.id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const cl = await prisma.coverLetter.update({
      where: { id: body.id },
      data: {
        title: body.title ?? existing.title,
        content: body.content ?? existing.content,
        jobTitle: body.jobTitle ?? existing.jobTitle,
        company: body.company ?? existing.company,
      },
    });
    return NextResponse.json(cl);
  } catch (error: any) {
    console.error("Update cover letter error:", error);
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
    const existing = await prisma.coverLetter.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.coverLetter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete cover letter error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
