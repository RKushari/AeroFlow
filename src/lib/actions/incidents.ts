'use server';

import { db } from '../db';
import { requireRole } from '../auth';
import { calculateRisk } from '../risk';
import { RapidGroundIncidentSchema, UpdateIncidentResolutionSchema } from '../validations';
import { Prisma, Severity } from '@prisma/client';
import { eventBus } from '../events';

async function logAudit(userId: string, action: string, resourceId: string, oldState: any, newState: any, tx: Prisma.TransactionClient = db) {
  await tx.auditLedger.create({
    data: {
      userId,
      action,
      resourceId,
      oldState,
      newState,
    }
  });
}

export async function createGroundIncident(data: {
  flightId?: string | null;
  type: string;
  description: string;
  severity: Severity;
}) {
  const session = await requireRole(['GROUND_CREW_LEAD', 'FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  const parsed = RapidGroundIncidentSchema.parse(data);

  return await db.$transaction(async (tx) => {
    // 1. Create incident record
    const incident = await tx.incidents.create({
      data: {
        flightId: parsed.flightId || null,
        reporterId: session.user.id,
        type: parsed.type,
        description: parsed.description,
        severity: parsed.severity,
        resolved: false,
      },
      include: {
        reporter: true,
        flight: true,
      }
    });

    // 2. Create alert log entry in DB for persistent alert history
    const flightText = incident.flight ? ` (Flight ${incident.flight.flightNumber})` : '';
    const alertMessage = `GROUND INCIDENT [${incident.type}]${flightText}: ${incident.description}`;
    
    await tx.alertLogs.create({
      data: {
        message: alertMessage,
        severity: parsed.severity,
        read: false,
      }
    });

    // 3. Recalculate flight risk if flightId was provided
    if (parsed.flightId) {
      try {
        await calculateRisk(parsed.flightId, tx);
      } catch (err) {
        console.warn('Risk calculation failed on incident log:', err);
      }
    }

    // 4. Record audit entry
    await logAudit(
      session.user.id,
      'GROUND_INCIDENT_REPORTED',
      incident.id,
      null,
      { type: parsed.type, severity: parsed.severity, flightId: parsed.flightId },
      tx
    );

    // 5. Emit real-time SSE push alert to active dispatchers
    eventBus.emit('alert_broadcast', {
      type: 'INCIDENT_REPORTED',
      incidentId: incident.id,
      flightId: parsed.flightId || incident.flight?.flightNumber || 'GROUND-ZONE',
      incidentType: parsed.type,
      severity: parsed.severity,
      description: parsed.description,
      reporterName: session.user.name || session.user.email || 'Ground Crew Operator',
      timestamp: new Date().toISOString(),
    });

    return incident;
  });
}

export async function updateIncidentResolution(data: {
  incidentId: string;
  resolutionNotes: string;
  resolved: boolean;
}) {
  const session = await requireRole(['GROUND_CREW_LEAD', 'FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  const parsed = UpdateIncidentResolutionSchema.parse(data);

  return await db.$transaction(async (tx) => {
    const existing = await tx.incidents.findUnique({
      where: { id: parsed.incidentId },
    });

    if (!existing) {
      throw new Error('Incident not found');
    }

    const updated = await tx.incidents.update({
      where: { id: parsed.incidentId },
      data: {
        resolutionNotes: parsed.resolutionNotes,
        resolved: parsed.resolved,
        resolvedAt: parsed.resolved ? new Date() : null,
        resolvedById: session.user.id,
      },
      include: {
        reporter: true,
        resolvedBy: true,
        flight: true,
      }
    });

    // Recalculate flight risk if attached to a flight
    if (existing.flightId) {
      try {
        await calculateRisk(existing.flightId, tx);
      } catch (err) {
        console.warn('Risk recalculation error during resolution:', err);
      }
    }

    // Record audit entry
    await logAudit(
      session.user.id,
      parsed.resolved ? 'INCIDENT_CLOSED' : 'INCIDENT_RESOLUTION_UPDATED',
      updated.id,
      { resolved: existing.resolved, resolutionNotes: existing.resolutionNotes },
      { resolved: updated.resolved, resolutionNotes: updated.resolutionNotes },
      tx
    );

    // Emit real-time broadcast of resolution status
    eventBus.emit('alert_broadcast', {
      type: 'INCIDENT_RESOLVED',
      incidentId: updated.id,
      flightId: updated.flightId || updated.flight?.flightNumber || 'GROUND-ZONE',
      incidentType: updated.type,
      resolved: updated.resolved,
      resolutionNotes: updated.resolutionNotes,
      resolverName: session.user.name || session.user.email || 'Supervisor',
      timestamp: new Date().toISOString(),
    });

    return updated;
  });
}

export async function getIncidents(filter?: {
  flightId?: string;
  resolved?: boolean;
  severity?: Severity;
}) {
  await requireRole(['GROUND_CREW_LEAD', 'FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  const whereClause: Prisma.IncidentsWhereInput = {};

  if (filter?.flightId) whereClause.flightId = filter.flightId;
  if (filter?.resolved !== undefined) whereClause.resolved = filter.resolved;
  if (filter?.severity) whereClause.severity = filter.severity;

  const incidents = await db.incidents.findMany({
    where: whereClause,
    include: {
      reporter: {
        select: { id: true, name: true, email: true, role: true }
      },
      resolvedBy: {
        select: { id: true, name: true, email: true, role: true }
      },
      flight: {
        select: { id: true, flightNumber: true, status: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return incidents;
}

export async function getGroundIncidentStats() {
  await requireRole(['GROUND_CREW_LEAD', 'FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  const [total, open, critical, resolved] = await Promise.all([
    db.incidents.count(),
    db.incidents.count({ where: { resolved: false } }),
    db.incidents.count({ where: { resolved: false, severity: 'CRITICAL' } }),
    db.incidents.count({ where: { resolved: true } }),
  ]);

  const recentUnresolved = await db.incidents.findMany({
    where: { resolved: false },
    include: {
      reporter: { select: { name: true, email: true } },
      flight: { select: { flightNumber: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return {
    total,
    open,
    critical,
    resolved,
    recentUnresolved
  };
}
