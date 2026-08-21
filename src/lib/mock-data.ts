import { FlightStatus, Severity, MessagePriority } from "@prisma/client";

const randomId = (i: number) => `mock-uuid-${i}`;

const globalAny = global as any;

if (!globalAny.mockFlights) {
  globalAny.mockFlights = Array.from({ length: 24 }).map((_, i) => {
    const origin = ['JFK', 'LAX', 'LHR', 'CDG', 'DXB'][i % 5];
    const dest = ['SFO', 'ORD', 'HND', 'FRA', 'SYD'][(i + 1) % 5];
    return {
      id: randomId(i),
      flightNumber: `AF-${100 + i}`,
      status: [FlightStatus.SCHEDULED, FlightStatus.BOARDING, FlightStatus.READY, FlightStatus.DEPARTED, FlightStatus.HOLD][i % 5],
      routeId: `${origin}-${dest}`,
      route: {
        id: randomId(i),
        originId: origin,
        destinationId: dest,
        baseRisk: 2.0 + (i % 3)
      },
      risk: {
        id: randomId(i),
        flightId: randomId(i),
        totalScore: (i % 5 === 0) ? 8.2 : 3.5 + (i % 4),
        fatigueFactor: 1.0 + (i % 2),
        weatherFactor: 1.0 + (i % 3),
        mechFactor: 0.5 + (i % 2),
        calculatedAt: new Date(Date.now() - i * 3600000)
      },
      checklists: [
        {
          id: randomId(i),
          flightId: randomId(i),
          isComplete: i % 3 === 0,
          items: [
            { id: `c1-${i}`, task: 'Pre-flight walkaround', isComplete: true, isMandatory: true, checklistId: randomId(i) },
            { id: `c2-${i}`, task: 'Fuel verification', isComplete: i % 3 === 0, isMandatory: true, checklistId: randomId(i) }
          ]
        }
      ]
    };
  });
}
export const mockFlights: any[] = globalAny.mockFlights;

if (!globalAny.mockAlerts) {
  globalAny.mockAlerts = [
    { id: 'alert-0', message: 'CRITICAL RISK EXCEEDED (Rc > 7.5) on flight AF-200 — JFK→SFO', severity: Severity.CRITICAL, read: false, createdAt: new Date(Date.now() - 600000) },
    { id: 'alert-1', message: 'CRITICAL RISK EXCEEDED (Rc > 7.5) on flight AF-201 — LAX→ORD', severity: Severity.CRITICAL, read: false, createdAt: new Date(Date.now() - 1800000) },
    { id: 'alert-2', message: 'CRITICAL RISK EXCEEDED (Rc > 7.5) on flight AF-205 — CDG→FRA', severity: Severity.CRITICAL, read: false, createdAt: new Date(Date.now() - 3600000) },
    { id: 'alert-3', message: 'HIGH fatigue index detected for Crew Rotation C-12 (FI=0.91)', severity: 'HIGH' as any, read: false, createdAt: new Date(Date.now() - 5400000) },
    { id: 'alert-4', message: 'HIGH weather degradation — Thunderstorm cell approaching ORD runway 28R', severity: 'HIGH' as any, read: false, createdAt: new Date(Date.now() - 7200000) },
    { id: 'alert-5', message: 'MEDIUM mechanical flag — APU oil pressure anomaly on AF-118', severity: 'MEDIUM' as any, read: false, createdAt: new Date(Date.now() - 9000000) },
    { id: 'alert-6', message: 'MEDIUM checklist incomplete — Pre-flight walkaround pending for AF-112', severity: 'MEDIUM' as any, read: false, createdAt: new Date(Date.now() - 10800000) },
  ];
}
export const mockAlerts: any[] = globalAny.mockAlerts;

export const mockLedger = Array.from({ length: 15 }).map((_, i) => ({
  id: `ledger-${i}`,
  userId: 'mock-user-1',
  action: ['FLIGHT_DISPATCHED', 'WEATHER_OVERRIDE', 'CREW_ASSIGNED', 'RISK_ACKNOWLEDGED'][i % 4],
  resourceId: `AF-${100 + i}`,
  ipAddress: '192.168.1.100',
  oldState: { status: 'SCHEDULED' },
  newState: { status: 'DEPARTED' },
  timestamp: new Date(Date.now() - i * 86400000)
}));

export const mockBroadcasts = Array.from({ length: 5 }).map((_, i) => ({
  id: `broadcast-${i}`,
  authorId: 'mock-director-1',
  content: `System Broadcast: ${['Severe weather warning for East Coast routing.', 'Runway maintenance at JFK delayed.', 'New fatigue management policy active.', 'API maintenance scheduled at 0200Z.', 'All flights holding at ORD.'][i]}`,
  priority: [MessagePriority.CRITICAL, MessagePriority.HIGH, MessagePriority.MEDIUM, MessagePriority.LOW, MessagePriority.LOW][i],
  expiresAt: new Date(Date.now() + 86400000 * (i + 1)),
  createdAt: new Date(Date.now() - i * 3600000)
}));

export const mockIncidents = [
  {
    id: 'inc-1',
    flightId: 'mock-uuid-0',
    reporterId: 'usr-1',
    type: 'BAGGAGE_BELT_JAM',
    description: 'Ground baggage conveyor belt jammed near hold 1.',
    severity: 'MEDIUM' as any,
    resolved: false,
    resolutionNotes: null,
    createdAt: new Date(Date.now() - 3600000),
    reporter: { id: 'usr-1', name: 'Ground Lead Sam', email: 'sam@aeroflow.com', role: 'GROUND_CREW_LEAD' },
    flight: { id: 'mock-uuid-0', flightNumber: 'AF-100', status: 'BOARDING' }
  },
  {
    id: 'inc-2',
    flightId: 'mock-uuid-1',
    reporterId: 'usr-2',
    type: 'HYDRAULIC_LEAK_RAMP',
    description: 'Minor hydraulic fluid spill detected near main landing gear.',
    severity: 'HIGH' as any,
    resolved: true,
    resolutionNotes: 'Absorbent pad applied and area cleaned. Hydraulic line re-torqued.',
    createdAt: new Date(Date.now() - 7200000),
    reporter: { id: 'usr-2', name: 'Alex Vance', email: 'alex@aeroflow.com', role: 'FLIGHT_DISPATCHER' },
    flight: { id: 'mock-uuid-1', flightNumber: 'AF-101', status: 'READY' }
  }
];

export const mockKpiAnalytics = {
  incidentData: [
    { month: '2026-01', CRITICAL: 1, HIGH: 2, MEDIUM: 5, LOW: 10 },
    { month: '2026-02', CRITICAL: 0, HIGH: 3, MEDIUM: 4, LOW: 12 },
    { month: '2026-03', CRITICAL: 2, HIGH: 1, MEDIUM: 6, LOW: 8 },
    { month: '2026-04', CRITICAL: 0, HIGH: 0, MEDIUM: 3, LOW: 15 },
  ],
  riskData: mockFlights.slice(0, 10).map((f: any) => ({ name: f.flightNumber, risk: f.risk.totalScore })),
  fatigueData: Array.from({ length: 10 }).map((_, i) => ({ name: `Crew Log ${i}`, fatigue: Math.random() * 0.8 + 0.2 })),
  checklistData: mockFlights.slice(0, 10).map((f: any) => ({ name: f.flightNumber, rate: f.checklists[0].isComplete ? 100 : 50 }))
};

export const mockRiskMap = Array.from({ length: 5 }).map((_, i) => ({
  id: `flag-${i}`,
  coordinates: ['JFK', 'LAX', 'ORD', 'MIA', 'SEA'][i],
  reason: ['Thunderstorm Cell', 'Volcanic Ash', 'High Traffic Density', 'Military Airspace', 'Severe Turbulence'][i % 5]
}));

export const mockRouteTrends = [
  { origin: 'JFK', dest: 'LHR', frequency: 145, avgRisk: 3.2 },
  { origin: 'LAX', dest: 'HND', frequency: 120, avgRisk: 4.1 },
  { origin: 'DXB', dest: 'CDG', frequency: 95, avgRisk: 2.8 },
  { origin: 'SFO', dest: 'ORD', frequency: 80, avgRisk: 5.5 },
  { origin: 'FRA', dest: 'JFK', frequency: 65, avgRisk: 3.9 }
];
