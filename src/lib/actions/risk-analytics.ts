'use server';

import { db } from "@/lib/db";
import { mockFlights, mockAlerts } from "@/lib/mock-data";

export async function getDashboardStats() {
  const flights = await db.flights.count({
    where: { status: { notIn: ['CANCELLED'] } }
  });
  
  const totalAlerts = await db.alertLogs.count();
  let alertsCount = 0;

  if (totalAlerts === 0) {
    alertsCount = mockAlerts.filter(a => !a.read && (String(a.severity) === 'HIGH' || String(a.severity) === 'CRITICAL')).length;
  } else {
    alertsCount = await db.alertLogs.count({
      where: { severity: { in: ['HIGH', 'CRITICAL'] }, read: false }
    });
  }

  return {
    flightsCount: flights > 0 ? flights : mockFlights.length,
    alertsCount
  };
}

export async function getCombinedRiskFactors() {
  let risks = await db.riskCalculations.findMany();
  
  if (risks.length === 0) {
    risks = mockFlights.map((f: any) => f.risk) as any;
  }

  const sums = risks.reduce((acc, curr) => ({
    total: acc.total + curr.totalScore,
    fatigue: acc.fatigue + curr.fatigueFactor,
    weather: acc.weather + curr.weatherFactor,
    mech: acc.mech + curr.mechFactor
  }), { total: 0, fatigue: 0, weather: 0, mech: 0 });

  return {
    totalAverage: sums.total / risks.length,
    fatigueAverage: sums.fatigue / risks.length,
    weatherAverage: sums.weather / risks.length,
    mechAverage: sums.mech / risks.length,
    count: risks.length
  };
}
