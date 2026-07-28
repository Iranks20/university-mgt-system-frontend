import type { GraduationCommitteeMeta, GraduationCommitteeType, CommitteeWorkspaceSection } from './types';

export const GRADUATION_ROUTES = {
  dashboard: '/graduation/dashboard',
  event: '/graduation/event',
  committees: '/graduation/committees',
  registrations: '/graduation/registrations',
  committee: (slug: string) => `/graduation/committees?committee=${slug}`,
} as const;

export const GRADUATION_COMMITTEES: GraduationCommitteeMeta[] = [
  {
    type: 'steering',
    slug: 'steering',
    name: 'Executive Steering Committee',
    shortName: 'Steering',
    description: 'Oversees the event, budget approval, dates, and guest speakers.',
    canViewRegistrations: true,
  },
  {
    type: 'finance',
    slug: 'finance',
    name: 'Finance Committee',
    shortName: 'Finance',
    description: 'Budget, sponsorships, fees, and expense tracking.',
    canViewRegistrations: false,
  },
  {
    type: 'venue',
    slug: 'venue',
    name: 'Event Planning & Venue Committee',
    shortName: 'Venue',
    description: 'Venue booking, stage layout, seating, caterers, and photographers.',
    canViewRegistrations: false,
  },
  {
    type: 'program',
    slug: 'program',
    name: 'Program & Awards Committee',
    shortName: 'Program',
    description: 'Ceremony flow, speakers, music, prayer, and certificate presentation.',
    canViewRegistrations: false,
  },
  {
    type: 'logistics',
    slug: 'logistics',
    name: 'Logistics & Security Committee',
    shortName: 'Logistics',
    description: 'Traffic, parking, venue access, crowd control, and safety.',
    canViewRegistrations: false,
  },
  {
    type: 'seating',
    slug: 'seating',
    name: 'Registration & Seating Committee',
    shortName: 'Seating',
    description: 'Invitations, tickets, entry points, and guest or VIP seating.',
    canViewRegistrations: true,
  },
  {
    type: 'av',
    slug: 'av',
    name: 'Technical & Audio-Visual Committee',
    shortName: 'AV',
    description: 'Sound, screens, lighting, and live streaming.',
    canViewRegistrations: false,
  },
  {
    type: 'decor',
    slug: 'decor',
    name: 'Decorations & Stage Setup Committee',
    shortName: 'Decor',
    description: 'Theme, colours, flowers, banners, and stage dressing.',
    canViewRegistrations: false,
  },
  {
    type: 'media',
    slug: 'media',
    name: 'Documentation & Media Committee',
    shortName: 'Media',
    description: 'Photography, video, press, and the printed program booklet.',
    canViewRegistrations: false,
  },
];

export const GRADUATION_COMMITTEE_BY_SLUG = Object.fromEntries(
  GRADUATION_COMMITTEES.map((c) => [c.slug, c])
) as Record<string, GraduationCommitteeMeta>;

export const GRADUATION_COMMITTEE_BY_TYPE = Object.fromEntries(
  GRADUATION_COMMITTEES.map((c) => [c.type, c])
) as Record<GraduationCommitteeType, GraduationCommitteeMeta>;

export const DEFAULT_CHECKLISTS: Record<GraduationCommitteeType, string[]> = {
  steering: [
    'Confirm ceremony date and venue',
    'Approve overall budget',
    'Confirm guest speaker(s)',
    'Review all committee progress',
    'Sign off final run sheet',
  ],
  finance: [
    'Draft event budget',
    'Confirm sponsorship commitments',
    'Set graduand or guest fee amounts',
    'Track major expenses (venue, food, decor)',
    'Reconcile spending against budget',
  ],
  venue: [
    'Book and confirm venue',
    'Agree stage and seating layout',
    'Book caterer',
    'Book photographer or videographer',
    'Walk-through venue before ceremony',
  ],
  program: [
    'Draft ceremony order of events',
    'Confirm speakers and introductions',
    'Arrange music and prayer',
    'Coordinate certificate presentation',
    'Finalise printed program content',
  ],
  logistics: [
    'Plan parking and traffic flow',
    'Assign venue access points',
    'Coordinate security team',
    'Prepare emergency contacts',
    'Brief ushers and crowd control',
  ],
  seating: [
    'Design invitation or ticket template',
    'Issue invitations to guests and VIPs',
    'Assign entry points and ushers',
    'Prepare seating plan',
    'Confirm VIP seating on the day',
  ],
  av: [
    'Test microphones and sound system',
    'Set up projection and large screens',
    'Confirm live-stream link',
    'Check venue lighting',
    'Run AV check during rehearsal',
  ],
  decor: [
    'Agree theme and colour palette',
    'Order flowers and banners',
    'Set up stage backdrop',
    'Dress graduate seating area',
    'Final walk-through of décor',
  ],
  media: [
    'Assign official photographers',
    'Plan video coverage',
    'Coordinate press or communications',
    'Produce graduation program booklet',
    'Collect and archive official photos',
  ],
};

export const GRADUATION_EVENT_STATUS_LABELS: Record<string, string> = {
  Planning: 'Planning',
  Confirmed: 'Confirmed',
  Completed: 'Completed',
};

export function committeeWorkspaceSections(type: GraduationCommitteeType): CommitteeWorkspaceSection[] {
  if (type === 'finance') return ['members', 'expenses'];
  if (type === 'decor' || type === 'venue' || type === 'av' || type === 'media') {
    return ['members', 'suppliers'];
  }
  return ['members', 'activities'];
}

export const COMMITTEE_SECTION_LABELS: Record<CommitteeWorkspaceSection, string> = {
  members: 'Members',
  expenses: 'Expenses',
  suppliers: 'Vendors & suppliers',
  activities: 'Tasks & activities',
};
