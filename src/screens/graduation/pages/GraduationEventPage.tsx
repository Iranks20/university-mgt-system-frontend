import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationPageShell } from '@/components/graduation/GraduationPageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GRADUATION_EVENT_STATUS_LABELS, GRADUATION_ROUTES } from '@/features/graduation/constants';
import { useGraduationActiveEvent } from '@/features/graduation/use-graduation-module';
import { buildGraduationAccess } from '@/lib/graduation-access';
import { graduationModuleService } from '@/services/graduation-module.service';
import type { GraduationEventStatus } from '@/features/graduation/types';

type EventFormState = {
  title: string;
  cohort: string;
  ceremonyDate: string;
  venue: string;
  overallBudget: string;
  status: GraduationEventStatus;
};

const emptyForm = (): EventFormState => ({
  title: '',
  cohort: '',
  ceremonyDate: '',
  venue: '',
  overallBudget: '',
  status: 'Planning',
});

export default function GraduationEventPage() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { activeEvent, access: serverAccess, loading } = useGraduationActiveEvent();
  const access = buildGraduationAccess({
    permissions: user?.permissions,
    role: userRole,
    serverAccess,
  });
  const [form, setForm] = useState<EventFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const isEditing = !!activeEvent;

  useEffect(() => {
    if (activeEvent) {
      setForm({
        title: activeEvent.title,
        cohort: activeEvent.cohort,
        ceremonyDate: activeEvent.ceremonyDate?.slice(0, 10) ?? '',
        venue: activeEvent.venue,
        overallBudget:
          activeEvent.overallBudget != null ? String(activeEvent.overallBudget) : '',
        status: activeEvent.status,
      });
    }
  }, [activeEvent]);

  if (loading) {
    return (
      <GraduationPageShell title="Event setup">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </GraduationPageShell>
    );
  }

  if (!access.canManageEvent) {
    return (
      <GraduationPageShell title="Event setup" description="You do not have permission to manage the graduation event.">
        <Button variant="outline" asChild>
          <Link to={GRADUATION_ROUTES.dashboard}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Link>
        </Button>
      </GraduationPageShell>
    );
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.cohort.trim()) {
      toast.error('Title and cohort are required');
      return;
    }
    const budget =
      form.overallBudget.trim() === '' ? null : Number(form.overallBudget.replace(/,/g, ''));
    if (budget != null && Number.isNaN(budget)) {
      toast.error('Budget must be a number');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        cohort: form.cohort,
        ceremonyDate: form.ceremonyDate || undefined,
        venue: form.venue,
        overallBudget: budget,
        status: form.status,
      };
      if (isEditing && activeEvent) {
        await graduationModuleService.updateEvent(activeEvent.id, payload);
        toast.success('Event updated');
      } else {
        await graduationModuleService.createEvent(payload);
        toast.success('Graduation event created with all committees');
      }
      navigate(GRADUATION_ROUTES.dashboard);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GraduationPageShell
      title={isEditing ? 'Manage graduation event' : 'Create graduation event'}
      description="Set the ceremony details. Ten committees are created automatically with starter checklists."
      actions={
        <Button variant="outline" asChild>
          <Link to={GRADUATION_ROUTES.dashboard}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Link>
        </Button>
      }
    >
      <Card>
        <CardContent className="pt-6 space-y-5 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="title">Event title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. KCU July 2026 Graduation"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cohort">Cohort</Label>
              <Input
                id="cohort"
                value={form.cohort}
                onChange={(e) => setForm((f) => ({ ...f, cohort: e.target.value }))}
                placeholder="e.g. July 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ceremonyDate">Ceremony date</Label>
              <Input
                id="ceremonyDate"
                type="date"
                value={form.ceremonyDate}
                onChange={(e) => setForm((f) => ({ ...f, ceremonyDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={form.venue}
              onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
              placeholder="e.g. Main graduation grounds"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="budget">Overall budget (UGX)</Label>
              <Input
                id="budget"
                value={form.overallBudget}
                onChange={(e) => setForm((f) => ({ ...f, overallBudget: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, status: value as GraduationEventStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GRADUATION_EVENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isEditing ? 'Save changes' : 'Create event'}
          </Button>
        </CardContent>
      </Card>
    </GraduationPageShell>
  );
}
