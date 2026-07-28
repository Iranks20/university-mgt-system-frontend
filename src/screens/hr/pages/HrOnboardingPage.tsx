import { useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { getHrOnboarding } from '@/features/hr/hr-demo-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

function taskStatusBadge(status: string) {
  const map: Record<string, string> = {
    Done: 'bg-green-100 text-green-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    Pending: 'bg-gray-100 text-gray-700',
  };
  return <Badge className={map[status] || ''}>{status}</Badge>;
}

export default function HrOnboardingPage() {
  const [cases] = useState(() => getHrOnboarding());

  return (
    <HrPageShell
      title="Onboarding"
      description="New hire checklists — account provisioning, orientation, and department induction."
      actions={
        <Button onClick={() => toast.info('New hire wizard will connect to backend')}>
          <UserPlus className="h-4 w-4 mr-2" /> Start Onboarding
        </Button>
      }
    >
      <div className="grid gap-6">
        {cases.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{c.employeeName}</CardTitle>
                  <CardDescription>
                    {c.jobTitle} · {c.department} · Start {c.startDate}
                  </CardDescription>
                </div>
                <div className="w-full sm:w-48">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{c.progress}%</span>
                  </div>
                  <Progress value={c.progress} className="h-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {c.tasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm font-medium">{t.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Owner: {t.owner}</span>
                      {taskStatusBadge(t.status)}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </HrPageShell>
  );
}
