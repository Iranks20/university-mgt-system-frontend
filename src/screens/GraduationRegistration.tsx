import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import kcuUniversityLogo from '@/assets/images/kcu-university-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  graduationRegistrationService,
  type GraduationFormOptions,
  type GraduationRsvpStatus,
} from '@/services/graduation-registration.service';
import { toast } from 'sonner';

const OTHER_SCHOOL = '__other_school__';
const OTHER_PROGRAM = '__other_program__';

const emptyForm = {
  studentId: '',
  fullName: '',
  dateOfBirth: '',
  nationality: '',
  village: '',
  parish: '',
  subcounty: '',
  county: '',
  district: '',
  region: '',
  country: 'Uganda',
  briefBioNotes: '',
  parentGuardianName: '',
  sponsorOrganization: '',
  parentSponsorContact: '',
  highSchoolAttended: '',
  previousQualifications: '',
  schoolSelect: '',
  facultySchoolOther: '',
  programSelect: '',
  programNameOther: '',
  awardClassification: '',
  graduationCohort: '',
  rsvpStatus: '' as GraduationRsvpStatus | '',
  gownSize: '',
  guestCount: '0',
  permanentContactEmail: '',
};

export default function GraduationRegistration() {
  const [options, setOptions] = useState<GraduationFormOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    graduationRegistrationService
      .getPublicOptions()
      .then(setOptions)
      .catch(() => toast.error('Unable to load form options. Please refresh the page.'))
      .finally(() => setLoadingOptions(false));
  }, []);

  const programsForSchool = useMemo(() => {
    if (!options || !form.schoolSelect || form.schoolSelect === OTHER_SCHOOL) return [];
    return options.programs.filter((p) => p.schoolId === form.schoolSelect);
  }, [options, form.schoolSelect]);

  const setField = (key: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rsvpStatus) {
      toast.error('Please select your attendance plan.');
      return;
    }

    const facultySchool =
      form.schoolSelect === OTHER_SCHOOL
        ? form.facultySchoolOther.trim()
        : options?.schools.find((s) => s.id === form.schoolSelect)?.name || '';

    const programName =
      form.programSelect === OTHER_PROGRAM
        ? form.programNameOther.trim()
        : options?.programs.find((p) => p.id === form.programSelect)?.name || '';

    if (!facultySchool || !programName) {
      toast.error('Please select or enter your school and program.');
      return;
    }

    setSubmitting(true);
    try {
      await graduationRegistrationService.submitPublic({
        studentId: form.studentId.trim(),
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth,
        nationality: form.nationality.trim(),
        village: form.village.trim(),
        parish: form.parish.trim(),
        subcounty: form.subcounty.trim(),
        county: form.county.trim(),
        district: form.district.trim(),
        region: form.region.trim(),
        country: form.country.trim(),
        briefBioNotes: form.briefBioNotes.trim() || undefined,
        parentGuardianName: form.parentGuardianName.trim(),
        sponsorOrganization: form.sponsorOrganization.trim() || undefined,
        parentSponsorContact: form.parentSponsorContact.trim(),
        highSchoolAttended: form.highSchoolAttended.trim(),
        previousQualifications: form.previousQualifications.trim() || undefined,
        facultySchool,
        schoolId: form.schoolSelect !== OTHER_SCHOOL ? form.schoolSelect : undefined,
        programName,
        programId:
          form.programSelect && form.programSelect !== OTHER_PROGRAM
            ? form.programSelect
            : undefined,
        awardClassification: form.awardClassification,
        graduationCohort: form.graduationCohort.trim(),
        rsvpStatus: form.rsvpStatus,
        gownSize: form.gownSize,
        guestCount: Number(form.guestCount) || 0,
        permanentContactEmail: form.permanentContactEmail.trim(),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const message = err instanceof Error ? err.message : 'Submission failed';
      if (code === 'GRADUATION_EMAIL_ALREADY_REGISTERED') {
        toast.error('This email has already been used to register.');
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-700" />
            </div>
            <CardTitle>Registration received</CardTitle>
            <CardDescription>
              Thank you. Your graduation details have been submitted successfully.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center">
            <img src={kcuUniversityLogo} alt="King Ceasor University" className="max-h-full max-w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Graduation Registration</h1>
          <p className="text-gray-600">King Ceasor University — complete all required fields below.</p>
        </div>

        {loadingOptions ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Biography & demographics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID *</Label>
                  <Input id="studentId" required value={form.studentId} onChange={(e) => setField('studentId', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fullName">Full name (as on certificate) *</Label>
                  <Input id="fullName" required value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of birth *</Label>
                  <Input id="dateOfBirth" type="date" required value={form.dateOfBirth} onChange={(e) => setField('dateOfBirth', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality *</Label>
                  <Input id="nationality" required value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="briefBioNotes">Brief bio / achievements</Label>
                  <Textarea id="briefBioNotes" rows={3} value={form.briefBioNotes} onChange={(e) => setField('briefBioNotes', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Home address</CardTitle>
                <CardDescription>Local council levels LC1–LC5, region and country</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="village">Village (LC1) *</Label>
                  <Input id="village" required value={form.village} onChange={(e) => setField('village', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parish">Parish (LC2) *</Label>
                  <Input id="parish" required value={form.parish} onChange={(e) => setField('parish', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcounty">Subcounty (LC3) *</Label>
                  <Input id="subcounty" required value={form.subcounty} onChange={(e) => setField('subcounty', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County (LC4) *</Label>
                  <Input id="county" required value={form.county} onChange={(e) => setField('county', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District (LC5) *</Label>
                  <Input id="district" required value={form.district} onChange={(e) => setField('district', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region *</Label>
                  <Input id="region" required value={form.region} onChange={(e) => setField('region', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input id="country" required value={form.country} onChange={(e) => setField('country', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Family & sponsor</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="parentGuardianName">Parent / guardian name *</Label>
                  <Input id="parentGuardianName" required value={form.parentGuardianName} onChange={(e) => setField('parentGuardianName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sponsorOrganization">Sponsor / organization</Label>
                  <Input id="sponsorOrganization" value={form.sponsorOrganization} onChange={(e) => setField('sponsorOrganization', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentSponsorContact">Parent / sponsor contact *</Label>
                  <Input id="parentSponsorContact" required value={form.parentSponsorContact} onChange={(e) => setField('parentSponsorContact', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Academic background</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="highSchoolAttended">High school attended *</Label>
                  <Input id="highSchoolAttended" required value={form.highSchoolAttended} onChange={(e) => setField('highSchoolAttended', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="previousQualifications">Previous qualifications</Label>
                  <Textarea id="previousQualifications" rows={2} value={form.previousQualifications} onChange={(e) => setField('previousQualifications', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">University credentials</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>School / faculty *</Label>
                  <Select
                    value={form.schoolSelect}
                    onValueChange={(v) => {
                      setField('schoolSelect', v);
                      setField('programSelect', '');
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                    <SelectContent>
                      {(options?.schools || []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                      <SelectItem value={OTHER_SCHOOL}>Other (type manually)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.schoolSelect === OTHER_SCHOOL && (
                  <div className="space-y-2">
                    <Label htmlFor="facultySchoolOther">School name *</Label>
                    <Input id="facultySchoolOther" required value={form.facultySchoolOther} onChange={(e) => setField('facultySchoolOther', e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Program *</Label>
                  <Select
                    value={form.programSelect}
                    onValueChange={(v) => setField('programSelect', v)}
                    disabled={!form.schoolSelect}
                  >
                    <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                    <SelectContent>
                      {programsForSchool.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                      <SelectItem value={OTHER_PROGRAM}>Other (type manually)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.programSelect === OTHER_PROGRAM && (
                  <div className="space-y-2">
                    <Label htmlFor="programNameOther">Program name *</Label>
                    <Input id="programNameOther" required value={form.programNameOther} onChange={(e) => setField('programNameOther', e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Award classification *</Label>
                  <Select value={form.awardClassification} onValueChange={(v) => setField('awardClassification', v)}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {(options?.awardClassifications || []).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="graduationCohort">Graduation cohort *</Label>
                  <Input id="graduationCohort" required placeholder="e.g. September 2026" value={form.graduationCohort} onChange={(e) => setField('graduationCohort', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ceremony & contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Will you attend? *</Label>
                  <Select value={form.rsvpStatus} onValueChange={(v) => setField('rsvpStatus', v as GraduationRsvpStatus)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Attending">Attending</SelectItem>
                      <SelectItem value="InAbsentia">In absentia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gown size *</Label>
                  <Select value={form.gownSize} onValueChange={(v) => setField('gownSize', v)}>
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {(options?.gownSizes || []).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestCount">Guest invitations *</Label>
                  <Input id="guestCount" type="number" min={0} max={20} required value={form.guestCount} onChange={(e) => setField('guestCount', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="permanentContactEmail">Permanent contact email *</Label>
                  <Input id="permanentContactEmail" type="email" required value={form.permanentContactEmail} onChange={(e) => setField('permanentContactEmail', e.target.value)} />
                  <p className="text-xs text-muted-foreground">Used for alumni contact. Each email can register once.</p>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full bg-[#015F2B] hover:bg-[#014a22]" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : 'Submit registration'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
