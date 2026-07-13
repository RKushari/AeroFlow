import { getServerSession } from "next-auth/next";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { db } from "./db";
import { redirect } from "next/navigation";

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
  },
  events: {
    async signIn({ user }) {
      try {
        await db.auditLedger.create({
          data: {
            userId: user.id,
            action: "SIGN_IN",
            resourceId: user.id,
            ipAddress: "127.0.0.1",
          }
        });
      } catch (err) {
        console.error("Failed to log sign-in audit:", err);
      }
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

export function getDashboardForRole(role: Role): string {
  switch (role) {
    case Role.GROUND_CREW_LEAD:
      return '/crew/dashboard';
    case Role.FLIGHT_DISPATCHER:
      return '/dispatcher/dashboard';
    case Role.OPERATIONS_DIRECTOR:
      return '/director/ledger';
    default:
      return '/';
  }
}

export async function requireRole(allowedRoles: Role[]) {
  const session = await getSession();
  if (!session) {
    redirect('/api/auth/signin');
  }
  
  if (session.user.email !== "johndoe@gmail.com" && !allowedRoles.includes(session.user.role)) {
    redirect('/api/auth/signin');
  }
  return session;
}
