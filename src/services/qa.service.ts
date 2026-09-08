import api from '@/lib/api';
import type { QALectureRecord, QALecturerSummary, QASchoolSummary, QALecturerSummaryReport, QAFilter, QALecturerRecord, QACourseUnitSummary } from '@/types/qa';
import { isLectureTaught, isLectureUntaught, mapImportStatusToComment } from '@/lib/lecture-outcome';
import type { DeliveryMode } from '@/lib/delivery-mode';
import { parseTimeLostToMinutes, resolveLectureTimeLost } from '@/lib/lecture-time-metrics';

async function fetchAllClassNames(params?: {
  schoolId?: string;
  academicTermId?: string;
  classStatus?: 'active' | 'inactive' | 'all';
}): Promise<string[]> {
  const names = new Set<string>();
  let page = 1;
  let total = Infinity;
  const pageSize = 200;

  while ((page - 1) * pageSize < total) {
    const query: Record<string, string> = {
      page: String(page),
      limit: String(pageSize),
    };
    if (params?.schoolId) query.schoolId = params.schoolId;
    if (params?.academicTermId) query.academicTermId = params.academicTermId;
    if (params?.classStatus) query.classStatus = params.classStatus;

    const res = await api.get<
      Array<{ name: string }> | { data: Array<{ name: string }>; total?: number }
    >('/academic/classes', query);

    const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    total = Array.isArray(res) ? rows.length : typeof res?.total === 'number' ? res.total : rows.length;

    for (const row of rows) {
      if (row?.name?.trim()) names.add(row.name.trim());
    }

    if (rows.length === 0) break;
    page += 1;
    if (page > 50) break;
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

function toDateQueryParam(value?: Date | string): string | undefined {
  if (!value) return undefined;
  return typeof value === 'string' ? value : value.toISOString().split('T')[0];
}

function buildLectureRecordQueryParams(
  filter?: QAFilter,
  options?: { includePaging?: boolean }
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  if (!filter) return params;

  const startDate = toDateQueryParam(filter.startDate);
  const endDate = toDateQueryParam(filter.endDate);
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (filter.school) params.school = filter.school;
  if (filter.department) params.department = filter.department;
  if (filter.lecturerName) params.lecturerName = filter.lecturerName;
  if (filter.courseCode) params.courseCode = filter.courseCode;
  if (filter.class) params.class = filter.class;
  if (filter.search) params.search = filter.search;
  if (filter.comment) params.comment = filter.comment;
  if (filter.checkInStatus) params.checkInStatus = filter.checkInStatus;
  if (filter.status) params.status = filter.status;
  if (filter.deliveryMode) params.deliveryMode = filter.deliveryMode;
  if (filter.academicTermId) params.academicTermId = filter.academicTermId;

  if (options?.includePaging !== false) {
    if (filter.page) params.page = filter.page;
    if (filter.limit) params.limit = filter.limit;
    if (filter.sortBy) params.sortBy = filter.sortBy;
    if (filter.sortOrder) params.sortOrder = filter.sortOrder;
  }

  return params;
}

function unwrapLectureRecordPage(
  response: QALectureRecord[] | { data?: QALectureRecord[]; total?: number }
): { data: QALectureRecord[]; total: number } {
  if (Array.isArray(response)) {
    return { data: response, total: response.length };
  }
  const data = Array.isArray(response?.data) ? response.data : [];
  return {
    data,
    total: typeof response?.total === 'number' ? response.total : data.length,
  };
}

function withLectureRecordClassName(records: QALectureRecord[]): QALectureRecord[] {
  return records.map((record) => ({
    ...record,
    class: record.class || (record as { className?: string }).className || '',
  }));
}

export const qaService = {
  getLectureRecords: async (filter?: QAFilter): Promise<QALectureRecord[] | { data: QALectureRecord[]; total: number; page: number; pageSize: number }> => {
    try {
      const params = buildLectureRecordQueryParams(filter);
      const response = await api.get<QALectureRecord[] | { data: QALectureRecord[]; total: number; page: number; pageSize: number }>('/qa/lecture-records', params);
      return response;
    } catch (error) {
      console.error('Error fetching lecture records:', error);
      return { data: [], total: 0, page: 1, pageSize: 0 };
    }
  },

  fetchAllLectureRecords: async (filter?: QAFilter): Promise<QALectureRecord[]> => {
    const pageSize = 500;
    const all: QALectureRecord[] = [];
    let page = 1;
    let total = Infinity;

    while ((page - 1) * pageSize < total) {
      const params = buildLectureRecordQueryParams({
        ...filter,
        page,
        limit: pageSize,
        sortBy: filter?.sortBy ?? 'date',
        sortOrder: filter?.sortOrder ?? 'desc',
      });
      const response = await api.get<
        QALectureRecord[] | { data: QALectureRecord[]; total: number; page: number; pageSize: number }
      >('/qa/lecture-records', params);
      const { data, total: nextTotal } = unwrapLectureRecordPage(response);
      total = nextTotal;
      all.push(...withLectureRecordClassName(data));
      if (data.length === 0) break;
      page += 1;
      if (page > 200) break;
    }

    return all;
  },

  getLectureRecordsSummary: async (filter?: QAFilter): Promise<{
    totalRecords: number;
    taughtCount: number;
    untaughtCount: number;
    pendingCount: number;
    substitutedCount: number;
    compensationCount: number;
    missedByLecturerCount: number;
    missedByStudentsCount: number;
    missedOtherProgramsHolidaysCount: number;
    assignmentCount: number;
    sdlCount: number;
    onTimeCount: number;
    lateCount: number;
    lecturerAbsentCount: number;
    earlyDepartureCount: number;
    onTimeRatePct: number;
    hasFilters: boolean;
  }> => {
    try {
      const params = buildLectureRecordQueryParams(filter, { includePaging: false });
      const response = await api.get<any>('/qa/lecture-records-summary', params);
      const data = (response as any)?.data ?? response;
      return {
        totalRecords: Number(data?.totalRecords ?? 0),
        taughtCount: Number(data?.taughtCount ?? 0),
        untaughtCount: Number(data?.untaughtCount ?? 0),
        pendingCount: Number(data?.pendingCount ?? 0),
        substitutedCount: Number(data?.substitutedCount ?? 0),
        compensationCount: Number(data?.compensationCount ?? 0),
        missedByLecturerCount: Number(data?.missedByLecturerCount ?? 0),
        missedByStudentsCount: Number(data?.missedByStudentsCount ?? 0),
        missedOtherProgramsHolidaysCount: Number(data?.missedOtherProgramsHolidaysCount ?? 0),
        assignmentCount: Number(data?.assignmentCount ?? 0),
        sdlCount: Number(data?.sdlCount ?? 0),
        onTimeCount: Number(data?.onTimeCount ?? 0),
        lateCount: Number(data?.lateCount ?? 0),
        lecturerAbsentCount: Number(data?.lecturerAbsentCount ?? 0),
        earlyDepartureCount: Number(data?.earlyDepartureCount ?? 0),
        onTimeRatePct: Number(data?.onTimeRatePct ?? 0),
        hasFilters: Boolean(data?.hasFilters ?? false),
      };
    } catch (error) {
      console.error('Error fetching lecture records summary:', error);
      return {
        totalRecords: 0,
        taughtCount: 0,
        untaughtCount: 0,
        pendingCount: 0,
        substitutedCount: 0,
        compensationCount: 0,
        missedByLecturerCount: 0,
        missedByStudentsCount: 0,
        missedOtherProgramsHolidaysCount: 0,
        assignmentCount: 0,
        sdlCount: 0,
        onTimeCount: 0,
        lateCount: 0,
        lecturerAbsentCount: 0,
        earlyDepartureCount: 0,
        onTimeRatePct: 0,
        hasFilters: false,
      };
    }
  },

  /**
   * Get current lecturer's own lecture records (for Lecturer dashboard).
   */
  getMyLectureRecords: async (): Promise<{ data: QALectureRecord[]; total: number }> => {
    try {
      const response = await api.get<{ data: QALectureRecord[]; total: number }>('/qa/me/lecture-records');
      const data = Array.isArray(response) ? response : (response as { data?: QALectureRecord[] })?.data ?? [];
      const total = typeof response === 'object' && response !== null && 'total' in response ? (response as any).total : data.length;
      return { data, total };
    } catch (error) {
      console.error('Error fetching my lecture records:', error);
      return { data: [], total: 0 };
    }
  },

  /**
   * Create a new lecture record
   */
  createLectureRecord: async (record: Omit<QALectureRecord, 'date'> & { date?: Date | string }): Promise<QALectureRecord> => {
    try {
      const payload = {
        ...record,
        date: record.date ? (typeof record.date === 'string' ? record.date : record.date.toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      };
      return await api.post<QALectureRecord>('/qa/lecture-records', payload);
    } catch (error) {
      console.error('Error creating lecture record:', error);
      throw error;
    }
  },

  /**
   * Update an existing lecture record
   */
  updateLectureRecord: async (id: string, updates: Partial<QALectureRecord>): Promise<QALectureRecord> => {
    try {
      const payload = {
        ...updates,
        date: updates.date ? (typeof updates.date === 'string' ? updates.date : updates.date.toISOString().split('T')[0]) : undefined,
      };
      return await api.put<QALectureRecord>(`/qa/lecture-records/${id}`, payload);
    } catch (error) {
      console.error('Error updating lecture record:', error);
      throw error;
    }
  },

  /**
   * Delete a lecture record
   */
  deleteLectureRecord: async (id: string): Promise<void> => {
    try {
      await api.delete(`/qa/lecture-records/${id}`);
    } catch (error) {
      console.error('Error deleting lecture record:', error);
      throw error;
    }
  },

  getLecturerSummaryReport: async (
    school?: string,
    params?: {
      dateFrom?: string;
      dateTo?: string;
      className?: string;
      courseUnit?: string;
      lecturerName?: string;
      department?: string;
    }
  ): Promise<QALecturerSummaryReport[]> => {
    try {
      const query: Record<string, string> = {};
      if (school) query.school = school;
      if (params?.dateFrom) query.dateFrom = params.dateFrom;
      if (params?.dateTo) query.dateTo = params.dateTo;
      if (params?.className) query.className = params.className;
      if (params?.courseUnit) query.courseUnit = params.courseUnit;
      if (params?.lecturerName) query.lecturerName = params.lecturerName;
      if (params?.department) query.department = params.department;
      const response = await api.get<QALecturerSummaryReport[]>('/qa/lecturer-summary-report', query);
      return Array.isArray(response) ? response : (response as { data?: QALecturerSummaryReport[] })?.data ?? [];
    } catch (error) {
      console.error('Error fetching lecturer summary report:', error);
      return [];
    }
  },

  getCourseUnitSummaryReport: async (
    school?: string,
    params?: {
      dateFrom?: string;
      dateTo?: string;
      className?: string;
      courseUnit?: string;
      lecturerName?: string;
      department?: string;
    }
  ): Promise<QACourseUnitSummary[]> => {
    try {
      const query: Record<string, string> = {};
      if (school) query.school = school;
      if (params?.dateFrom) query.dateFrom = params.dateFrom;
      if (params?.dateTo) query.dateTo = params.dateTo;
      if (params?.className) query.className = params.className;
      if (params?.courseUnit) query.courseUnit = params.courseUnit;
      if (params?.lecturerName) query.lecturerName = params.lecturerName;
      if (params?.department) query.department = params.department;
      const response = await api.get<QACourseUnitSummary[]>('/qa/course-unit-summary-report', query);
      return Array.isArray(response) ? response : (response as { data?: QACourseUnitSummary[] })?.data ?? [];
    } catch (error) {
      console.error('Error fetching course unit summary report:', error);
      return [];
    }
  },

  /**
   * Get school summary report (1.csv format)
   */
  getSchoolSummaryReport: async (params?: { dateFrom?: string; dateTo?: string }): Promise<QASchoolSummary[]> => {
    try {
      const query = params?.dateFrom && params?.dateTo ? { dateFrom: params.dateFrom, dateTo: params.dateTo } : {};
      const raw = await api.get<QASchoolSummary[] | { data: QASchoolSummary[] }>('/qa/school-summary-report', query as Record<string, string>);
      return Array.isArray(raw) ? raw : (raw as { data?: QASchoolSummary[] })?.data ?? [];
    } catch (error) {
      console.error('Error fetching school summary report:', error);
      return [];
    }
  },

  getReconciliationReport: async (dateFrom: string, dateTo: string, schoolId?: string, courseId?: string): Promise<{
    timetableId: string;
    classId: string;
    className: string;
    date: string;
    startTime: unknown;
    endTime: unknown;
    venue: string;
    lecturerName: string;
    outcome: string;
    scheduled: boolean;
    substituteLecturerName?: string | null;
  }[]> => {
    try {
      const params: Record<string, string> = { dateFrom, dateTo };
      if (schoolId) params.schoolId = schoolId;
      if (courseId) params.courseId = courseId;
      const raw = await api.get<unknown>('/qa/reconciliation-report', params);
      const arr = Array.isArray(raw) ? raw : (raw as { data?: unknown[] })?.data ?? [];
      return arr as { timetableId: string; classId: string; className: string; date: string; startTime: unknown; endTime: unknown; venue: string; lecturerName: string; outcome: string; scheduled: boolean; substituteLecturerName?: string | null }[];
    } catch (error) {
      console.error('Error fetching reconciliation report:', error);
      return [];
    }
  },

  getCompensationTrackingReport: async (dateFrom: string, dateTo: string): Promise<{
    cancelledSessions: number;
    compensationSessions: number;
    uncompensatedCancellations: Array<{
      id: string;
      requestId: string;
      timetableId: string;
      classId: string;
      date: string;
      className: string;
      courseUnit: string;
      lecturerName: string;
      status: string;
    }>;
    compensatedCancellations: Array<{
      id: string;
      requestId: string;
      timetableId: string;
      classId: string;
      date: string;
      className: string;
      courseUnit: string;
      lecturerName: string;
      status: string;
      compensationSessions: Array<{
        id: string;
        date: string;
        startTime: string;
        endTime: string;
        venue: string;
        className: string;
      }>;
    }>;
  }> => {
    const raw = await api.get<unknown>('/qa/compensation-tracking-report', { dateFrom, dateTo });
    const data = (raw as { data?: unknown })?.data ?? raw;
    return data as {
      cancelledSessions: number;
      compensationSessions: number;
      uncompensatedCancellations: Array<{ id: string; requestId: string; timetableId: string; classId: string; date: string; className: string; courseUnit: string; lecturerName: string; status: string }>;
      compensatedCancellations: Array<{ id: string; requestId: string; timetableId: string; classId: string; date: string; className: string; courseUnit: string; lecturerName: string; status: string; compensationSessions: Array<{ id: string; date: string; startTime: string; endTime: string; venue: string; className: string }> }>;
    };
  },

  /**
   * Import lecture records from CSV data
   */
  importLectureRecords: async (records: QALectureRecord[]): Promise<void> => {
    try {
      await api.post('/qa/lecture-records/import', records);
    } catch (error) {
      console.error('Error importing lecture records:', error);
      throw error;
    }
  },

  seedLectureRecordsFromTimetable: async (date: string): Promise<{ created: number; skipped: number }> => {
    return await api.post<{ created: number; skipped: number }>('/qa/lecture-records/seed-from-timetable', {
      date,
    });
  },

  /**
   * Create a record (legacy method for backward compatibility)
   * Converts QALecturerRecord to QALectureRecord format
   */
  createRecord: async (record: QALecturerRecord): Promise<QALecturerRecord> => {
    // Convert to QALectureRecord format
    const timeMatch = record.scheduledTime?.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    const startTime = timeMatch ? timeMatch[1] + ':00' : '08:00:00';
    const endTime = timeMatch ? timeMatch[2] + ':00' : '10:00:00';
    
    // Calculate duration from check-in/check-out if available, otherwise from scheduled times
    let duration: string;
    let lessonTimeout: string | undefined;
    
    if (record.actualStartTime && record.actualEndTime) {
      const diff = record.actualEndTime.getTime() - record.actualStartTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      lessonTimeout = duration;
    } else {
      const parseTime = (timeStr: string): number => {
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
          return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        return 0;
      };
      const durationMinutes = parseTime(endTime) - parseTime(startTime);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    }
    
    // Map status to comment
    const statusToComment = mapImportStatusToComment;
    
    // Format check-in/check-out times
    const formatTime = (date?: Date): string | undefined => {
      if (!date) return undefined;
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    };
    
    const lectureRecord: QALectureRecord = {
      date: record.scheduledDate,
      lecturerName: record.lecturerName,
      class: record.courseCode || 'N/A',
      courseUnit: record.courseName,
      timeForStarting: startTime,
      timeOutForEnding: endTime,
      duration: duration,
      timeLost: '0',
      comment: statusToComment(record.status),
      checkInTime: formatTime(record.actualStartTime),
      checkOutTime: formatTime(record.actualEndTime),
      checkInTimestamp: record.actualStartTime,
      checkOutTimestamp: record.actualEndTime,
      lessonTimeout: lessonTimeout,
    };
    
    // Also create the lecture record
    await qaService.createLectureRecord(lectureRecord);
    
    // Return the original record for backward compatibility
    return record;
  },

  /**
   * Get all schools
   */
  getSchools: async (): Promise<string[]> => {
    try {
      const schools = await api.get<Array<{ name: string }>>('/academic/schools');
      return schools.map(s => s.name);
    } catch (error) {
      console.error('Error fetching schools:', error);
      return [];
    }
  },

  /**
   * Get classes for a specific school
   * Maps classes to schools based on lecturer summary data and common patterns
   */
  getClassesBySchool: async (
    school: string,
    params?: { academicTermId?: string; classStatus?: 'active' | 'inactive' | 'all' }
  ): Promise<string[]> => {
    try {
      const schools = await api.get<Array<{ id: string; name: string }>>('/academic/schools');
      const schoolList = Array.isArray(schools) ? schools : (schools as any)?.data ?? [];
      const schoolObj = schoolList.find((s: { name: string }) => s.name === school);
      if (!schoolObj) return [];

      return fetchAllClassNames({
        schoolId: schoolObj.id,
        academicTermId: params?.academicTermId,
        classStatus: params?.classStatus,
      });
    } catch (error) {
      console.error('Error fetching classes by school:', error);
      return [];
    }
  },

  /**
   * Get all unique classes (across all schools)
   */
  getAllClasses: async (
    params?: { academicTermId?: string; classStatus?: 'active' | 'inactive' | 'all' }
  ): Promise<string[]> => {
    try {
      return fetchAllClassNames({
        academicTermId: params?.academicTermId,
        classStatus: params?.classStatus,
      });
    } catch (error) {
      console.error('Error fetching all classes:', error);
      return [];
    }
  },

  getLecturerAssignments: async (lecturerId: string): Promise<{
    lecturerId: string;
    departments: Array<{
      id: string;
      name: string;
      classes: Array<{ id: string; label: string; className: string; courseUnit: string; courseId: string | null; deliveryMode?: DeliveryMode }>;
    }>;
  } | null> => {
    try {
      const res = await api.get<any>('/qa/lecturer-assignments', { lecturerId });
      const data = (res as any)?.data ?? res;
      return data;
    } catch (error) {
      console.error('Error fetching lecturer assignments:', error);
      return null;
    }
  },

  /**
   * Calculate statistics from lecture records
   */
  calculateStatistics: async (records: QALectureRecord[]): Promise<{
    totalRecords: number;
    totalTaught: number;
    totalUntaught: number;
    totalCompensation: number;
    totalTimeLost: string;
  }> => {
    const totalRecords = records.length;
    const totalTaught = records.filter((r) => isLectureTaught(r.comment)).length;
    const totalUntaught = records.filter((r) => isLectureUntaught(r.comment)).length;
    const totalCompensation = records.filter(r => r.comment === 'COMPENSATION').length;
    
    const totalMinutes = records.reduce(
      (sum, r) => sum + parseTimeLostToMinutes(resolveLectureTimeLost(r)),
      0
    );
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes % 1) * 60);
    const totalTimeLost = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return {
      totalRecords,
      totalTaught,
      totalUntaught,
      totalCompensation,
      totalTimeLost,
    };
  },

  getTodayRecordForClass: async (classId: string): Promise<QALectureRecord | null> => {
    try {
      const record = await api.get<QALectureRecord | null>('/qa/me/today-record', { classId });
      return record ?? null;
    } catch (error) {
      console.error('Error fetching today record for class:', error);
      return null;
    }
  },

  getTodayRecords: async (): Promise<QALectureRecord[]> => {
    try {
      const raw = await api.get<QALectureRecord[]>('/qa/me/today-records');
      return Array.isArray(raw) ? raw : [];
    } catch (error) {
      console.error('Error fetching today records:', error);
      return [];
    }
  },

  checkIn: async (classId: string, latitude: number, longitude: number): Promise<{ record: QALectureRecord & { _alreadyCheckedIn?: boolean }; alreadyCheckedIn?: boolean }> => {
    const record = await api.post<QALectureRecord & { _alreadyCheckedIn?: boolean }>('/qa/check-in', { classId, latitude, longitude });
    return {
      record: record as QALectureRecord & { _alreadyCheckedIn?: boolean },
      alreadyCheckedIn: !!(record as any)?._alreadyCheckedIn,
    };
  },

  checkOut: async (classId: string): Promise<QALectureRecord> => {
    return await api.post<QALectureRecord>('/qa/check-out', { classId });
  },

  updateCheckOut: async (recordId: string, checkOutTime: string): Promise<QALectureRecord> => {
    return await api.put<QALectureRecord>(`/qa/lecture-records/${recordId}/check-out`, { checkOutTime });
  },
};
