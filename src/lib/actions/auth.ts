'use server';

import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import crypto from "crypto";

export async function registerUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as Role;

  if (!name || !email || !password || !role) {
    throw new Error("Missing required fields.");
  }

  // Prevent registration of Operations Director
  if (role === Role.OPERATIONS_DIRECTOR) {
    throw new Error("OPERATIONS_DIRECTOR accounts cannot be created via public registration.");
  }

  // Check unique constraints
  const existingUser = await db.users.findFirst({
    where: {
      OR: [
        { email },
        { phone: phone || undefined }
      ]
    }
  });

  if (existingUser) {
    throw new Error("A user with this email or phone number already exists.");
  }

  // Hash password using native crypto module (SHA-256)
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

  // Create user
  await db.users.create({
    data: {
      name,
      email,
      phone,
      password: hashedPassword,
      role
    }
  });

  return { success: true };
}
