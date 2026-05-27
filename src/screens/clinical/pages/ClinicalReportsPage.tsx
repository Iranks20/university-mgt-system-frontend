import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { clinicalService, studentService } from '@/services';
import { ReportsSection } from '../ReportsSection';

export default function ClinicalReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportType = searchParams.get('report') || 'daily-student-register';

  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<any[]>([]);
  const [rotations, setRotations] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  const setReportType = (report: string) => {
    setSearchParams({ report }, { replace: true });
  };

  const loadFilterOptions = useCallback(async () => {
    setLoading(true);
    try {
      const [sitesRes, rotationsRes, directoryRes, studentsRes, programsRes] = await Promise.all([
        clinicalService.getSites({ page: 1, limit: 200, status: 'active' }),
        clinicalService.getRotations({ page: 1, limit: 200 }),
        clinicalService.getInstructorDirectory({ page: 1, limit: 200, scope: 'all' }),
        studentService.getStudents({ page: 1, limit: 200 }),
        clinicalService.getClinicalPrograms(),
      ]);
      setSites(sitesRes.data || []);
      setRotations(rotationsRes.data || []);
      setInstructors(
        (directoryRes.data || [])
          .filter((row: any) => row.clinicalInstructorId)
          .map((row: any) => ({
            id: row.clinicalInstructorId as string,
            fullName: row.fullName as string,
          }))
      );
      setStudents(studentsRes.data || []);
      setPrograms(Array.isArray(programsRes) ? programsRes : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load report filters');
      setSites([]);
      setRotations([]);
      setInstructors([]);
      setStudents([]);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Clinical Reports</h1>
          <p className="text-gray-500">
            Generate and export attendance registers, teaching sessions, and summary reports for clinical QA.
          </p>
        </div>
      </div>

      <ReportsSection
        filtersLoading={loading}
        reportType={reportType}
        onReportTypeChange={setReportType}
        sites={sites}
        rotations={rotations}
        instructors={instructors}
        students={students}
        programs={programs}
      />
    </div>
  );
}
