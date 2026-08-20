import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/services/opensky', () => ({
  openSky: { getStates: vi.fn() },
}));

import { openSky } from '../../src/lib/services/opensky';
import {
  validateFlightDetails,
  validateAircraftRegistration,
} from '../../src/lib/flight-validation';

const mockGetStates = openSky.getStates as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockGetStates.mockReset();
});

describe('validateAircraftRegistration', () => {
  test('accepts US N-numbers', () => {
    expect(validateAircraftRegistration('N789AA').valid).toBe(true);
    expect(validateAircraftRegistration('N12345').valid).toBe(true);
    expect(validateAircraftRegistration('n789aa').valid).toBe(true);
  });

  test('accepts common international prefixes', () => {
    for (const reg of ['G-ABCD', 'D-AABC', 'VH-ABC', 'EI-DUB', '9V-SKA', 'B-2048', 'JA1234']) {
      expect(validateAircraftRegistration(reg).valid, reg).toBe(true);
    }
  });

  test('rejects invalid formats', () => {
    for (const reg of ['123', '!!', 'G-', 'N12345678AB', 'ZZZZZZZZZZ', '']) {
      expect(validateAircraftRegistration(reg).valid, reg).toBe(false);
    }
  });
});

describe('validateFlightDetails', () => {
  test('rejects an unknown origin IATA code', async () => {
    mockGetStates.mockResolvedValue([]);
    const result = await validateFlightDetails('ZZZ', 'LAX', 'N789AA', 'AAL123');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Origin IATA');
    expect(result.source).toBe('local-airport-db');
  });

  test('rejects an unknown destination IATA code', async () => {
    mockGetStates.mockResolvedValue([]);
    const result = await validateFlightDetails('JFK', 'ZZZ', 'N789AA', 'AAL123');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Destination IATA');
  });

  test('rejects an invalid aircraft registration', async () => {
    mockGetStates.mockResolvedValue([]);
    const result = await validateFlightDetails('JFK', 'LAX', 'NOT-A-REG', 'AAL123');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('registration');
  });

  test('passes with airport metadata when no live match exists', async () => {
    mockGetStates.mockResolvedValue([
      {
        icao24: 'a1b2c3',
        callsign: 'UAL999 ',
        originCountry: 'United States',
      },
    ]);
    const result = await validateFlightDetails('JFK', 'LAX', 'N789AA', 'AAL123');
    expect(result.isValid).toBe(true);
    expect(result.source).toBe('local-airport-db');
    expect(result.origin?.name).toBeTruthy();
    expect(result.destination?.name).toBeTruthy();
    expect(result.aircraft?.isLiveCorroborated).toBe(false);
  });

  test('corroborates the flight against live OpenSky radar', async () => {
    mockGetStates.mockResolvedValue([
      {
        icao24: 'a1b2c3',
        callsign: 'AAL123 ',
        originCountry: 'United States',
      },
      {
        icao24: 'd4e5f6',
        callsign: 'UAL999',
        originCountry: 'Germany',
      },
    ]);
    const result = await validateFlightDetails('JFK', 'LAX', 'N789AA', 'AAL123');
    expect(result.isValid).toBe(true);
    expect(result.source).toBe('opensky-live');
    expect(result.aircraft?.isLiveCorroborated).toBe(true);
    expect(result.aircraft?.icao24).toBe('a1b2c3');
    expect(result.aircraft?.originCountry).toBe('United States');
    expect(result.aircraft?.countryOfRegistration).toBe('United States');
  });

  test('gracefully degrades when OpenSky is unavailable', async () => {
    mockGetStates.mockRejectedValue(new Error('Rate limit exceeded'));
    const result = await validateFlightDetails('JFK', 'LAX', 'N789AA', 'AAL123');
    expect(result.isValid).toBe(true);
    expect(result.source).toBe('local-airport-db');
    expect(result.aircraft?.isLiveCorroborated).toBe(false);
  });
});