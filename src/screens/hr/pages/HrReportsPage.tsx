import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Users, ClipboardCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { getApiErrorMessage } from '@/lib/api';
import {
  getHrCyclesForReportFilter,
  hrReportsService,
  type HrReportExportType,
} from '@/services/hr-reports.service';
import type { HrAppraisalCycle } from '@/features/hr/types';

type ReportCard = {
  id: HrReportExportType;
  title: string;
  description: string;
  icon: typeof Users;
};

const REPORTS: ReportCard[] = [
  {
    id: 'headcount',
    title: 'Staff Headcount Report',
    description: 'Employees by school, department, category, and employment type',
    icon: Users,
  },
  {
    id: 'attendance',
    title: 'Daily Attendance Register',
    description: 'Check-in summary, late arrivals, and absences for a selected date',
    icon: FileText,
  },
  {
    id: 'appraisal',
    title: 'Appraisal Completion Report',
    description: 'Cycle progress, ratings, and archive titles',
    icon: ClipboardCheck,
  },
  {
    id: 'onboarding',
    title: 'Onboarding Status Report',
    description: 'Probation and recent hires (≤90 days)',
    icon: UserPlus,
  },
];

export default function HrReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [cycles, setCycles] = useState<HrAppraisalCycle[]>([]);
  const [cycleId, setCycleId] = useState<string>('active');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    getHrCyclesForReportFilter()
      .then((rows) => setCycles(rows))
      .catch(() => setCycles([]));
  }, []);

  const handleExport = async (report: ReportCard) => {
    setGenerating(report.id);
    try {
      const result = await hrReportsService.downloadExport({
        type: report.id,
        date: report.id === 'attendance' ? attendanceDate : undefined,
        cycleId: report.id === 'appraisal' && cycleId !== 'active' ? cycleId : undefined,
      });
      toast.success(`Downloaded ${result.filename}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Export failed'));
    } finally {
      setGenerating(null);
    }
  };

  return (
    <HrPageShell title="HR Reports" description="Workforce CSV exports">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Attendance date</CardTitle>
            <CardDescription>Used by the daily attendance register export</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="attendance-date" className="sr-only">
              Attendance date
            </Label>
            <Input
              id="attendance-date"
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Appraisal cycle</CardTitle>
            <CardDescription>Optional — defaults to the latest available cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={cycleId} onValueChange={setCycleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Latest available cycle</SelectItem>
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.name} ({cycle.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <r.icon className="h-5 w-5 text-[#015F2B]" />
                <CardTitle className="text-base">{r.title}</CardTitle>
              </div>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button
                variant="outline"
                className="w-full"
                disabled={generating === r.id}
                onClick={() => handleExport(r)}
              >
                <Download className="h-4 w-4 mr-2" />
                {generating === r.id ? 'Generating…' : 'Export CSV'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </HrPageShell>
  );
}
