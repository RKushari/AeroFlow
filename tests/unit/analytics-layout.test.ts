import { describe, expect, it } from 'vitest';
import { normalizeDashboardLayout } from '../../src/app/director/analytics/layout-utils';

describe('normalizeDashboardLayout', () => {
  it('adds the incident widget back when a user layout omits it', () => {
    expect(normalizeDashboardLayout(['risk', 'fatigue'])).toEqual(['incidents', 'risk', 'fatigue']);
  });

  it('preserves the user-selected widgets while keeping incidents visible', () => {
    expect(normalizeDashboardLayout(['checklists', 'risk'])).toEqual(['incidents', 'checklists', 'risk']);
  });
});
