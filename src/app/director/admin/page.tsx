import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getRiskThreshold } from "@/lib/config";
import AdminClient from "./admin-client";
import { Role } from "@prisma/client";

export const dynamic = 'force-dynamic';

const DEFAULT_MOCK_USERS = [
  { id: 'usr-1', name: 'John Doe (Director)', email: 'johndoe@gmail.com', role: Role.OPERATIONS_DIRECTOR },
  { id: 'usr-2', name: 'Alex Vance (Dispatcher)', email: 'dispatcher@aeroflow.com', role: Role.FLIGHT_DISPATCHER },
  { id: 'usr-3', name: 'Sam Miller (Crew Lead)', email: 'crew@aeroflow.com', role: Role.GROUND_CREW_LEAD },
];

export default async function AdminDashboardPage() {
  const session = await requireRole(["OPERATIONS_DIRECTOR", "FLIGHT_DISPATCHER", "GROUND_CREW_LEAD"]);

  let users: any[] = [];
  let threshold = 7.5;
  let recentLogs: any[] = [];

  try {
    users = await db.users.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (users.length === 0) {
      users = DEFAULT_MOCK_USERS;
    }

    threshold = await getRiskThreshold();

    recentLogs = await db.auditLedger.findMany({
      where: {
        action: {
          in: ["SIGN_IN", "UPDATE_USER_ROLE", "UPDATE_SYSTEM_CONFIG"],
        },
      },
      orderBy: { timestamp: "desc" },
      take: 50,
    });
  } catch (err) {
    console.error("Admin Control Panel DB Error, falling back to defaults:", err);
    users = DEFAULT_MOCK_USERS;
    recentLogs = [];
  }

  return (
    <div className="space-y-6 font-mono">
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
