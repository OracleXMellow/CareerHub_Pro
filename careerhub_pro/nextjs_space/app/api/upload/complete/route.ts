export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const { cloudStoragePath, isPublic, name, type, contentType, fileSize } = body ?? {};
    if (!cloudStoragePath || !name) {
      return NextResponse.json({ error: "cloudStoragePath and name required" }, { status: 400 });
    }
    const doc = await prisma.document.create({
      data: {
        userId,
        name: name ?? 'Untitled',
        type: type ?? 'other',
        cloudStoragePath: cloudStoragePath,
        isPublic: isPublic ?? false,
        contentType: contentType ?? 'application/octet-stream',
        fileSize: fileSize ?? 0,
      },
    });
    return NextResponse.json(doc);
  } catch (error: any) {
    console.error("Upload complete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
