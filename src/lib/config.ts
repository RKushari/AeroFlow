import { db } from "./db";

/**
 * Gets a configuration value from the SystemConfig table, falling back to a default value.
 */
export async function getSystemConfig(key: string, defaultValue: string): Promise<string> {
  try {
    const config = await db.systemConfig.findUnique({
      where: { key },
    });
    return config ? config.value : defaultValue;
  } catch (error) {
    // Fallback if client generator is not yet updated or DB call fails
    return defaultValue;
  }
}

/**
 * Retrieves the system-wide safety/risk threshold, default 0.75.
 */
export async function getRiskThreshold(): Promise<number> {
  const valueStr = await getSystemConfig("RISK_THRESHOLD", "0.75");
  const parsed = parseFloat(valueStr);
  return isNaN(parsed) ? 0.75 : parsed;
}
