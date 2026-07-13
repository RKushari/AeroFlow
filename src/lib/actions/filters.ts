'use server';

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function saveFilter(name: string, query: any) {
  await requireRole(['OPERATIONS_DIRECTOR']);

  const filter = await db.savedFilters.create({
    data: {
      name,
      query: JSON.stringify(query)
    }
  });

  revalidatePath('/director/route-trends');
  return filter;
}
