import { db } from "@/lib/db";
import { approveDispatch, overrideDispatch } from "@/lib/actions/flight";
import { requireRole, getSession } from "@/lib/auth";
import { getRiskThreshold } from "@/lib/config";
import { RefreshWeatherButton } from "@/components/refresh-weather-button";
import { BriefingEditor } from "@/components/briefing-editor";

export const dynamic = 'force-dynamic';

export default async function FlightDetails({ params }: { params: { id: string } }) {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  const flight = await db.flights.findUnique({
    where: { id: params.id },
    include: {
      route: true,
      risk: true,
      weather: { orderBy: { id: 'desc' }, take: 1 },
      briefings: { where: { deletedAt: null }, orderBy: { id: 'desc' } },
    }
  });

  const timeline = await db.auditLedger.findMany({
    where: { resourceId: params.id },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });

  const session = await getSession();
  const isDirector = session?.user?.role === 'OPERATIONS_DIRECTOR';

  if (!flight) {
    return <div className="p-8 text-red-500">Flight not found.</div>;
  }

  const threshold = await getRiskThreshold();
  const isCritical = flight.risk ? flight.risk.totalScore >= threshold : false;

  return (
    <div className="flex flex-col gap-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Flight {flight.flightNumber}</h1>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
              flight.status === 'READY' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
              flight.status === 'DEPARTED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
              flight.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
              'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {flight.status}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Route Profile: <strong className="text-slate-700 dark:text-slate-200">{flight.route.originId}</strong> ➔ <strong className="text-slate-700 dark:text-slate-200">{flight.route.destinationId}</strong> (Base Route Risk: {flight.route.baseRisk})
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <RefreshWeatherButton flightId={flight.id} />
          <a 
            href={`/api/export?flightId=${flight.id}`} 
            target="_blank" 
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
          >
            Export Dossier (PDF)
          </a>
          
          {/* Dispatch Form Server Action */}
          <form action={async () => {
            'use server';
            await approveDispatch(flight.id);
          }}>
            <button 
              type="submit" 
              disabled={isCritical}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
                isCritical ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
              }`}
            >
              Approve Dispatch
            </button>
          </form>

          {flight.status === 'READY' && (
            <form action={async () => {
              'use server';
              const { signoffDeparture } = await import('@/lib/actions/signoff');
              await signoffDeparture(flight.id);
            }}>
              <button 
                type="submit" 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Confirm Departure (Sign-off)
              </button>
            </form>
          )}

          {isCritical && isDirector && (
            <form action={async (formData: FormData) => {
              'use server';
              const justification = formData.get('justification') as string;
              await overrideDispatch(flight.id, justification || 'Emergency Override');
            }} className="flex gap-2">
              <input 
                type="text" 
                name="justification" 
                placeholder="Override Justification..." 
                required 
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none" 
              />
              <button 
                type="submit" 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Force Override
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Visualization Panel */}
        <section className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Risk Matrix Analysis</h2>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                isCritical ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {isCritical ? 'CRITICAL / LOCKED' : 'NOMINAL'}
              </span>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-600 dark:text-slate-400 text-xs">Total Composite Score</span>
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    {flight.risk?.totalScore.toFixed(2) ?? 'N/A'} <span className="text-xs font-normal text-slate-400">/ 10.0</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      (flight.risk?.totalScore ?? 0) >= 7.5 ? 'bg-red-500' :
                      (flight.risk?.totalScore ?? 0) >= 5.0 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, ((flight.risk?.totalScore ?? 0) / 10) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Fatigue Factor (Fs) (30%)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{flight.risk?.fatigueFactor.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Weather Factor (Wi) (40%)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{flight.risk?.weatherFactor.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Mechanical Factor (Md) (30%)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{flight.risk?.mechFactor.toFixed(2) ?? '0.00'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            Automatic gate threshold: Risk score &lt; 5.0 allows dispatch clearance; &ge; 7.5 enforces mandatory dispatch block.
          </div>
        </section>

        {/* AI Briefing Delta Editor Component */}
        <div className="lg:col-span-2">
          <BriefingEditor 
            flightId={flight.id}
            flightNumber={flight.flightNumber}
            briefings={flight.briefings}
            riskScore={flight.risk?.totalScore ?? 0.0}
            weatherSeverity={flight.weather[0]?.severityIndex ?? 0.0}
          />
        </div>
      </div>

      {/* Flight Safety Timeline */}
      <section className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Immutable Audit & Safety Timeline</h2>
        {timeline.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-6">No audit records logged for this flight yet.</div>
        ) : (
          <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-4">
            {timeline.map((event) => (
              <div key={event.id} className="relative pl-6">
                <div className="absolute -left-[9px] top-1.5 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 shadow-xs" />
                <div className="text-[11px] text-slate-400 font-mono">{new Date(event.timestamp).toLocaleString()}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md text-[11px] font-bold tracking-wide uppercase border border-blue-100 dark:border-blue-900">
                    {event.action}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">by User ID: {event.userId.slice(0, 8)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
