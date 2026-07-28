import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Users, CalendarOff, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { HrPageShell } from '@/components/hr/HrPageShell';

const REPORTS = [
  {
    id: 'headcount',
    title: 'Staff Headcount Report',
    description: 'Employees by school, department, category, and employment type',
    icon: Users,
  },
  {
    id: 'leave',
    title: 'Leave Utilization Report',
    description: 'Leave taken, balances, and pending requests by period',
    icon: CalendarOff,
  },
  {
    id: 'attendance',
    title: 'Monthly Attendance Register',
    description: 'Check-in summary, late arrivals, and absences',
    icon: FileText,
  },
  {
    id: 'appraisal',
    title: 'Appraisal Completion Report',
    description: 'Cycle progress, ratings distribution, and overdue reviews',
    icon: ClipboardCheck,
  },
  {
    id: 'onboarding',
    title: 'Onboarding Status Report',
    description: 'New hires and checklist completion rates',
    icon: Users,
  },
  {
    id: 'contracts',
    title: 'Contract Expiry Report',
    description: 'Contracts and appointment letters due for renewal',
    icon: FileText,
  },
];

export default function HrReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleExport = async (id: string, title: string) => {
    setGenerating(id);
    await new Promise((r) => setTimeout(r, 800));
    setGenerating(null);
    toast.success(`${title} exported (demo CSV)`);
  };

  return (
    <HrPageShell
      title="HR Reports"
      description="Standard workforce reports for management and compliance — export to CSV/PDF."
    >
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
                onClick={() => handleExport(r.id, r.title)}
              >
                <Download className="h-4 w-4 mr-2" />
                {generating === r.id ? 'Generating...' : 'Export CSV'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </HrPageShell>
  );
}
