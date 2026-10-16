import type { OrgUnitNode } from '@/services/organization.service';

export type OfficeOption = { id: string; label: string };

export function buildOfficeOptions(units: OrgUnitNode[]): OfficeOption[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const pathOf = (unit: OrgUnitNode): string => {
    const names: string[] = [];
    let current: OrgUnitNode | undefined = unit;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      if (current.unitType !== 'Governance' && current.unitType !== 'SchoolGroup') names.unshift(current.name);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return names.join(' › ');
  };
  return units
    .filter((u) => u.isActive && u.unitType !== 'SchoolGroup' && u.unitType !== 'Governance')
    .map((u) => ({ id: u.id, label: pathOf(u) || u.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
