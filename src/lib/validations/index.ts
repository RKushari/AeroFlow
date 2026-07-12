import { z } from 'zod';

export const ApproveDispatchSchema = z.object({
  flightId: z.string().uuid(),
});

export const ChecklistUpdateSchema = z.object({
  checklistId: z.string().uuid(),
  itemId: z.string().uuid(),
  isComplete: z.boolean(),
  notes: z.string().optional(),
});

export const ReportIncidentSchema = z.object({
  description: z.string().min(10),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});
