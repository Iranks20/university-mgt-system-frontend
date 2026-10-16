import api from '@/lib/api';

export type OrgUnitType =
  | 'Governance'
  | 'Office'
  | 'Directorate'
  | 'Department'
  | 'Unit'
  | 'Post'
  | 'SchoolGroup'
  | 'School';

export const EDITABLE_UNIT_TYPES: Array<{ value: Exclude<OrgUnitType, 'School' | 'SchoolGroup'>; label: string }> = [
  { value: 'Office', label: 'Office' },
  { value: 'Directorate', label: 'Directorate' },
  { value: 'Department', label: 'Department' },
  { value: 'Unit', label: 'Unit' },
  { value: 'Post', label: 'Post (single position)' },
  { value: 'Governance', label: 'Governance body' },
];

export type OrgAppointment = {
  id: string;
  orgUnitId: string;
  staffId: string;
  staffName: string;
  staffNumber: string;
  jobTitle: string;
  title: string;
  isHead: boolean;
  isActing: boolean;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  unitName?: string;
  unitType?: OrgUnitType;
};

export type OrgAcademicDepartment = {
  id: string;
  name: string;
  code: string;
  levelName: string;
  headStaffId: string | null;
  headName: string | null;
  headIsActing: boolean;
  staffCount: number;
};

export type OrgUnitNode = {
  id: string;
  code: string;
  name: string;
  unitType: OrgUnitType;
  parentId: string | null;
  schoolId: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isOnChart: boolean;
  isSystem: boolean;
  headTitle: string | null;
  isVacant: boolean;
  heads: OrgAppointment[];
  members: OrgAppointment[];
  homeStaffCount: number;
  departments: OrgAcademicDepartment[];
};

export type OrgTree = {
  units: OrgUnitNode[];
  summary: {
    unitCount: number;
    vacantCount: number;
    appointmentCount: number;
    unplacedStaffCount: number;
  };
};

export type OrgUnitStaffMember = {
  id: string;
  staffNumber: string;
  name: string;
  email: string;
  role: string;
  staffCategory: string;
  academicRankLabel: string | null;
  placement: string | null;
  status: string;
};

export type UnitInput = {
  name: string;
  unitType: Exclude<OrgUnitType, 'School' | 'SchoolGroup'>;
  parentId: string | null;
  headTitle?: string | null;
  description?: string | null;
  isActive?: boolean;
  isOnChart?: boolean;
};

export type AppointmentInput = {
  staffId: string;
  orgUnitId: string;
  title: string;
  isHead: boolean;
  isActing: boolean;
  startDate?: string | null;
  endDate?: string | null;
};

const BASE = '/hr/organization';

export const organizationService = {
  getTree: () => api.get<OrgTree>(`${BASE}/tree`),

  createUnit: (input: UnitInput) => api.post<OrgUnitNode>(`${BASE}/units`, input),

  updateUnit: (id: string, input: Partial<UnitInput> & { sortOrder?: number }) =>
    api.put<OrgUnitNode>(`${BASE}/units/${id}`, input),

  deleteUnit: (id: string) => api.delete<{ success: boolean }>(`${BASE}/units/${id}`),

  reorderUnits: (parentId: string | null, orderedIds: string[]) =>
    api.put<{ success: boolean }>(`${BASE}/units/reorder`, { parentId, orderedIds }),

  getUnitStaff: (id: string, includeDescendants = false) =>
    api.get<{ staff: OrgUnitStaffMember[]; appointments: OrgAppointment[] }>(`${BASE}/units/${id}/staff`, {
      includeDescendants,
    }),

  getUnplacedStaff: () =>
    api.get<Array<{ id: string; staffNumber: string; name: string; role: string; staffCategory: string }>>(
      `${BASE}/unplaced-staff`
    ),

  getStaffAppointments: (staffId: string) =>
    api.get<OrgAppointment[]>(`${BASE}/staff/${staffId}/appointments`),

  createAppointment: (input: AppointmentInput) => api.post<OrgAppointment>(`${BASE}/appointments`, input),

  updateAppointment: (id: string, input: Partial<Omit<AppointmentInput, 'staffId' | 'orgUnitId'>> & { isActive?: boolean }) =>
    api.put<OrgAppointment>(`${BASE}/appointments/${id}`, input),

  deleteAppointment: (id: string) => api.delete<{ success: boolean }>(`${BASE}/appointments/${id}`),

  setDepartmentHead: (departmentId: string, headStaffId: string | null, isActing: boolean) =>
    api.put(`${BASE}/departments/${departmentId}/head`, { headStaffId, isActing }),
};
