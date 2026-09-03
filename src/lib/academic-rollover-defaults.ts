export type ClassListMode = 'clone-from-term' | 'from-curriculum';

export type RegistrationPolicy = 'auto' | 'hybrid' | 'self' | 'none';

export type PanelRegistrationPolicy = Exclude<RegistrationPolicy, 'none'>;

export const DEFAULT_CLASS_LIST_MODE: ClassListMode = 'clone-from-term';

export const DEFAULT_REGISTRATION_POLICY: RegistrationPolicy = 'auto';

export const DEFAULT_PANEL_REGISTRATION_POLICY: PanelRegistrationPolicy = 'auto';

export const DEFAULT_SKIP_CLASS_LISTS = false;

export const DEFAULT_SKIP_PROMOTE = false;

export const DEFAULT_SKIP_REGISTER = false;

export const DEFAULT_INCLUDE_UNSCOPED_ACTIVE_CLASSES = true;

export const SELECT_UNSET = '__unset__';

export function toOptionalSelectValue(value: string): string {
  return value || SELECT_UNSET;
}

export function fromOptionalSelectValue(value: string): string {
  return value === SELECT_UNSET ? '' : value;
}

export function hasOptionalSelectValue(value: string): boolean {
  return value !== '' && value !== SELECT_UNSET;
}
