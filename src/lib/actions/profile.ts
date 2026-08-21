'use server';

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateProfileSettings(pictureUrl: string | null, status: 'ON_DUTY' | 'OFF_DUTY') {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  try {
    const existingPref = await db.dashboardPreferences.findUnique({
      where: { userId: session.user.id }
    });

    const layoutConfig = (existingPref?.layoutConfig as any) || {};

    await db.dashboardPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        layoutConfig: { ...layoutConfig, pictureUrl, status }
      },
      update: {
        layoutConfig: { ...layoutConfig, pictureUrl, status }
      }
    });
  } catch (e) {
    console.warn("updateProfileSettings DB error:", e);
  }

  revalidatePath('/');
}

export async function getProfileSettings() {
  const session = await getSession();
  if (!session) return null;

  let user = null;
  try {
    user = await db.users.findUnique({
      where: { id: session.user.id },
      include: { preferences: true }
    });
  } catch (e) {
    console.warn("getProfileSettings DB error:", e);
  }

  const config = (user?.preferences?.layoutConfig as any) || {};

  return {
    name: user?.name || session.user.name || 'John Doe',
    pictureUrl: config.pictureUrl || null,
    status: config.status || 'ON_DUTY',
    role: session.user.role || 'OPERATIONS_DIRECTOR',
    email: session.user.email || 'johndoe@gmail.com'
  };
}
