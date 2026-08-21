import { z } from 'zod';
import { Severity, FlightStatus } from '@prisma/client';

export const ShiftLogSchema = z.object({
  flightId: z.string().optional(),
  wakeTime: z.string().optional().nullable(),
  workDurationHours: z.number().min(0).max(24),
  alertnessScore: z.number().min(1).max(10),
  fatigueIndex: z.number().min(1).max(10).optional(),
});

export const ShiftLogUpdateSchema = z.object({
  logId: z.string(),
  wakeTime: z.string().optional().nullable(),
  workDurationHours: z.number().min(0).max(24),
  alertnessScore: z.number().min(1).max(10),
});

export const ChecklistItemUpdateSchema = z.object({
  itemId: z.string().uuid(),
  isComplete: z.boolean(),
});

export const IncidentReportSchema = z.object({
  flightId: z.string().optional().nullable(),
  type: z.string().min(2).default('OTHER'),
  severity: z.nativeEnum(Severity),
  description: z.string().min(5, 'Description must be at least 5 characters.'),
});

export const RapidGroundIncidentSchema = z.object({
  flightId: z.string().optional().nullable(),
  type: z.string().min(2, 'Incident type is required.'),
  severity: z.nativeEnum(Severity),
  description: z.string().min(5, 'Description must be at least 5 characters.'),
});

export const UpdateIncidentResolutionSchema = z.object({
  incidentId: z.string().min(1, 'Incident ID is required.'),
  resolutionNotes: z.string().min(3, 'Resolution notes must be at least 3 characters.'),
  resolved: z.boolean(),
});

export const DispatchApprovalSchema = z.object({
  flightId: z.string().uuid(),
});

export const ManualOverrideSchema = z.object({
  flightId: z.string().uuid(),
  justification: z.string().min(20, 'Justification must be detailed (at least 20 chars).'),
});

export const AiBriefingSchema = z.object({
  flightId: z.string().uuid(),
  finalContent: z.string().min(50),
});
