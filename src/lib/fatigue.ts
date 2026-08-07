export interface FatigueEvaluationInput {
  startTime?: Date;
  wakeTime?: Date | string | null;
  workDurationHours: number;
  alertnessScore: number; // 1 (exhausted) to 10 (fully alert)
}

export interface FatigueEvaluationResult {
  hoursAwake: number;
  fatigueIndex: number; // 1.0 - 10.0
  isFlagged: boolean;
  flagReason: string | null;
  severity: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
}

/**
 * Calculates a crew member's Fatigue Index (1.0 to 10.0) based on working patterns
 * and checks if the shift record exceeds predefined safety boundaries.
 */
export function calculateFatigueIndex(input: FatigueEvaluationInput): FatigueEvaluationResult {
  const now = input.startTime ? new Date(input.startTime) : new Date();
  
  let hoursAwake = 8; // Default estimate if wake time not provided
  if (input.wakeTime) {
    const wakeDate = new Date(input.wakeTime);
    if (!isNaN(wakeDate.getTime())) {
      const diffMs = now.getTime() - wakeDate.getTime();
      hoursAwake = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
    }
  }

  const workHours = Math.max(0, input.workDurationHours || 0);
  const alertness = Math.min(10, Math.max(1, Math.round(input.alertnessScore || 5)));

  // Inverse alertness factor: 1 (alert) -> 10 (sleepy)
  const alertnessInverted = 11 - alertness;

  // Weighted Fatigue calculation formula:
  // Base score starts from wakefulness, continuous work hours, and self-reported alertness
  const rawScore = (hoursAwake * 0.25) + (workHours * 0.45) + (alertnessInverted * 0.45);
  
  // Clamp between 1.0 and 10.0 rounded to 1 decimal place
  const fatigueIndex = Math.min(10.0, Math.max(1.0, Math.round(rawScore * 10) / 10));

  // Determine safety boundary flags & reasons
  const flagReasons: string[] = [];
  
  if (fatigueIndex >= 8.5) {
    flagReasons.push(`Critical Fatigue Index (${fatigueIndex}/10)`);
  } else if (fatigueIndex >= 7.0) {
    flagReasons.push(`High Fatigue Index (${fatigueIndex}/10)`);
  }

  if (workHours >= 12) {
    flagReasons.push(`Excessive shift duration (${workHours} hrs >= 12 hrs limit)`);
  }

  if (hoursAwake >= 16) {
    flagReasons.push(`Extended wakefulness (${hoursAwake} hrs awake >= 16 hrs threshold)`);
  }

  if (alertness <= 3) {
    flagReasons.push(`Low alertness score (${alertness}/10)`);
  }

  const isFlagged = flagReasons.length > 0;
  const flagReason = isFlagged ? flagReasons.join(' | ') : null;

  let severity: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NORMAL';
  if (fatigueIndex >= 8.5 || workHours >= 14) {
    severity = 'CRITICAL';
  } else if (fatigueIndex >= 7.0 || workHours >= 12 || hoursAwake >= 16) {
    severity = 'HIGH';
  } else if (fatigueIndex >= 5.0 || workHours >= 8) {
    severity = 'ELEVATED';
  }

  return {
    hoursAwake,
    fatigueIndex,
    isFlagged,
    flagReason,
    severity,
  };
}
