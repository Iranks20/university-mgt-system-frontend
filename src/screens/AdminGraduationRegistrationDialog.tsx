import React, { useEffect, useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  graduationRegistrationService,
  type GraduationClearanceStatus,
  type GraduationEmploymentStatus,
  type GraduationFormOptions,
  type GraduationPostGraduationPlan,
  type GraduationRegistrationRow,
  type GraduationRegistrationUpdatePayload,
  type GraduationRsvpStatus,
} from '@/services/graduation-registration.service';
import { toast } from 'sonner';

const GOWN_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function rsvpLabel(status: GraduationRsvpStatus) {
  return status === 'InAbsentia' ? 'In absentia' : 'Attending';
}

function rowToEditForm(row: GraduationRegistrationRow): GraduationRegistrationUpdatePayload {
  return {
    studentId: row.studentId,
    fullName: row.fullName,
    dateOfBirth: row.dateOfBirth,
    nationality: row.nationality,
    permanentAddressFormat: row.permanentAddressFormat,
    village: row.village,
    parish: row.parish,
    subcounty: row.subcounty,
    county: row.county,
    district: row.district,
    region: row.region,
    country: row.country,
    homePlotStreet: row.homePlotStreet,
    poBoxNumber: row.poBoxNumber,
    intlStreetAddress: row.intlStreetAddress,
    intlCity: row.intlCity,
    intlStateProvince: row.intlStateProvince,
    intlAreaLga: row.intlAreaLga,
    intlPostalCode: row.intlPostalCode,
    intlCountry: row.intlCountry,
    personalMobilePhone: row.personalMobilePhone,
    whatsAppNumber: row.whatsAppNumber,
    nationalIdOrPassport: row.nationalIdOrPassport,
    emergencyContactName: row.emergencyContactName,
    emergencyContactPhone: row.emergencyContactPhone,
    namePronunciation: row.namePronunciation,
    universityEmail: row.universityEmail,
    permanentContactEmail: row.permanentContactEmail,
    briefBioNotes: row.briefBioNotes,
    parentGuardianName: row.parentGuardianName,
    parentGuardianEmail: row.parentGuardianEmail,
    sponsorOrganization: row.sponsorOrganization || '',
    parentSponsorPhone: row.parentSponsorPhone,
    p7SchoolAttended: row.p7SchoolAttended,
    s4SchoolAttended: row.s4SchoolAttended,
    s6SchoolAttended: row.s6SchoolAttended,
    previousQualifications: row.previousQualifications,
    facultySchool: row.facultySchool,
    programName: row.programName,
    awardClassification: row.awardClassification,
    graduationCohort: row.graduationCohort,
    institutionalClearance: row.institutionalClearance,
    employmentStatusAtGraduation: row.employmentStatusAtGraduation,
    postGraduationPlan: row.postGraduationPlan,
    postGraduationPlanDetail: row.postGraduationPlanDetail,
    accessibilityNeeds: row.accessibilityNeeds,
    alumniCommunicationConsent: row.alumniCommunicationConsent,
    rsvpStatus: row.rsvpStatus,
    gownSize: row.gownSize,
    guestCount: row.guestCount,
    staffEscortAssigned: row.staffEscortAssigned,
  };
}

type Props = {
  row: GraduationRegistrationRow | null;
  open: boolean;
  initialEditing?: boolean;
  onClose: () => void;
  onSaved: (row: GraduationRegistrationRow) => void;
  onDeleted: (id: string) => void;
};

export default function AdminGraduationRegistrationDialog({
  row,
  open,
  initialEditing = false,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const [editing, setEditing] = useState(initialEditing);
  const [form, setForm] = useState<GraduationRegistrationUpdatePayload | null>(null);
  const [formOptions, setFormOptions] = useState<GraduationFormOptions | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEditing(initialEditing);
    if (row) setForm(rowToEditForm(row));
  }, [open, row, initialEditing]);

  useEffect(() => {
    if (!open) return;
    graduationRegistrationService.getPublicOptions().then(setFormOptions).catch(() => {});
  }, [open]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    if (!open || !row?.signaturePath) {
      setSignaturePreviewUrl(null);
      return;
    }

    graduationRegistrationService.fetchSignatureBlob(row.id).then((blob) => {
      if (cancelled || !blob) {
        if (!cancelled) setSignaturePreviewUrl(null);
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setSignaturePreviewUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, row?.id, row?.signaturePath]);

  const setField = <K extends keyof GraduationRegistrationUpdatePayload>(
    key: K,
    value: GraduationRegistrationUpdatePayload[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!row || !form) return;
    setSaving(true);
    try {
      const updated = await graduationRegistrationService.update(row.id, form);
      onSaved(updated);
      setEditing(false);
      toast.success('Registration updated.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!row) return;
    setDeleting(true);
    try {
      await graduationRegistrationService.remove(row.id);
      onDeleted(row.id);
      setDeleteOpen(false);
      onClose();
      toast.success('Registration deleted.');
    } catch {
      toast.error('Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  if (!row || !form) return null;

  const isUgandaAddress = form.permanentAddressFormat === 'Uganda';

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit registration' : row.fullName}</DialogTitle>
            <DialogDescription>
              {row.studentId} · {row.programName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 text-sm md:grid-cols-2">
            {editing ? (
              <>
                <Field label="Registration number" className="md:col-span-2">
                  <Input value={form.studentId} onChange={(e) => setField('studentId', e.target.value)} />
                </Field>
                <Field label="Full name" className="md:col-span-2">
                  <Input value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
                </Field>
                <Field label="Date of birth">
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
                </Field>
                <Field label="Nationality">
                  <Input value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} />
                </Field>
                <Field label="University email">
                  <Input type="email" value={form.universityEmail} onChange={(e) => setField('universityEmail', e.target.value)} />
                </Field>
                <Field label="Personal email">
                  <Input
                    type="email"
                    value={form.permanentContactEmail || ''}
                    onChange={(e) => setField('permanentContactEmail', e.target.value || null)}
                  />
                </Field>
                <Field label="Mobile">
                  <Input value={form.personalMobilePhone} onChange={(e) => setField('personalMobilePhone', e.target.value)} />
                </Field>
                <Field label="WhatsApp">
                  <Input value={form.whatsAppNumber} onChange={(e) => setField('whatsAppNumber', e.target.value)} />
                </Field>
                <Field label="National ID / passport">
                  <Input value={form.nationalIdOrPassport} onChange={(e) => setField('nationalIdOrPassport', e.target.value)} />
                </Field>
                <Field label="Name pronunciation">
                  <Input value={form.namePronunciation} onChange={(e) => setField('namePronunciation', e.target.value)} />
                </Field>
                <Field label="Address format" className="md:col-span-2">
                  <Select
                    value={form.permanentAddressFormat}
                    onValueChange={(v) => {
                      setField('permanentAddressFormat', v as GraduationRegistrationUpdatePayload['permanentAddressFormat']);
                      if (v === 'Uganda') setField('country', 'Uganda');
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Uganda">Uganda (LC1–LC5)</SelectItem>
                      <SelectItem value="International">Outside Uganda</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {isUgandaAddress ? (
                  <>
                    <Field label="Village (LC1)">
                      <Input value={form.village || ''} onChange={(e) => setField('village', e.target.value || null)} />
                    </Field>
                    <Field label="Parish (LC2)">
                      <Input value={form.parish || ''} onChange={(e) => setField('parish', e.target.value || null)} />
                    </Field>
                    <Field label="Subcounty (LC3)">
                      <Input value={form.subcounty || ''} onChange={(e) => setField('subcounty', e.target.value || null)} />
                    </Field>
                    <Field label="County (LC4)">
                      <Input value={form.county || ''} onChange={(e) => setField('county', e.target.value || null)} />
                    </Field>
                    <Field label="District (LC5)">
                      <Input value={form.district || ''} onChange={(e) => setField('district', e.target.value || null)} />
                    </Field>
                    <Field label="Region">
                      <Input value={form.region || ''} onChange={(e) => setField('region', e.target.value || null)} />
                    </Field>
                    <Field label="Country">
                      <Input value={form.country || ''} onChange={(e) => setField('country', e.target.value || null)} />
                    </Field>
                    <Field label="Plot / street" className="md:col-span-2">
                      <Input value={form.homePlotStreet || ''} onChange={(e) => setField('homePlotStreet', e.target.value || null)} />
                    </Field>
                    <Field label="P.O. Box">
                      <Input value={form.poBoxNumber || ''} onChange={(e) => setField('poBoxNumber', e.target.value || null)} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label="Street / house address" className="md:col-span-2">
                      <Input value={form.intlStreetAddress || ''} onChange={(e) => setField('intlStreetAddress', e.target.value || null)} />
                    </Field>
                    <Field label="City / town">
                      <Input value={form.intlCity || ''} onChange={(e) => setField('intlCity', e.target.value || null)} />
                    </Field>
                    <Field label="State / province">
                      <Input value={form.intlStateProvince || ''} onChange={(e) => setField('intlStateProvince', e.target.value || null)} />
                    </Field>
                    <Field label="Area / LGA">
                      <Input value={form.intlAreaLga || ''} onChange={(e) => setField('intlAreaLga', e.target.value || null)} />
                    </Field>
                    <Field label="Postal / ZIP">
                      <Input value={form.intlPostalCode || ''} onChange={(e) => setField('intlPostalCode', e.target.value || null)} />
                    </Field>
                    <Field label="Country" className="md:col-span-2">
                      <Input value={form.intlCountry || ''} onChange={(e) => setField('intlCountry', e.target.value || null)} />
                    </Field>
                  </>
                )}
                <Field label="Emergency contact">
                  <Input value={form.emergencyContactName} onChange={(e) => setField('emergencyContactName', e.target.value)} />
                </Field>
                <Field label="Emergency phone">
                  <Input value={form.emergencyContactPhone} onChange={(e) => setField('emergencyContactPhone', e.target.value)} />
                </Field>
                <Field label="School">
                  <Input value={form.facultySchool} onChange={(e) => setField('facultySchool', e.target.value)} />
                </Field>
                <Field label="Program">
                  <Input value={form.programName} onChange={(e) => setField('programName', e.target.value)} />
                </Field>
                <Field label="Award classification">
                  <Select value={form.awardClassification} onValueChange={(v) => setField('awardClassification', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(formOptions?.awardClassifications || [form.awardClassification]).map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Graduation cohort">
                  <Input value={form.graduationCohort} onChange={(e) => setField('graduationCohort', e.target.value)} />
                </Field>
                <Field label="Self-reported clearance">
                  <Select
                    value={form.institutionalClearance}
                    onValueChange={(v) => setField('institutionalClearance', v as GraduationClearanceStatus)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="FullyCleared">Fully cleared</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Employment at graduation">
                  <Select
                    value={form.employmentStatusAtGraduation}
                    onValueChange={(v) => setField('employmentStatusAtGraduation', v as GraduationEmploymentStatus)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(formOptions?.employmentStatuses || []).map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Post-graduation plan">
                  <Select
                    value={form.postGraduationPlan}
                    onValueChange={(v) => setField('postGraduationPlan', v as GraduationPostGraduationPlan)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(formOptions?.postGraduationPlans || []).map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Plan details" className="md:col-span-2">
                  <Textarea
                    rows={2}
                    value={form.postGraduationPlanDetail || ''}
                    onChange={(e) => setField('postGraduationPlanDetail', e.target.value || null)}
                  />
                </Field>
                <Field label="RSVP">
                  <Select
                    value={form.rsvpStatus}
                    onValueChange={(v) => setField('rsvpStatus', v as GraduationRsvpStatus)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Attending">Attending</SelectItem>
                      <SelectItem value="InAbsentia">In absentia</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Gown size">
                  <Select value={form.gownSize} onValueChange={(v) => setField('gownSize', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GOWN_SIZES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Guest count">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={form.guestCount}
                    onChange={(e) => setField('guestCount', Number(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Staff escort assigned">
                  <Input
                    value={form.staffEscortAssigned || ''}
                    onChange={(e) => setField('staffEscortAssigned', e.target.value || null)}
                  />
                </Field>
                <Field label="Sponsor">
                  <Input value={form.sponsorOrganization} onChange={(e) => setField('sponsorOrganization', e.target.value)} />
                </Field>
                <Field label="Contact person">
                  <Input value={form.parentGuardianName} onChange={(e) => setField('parentGuardianName', e.target.value)} />
                </Field>
                <Field label="Contact email">
                  <Input
                    type="email"
                    value={form.parentGuardianEmail || ''}
                    onChange={(e) => setField('parentGuardianEmail', e.target.value || null)}
                  />
                </Field>
                <Field label="Contact phone">
                  <Input value={form.parentSponsorPhone} onChange={(e) => setField('parentSponsorPhone', e.target.value)} />
                </Field>
                <Field label="P.7 school">
                  <Input value={form.p7SchoolAttended} onChange={(e) => setField('p7SchoolAttended', e.target.value)} />
                </Field>
                <Field label="S.4 school">
                  <Input value={form.s4SchoolAttended} onChange={(e) => setField('s4SchoolAttended', e.target.value)} />
                </Field>
                <Field label="S.6 or equivalent" className="md:col-span-2">
                  <Input
                    value={form.s6SchoolAttended || ''}
                    onChange={(e) => setField('s6SchoolAttended', e.target.value || null)}
                  />
                </Field>
                <Field label="Other qualifications" className="md:col-span-2">
                  <Textarea
                    rows={2}
                    value={form.previousQualifications || ''}
                    onChange={(e) => setField('previousQualifications', e.target.value || null)}
                  />
                </Field>
                <Field label="Accessibility needs" className="md:col-span-2">
                  <Textarea
                    rows={2}
                    value={form.accessibilityNeeds || ''}
                    onChange={(e) => setField('accessibilityNeeds', e.target.value || null)}
                  />
                </Field>
                <Field label="Bio" className="md:col-span-2">
                  <Textarea
                    rows={3}
                    value={form.briefBioNotes || ''}
                    onChange={(e) => setField('briefBioNotes', e.target.value || null)}
                  />
                </Field>
              </>
            ) : (
              <>
                <Detail label="University email" value={row.universityEmail} />
                <Detail label="Personal email" value={row.permanentContactEmail || '—'} />
                <Detail label="Mobile" value={row.personalMobilePhone || '—'} />
                <Detail label="WhatsApp" value={row.whatsAppNumber || '—'} />
                <Detail label="National ID / passport" value={row.nationalIdOrPassport || '—'} />
                <Detail label="Name pronunciation" value={row.namePronunciation || '—'} />
                <Detail label="Date of birth" value={row.dateOfBirth} />
                <Detail label="Nationality" value={row.nationality} />
                <Detail
                  label="Address format"
                  value={row.permanentAddressFormat === 'International' ? 'Outside Uganda' : 'Uganda'}
                  className="md:col-span-2"
                />
                {row.permanentAddressFormat === 'International' ? (
                  <>
                    <Detail label="Street / house" value={row.intlStreetAddress || '—'} className="md:col-span-2" />
                    <Detail label="City / town" value={row.intlCity || '—'} />
                    <Detail label="State / province" value={row.intlStateProvince || '—'} />
                    <Detail label="Area / LGA" value={row.intlAreaLga || '—'} />
                    <Detail label="Postal / ZIP" value={row.intlPostalCode || '—'} />
                    <Detail label="Country" value={row.intlCountry || '—'} />
                  </>
                ) : (
                  <>
                    <Detail label="Village (LC1)" value={row.village || '—'} />
                    <Detail label="Parish (LC2)" value={row.parish || '—'} />
                    <Detail label="Subcounty (LC3)" value={row.subcounty || '—'} />
                    <Detail label="County (LC4)" value={row.county || '—'} />
                    <Detail label="District (LC5)" value={row.district || '—'} />
                    <Detail label="Region" value={row.region || '—'} />
                    <Detail label="Country" value={row.country || '—'} />
                    <Detail label="Plot / street" value={row.homePlotStreet || '—'} className="md:col-span-2" />
                    <Detail label="P.O. Box" value={row.poBoxNumber || '—'} />
                  </>
                )}
                <Detail label="Emergency contact" value={row.emergencyContactName || '—'} />
                <Detail label="Emergency phone" value={row.emergencyContactPhone || '—'} />
                <Detail label="School" value={row.facultySchool} />
                <Detail label="Clearance (self-reported)" value={row.institutionalClearance === 'FullyCleared' ? 'Fully cleared' : 'Pending'} />
                <Detail label="Employment at graduation" value={row.employmentStatusAtGraduation || '—'} />
                <Detail label="Post-graduation plan" value={row.postGraduationPlan || '—'} />
                <Detail label="Plan details" value={row.postGraduationPlanDetail || '—'} className="md:col-span-2" />
                <Detail label="Alumni consent" value={row.alumniCommunicationConsent ? 'Yes' : 'No'} />
                <Detail label="Award" value={row.awardClassification} />
                <Detail label="Cohort" value={row.graduationCohort} />
                <Detail label="RSVP" value={rsvpLabel(row.rsvpStatus)} />
                <Detail label="Gown size" value={row.gownSize} />
                <Detail label="Guests" value={String(row.guestCount)} />
                <Detail label="Staff escort" value={row.staffEscortAssigned || '—'} />
                <Detail label="Accessibility needs" value={row.accessibilityNeeds || '—'} className="md:col-span-2" />
                <Detail label="Sponsor" value={row.sponsorOrganization || '—'} />
                <Detail label="Contact person" value={row.parentGuardianName} />
                <Detail label="Contact email" value={row.parentGuardianEmail || '—'} />
                <Detail label="Contact phone" value={row.parentSponsorPhone} />
                <Detail label="P.7 school" value={row.p7SchoolAttended || '—'} />
                <Detail label="S.4 school" value={row.s4SchoolAttended || '—'} />
                <Detail label="S.6 or equivalent" value={row.s6SchoolAttended || '—'} className="md:col-span-2" />
                <Detail label="Other qualifications" value={row.previousQualifications || '—'} className="md:col-span-2" />
                <Detail label="Bio" value={row.briefBioNotes || '—'} className="md:col-span-2" />
              </>
            )}

            <div className="space-y-2 md:col-span-2 border-t pt-4">
              <Label>Declaration signature</Label>
              {row.signatureSignedName ? (
                <p className="text-sm">
                  Signed by <span className="font-medium">{row.signatureSignedName}</span>
                  {row.signedAt ? ` on ${new Date(row.signedAt).toLocaleString('en-GB')}` : ''}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No signature on file.</p>
              )}
              {signaturePreviewUrl ? (
                <div className="rounded-md border bg-white p-2">
                  <img
                    src={signaturePreviewUrl}
                    alt={`Signature of ${row.signatureSignedName || row.fullName}`}
                    className="max-h-40 w-full object-contain"
                  />
                </div>
              ) : row.signaturePath ? (
                <p className="text-sm text-muted-foreground">Loading signature…</p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={saving || deleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving || deleting}>
                Close
              </Button>
              {editing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setForm(rowToEditForm(row));
                    }}
                    disabled={saving}
                  >
                    Cancel edit
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-[#015F2B] hover:bg-[#014a22]"
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="bg-[#015F2B] hover:bg-[#014a22]"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this registration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the application for {row.fullName} ({row.studentId}),
              including the stored signature. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete registration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Detail({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
