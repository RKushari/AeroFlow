import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { mockLedger } from "@/lib/mock-data";
import { LedgerTable } from "./ledger-client";

export const dynamic = 'force-dynamic';

export default async function ComplianceLedger() {
  await requireRole(['OPERATIONS_DIRECTOR']);

  let auditLogs = await db.auditLedger.findMany({
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  if (auditLogs.length === 0) {
    auditLogs = mockLedger as any;
  }

  // Serialize dates for client component
  const serialized = auditLogs.map(log => ({
    ...log,
    timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : log.timestamp,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compliance Ledger Explorer</h1>
      </div>
      <LedgerTable auditLogs={serialized} />
    </div>
  );
}
