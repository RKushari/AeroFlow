const DEFAULT_LAYOUT = ['incidents', 'risk', 'fatigue', 'checklists'] as const;
const VALID_WIDGETS = new Set<string>(DEFAULT_LAYOUT);

export function normalizeDashboardLayout(layout?: string[] | null): string[] {
  if (!Array.isArray(layout) || layout.length === 0) {
    return [...DEFAULT_LAYOUT];
  }

  const normalized = layout.filter((id): id is string => typeof id === 'string' && VALID_WIDGETS.has(id));

  if (!normalized.includes('incidents')) {
    normalized.unshift('incidents');
  }

  return normalized.filter((id, index) => normalized.indexOf(id) === index);
}
