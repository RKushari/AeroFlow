import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { layout } = await req.json();

  await db.dashboardPreferences.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      layoutConfig: { layout }
    },
    update: {
      layoutConfig: { layout }
    }
  });

  return NextResponse.json({ success: true });
}
