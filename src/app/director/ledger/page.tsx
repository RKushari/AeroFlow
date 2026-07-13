import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { mockLedger } from "@/lib/mock-data";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compliance Ledger Explorer</h1>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Search Action or Resource ID..." 
            className="px-4 py-2 border rounded-lg text-sm w-64"
          />
          <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">Filter</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Resource ID</th>
                <th className="px-6 py-4">Deltas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{log.userId}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{log.resourceId}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:underline font-medium text-xs">
                      View JSON Diffs
                    </button>
                  </td>
                </tr>
              ))}

              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No compliance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
