import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getRiskThreshold } from "@/lib/config";
import AdminClient from "./admin-client";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const session = await requireRole(["OPERATIONS_DIRECTOR"]);

  // Fetch all user accounts
  const users = await db.users.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  // Fetch current risk threshold
  const threshold = await getRiskThreshold();

  // Fetch recent logins, config updates, and role updates
  const recentLogs = await db.auditLedger.findMany({
    where: {
      action: {
        in: ["SIGN_IN", "UPDATE_USER_ROLE", "UPDATE_SYSTEM_CONFIG"],
      },
    },
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">System Admin Control Panel</h1>
      </div>

      <AdminClient
        initialUsers={users}
        initialThreshold={threshold}
        recentLogs={recentLogs}
        callerId={session.user.id}
      />
    </div>
  );
}
