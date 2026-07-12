import { db } from "@/lib/db";
import { approveDispatch, overrideDispatch } from "@/lib/actions/flight";
import { requireRole, getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function FlightDetails({ params }: { params: { id: string } }) {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  const flight = await db.flights.findUnique({
    where: { id: params.id },
    include: {
      risk: true,
      weather: { orderBy: { id: 'desc' }, take: 1 },
      briefing: true,
    }
  });

  const session = await getSession();
  const isDirector = session?.user?.role === 'OPERATIONS_DIRECTOR';

  if (!flight) {
    return <div className="p-8 text-red-500">Flight not found.</div>;
  }

  const isCritical = flight.risk ? flight.risk.totalScore >= 0.75 : false;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Flight {flight.flightNumber}</h1>
          <p className="text-slate-500">Route: {flight.routeId}</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-200 rounded-lg text-sm font-medium">Export Dossier (PDF)</button>
          
          {/* Dispatch Form Server Action */}
          <form action={async () => {
            'use server';
            await approveDispatch(flight.id);
          }}>
            <button 
              type="submit" 
              disabled={isCritical}
              className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors ${isCritical ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              Approve Dispatch
            </button>
          </form>

          {isCritical && isDirector && (
            <form action={async (formData: FormData) => {
              'use server';
              const justification = formData.get('justification') as string;
              await overrideDispatch(flight.id, justification || 'Emergency Override');
            }} className="flex gap-2">
              <input type="text" name="justification" placeholder="Reason..." required className="px-2 py-1 text-sm border rounded-lg" />
              <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold">
                Force Override
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Visualization Panel */}
        <section className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold mb-4">Risk Coefficient breakdown</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Total Score</span>
              <span className="font-bold">{flight.risk?.totalScore.toFixed(2) ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Fatigue Factor (Fs)</span>
              <span>{flight.risk?.fatigueFactor.toFixed(2) ?? '0'}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Weather Factor (Wi)</span>
              <span>{flight.risk?.weatherFactor.toFixed(2) ?? '0'}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Mechanical Factor (Md)</span>
              <span>{flight.risk?.mechFactor.toFixed(2) ?? '0'}</span>
            </div>
          </div>
        </section>

        {/* AI Briefing Delta Editor */}
        <section className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Safety Briefing (AI Draft)</h2>
            <form action={async () => {
              'use server';
              const { generateAiBriefing } = await import('@/lib/ai');
              await generateAiBriefing(flight.id);
            }}>
              <button type="submit" className="text-sm text-blue-600 font-medium hover:underline">
                Generate Draft
              </button>
            </form>
          </div>
          
          {flight.briefing ? (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Draft Content</label>
              <textarea 
                className="w-full h-32 p-3 text-sm bg-slate-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                defaultValue={flight.briefing.draftContent}
              />
              <button className="self-end px-3 py-1.5 bg-slate-900 text-white rounded text-sm font-medium mt-2">
                Commit Briefing
              </button>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed rounded-lg">
              No briefing generated yet.
            </div>
          )}
        </section>
      </div>

      {/* Safety Timeline Placeholder */}
      <section className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold mb-4">Flight Safety Timeline</h2>
        <div className="text-sm text-slate-500">
          Timeline component mapping AuditLedger events for {flight.id}...
        </div>
      </section>
    </div>
  );
}
