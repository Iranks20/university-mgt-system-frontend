import { useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api';
import { EMPLOYMENT_TYPE_OPTIONS, SCHOOL_UNIT_OPTIONS, type HrAppraisalReview } from '@/features/hr/types';
import { hrAppraisalService } from '@/services/hr-appraisal.service';

const OTHER = '__other__';

type Props = {
  review: HrAppraisalReview;
  editable: boolean;
  onSaved: (review: HrAppraisalReview) => void;
};

/** "Fill this form to begin your appraisal": the Performance Agreement bio-data. */
export function AgreementForm({ review, editable, onSaved }: Props) {
  const a = review.agreement;
  const knownSchool = SCHOOL_UNIT_OPTIONS.includes(a.schoolUnit);
  const [form, setForm] = useState({
    periodFrom: a.periodFrom ?? '',
    periodTo: a.periodTo ?? '',
    designation: a.designation,
    employmentType: a.employmentType,
    appointmentDate: a.appointmentDate ?? '',
    school: knownSchool ? a.schoolUnit : a.schoolUnit ? OTHER : '',
    schoolCustom: knownSchool ? '' : a.schoolUnit,
    departmentName: a.departmentName,
  });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const employmentOptions = EMPLOYMENT_TYPE_OPTIONS.includes(form.employmentType) || !form.employmentType
    ? EMPLOYMENT_TYPE_OPTIONS
    : [form.employmentType, ...EMPLOYMENT_TYPE_OPTIONS];

  const handleSave = async () => {
    const schoolUnit = form.school === OTHER ? form.schoolCustom.trim() : form.school;
    const missing = [
      !form.periodFrom && 'period from',
      !form.periodTo && 'period to',
      !form.designation.trim() && 'designation',
      !form.employmentType && 'employment type',
      !form.appointmentDate && 'appointment date',
      !schoolUnit && 'school / unit',
      !form.departmentName.trim() && 'department',
    ].filter(Boolean);
    if (missing.length) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    if (form.periodFrom > form.periodTo) {
      toast.error('The appraisal period must end after it starts');
      return;
    }
    setSaving(true);
    try {
      const saved = await hrAppraisalService.saveDraft(review.id, {
        agreement: {
          periodFrom: form.periodFrom,
          periodTo: form.periodTo,
          designation: form.designation.trim(),
          employmentType: form.employmentType,
          appointmentDate: form.appointmentDate,
          schoolUnit,
          departmentName: form.departmentName.trim(),
        },
      });
      toast.success(a.savedAt ? 'Changes saved' : 'Saved. Now continue and start self rating');
      onSaved(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not save the appraisal information'));
    } finally {
      setSaving(false);
    }
  };

  const disabled = !editable || saving;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Appraisal Type</Label>
          <Input className="mt-1" value={review.appraisalTypeLabel} readOnly disabled />
          <p className="mt-1 text-xs text-gray-500">Set by HR for this appraisal period.</p>
        </div>
        <div>
          <Label>Period of Appraisal</Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <Input type="date" aria-label="Period from" value={form.periodFrom} onChange={set('periodFrom')} disabled={disabled} />
            <Input type="date" aria-label="Period to" value={form.periodTo} onChange={set('periodTo')} disabled={disabled} />
          </div>
        </div>
        <div>
          <Label>Full Name</Label>
          <Input className="mt-1" value={review.employeeName} readOnly disabled />
        </div>
        <div>
          <Label htmlFor="ag-designation">Designation</Label>
          <Input
            id="ag-designation"
            className="mt-1"
            value={form.designation}
            placeholder="e.g. Assistant Lecturer"
            onChange={set('designation')}
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="ag-employment">Employment Type Category</Label>
          <select
            id="ag-employment"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
            value={form.employmentType}
            onChange={set('employmentType')}
            disabled={disabled}
          >
            <option value="">— Select employment type —</option>
            {employmentOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="ag-appointment">Formal Appointment Date</Label>
          <Input
            id="ag-appointment"
            type="date"
            className="mt-1"
            value={form.appointmentDate}
            onChange={set('appointmentDate')}
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="ag-school">School / Department / Directorate or Unit</Label>
          <select
            id="ag-school"
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
            value={form.school}
            onChange={set('school')}
            disabled={disabled}
          >
            <option value="">— Select School / Unit —</option>
            {SCHOOL_UNIT_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            <option value={OTHER}>Others</option>
          </select>
          {form.school === OTHER ? (
            <Input
              className="mt-2"
              aria-label="School or unit name"
              placeholder="Type your school / unit name"
              value={form.schoolCustom}
              onChange={set('schoolCustom')}
              disabled={disabled}
            />
          ) : null}
        </div>
        <div>
          <Label htmlFor="ag-department">Assigned Department</Label>
          <Input
            id="ag-department"
            className="mt-1"
            value={form.departmentName}
            placeholder="e.g. Computer Science"
            onChange={set('departmentName')}
            disabled={disabled}
          />
        </div>
        <div>
          <Label>Assigned Supervisor</Label>
          <Input className="mt-1" value={review.supervisorName ?? 'Not assigned yet'} readOnly disabled />
          <p className="mt-1 text-xs text-gray-500">
            Taken from the organisation chart. Contact HR if your supervisor is wrong.
          </p>
        </div>
        <div>
          <Label>Supervisor Rank</Label>
          <Input className="mt-1" value={a.supervisorRank || '—'} readOnly disabled />
        </div>
      </div>

      {editable ? (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving…' : a.savedAt ? 'Save changes' : 'Save and start self rating'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
