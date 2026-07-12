import { z } from 'zod';
import { Severity, FlightStatus } from '@prisma/client';

export const ShiftLogSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  fatigueIndex: z.number().min(0).max(1),
});

export const ChecklistItemUpdateSchema = z.object({
  itemId: z.string().uuid(),
  isComplete: z.boolean(),
});

export const IncidentReportSchema = z.object({
  flightId: z.string().uuid(),
  severity: z.nativeEnum(Severity),
  description: z.string().min(10),
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
