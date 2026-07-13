import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import Link from "next/link";
import { ShieldAlert, CheckCircle, Check } from "lucide-react";
import { markAlertsRead, markAlertRead } from "@/lib/actions/alerts";
import { mockAlerts } from "@/lib/mock-data";

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  let alerts = await db.alertLogs.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  if (alerts.length === 0) {
    alerts = mockAlerts as any;
  }

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="text-amber-500" /> System Alerts
        </h1>
        <div className="flex gap-3">
          <Link href="/dispatcher/dashboard" className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300">
            Back to Dashboard
          </Link>
          <form action={markAlertsRead}>
            <button type="submit" disabled={unreadCount === 0} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <CheckCircle size={16} /> Mark All Read ({unreadCount})
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No alerts found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-4 flex flex-col gap-1 ${alert.read ? 'opacity-60 bg-slate-50' : 'bg-white'}`}>
                <div className="flex justify-between items-start">
                  <span className="font-medium text-slate-800">{alert.message}</span>
                  <div className="flex items-center gap-3">
                    {!alert.read && (
                      <form action={markAlertRead.bind(null, alert.id)}>
                        <button type="submit" className="text-xs flex items-center gap-1 text-slate-500 hover:text-blue-600 font-medium">
                          <Check size={14} /> Mark Read
                        </button>
                      </form>
                    )}
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      alert.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {alert.createdAt.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
