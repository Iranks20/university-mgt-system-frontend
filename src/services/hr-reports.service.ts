import api from '@/lib/api';

export type HrReportExportType = 'headcount' | 'attendance' | 'appraisal' | 'onboarding';

function getApiBase(): string {
  return (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('kcu-token');
}

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
  return match?.[1] || fallback;
}

export const hrReportsService = {
  downloadExport: async (params: {
    type: HrReportExportType;
    date?: string;
    cycleId?: string;
  }): Promise<{ filename: string }> => {
    const query = new URLSearchParams({ type: params.type });
    if (params.date) query.set('date', params.date);
    if (params.cycleId) query.set('cycleId', params.cycleId);

    const token = getToken();
    const response = await fetch(`${getApiBase()}/hr/reports/export?${query.toString()}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const error = new Error(errorData.message || 'Export failed');
      (error as Error & { code?: string }).code = errorData.code;
      throw error;
    }

    const blob = await response.blob();
    const filename = parseFilename(
      response.headers.get('Content-Disposition'),
      `hr-${params.type}-export.csv`
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { filename };
  },
};

export async function getHrCyclesForReportFilter() {
  const { hrAppraisalService } = await import('@/services/hr-appraisal.service');
  return hrAppraisalService.getCycles();
}
