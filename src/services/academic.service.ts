import api from '@/lib/api';
import type { School, Level, Department, Course, Class, Venue } from '@/types';

export const academicService = {
  getSchools: async (): Promise<School[]> => {
    try {
      return await api.get<School[]>('/academic/schools');
    } catch (error) {
      console.error('Error fetching schools:', error);
      return [];
    }
  },

  getSchoolById: async (id: string): Promise<School | null> => {
    try {
      return await api.get<School>(`/academic/schools/${id}`);
    } catch (error) {
      console.error('Error fetching school:', error);
      return null;
    }
  },

  getSchoolStats: async (id: string): Promise<{ studentCount: number; staffCount: number } | null> => {
    try {
      return await api.get<{ studentCount: number; staffCount: number }>(`/academic/schools/${id}/stats`);
    } catch (error) {
      console.error('Error fetching school stats:', error);
      return null;
    }
  },

  createSchool: async (school: Omit<School, 'id'>): Promise<School> => {
    try {
      return await api.post<School>('/academic/schools', school);
    } catch (error) {
      console.error('Error creating school:', error);
      throw error;
    }
  },

  updateSchool: async (id: string, school: Partial<School>): Promise<School> => {
    try {
      return await api.put<School>(`/academic/schools/${id}`, school);
    } catch (error) {
      console.error('Error updating school:', error);
      throw error;
    }
  },

  deleteSchool: async (id: string): Promise<void> => {
    try {
      await api.delete(`/academic/schools/${id}`);
    } catch (error) {
      console.error('Error deleting school:', error);
      throw error;
    }
  },

  getLevels: async (schoolId?: string): Promise<Level[]> => {
    try {
      const params = schoolId ? { schoolId } : {};
      const res = await api.get<Level[] | { data: Level[] }>('/academic/levels', params);
      const raw = Array.isArray(res) ? res : (res as { data: Level[] })?.data;
      return Array.isArray(raw) ? raw : [];
    } catch (error) {
      console.error('Error fetching levels:', error);
      return [];
    }
  },

  getLevelById: async (id: string): Promise<Level | null> => {
    try {
      const res = await api.get<Level | { data: Level }>(`/academic/levels/${id}`);
      const data = res && typeof res === 'object' && 'data' in res ? (res as { data: Level }).data : res;
      return data as Level ?? null;
    } catch (error) {
      console.error('Error fetching level:', error);
      return null;
    }
  },

  createLevel: async (level: Omit<Level, 'id'>): Promise<Level> => {
    try {
      return await api.post<Level>('/academic/levels', level);
    } catch (error) {
      console.error('Error creating level:', error);
      throw error;
    }
  },

  updateLevel: async (id: string, level: Partial<Level>): Promise<Level> => {
    try {
      return await api.put<Level>(`/academic/levels/${id}`, level);
    } catch (error) {
      console.error('Error updating level:', error);
      throw error;
    }
  },

  deleteLevel: async (id: string): Promise<void> => {
    try {
      await api.delete(`/academic/levels/${id}`);
    } catch (error) {
      console.error('Error deleting level:', error);
      throw error;
    }
  },

  getDepartments: async (schoolId?: string, levelId?: string): Promise<Department[]> => {
    try {
      const params: Record<string, string> = {};
      if (schoolId) params.schoolId = schoolId;
      if (levelId) params.levelId = levelId;
      const res = await api.get<Department[] | { data: Department[] }>('/academic/departments', params);
      const raw = Array.isArray(res) ? res : (res as { data: Department[] })?.data;
      return Array.isArray(raw) ? raw : [];
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  },

  getDepartmentById: async (id: string): Promise<Department | null> => {
    try {
      return await api.get<Department>(`/academic/departments/${id}`);
    } catch (error) {
      console.error('Error fetching department:', error);
      return null;
    }
  },

  createDepartment: async (department: Omit<Department, 'id'>): Promise<Department> => {
    try {
      return await api.post<Department>('/academic/departments', department);
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  },

  updateDepartment: async (id: string, department: Partial<Department>): Promise<Department> => {
    try {
      return await api.put<Department>(`/academic/departments/${id}`, department);
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  },

  deleteDepartment: async (id: string): Promise<void> => {
    try {
      await api.delete(`/academic/departments/${id}`);
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  },

  getPrograms: async (departmentId?: string): Promise<any[]> => {
    try {
      const params = departmentId ? { departmentId } : {};
      return await api.get<any[]>('/academic/programs', params);
    } catch (error) {
      console.error('Error fetching programs:', error);
      return [];
    }
  },

  getProgramById: async (id: string): Promise<any | null> => {
    try {
      return await api.get<any>(`/academic/programs/${id}`);
    } catch (error) {
      console.error('Error fetching program:', error);
      return null;
    }
  },

  createProgram: async (program: { name: string; code: string; departmentId: string; duration?: number; description?: string }): Promise<any> => {
    try {
      return await api.post<any>('/academic/programs', program);
    } catch (error) {
      console.error('Error creating program:', error);
      throw error;
    }
  },

  updateProgram: async (id: string, program: Partial<{ name: string; code: string; departmentId: string; duration?: number; description?: string }>): Promise<any> => {
    try {
      return await api.put<any>(`/academic/programs/${id}`, program);
    } catch (error) {
      console.error('Error updating program:', error);
      throw error;
    }
  },

  deleteProgram: async (id: string): Promise<void> => {
    try {
      await api.delete(`/academic/programs/${id}`);
    } catch (error) {
      console.error('Error deleting program:', error);
      throw error;
    }
  },

  getCourses: async (params?: { departmentId?: string; programId?: string; level?: number; semester?: number; page?: number; limit?: number }): Promise<{ data: Course[]; total: number; page: number; pageSize: number }> => {
    try {
      const query = new URLSearchParams();
      if (params?.departmentId) query.set('departmentId', params.departmentId);
      if (params?.programId) query.set('programId', params.programId);
      if (params?.level != null) query.set('level', String(params.level));
      if (params?.semester != null) query.set('semester', String(params.semester));
      if (params?.page != null) query.set('page', String(params.page));
      if (params?.limit != null) query.set('limit', String(params.limit));
      const res = await api.get<{ data: Course[]; total: number; page: number; pageSize: number }>('/academic/courses' + (query.toString() ? '?' + query.toString() : ''));
      return { data: res?.data ?? [], total: res?.total ?? 0, page: res?.page ?? 1, pageSize: res?.pageSize ?? 20 };
    } catch (error) {
      console.error('Error fetching courses:', error);
      return { data: [], total: 0, page: 1, pageSize: 20 };
    }
  },

  moveCourses: async (payload: { courseIds: string[]; targetProgramId?: string | null; targetDepartmentId: string; targetLevel: number; targetSemester: number }): Promise<{ moved: number }> => {
    try {
      const res = await api.post<{ data: { moved: number } }>('/academic/courses/move', payload);
      return (res as any)?.data ?? res ?? { moved: 0 };
    } catch (error) {
      console.error('Error moving courses:', error);
      throw error;
    }
  },

  getCourseById: async (id: string): Promise<Course | null> => {
    try {
      return await api.get<Course>(`/academic/courses/${id}`);
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  },

  createCourse: async (course: Omit<Course, 'id'>): Promise<Course> => {
    try {
      return await api.post<Course>('/academic/courses', course);
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  },

  updateCourse: async (id: string, course: Partial<Course>): Promise<Course> => {
    try {
      return await api.put<Course>(`/academic/courses/${id}`, course);
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  },

  deleteCourse: async (id: string): Promise<void> => {
    try {
      await api.delete(`/academic/courses/${id}`);
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  },

  getClasses: async (params?: { courseId?: string; schoolId?: string; page?: number; limit?: number }): Promise<{ data: Class[]; total: number; page: number; pageSize: number }> => {
    try {
      const query = new URLSearchParams();
      if (params?.courseId) query.set('courseId', params.courseId);
      if (params?.schoolId) query.set('schoolId', params.schoolId);
      if (params?.page != null) query.set('page', String(params.page));
      if (params?.limit != null) query.set('limit', String(params.limit));
      const res = await api.get<{ data: Class[]; total: number; page: number; pageSize: number }>('/academic/classes' + (query.toString() ? '?' + query.toString() : ''));
      return { data: res?.data ?? [], total: res?.total ?? 0, page: res?.page ?? 1, pageSize: res?.pageSize ?? 20 };
    } catch (error) {
      console.error('Error fetching classes:', error);
      return { data: [], total: 0, page: 1, pageSize: 20 };
    }
  },

  getClassById: async (id: string): Promise<Class | null> => {
    try {
      return await api.get<Class>(`/academic/classes/${id}`);
    } catch (error) {
      console.error('Error fetching class:', error);
      return null;
    }
  },

  createClass: async (classData: Omit<Class, 'id'>): Promise<Class> => {
    try {
      return await api.post<Class>('/academic/classes', classData);
    } catch (error) {
      console.error('Error creating class:', error);
      throw error;
    }
  },

  getVenues: async (params?: { page?: number; limit?: number }): Promise<{ data: Venue[]; total: number; page: number; pageSize: number }> => {
    try {
      const query = new URLSearchParams();
      if (params?.page != null) query.set('page', String(params.page));
      if (params?.limit != null) query.set('limit', String(params.limit));
      const res = await api.get<{ data: Venue[]; total: number; page: number; pageSize: number }>('/academic/venues' + (query.toString() ? '?' + query.toString() : ''));
      return { data: res?.data ?? [], total: res?.total ?? 0, page: res?.page ?? 1, pageSize: res?.pageSize ?? 20 };
    } catch (error) {
      console.error('Error fetching venues:', error);
      return { data: [], total: 0, page: 1, pageSize: 20 };
    }
  },

  getVenueById: async (id: string): Promise<Venue | null> => {
    try {
      return await api.get<Venue>(`/academic/venues/${id}`);
    } catch (error) {
      console.error('Error fetching venue:', error);
      return null;
    }
  },

  createVenue: async (venue: Omit<Venue, 'id'>): Promise<Venue> => {
    try {
      return await api.post<Venue>('/academic/venues', venue);
    } catch (error) {
      console.error('Error creating venue:', error);
      throw error;
    }
  },

  getTimetable: async (): Promise<any[]> => {
    try {
      const response = await api.get<{ data: any[] }>('/academic/timetable');
      return Array.isArray(response) ? response : response?.data ?? [];
    } catch (error) {
      console.error('Error fetching timetable:', error);
      return [];
    }
  },

  getCurrentClass: async (): Promise<{ id: string; course: string; code: string; venue: string; time: string; lecturer: string } | null> => {
    try {
      const response = await api.get<any>('/academic/current-class');
      return response ?? null;
    } catch (error) {
      console.error('Error fetching current class:', error);
      return null;
    }
  },

  updateVenue: async (id: string, venue: Partial<Venue>): Promise<Venue> => {
    try {
      return await api.put<Venue>(`/academic/venues/${id}`, venue);
    } catch (error) {
      console.error('Error updating venue:', error);
      throw error;
    }
  },

  deleteVenue: async (id: string): Promise<void> => {
    try {
      await api.delete(`/academic/venues/${id}`);
    } catch (error) {
      console.error('Error deleting venue:', error);
      throw error;
    }
  },

  updateClass: async (id: string, classData: Partial<Class>): Promise<Class> => {
    try {
      return await api.put<Class>(`/academic/classes/${id}`, classData);
    } catch (error) {
      console.error('Error updating class:', error);
      throw error;
    }
  },

  deleteClass: async (id: string): Promise<void> => {
    try {
      await api.delete(`/academic/classes/${id}`);
    } catch (error) {
      console.error('Error deleting class:', error);
      throw error;
    }
  },

  // Academic Calendar
  getCalendarEvents: async (): Promise<any[]> => {
    try {
      const response = await api.get<any>('/academic/calendar');
      return Array.isArray(response) ? response : response?.data ?? [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  },

  createCalendarEvent: async (event: { name: string; type: string; startDate: string; endDate: string; status?: string; description?: string }): Promise<any> => {
    try {
      return await api.post<any>('/academic/calendar', event);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  },

  updateCalendarEvent: async (id: string, event: Partial<{ name: string; type: string; startDate: string; endDate: string; status?: string; description?: string }>): Promise<any> => {
    try {
      return await api.put<any>(`/academic/calendar/${id}`, event);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  },

  deleteCalendarEvent: async (id: string): Promise<void> => {
    try {
      await api.delete(`/academic/calendar/${id}`);
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  },

  getDepartmentStats: async (id: string): Promise<{ headOfDepartment: { id: string; name: string } | null; staffCount: number; studentCount: number; attendanceRate: number; status: string }> => {
    try {
      return await api.get<any>(`/academic/departments/${id}/stats`);
    } catch (error) {
      console.error('Error fetching department stats:', error);
      throw error;
    }
  },
};
