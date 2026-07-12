import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { completeChecklistItem, submitShiftLog } from "@/lib/actions/crew";

export const dynamic = 'force-dynamic';

export default async function CrewDashboard() {
  const session = await requireRole(['GROUND_CREW_LEAD']);

  const flights = await db.flights.findMany({
    where: {
      status: 'SCHEDULED'
    },
    include: {
      checklists: { include: { items: true } },
      crewUsers: true,
    },
  });

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">Ground Operations</h1>

      {flights.map(flight => {
        const isAssigned = flight.crewUsers.some(u => u.id === session.user.id);

        return (
          <div key={flight.id} className="p-5 border rounded-xl shadow-sm bg-white">
            <h2 className="font-bold text-lg mb-2">Flight {flight.flightNumber}</h2>
            
            <div className="mb-4">
              <h3 className="font-semibold text-sm mb-2 text-slate-600">Pre-Flight Checklists</h3>
              {flight.checklists.map(checklist => (
                <div key={checklist.id} className="ml-2 mb-4">
                  {checklist.items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 py-1 text-sm">
                      <form action={async () => {
                        'use server';
                        await completeChecklistItem(item.id);
                      }}>
                        <button 
                          type="submit" 
                          disabled={item.isComplete}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.isComplete ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}
                        >
                          {item.isComplete && "✓"}
                        </button>
                      </form>
                      <span className={item.isComplete ? "text-slate-400 line-through" : ""}>
                        {item.task} {item.isMandatory && <span className="text-red-500 text-xs">*</span>}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {!isAssigned && (
              <div className="mt-4 pt-4 border-t">
                <form action={async (formData: FormData) => {
                  'use server';
                  const fatigue = parseInt(formData.get('fatigue') as string || '0', 10);
                  await submitShiftLog(flight.id, fatigue);
                }} className="flex items-center gap-3">
                  <label className="text-sm font-medium">Log Fatigue (0-10):</label>
                  <input type="number" name="fatigue" min="0" max="10" defaultValue="5" className="w-16 border rounded px-2 py-1 text-sm" />
                  <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium">Clock In</button>
                </form>
              </div>
            )}
            
            {isAssigned && (
              <div className="mt-4 pt-4 border-t text-sm text-green-600 font-medium">
                ✓ Checked in for this flight
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
