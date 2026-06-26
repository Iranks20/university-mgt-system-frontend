import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import kcuUniversityLogo from '@/assets/images/kcu-university-logo.png';
import SignaturePad, { type SignaturePadHandle } from '@/components/SignaturePad';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  graduationRegistrationService,
  type GraduationClearanceStatus,
  type GraduationEmploymentStatus,
  type GraduationFormOptions,
  type GraduationPostGraduationPlan,
  type GraduationRsvpStatus,
} from '@/services/graduation-registration.service';
import { toast } from 'sonner';

const OTHER_SCHOOL = '__other_school__';
const OTHER_PROGRAM = '__other_program__';
const OTHER_SPONSOR = '__other__';
const OTHER_PLAN = 'Other';

const emptyForm = {
  studentId: '',
  fullName: '',
  dateOfBirth: '',
  nationality: '',
  nationalIdOrPassport: '',
  namePronunciation: '',
  permanentContactEmail: '',
  universityEmail: '',
  personalMobilePhone: '',
  whatsAppNumber: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  permanentAddressFormat: 'Uganda' as 'Uganda' | 'International',
  village: '',
  parish: '',
  subcounty: '',
  county: '',
  district: '',
  region: '',
  country: 'Uganda',
  homePlotStreet: '',
  poBoxNumber: '',
  intlStreetAddress: '',
  intlCity: '',
  intlStateProvince: '',
  intlAreaLga: '',
  intlPostalCode: '',
  intlCountry: '',
  whatsAppSameAsMobile: false,
  briefBioNotes: '',
  parentGuardianName: '',
  parentGuardianEmail: '',
  sponsorSelect: '',
  sponsorOrganizationOther: '',
  parentSponsorPhone: '',
  p7SchoolAttended: '',
  s4SchoolAttended: '',
  s6SchoolAttended: '',
  previousQualifications: '',
  schoolSelect: '',
  facultySchoolOther: '',
  programSelect: '',
  programNameOther: '',
  awardClassification: '',
  graduationCohort: '',
  institutionalClearance: '' as GraduationClearanceStatus | '',
  employmentStatusAtGraduation: '' as GraduationEmploymentStatus | '',
  postGraduationPlan: '' as GraduationPostGraduationPlan | '',
  postGraduationPlanDetail: '',
  alumniCommunicationConsent: false,
  rsvpStatus: '' as GraduationRsvpStatus | '',
  gownSize: '',
  guestCount: '0',
  accessibilityNeeds: '',
};

export default function GraduationRegistration() {
  const [options, setOptions] = useState<GraduationFormOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [signatureSignedName, setSignatureSignedName] = useState('');
  const [signatureSignedNameTouched, setSignatureSignedNameTouched] = useState(false);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (!signatureSignedNameTouched) {
      setSignatureSignedName(form.fullName);
    }
  }, [form.fullName, signatureSignedNameTouched]);

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

  const isUgandaAddress = form.permanentAddressFormat === 'Uganda';

  const setField = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rsvpStatus) {
      toast.error('Please select your attendance plan.');
      return;
    }
    if (!form.institutionalClearance) {
      toast.error('Please select your institutional clearance status.');
      return;
    }
    if (!form.employmentStatusAtGraduation) {
      toast.error('Please select your employment status at graduation.');
      return;
    }
    if (!form.postGraduationPlan) {
      toast.error('Please select your post-graduation plan.');
      return;
    }
    if (!form.alumniCommunicationConsent) {
      toast.error('Please consent to alumni communications to submit.');
      return;
    }
    if (!declarationAccepted) {
      toast.error('Please accept the declaration to submit.');
      return;
    }
    if (!signatureSignedName.trim()) {
      toast.error('Please enter your printed name for the signature.');
      return;
    }
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast.error('Please sign in the signature box.');
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

    const sponsorOrganization =
      form.sponsorSelect === OTHER_SPONSOR
        ? form.sponsorOrganizationOther.trim()
        : form.sponsorSelect;

    if (!sponsorOrganization) {
      toast.error('Please select or enter your sponsor.');
      return;
    }

    setSubmitting(true);
    try {
      const whatsAppNumber = form.whatsAppSameAsMobile
        ? form.personalMobilePhone.trim()
        : form.whatsAppNumber.trim();

      const sharedPayload = {
        studentId: form.studentId.trim(),
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth,
        nationality: form.nationality.trim(),
        personalMobilePhone: form.personalMobilePhone.trim(),
        whatsAppNumber,
        nationalIdOrPassport: form.nationalIdOrPassport.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        namePronunciation: form.namePronunciation.trim(),
        universityEmail: form.universityEmail.trim(),
        permanentContactEmail: form.permanentContactEmail.trim() || undefined,
        briefBioNotes: form.briefBioNotes.trim() || undefined,
        parentGuardianName: form.parentGuardianName.trim(),
        parentGuardianEmail: form.parentGuardianEmail.trim() || undefined,
        sponsorOrganization,
        parentSponsorPhone: form.parentSponsorPhone.trim(),
        p7SchoolAttended: form.p7SchoolAttended.trim(),
        s4SchoolAttended: form.s4SchoolAttended.trim(),
        s6SchoolAttended: form.s6SchoolAttended.trim() || undefined,
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
        institutionalClearance: form.institutionalClearance,
        employmentStatusAtGraduation: form.employmentStatusAtGraduation,
        postGraduationPlan: form.postGraduationPlan,
        postGraduationPlanDetail: form.postGraduationPlanDetail.trim() || undefined,
        accessibilityNeeds: form.accessibilityNeeds.trim() || undefined,
        alumniCommunicationConsent: true as const,
        rsvpStatus: form.rsvpStatus,
        gownSize: form.gownSize,
        guestCount: Number(form.guestCount) || 0,
        declarationAccepted: true as const,
        signatureSignedName: signatureSignedName.trim(),
        signatureImage: signaturePadRef.current.toDataURL(),
      };

      if (isUgandaAddress) {
        await graduationRegistrationService.submitPublic({
          ...sharedPayload,
          permanentAddressFormat: 'Uganda',
          village: form.village.trim(),
          parish: form.parish.trim(),
          subcounty: form.subcounty.trim(),
          county: form.county.trim(),
          district: form.district.trim(),
          region: form.region.trim(),
          country: form.country.trim(),
          homePlotStreet: form.homePlotStreet.trim(),
          poBoxNumber: form.poBoxNumber.trim() || undefined,
        });
      } else {
        await graduationRegistrationService.submitPublic({
          ...sharedPayload,
          permanentAddressFormat: 'International',
          intlStreetAddress: form.intlStreetAddress.trim(),
          intlCity: form.intlCity.trim(),
          intlStateProvince: form.intlStateProvince.trim(),
          intlAreaLga: form.intlAreaLga.trim() || undefined,
          intlPostalCode: form.intlPostalCode.trim() || undefined,
          intlCountry: form.intlCountry.trim(),
        });
      }
      setSubmitted(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const message = err instanceof Error ? err.message : 'Submission failed';
      if (code === 'GRADUATION_EMAIL_ALREADY_REGISTERED') {
        toast.error('This university email has already been used to register.');
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
                  <Label htmlFor="studentId">Registration number *</Label>
                  <Input
                    id="studentId"
                    required
                    placeholder="e.g. 2022AG/MBCHB/1104"
                    value={form.studentId}
                    onChange={(e) => setField('studentId', e.target.value)}
                  />
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
                <div className="space-y-2">
                  <Label htmlFor="nationalIdOrPassport">National ID or passport number *</Label>
                  <Input id="nationalIdOrPassport" required value={form.nationalIdOrPassport} onChange={(e) => setField('nationalIdOrPassport', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="namePronunciation">Name pronunciation (for stage announcement) *</Label>
                  <Input id="namePronunciation" required placeholder="e.g. Ah-mah-dee O-kello" value={form.namePronunciation} onChange={(e) => setField('namePronunciation', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="briefBioNotes">Brief bio / achievements</Label>
                  <Textarea id="briefBioNotes" rows={3} value={form.briefBioNotes} onChange={(e) => setField('briefBioNotes', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact & email</CardTitle>
                <CardDescription>
                  Your university email is required and can only be used once for this graduation registration.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="universityEmail">University email *</Label>
                  <Input
                    id="universityEmail"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="e.g. student@kcu.ac.ug"
                    value={form.universityEmail}
                    onChange={(e) => setField('universityEmail', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required. Each university email can submit only once — used to prevent duplicate registrations.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="permanentContactEmail">Personal email (alumni contact)</Label>
                  <Input
                    id="permanentContactEmail"
                    type="email"
                    autoComplete="email"
                    value={form.permanentContactEmail}
                    onChange={(e) => setField('permanentContactEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="personalMobilePhone">Student phone number *</Label>
                  <Input id="personalMobilePhone" required value={form.personalMobilePhone} onChange={(e) => setField('personalMobilePhone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsAppNumber">WhatsApp number *</Label>
                  <Input
                    id="whatsAppNumber"
                    required={!form.whatsAppSameAsMobile}
                    disabled={form.whatsAppSameAsMobile}
                    value={form.whatsAppSameAsMobile ? form.personalMobilePhone : form.whatsAppNumber}
                    onChange={(e) => setField('whatsAppNumber', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 md:col-span-2">
                  <Checkbox
                    id="whatsAppSameAsMobile"
                    checked={form.whatsAppSameAsMobile}
                    onCheckedChange={(checked) => setField('whatsAppSameAsMobile', checked === true)}
                  />
                  <Label htmlFor="whatsAppSameAsMobile" className="cursor-pointer">
                    WhatsApp number is the same as mobile
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Emergency contact name *</Label>
                  <Input id="emergencyContactName" required value={form.emergencyContactName} onChange={(e) => setField('emergencyContactName', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Emergency contact phone *</Label>
                  <Input id="emergencyContactPhone" required value={form.emergencyContactPhone} onChange={(e) => setField('emergencyContactPhone', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Home address</CardTitle>
                <CardDescription>
                  Where is your permanent home address? Ugandan students use LC1–LC5; international students use the address format for their country.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Permanent home address *</Label>
                  <Select
                    value={form.permanentAddressFormat}
                    onValueChange={(v) => {
                      const format = v as 'Uganda' | 'International';
                      setField('permanentAddressFormat', format);
                      if (format === 'Uganda') {
                        setField('country', 'Uganda');
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Uganda">Uganda (LC1–LC5)</SelectItem>
                      <SelectItem value="International">Outside Uganda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isUgandaAddress ? (
                  <>
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
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="homePlotStreet">Home plot / street *</Label>
                      <Input id="homePlotStreet" required placeholder="e.g. Plot 29 Main Street" value={form.homePlotStreet} onChange={(e) => setField('homePlotStreet', e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="poBoxNumber">P.O. Box number</Label>
                      <Input id="poBoxNumber" value={form.poBoxNumber} onChange={(e) => setField('poBoxNumber', e.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="intlStreetAddress">Street / house address *</Label>
                      <Input
                        id="intlStreetAddress"
                        required
                        placeholder="e.g. 12 Admiralty Way, Lekki"
                        value={form.intlStreetAddress}
                        onChange={(e) => setField('intlStreetAddress', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intlCity">City / town *</Label>
                      <Input id="intlCity" required value={form.intlCity} onChange={(e) => setField('intlCity', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intlStateProvince">State / province *</Label>
                      <Input id="intlStateProvince" required value={form.intlStateProvince} onChange={(e) => setField('intlStateProvince', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intlAreaLga">Area / LGA / neighbourhood</Label>
                      <Input id="intlAreaLga" value={form.intlAreaLga} onChange={(e) => setField('intlAreaLga', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intlPostalCode">Postal / ZIP code</Label>
                      <Input id="intlPostalCode" value={form.intlPostalCode} onChange={(e) => setField('intlPostalCode', e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="intlCountry">Country *</Label>
                      <Input id="intlCountry" required placeholder="e.g. Nigeria" value={form.intlCountry} onChange={(e) => setField('intlCountry', e.target.value)} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sponsor & contacts</CardTitle>
                <CardDescription>
                  Sponsor may be an organisation, scholarship body, or private individual — not only family.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sponsor *</Label>
                  <Select
                    value={form.sponsorSelect}
                    onValueChange={(v) => setField('sponsorSelect', v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select sponsor" /></SelectTrigger>
                    <SelectContent>
                      {(options?.sponsorTypes || []).map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.sponsorSelect === OTHER_SPONSOR && (
                  <div className="space-y-2">
                    <Label htmlFor="sponsorOrganizationOther">Sponsor name *</Label>
                    <Input
                      id="sponsorOrganizationOther"
                      required
                      placeholder="Organisation or individual name"
                      value={form.sponsorOrganizationOther}
                      onChange={(e) => setField('sponsorOrganizationOther', e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="parentGuardianName">Contact person name *</Label>
                  <Input
                    id="parentGuardianName"
                    required
                    placeholder="Sponsor representative, parent, guardian, or next of kin"
                    value={form.parentGuardianName}
                    onChange={(e) => setField('parentGuardianName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentGuardianEmail">Contact person email</Label>
                  <Input id="parentGuardianEmail" type="email" value={form.parentGuardianEmail} onChange={(e) => setField('parentGuardianEmail', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentSponsorPhone">Contact person phone *</Label>
                  <Input id="parentSponsorPhone" required value={form.parentSponsorPhone} onChange={(e) => setField('parentSponsorPhone', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Academic background</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="p7SchoolAttended">
                    {isUgandaAddress ? 'P.7 school attended *' : 'Primary / elementary school *'}
                  </Label>
                  <Input id="p7SchoolAttended" required value={form.p7SchoolAttended} onChange={(e) => setField('p7SchoolAttended', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="s4SchoolAttended">
                    {isUgandaAddress ? 'S.4 school attended *' : 'Secondary school (O-Level / JSS / equivalent) *'}
                  </Label>
                  <Input id="s4SchoolAttended" required value={form.s4SchoolAttended} onChange={(e) => setField('s4SchoolAttended', e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="s6SchoolAttended">
                    {isUgandaAddress ? 'S.6 or equivalent school' : 'Secondary school (A-Level / SS / equivalent)'}
                  </Label>
                  <Input
                    id="s6SchoolAttended"
                    placeholder={
                      isUgandaAddress
                        ? 'e.g. UACE school, or certificate/entry programme if no S.6'
                        : 'e.g. high school or pre-university programme if applicable'
                    }
                    value={form.s6SchoolAttended}
                    onChange={(e) => setField('s6SchoolAttended', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Leave blank if not applicable to your education pathway.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="previousQualifications">Other qualifications</Label>
                  <Textarea
                    id="previousQualifications"
                    rows={2}
                    placeholder="e.g. diploma, certificate, or other awards not covered above"
                    value={form.previousQualifications}
                    onChange={(e) => setField('previousQualifications', e.target.value)}
                  />
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
                <div className="space-y-2 md:col-span-2">
                  <Label>Institutional clearance *</Label>
                  <Select
                    value={form.institutionalClearance}
                    onValueChange={(v) => setField('institutionalClearance', v as GraduationClearanceStatus)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select clearance status" /></SelectTrigger>
                    <SelectContent>
                      {(options?.clearanceStatuses || []).map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Confirm whether you have cleared with finance, registry, and library.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Career & alumni</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Employment status at graduation *</Label>
                  <Select
                    value={form.employmentStatusAtGraduation}
                    onValueChange={(v) => setField('employmentStatusAtGraduation', v as GraduationEmploymentStatus)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {(options?.employmentStatuses || []).map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Post-graduation plan *</Label>
                  <Select
                    value={form.postGraduationPlan}
                    onValueChange={(v) => setField('postGraduationPlan', v as GraduationPostGraduationPlan)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      {(options?.postGraduationPlans || []).map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(form.postGraduationPlan === OTHER_PLAN || form.employmentStatusAtGraduation === 'Other') && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="postGraduationPlanDetail">Plan details</Label>
                    <Textarea
                      id="postGraduationPlanDetail"
                      rows={2}
                      value={form.postGraduationPlanDetail}
                      onChange={(e) => setField('postGraduationPlanDetail', e.target.value)}
                      placeholder="Briefly describe your plans"
                    />
                  </div>
                )}
                <div className="flex items-start gap-3 md:col-span-2 rounded-md border p-4">
                  <Checkbox
                    id="alumniCommunicationConsent"
                    checked={form.alumniCommunicationConsent}
                    onCheckedChange={(checked) => setField('alumniCommunicationConsent', checked === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="alumniCommunicationConsent" className="cursor-pointer">
                      Alumni communication consent *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      I agree to receive alumni updates from King Ceasor University by email or other channels.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ceremony logistics</CardTitle>
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
                  <Label htmlFor="accessibilityNeeds">Accessibility needs at ceremony</Label>
                  <Textarea
                    id="accessibilityNeeds"
                    rows={2}
                    value={form.accessibilityNeeds}
                    onChange={(e) => setField('accessibilityNeeds', e.target.value)}
                    placeholder="Wheelchair access, mobility support, etc. Leave blank if none."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Declaration & signature</CardTitle>
                <CardDescription>
                  Sign with your finger on a phone or with your mouse on a computer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  I confirm that the information provided in this graduation registration form is true
                  and complete to the best of my knowledge.
                </p>
                <div className="flex items-start gap-3 rounded-md border p-4">
                  <Checkbox
                    id="declarationAccepted"
                    checked={declarationAccepted}
                    onCheckedChange={(checked) => setDeclarationAccepted(checked === true)}
                  />
                  <Label htmlFor="declarationAccepted" className="cursor-pointer leading-snug">
                    I accept the declaration above *
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signatureSignedName">Printed name *</Label>
                  <Input
                    id="signatureSignedName"
                    required
                    value={signatureSignedName}
                    onChange={(e) => {
                      setSignatureSignedNameTouched(true);
                      setSignatureSignedName(e.target.value);
                    }}
                    placeholder="As it should appear under your signature"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Signature *</Label>
                  <SignaturePad ref={signaturePadRef} height={180} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Date of signing: {new Date().toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
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
