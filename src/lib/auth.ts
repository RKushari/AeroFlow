import { getServerSession } from "next-auth/next";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { db } from "./db";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        // In a real app we check hash. For this MVP, we match email.
        const user = await db.users.findUnique({ where: { email: credentials.email } });
        if (user) {
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role as Role;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    }
  }
};

export type Session = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: Role;
  };
};

export async function getSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  return session as Session | null;
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await getSession();
  if (!session || !allowedRoles.includes(session.user.role)) {
    throw new Error('Unauthorized: Insufficient role permissions');
  }
  return session;
}
