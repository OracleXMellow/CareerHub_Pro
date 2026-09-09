export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFileUrl, deleteFile } from "@/lib/s3";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;
    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const docsWithUrls = await Promise.all(
      (documents ?? []).map(async (doc: any) => {
        try {
          const url = await getFileUrl(doc.cloudStoragePath, doc.contentType, doc.isPublic);
          return { ...(doc ?? {}), downloadUrl: url };
        } catch {
          return { ...(doc ?? {}), downloadUrl: null };
        }
      })
    );
    return NextResponse.json(docsWithUrls);
  } catch (error: any) {
    console.error("Get documents error:", error);
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
    const existing = await prisma.document.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    try {
      await deleteFile(existing.cloudStoragePath);
    } catch (e: any) {
      console.error("S3 delete error:", e);
    }
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
