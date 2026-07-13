import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { completeChecklistItem, submitShiftLog } from "@/lib/actions/crew";
import { seedDummyEquipment, logEquipmentMaintenance } from "@/lib/actions/equipment";

export const dynamic = 'force-dynamic';

export default async function CrewDashboard() {
  const session = await requireRole(['GROUND_CREW_LEAD', 'OPERATIONS_DIRECTOR']);

  const flights = await db.flights.findMany({
    where: {
      status: 'SCHEDULED'
    },
    include: {
      checklists: { include: { items: true } },
      crewUsers: true,
    },
  });

  let equipment = await db.groundEquipment.findMany({
    orderBy: { identifier: 'asc' }
  });

  if (equipment.length === 0) {
    await seedDummyEquipment();
    equipment = await db.groundEquipment.findMany({
      orderBy: { identifier: 'asc' }
    });
  }

  return (
    <div className="flex flex-col gap-8 p-4">
      <div>
        <h1 className="text-2xl font-bold mb-6">Ground Operations</h1>
        
        {flights.length === 0 && (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 mb-8">
            No flights are currently scheduled for dispatch.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Equipment Status Board</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {equipment.map(eq => (
            <div key={eq.id} className="p-4 bg-white border rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">{eq.identifier}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  eq.status === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                  eq.status === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                  eq.status === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {eq.status === 'LOW' ? 'OPERATIONAL' : eq.status}
                </span>
              </div>
              <form action={async (formData: FormData) => {
                'use server';
                const status = formData.get('status') as any;
                const notes = formData.get('notes') as string;
                if (notes) {
                  await logEquipmentMaintenance(eq.id, notes, status);
                }
              }} className="flex gap-2">
                <select name="status" defaultValue={eq.status} className="border rounded px-2 py-1 text-sm bg-slate-50">
                  <option value="LOW">Operational</option>
                  <option value="MEDIUM">Maintenance Needed</option>
                  <option value="HIGH">Degraded</option>
                  <option value="CRITICAL">Out of Service</option>
                </select>
                <input type="text" name="notes" placeholder="Log maintenance note..." required className="flex-1 border rounded px-2 py-1 text-sm" />
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-500">Log</button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
