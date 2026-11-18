import { describe, expect, it } from 'vitest';
import { buildSidebar, folderIdForPath, usesQaLayout } from '@/lib/sidebar-nav';

// Permissions of a Quality Assurance user (QA account type / QA Officer position).
const QA = [
  'academic.program_intakes', 'academic.read', 'academic.venues', 'academic.venues_manage', 'analytics.core_dashboard',
  'analytics.lecturer_shared', 'cancellations.decide', 'cancellations.queue', 'enrollment.class_read', 'enrollment.preview',
  'enrollment.read', 'graduation.access', 'graduation.committee', 'graduation.manage', 'graduation.registrations',
  'notifications.self', 'qa.import', 'qa.review', 'qa.seed_timetable', 'qa.write', 'settings.read', 'staff.record_read',
  'students.read', 'substitutions.decide', 'substitutions.queue', 'timetable.lecturer_me', 'timetable.ops',
  'timetable.student_view',
];

const shape = (perms: string[]) =>
  buildSidebar(perms).map((i) => (i.type === 'folder' ? `${i.label} [${i.children.map((c) => c.label).join(', ')}]` : i.label));

describe('Quality Assurance sidebar', () => {
  it('keeps the production layout QA staff are used to', () => {
    expect(shape(QA)).toEqual([
      'Dashboard',
      'Graduation [Dashboard, Event setup, Committees, Registrations]',
      'Timetable',
      'Timetable Builder',
      'Lecture Records',
      'Cancellations',
      'Student Records',
      'Reports',
      'Venues',
    ]);
  });

  it('shows Graduation pages flat when QA has only one, and drops it when QA has none', () => {
    const noGraduation = QA.filter((p) => !p.startsWith('graduation.'));
    expect(shape(noGraduation)).toEqual([
      'Dashboard', 'Timetable', 'Timetable Builder', 'Lecture Records', 'Cancellations', 'Student Records', 'Reports', 'Venues',
    ]);
  });

  it('opens the Graduation folder on a graduation page', () => {
    expect(folderIdForPath(buildSidebar(QA), '/graduation/committees')).toBe('graduation');
  });

  it('applies only to QA staff, not heads of department, management or admins', () => {
    expect(usesQaLayout(QA)).toBe(true);
    expect(usesQaLayout(['qa.review', 'reports.access'])).toBe(false);
    expect(usesQaLayout([...QA, 'analytics.mgmt_overview'])).toBe(false);
    expect(usesQaLayout([...QA, 'admin.console'])).toBe(false);
  });

  it('still lists a menu outside the earlier layout instead of hiding it', () => {
    const items = buildSidebar([...QA, 'hr.read']);
    const flat = items.flatMap((i) => (i.type === 'folder' ? i.children.map((c) => c.path) : [i.path]));
    expect(flat).toContain('/hr/dashboard');
  });
});
