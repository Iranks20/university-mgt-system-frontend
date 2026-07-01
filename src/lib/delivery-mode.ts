export type DeliveryMode = 'InPerson' | 'Online' | 'Hybrid';

export const DELIVERY_MODE_OPTIONS: Array<{ value: DeliveryMode; label: string }> = [
  { value: 'InPerson', label: 'Physical (in-person)' },
  { value: 'Online', label: 'Online' },
  { value: 'Hybrid', label: 'Hybrid' },
];

export function deliveryModeLabel(mode?: string | null): string {
  const match = DELIVERY_MODE_OPTIONS.find((option) => option.value === mode);
  return match?.label ?? 'Physical (in-person)';
}

export function normalizeDeliveryMode(mode?: string | null): DeliveryMode {
  if (mode === 'Online' || mode === 'Hybrid') return mode;
  return 'InPerson';
}
