import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { completeChecklistItem, getUserShiftLogs } from "@/lib/actions/crew";
import { seedDummyEquipment, logEquipmentMaintenance } from "@/lib/actions/equipment";
import { FlightSimulator3D } from "@/components/flight-simulator-3d";
import { ShiftLoggerClient } from "./shift-logger-client";
import { Shield, Wrench, Plane, CheckCircle2, Clock } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function CrewDashboard() {
  const session = await requireRole(['GROUND_CREW_LEAD', 'OPERATIONS_DIRECTOR']);

  let flights: any[] = [];
  let equipment: any[] = [];
  let shiftLogs: any[] = [];
  let errorMessage = null;

  try {
    flights = await db.flights.findMany({
      where: {
        status: 'SCHEDULED'
      },
      include: {
        checklists: { include: { items: true } },
        crewUsers: true,
      },
    });

    equipment = await db.groundEquipment.findMany({
      orderBy: { identifier: 'asc' }
    });

    if (equipment.length === 0) {
      await seedDummyEquipment();
      equipment = await db.groundEquipment.findMany({
        orderBy: { identifier: 'asc' }
      });
    }

    shiftLogs = await getUserShiftLogs(session.user.id);
  } catch (err: any) {
    console.error("Crew Dashboard Error:", err);
    errorMessage = err.message || String(err);
  }

  if (errorMessage) {
    return (
      <div className="p-8 text-red-500 bg-red-950/20 border border-red-800 rounded-2xl m-8 font-mono">
        <h2 className="text-xl font-bold mb-4">Dashboard Error</h2>
        <p>{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex flex-col gap-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-lg shadow-amber-900/30">
            <Wrench className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-mono">
                GROUND OPERATIONS DECK
              </h1>
              <span className="px-2.5 py-1 text-[10px] font-bold font-mono rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                CREW CONTROL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Pre-Flight Readiness, Fatigue Evaluation & Equipment Telemetry</span>
            </p>
          </div>
        </div>
      </div>

      {/* Crew Fatigue Evaluation & Shift Logger Component */}
      <ShiftLoggerClient initialLogs={shiftLogs} />

      {/* 3D Boeing 737 Flight Simulator Deck */}
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-mono flex items-center gap-2 text-slate-200">
            <Plane className="h-5 w-5 text-blue-400" /> 3D Aircraft Flight Deck Simulator
          </h2>
          <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            Interactive Flight Dynamics & Gear Physics
          </span>
        </div>
        <FlightSimulator3D />
      </div>

      {/* Scheduled Flights & Pre-Flight Checklists */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-mono flex items-center gap-2 text-slate-200">
          <Clock className="h-5 w-5 text-emerald-400" /> Scheduled Flight Pre-Flight Checklists
        </h2>

        {flights.length === 0 && (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 font-mono text-sm">
            No flights are currently scheduled for ground crew dispatch.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {flights.map(flight => {
            const isAssigned = flight.crewUsers.some((u: any) => u.id === session.user.id);

            return (
              <div key={flight.id} className="p-6 border border-slate-800/80 rounded-2xl shadow-xl bg-slate-900/60 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-lg font-mono text-white flex items-center gap-2">
                      <Plane className="h-4 w-4 text-blue-400" /> Flight {flight.flightNumber}
                    </h3>
                    <span className="px-2.5 py-1 text-[10px] font-bold font-mono rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {flight.status}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-semibold text-xs font-mono mb-2 text-slate-400 uppercase tracking-wider">Mandatory Pre-Flight Checklists</h4>
                    {flight.checklists.map((checklist: any) => (
                      <div key={checklist.id} className="ml-1 mb-4 space-y-2">
                        {checklist.items.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono">
                            <form action={async () => {
                              'use server';
                              await completeChecklistItem(item.id);
                            }}>
                              <button 
                                type="submit" 
                                disabled={item.isComplete}
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${item.isComplete ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}
                              >
                                {item.isComplete && "✓"}
                              </button>
                            </form>
                            <span className={item.isComplete ? "text-slate-500 line-through" : "text-slate-200"}>
                              {item.task} {item.isMandatory && <span className="text-red-400 text-xs">*</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                
                {isAssigned && (
                  <div className="pt-3 border-t border-slate-800 text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Clocked in for ground dispatch duty</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ground Equipment Status Board */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-mono flex items-center gap-2 text-slate-200">
          <Wrench className="h-5 w-5 text-amber-400" /> Ground Support Equipment (GSE) Status Board
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          {equipment.map(eq => (
            <div key={eq.id} className="p-5 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl flex flex-col gap-3 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" /> {eq.identifier}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                  eq.status === 'CRITICAL' ? 'bg-red-950/60 text-red-300 border-red-800/50' :
                  eq.status === 'HIGH' ? 'bg-orange-950/60 text-orange-300 border-orange-800/50' :
                  eq.status === 'MEDIUM' ? 'bg-amber-950/60 text-amber-300 border-amber-800/50' :
                  'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
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
                <select name="status" defaultValue={eq.status} className="border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs bg-slate-950 text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="LOW">Operational</option>
                  <option value="MEDIUM">Maintenance Needed</option>
                  <option value="HIGH">Degraded</option>
                  <option value="CRITICAL">Out of Service</option>
                </select>
                <input type="text" name="notes" placeholder="Log maintenance notes..." required className="flex-1 border border-slate-700 bg-slate-950 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <button type="submit" className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-blue-900/30">
                  Log
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
