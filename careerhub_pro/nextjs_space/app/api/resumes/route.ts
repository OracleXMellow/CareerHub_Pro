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
    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(resumes ?? []);
  } catch (error: any) {
    console.error("Get resumes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const resume = await prisma.resume.create({
      data: {
        userId,
        title: body?.title ?? 'Untitled Resume',
        template: body?.template ?? 'modern',
        fullName: body?.fullName ?? '',
        email: body?.email ?? '',
        phone: body?.phone ?? '',
        location: body?.location ?? '',
        summary: body?.summary ?? '',
        targetTitle: body?.targetTitle ?? '',
        experience: body?.experience ? JSON.stringify(body.experience) : '[]',
        education: body?.education ? JSON.stringify(body.education) : '[]',
        skills: body?.skills ? JSON.stringify(body.skills) : '[]',
        certifications: body?.certifications ? JSON.stringify(body.certifications) : '[]',
        projects: body?.projects ? JSON.stringify(body.projects) : '[]',
        volunteering: body?.volunteering ? JSON.stringify(body.volunteering) : '[]',
        awards: body?.awards ? JSON.stringify(body.awards) : '[]',
        publications: body?.publications ? JSON.stringify(body.publications) : '[]',
        interests: body?.interests ? JSON.stringify(body.interests) : '[]',
      },
    });
    return NextResponse.json(resume);
  } catch (error: any) {
    console.error("Create resume error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    if (!body?.id) return NextResponse.json({ error: "Resume ID required" }, { status: 400 });

    const existing = await prisma.resume.findFirst({ where: { id: body.id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const resume = await prisma.resume.update({
      where: { id: body.id },
      data: {
        title: body.title ?? existing.title,
        template: body.template ?? existing.template,
        fullName: body.fullName ?? existing.fullName,
        email: body.email ?? existing.email,
        phone: body.phone ?? existing.phone,
        location: body.location ?? existing.location,
        summary: body.summary ?? existing.summary,
        targetTitle: body.targetTitle ?? existing.targetTitle,
        experience: body.experience ? JSON.stringify(body.experience) : existing.experience,
        education: body.education ? JSON.stringify(body.education) : existing.education,
        skills: body.skills ? JSON.stringify(body.skills) : existing.skills,
        certifications: body.certifications ? JSON.stringify(body.certifications) : existing.certifications,
        projects: body.projects ? JSON.stringify(body.projects) : existing.projects,
        volunteering: body.volunteering ? JSON.stringify(body.volunteering) : existing.volunteering,
        awards: body.awards ? JSON.stringify(body.awards) : existing.awards,
        publications: body.publications ? JSON.stringify(body.publications) : existing.publications,
        interests: body.interests ? JSON.stringify(body.interests) : existing.interests,
      },
    });
    return NextResponse.json(resume);
  } catch (error: any) {
    console.error("Update resume error:", error);
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

    const existing = await prisma.resume.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.resume.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete resume error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
