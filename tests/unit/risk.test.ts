import { expect, test, vi, describe } from 'vitest';
import { calculateRisk } from '../../src/lib/risk';
import { Prisma } from '@prisma/client';

describe('calculateRisk Engine', () => {
  test('throws an error if the flight does not exist', async () => {
    const mockTx = {
      flights: {
        findUnique: vi.fn().mockResolvedValue(null)
      }
    } as unknown as Prisma.TransactionClient;

    await expect(calculateRisk('invalid-id', mockTx)).rejects.toThrow('Flight not found');
  });
  
  test('correctly aggregates fatigue and weather factors', async () => {
    const mockTx = {
      flights: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'flight-1',
          route: { baseRisk: 0.1 },
          crewUsers: [
            { shiftLogs: [{ fatigueIndex: 8 }] },
            { shiftLogs: [{ fatigueIndex: 6 }] }
          ],
          weather: [
            { severityIndex: 0.8 }
          ],
          incidents: [
            { severity: 'HIGH', resolved: false }
          ],
          checklists: []
        })
      },
      groundEquipment: {
        findMany: vi.fn().mockResolvedValue([])
      },
      riskCalculations: {
        upsert: vi.fn().mockImplementation((args: any) => Promise.resolve(args.create))
      }
    } as unknown as Prisma.TransactionClient;

    const result = await calculateRisk('flight-1', mockTx);

    // Fs = (8 + 6) / 2 = 7.0
    // Wi = 0.8
    // Md = 0.7 (from eq logic, but groundEquipment is mocked as []) => Md = 0 (no checklists)
    // Actually, WEIGHTS are: w1: 0.3, w2: 0.4, w3: 0.3
    // Rc = (0.3 * 7.0) + (0.4 * 0.8) + (0.3 * 0) = 2.1 + 0.32 + 0 = 2.42
    
    // Total is calculated directly in calculateRisk as totalScore = w1*Fs + w2*Wi + w3*Md
    // So total = 2.42
    
    expect(result.calc.totalScore).toBeCloseTo(2.42, 2);
    expect(result.isCritical).toBe(true);
    expect(result.blockingReason).toBe('Critical overall risk score.');
  });

  test('handles zero crew correctly without NaN', async () => {
    const mockTx = {
      flights: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'flight-1',
          route: { baseRisk: 0.1 },
          crewUsers: [],
          weather: [],
          incidents: [],
          checklists: []
        })
      },
      groundEquipment: {
        findMany: vi.fn().mockResolvedValue([])
      },
      riskCalculations: {
        upsert: vi.fn().mockImplementation((args: any) => Promise.resolve(args.create))
      }
    } as unknown as Prisma.TransactionClient;

    const result = await calculateRisk('flight-1', mockTx);

    // Fs = 0, Wi = 0, Md = 0. Total = 0.0
    expect(result.calc.totalScore).toBeCloseTo(0.0, 2);
    expect(result.isCritical).toBe(false);
  });
});
