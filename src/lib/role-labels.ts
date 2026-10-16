export const SYSTEM_ACCOUNT_ROLES = [
  'QA',
  'QAClinicals',
  'ClinicalCoordinator',
  'Staff',
  'HR',
  'Timekeeper',
  'Management',
  'Admin',
] as const;

export type SystemAccountRole = (typeof SYSTEM_ACCOUNT_ROLES)[number];

export function formatRoleLabel(role: string): string {
  switch (role) {
    case 'QA':
      return 'QA (University)';
    case 'QAClinicals':
      return 'QA Clinicals';
    case 'ClinicalCoordinator':
      return 'Clinical Coordinator';
    case 'Management':
      return 'Management';
    case 'Admin':
      return 'Admin';
    case 'Staff':
      return 'Staff';
    case 'HR':
      return 'HR Officer';
    case 'Graduation':
      return 'Graduation Management';
    case 'Timekeeper':
      return 'Timekeeper';
    case 'Lecturer':
      return 'Lecturer';
    case 'Student':
      return 'Student';
    default:
      return role;
  }
}
