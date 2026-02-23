import api from '@/lib/api';
import type { Report, ReportFilter } from '@/types';

export const reportService = {
  generateReport: async (
    type: Report['type'] | string,
    title: string,
    filters: ReportFilter,
    data: unknown
  ): Promise<Report> => {
    try {
      return await api.post<Report>('/reports', {
        type,
        title,
        filters,
        data,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  getReports: async (type?: string): Promise<Report[]> => {
    try {
      const params = type ? { type } : {};
      return await api.get<Report[]>('/reports', params);
    } catch (error) {
      console.error('Error fetching reports:', error);
      return [];
    }
  },

  getReportById: async (id: string): Promise<Report | null> => {
    try {
      return await api.get<Report>(`/reports/${id}`);
    } catch (error) {
      console.error('Error fetching report:', error);
      return null;
    }
  },

  deleteReport: async (id: string): Promise<void> => {
    try {
      await api.delete(`/reports/${id}`);
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  exportReport: async (type: string, format: 'excel' | 'pdf' | 'csv', dateRange?: { start: string; end: string }): Promise<{ downloadUrl: string; filename: string; expiresAt: string }> => {
    try {
      const response = await api.post<any>('/reports/export', {
        type,
        format,
        dateRange,
      });
      return response?.data ?? response;
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  },

  downloadReport: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://16.171.234.222:3000/api/v1'}/reports/${id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('kcu-token')}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  },
};
