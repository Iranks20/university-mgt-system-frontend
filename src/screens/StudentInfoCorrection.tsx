import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, X } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  type StudentInfoAddressFormat,
  type StudentInfoHowHeard,
  type StudentInfoSearchResult,
  type StudentInfoSponsorType,
  studentInfoFormService,
  type StudentInfoFormOptions,
  type StudentInfoIntakeType,
  type StudentInfoLookupStudent,
} from '@/services/student-info-form.service';
import { toast } from 'sonner';

const HOW_HEARD: StudentInfoHowHeard[] = [
  'Facebook',
  'Twitter',
  'Our website',
  'LinkedIn',
  'Other',
];

function parseHowHeard(value: string | null | undefined): {
  channel: '' | StudentInfoHowHeard;
  other: string;
} {
  if (!value?.trim()) return { channel: '', other: '' };
  const trimmed = value.trim();
  if (HOW_HEARD.includes(trimmed as StudentInfoHowHeard)) {
    return { channel: trimmed as StudentInfoHowHeard, other: '' };
  }
  if (trimmed.toLowerCase().startsWith('other:')) {
    return { channel: 'Other', other: trimmed.slice(6).trim() };
  }
  return { channel: 'Other', other: trimmed };
}

function parseSponsor(student: StudentInfoLookupStudent): {
  funding: '' | 'Private' | 'Sponsored';
  kcdk: boolean;
  sponsorName: string;
  sponsorType: '' | StudentInfoSponsorType;
} {
  const raw = (student.sponsorType || '').trim();
  if (raw === 'Private') {
    return { funding: 'Private', kcdk: false, sponsorName: '', sponsorType: 'Private' };
  }
  if (raw === 'KCDK') {
    return { funding: 'Sponsored', kcdk: true, sponsorName: '', sponsorType: 'KCDK' };
  }
  if (raw === 'Other' || raw === 'Funded') {
    return {
      funding: 'Sponsored',
      kcdk: false,
      sponsorName: student.sponsorName || (raw === 'Funded' ? '' : student.sponsorName || ''),
      sponsorType: 'Other',
    };
  }
  return { funding: '', kcdk: false, sponsorName: student.sponsorName || '', sponsorType: '' };
}

const emptyForm = {
  studentNumber: '',
  fullName: '',
  email: '',
  phone: '',
  gender: '' as '' | 'Male' | 'Female' | 'Other',
  dateOfBirth: '',
  nationality: '',
  nin: '',
  oLevelSchool: '',
  aLevelSchool: '',
  maritalStatus: '' as '' | 'Married' | 'Single',
  fundingType: '' as '' | 'Private' | 'Sponsored',
  sponsoredByKcdk: false,
  sponsorName: '',
  permanentAddressFormat: 'Uganda' as StudentInfoAddressFormat,
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
  howHeardAboutUs: '' as '' | StudentInfoHowHeard,
  howHeardAboutUsOther: '',
  hasDisability: false,
  disabilityDetails: '',
  schoolId: '',
  programId: '',
  year: '1',
  semester: '1',
  intakeType: 'Day' as StudentInfoIntakeType,
  website: '',
};

export default function StudentInfoCorrection() {
  const [options, setOptions] = useState<StudentInfoFormOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<StudentInfoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [lookupToken, setLookupToken] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<StudentInfoSearchResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    studentInfoFormService
      .getPublicOptions()
      .then(setOptions)
      .catch(() => toast.error('Unable to load form options. Please refresh.'))
      .finally(() => setLoadingOptions(false));
  }, []);

  const programsForSchool = useMemo(() => {
    if (!options) return [];
    if (!form.schoolId) return options.programs;
    return options.programs.filter((p) => p.schoolId === form.schoolId);
  }, [options, form.schoolId]);

  const isUgandaAddress = form.permanentAddressFormat === 'Uganda';

  useEffect(() => {
    const term = searchTerm.trim();
    if (manualMode || selectedMatch || term.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const rows = await studentInfoFormService.searchStudents(term);
        if (!cancelled) {
          setSearchResults(rows);
          setShowResults(true);
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [manualMode, searchTerm, selectedMatch]);

  const setField = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resolveSchoolId = (
    programId: string | null | undefined,
    schoolIdFromApi: string | null | undefined,
    formOptions: StudentInfoFormOptions | null
  ) => {
    if (schoolIdFromApi) return schoolIdFromApi;
    if (!programId || !formOptions) return '';
    return formOptions.programs.find((p) => p.id === programId)?.schoolId || '';
  };

  const applyLookupStudent = async (
    studentNumber?: string,
    email?: string,
    formOptions: StudentInfoFormOptions | null = options
  ) => {
    try {
      const result = await studentInfoFormService.lookup({ studentNumber, email });
      if (result.found && result.student && result.lookupToken) {
        const s = result.student;
        const schoolId = resolveSchoolId(s.programId, s.schoolId, formOptions);
        const heard = parseHowHeard(s.howHeardAboutUs);
        const sponsor = parseSponsor(s);
        const format =
          s.permanentAddressFormat === 'International' ? 'International' : 'Uganda';
        setLookupToken(result.lookupToken);
        setManualMode(false);
        setForm({
          ...emptyForm,
          studentNumber: s.studentNumber,
          fullName: s.fullName,
          email: s.email,
          phone: s.phone || '',
          gender: (s.gender as typeof emptyForm.gender) || '',
          dateOfBirth: s.dateOfBirth || '',
          nationality: s.nationality || '',
          nin: s.nin || '',
          oLevelSchool: s.oLevelSchool || '',
          aLevelSchool: s.aLevelSchool || '',
          maritalStatus: (s.maritalStatus as typeof emptyForm.maritalStatus) || '',
          fundingType: sponsor.funding,
          sponsoredByKcdk: sponsor.kcdk,
          sponsorName: sponsor.sponsorName,
          permanentAddressFormat: format,
          village: s.village || '',
          parish: s.parish || '',
          subcounty: s.subcounty || '',
          county: s.county || '',
          district: s.district || s.homeDistrict || '',
          region: s.region || '',
          country: s.country || (format === 'Uganda' ? 'Uganda' : ''),
          homePlotStreet: s.homePlotStreet || '',
          poBoxNumber: s.poBoxNumber || '',
          intlStreetAddress: s.intlStreetAddress || s.physicalAddress || '',
          intlCity: s.intlCity || '',
          intlStateProvince: s.intlStateProvince || '',
          intlAreaLga: s.intlAreaLga || '',
          intlPostalCode: s.intlPostalCode || '',
          intlCountry: s.intlCountry || '',
          howHeardAboutUs: heard.channel,
          howHeardAboutUsOther: heard.other,
          hasDisability: Boolean(s.hasDisability),
          disabilityDetails: s.disabilityDetails || '',
          schoolId,
          programId: s.programId || '',
          year: String(s.year || 1),
          semester: String(s.semester || 1),
          intakeType: (s.intakeType as StudentInfoIntakeType) || 'Day',
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lookup failed');
    }
  };

  const selectMatch = async (row: StudentInfoSearchResult) => {
    setSelectedMatch(row);
    setSearchTerm(row.label);
    setSearchResults([]);
    setShowResults(false);
    await applyLookupStudent(row.studentNumber, row.email, options);
  };

  const startManual = () => {
    setSelectedMatch(null);
    setLookupToken(null);
    setManualMode(true);
    setShowResults(false);
    setSearchResults([]);
    setForm((prev) => ({
      ...emptyForm,
      studentNumber: prev.studentNumber,
      email: prev.email,
    }));
  };

  const clearSearchSelection = () => {
    setSelectedMatch(null);
    setLookupToken(null);
    setManualMode(false);
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
    setForm(emptyForm);
  };

  const resolveSponsorType = (): StudentInfoSponsorType | null => {
    if (form.fundingType === 'Private') return 'Private';
    if (form.fundingType === 'Sponsored') {
      if (form.sponsoredByKcdk) return 'KCDK';
      return 'Other';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.programId) {
      toast.error('Select a program');
      return;
    }
    const sponsorType = resolveSponsorType();
    if (!form.gender || !form.maritalStatus || !sponsorType || !form.howHeardAboutUs) {
      toast.error('Please complete all required fields');
      return;
    }
    if (sponsorType === 'Other' && !form.sponsorName.trim()) {
      toast.error('Enter the sponsor name');
      return;
    }
    if (form.howHeardAboutUs === 'Other' && !form.howHeardAboutUsOther.trim()) {
      toast.error('Please specify how you heard about us');
      return;
    }
    if (form.hasDisability && !form.disabilityDetails.trim()) {
      toast.error('Please describe the disability');
      return;
    }
    if (!form.nin.trim()) {
      toast.error('Enter National ID (NIN) or passport number');
      return;
    }
    if (!form.email.trim().toLowerCase().endsWith('@kcu.ac.ug')) {
      toast.error('Email must end with @kcu.ac.ug');
      return;
    }

    setSubmitting(true);
    try {
      await studentInfoFormService.submitPublic({
        website: form.website || undefined,
        lookupToken: lookupToken || undefined,
        studentNumber: form.studentNumber.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        nationality: form.nationality.trim(),
        nin: form.nin.trim(),
        oLevelSchool: form.oLevelSchool.trim(),
        aLevelSchool: form.aLevelSchool.trim() || null,
        maritalStatus: form.maritalStatus,
        sponsorType,
        sponsorName: sponsorType === 'Other' ? form.sponsorName.trim() : null,
        permanentAddressFormat: form.permanentAddressFormat,
        village: isUgandaAddress ? form.village.trim() : null,
        parish: isUgandaAddress ? form.parish.trim() : null,
        subcounty: isUgandaAddress ? form.subcounty.trim() : null,
        county: isUgandaAddress ? form.county.trim() : null,
        district: isUgandaAddress ? form.district.trim() : null,
        region: isUgandaAddress ? form.region.trim() : null,
        country: isUgandaAddress ? form.country.trim() || 'Uganda' : null,
        homePlotStreet: isUgandaAddress ? form.homePlotStreet.trim() : null,
        poBoxNumber: isUgandaAddress ? form.poBoxNumber.trim() || null : null,
        intlStreetAddress: !isUgandaAddress ? form.intlStreetAddress.trim() : null,
        intlCity: !isUgandaAddress ? form.intlCity.trim() : null,
        intlStateProvince: !isUgandaAddress ? form.intlStateProvince.trim() : null,
        intlAreaLga: !isUgandaAddress ? form.intlAreaLga.trim() || null : null,
        intlPostalCode: !isUgandaAddress ? form.intlPostalCode.trim() || null : null,
        intlCountry: !isUgandaAddress ? form.intlCountry.trim() : null,
        howHeardAboutUs: form.howHeardAboutUs,
        howHeardAboutUsOther:
          form.howHeardAboutUs === 'Other' ? form.howHeardAboutUsOther.trim() : null,
        hasDisability: form.hasDisability,
        disabilityDetails: form.hasDisability ? form.disabilityDetails.trim() : null,
        programId: form.programId,
        year: Number(form.year),
        semester: Number(form.semester),
        intakeType: form.intakeType,
        classIds: [],
      });
      setSubmitted(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-700" />
            </div>
            <CardTitle>Submission received</CardTitle>
            <p className="text-sm text-muted-foreground">
              Your details have been submitted for administrator review.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center">
            <img src={kcuUniversityLogo} alt="King Ceasor University" className="h-20 w-auto" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Student Information Form</h1>
          <p className="text-sm text-slate-600">
            Start by searching your registration number or university email. Select your record if
            it appears, or continue with manual entry if it does not.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={(e) => setField('website', e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          <Card>
            <CardHeader>
              <CardTitle>Registration Number or Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedMatch(null);
                    setLookupToken(null);
                    if (!manualMode) {
                      setForm(emptyForm);
                    }
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowResults(true);
                  }}
                  placeholder="Search registration number or @kcu.ac.ug email"
                  className="pl-9 pr-10"
                />
                {(selectedMatch || manualMode || searchTerm) && (
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    onClick={clearSearchSelection}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {searching && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              )}
              {showResults && searchResults.length > 0 && !selectedMatch && !manualMode && (
                <div className="rounded-md border bg-white shadow-sm">
                  {searchResults.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
                      onClick={() => void selectMatch(row)}
                    >
                      <div className="font-medium text-slate-900">{row.studentNumber}</div>
                      <div className="text-slate-600">{row.email}</div>
                    </button>
                  ))}
                </div>
              )}
              {!selectedMatch &&
                !manualMode &&
                searchTerm.trim().length >= 2 &&
                !searching &&
                searchResults.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>No match found.</span>
                    <Button type="button" variant="link" className="h-auto px-0" onClick={startManual}>
                      Enter details manually
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Registration Number *</Label>
                <Input
                  required
                  value={form.studentNumber}
                  onChange={(e) => setField('studentNumber', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Full Name *</Label>
                <Input
                  required
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email (@kcu.ac.ug) *</Label>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="name@kcu.ac.ug"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  required
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender *</Label>
                <Select value={form.gender} onValueChange={(v) => setField('gender', v as typeof form.gender)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.genders || ['Male', 'Female', 'Other']).map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth *</Label>
                <Input
                  required
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setField('dateOfBirth', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nationality *</Label>
                <Input
                  required
                  value={form.nationality}
                  onChange={(e) => setField('nationality', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>National ID (NIN) / Passport *</Label>
                <Input
                  required
                  value={form.nin}
                  onChange={(e) => setField('nin', e.target.value)}
                  placeholder="NIN or passport number"
                />
              </div>
              <div className="space-y-2">
                <Label>Marital Status *</Label>
                <Select
                  value={form.maritalStatus}
                  onValueChange={(v) => setField('maritalStatus', v as typeof form.maritalStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Funding *</Label>
                <Select
                  value={form.fundingType}
                  onValueChange={(v) => {
                    const funding = v as typeof form.fundingType;
                    setForm((prev) => ({
                      ...prev,
                      fundingType: funding,
                      sponsoredByKcdk: funding === 'Sponsored' ? prev.sponsoredByKcdk : false,
                      sponsorName: funding === 'Sponsored' ? prev.sponsorName : '',
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Private">Private (self-funded)</SelectItem>
                    <SelectItem value="Sponsored">Sponsored / funded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.fundingType === 'Sponsored' ? (
                <div className="space-y-3 sm:col-span-2 rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sponsoredByKcdk"
                      checked={form.sponsoredByKcdk}
                      onCheckedChange={(v) => {
                        const checked = Boolean(v);
                        setForm((prev) => ({
                          ...prev,
                          sponsoredByKcdk: checked,
                          sponsorName: checked ? '' : prev.sponsorName,
                        }));
                      }}
                    />
                    <Label htmlFor="sponsoredByKcdk">Sponsored by KCDK</Label>
                  </div>
                  {!form.sponsoredByKcdk ? (
                    <div className="space-y-2">
                      <Label>Sponsor name *</Label>
                      <Input
                        required
                        value={form.sponsorName}
                        onChange={(e) => setField('sponsorName', e.target.value)}
                        placeholder="Organisation or individual sponsor"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Home address</CardTitle>
              <CardDescription>
                Ugandan students use LC1–LC5 (country down to village). International students use
                the address format for their country.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Permanent home address *</Label>
                <Select
                  value={form.permanentAddressFormat}
                  onValueChange={(v) => {
                    const format = v as StudentInfoAddressFormat;
                    setForm((prev) => ({
                      ...prev,
                      permanentAddressFormat: format,
                      country: format === 'Uganda' ? prev.country || 'Uganda' : prev.country,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Uganda">Uganda (LC1–LC5)</SelectItem>
                    <SelectItem value="International">Outside Uganda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isUgandaAddress ? (
                <>
                  <div className="space-y-2">
                    <Label>Country *</Label>
                    <Input
                      required
                      value={form.country}
                      onChange={(e) => setField('country', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Region *</Label>
                    <Input
                      required
                      value={form.region}
                      onChange={(e) => setField('region', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>District (LC5) *</Label>
                    <Input
                      required
                      value={form.district}
                      onChange={(e) => setField('district', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>County (LC4) *</Label>
                    <Input
                      required
                      value={form.county}
                      onChange={(e) => setField('county', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subcounty (LC3) *</Label>
                    <Input
                      required
                      value={form.subcounty}
                      onChange={(e) => setField('subcounty', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Parish (LC2) *</Label>
                    <Input
                      required
                      value={form.parish}
                      onChange={(e) => setField('parish', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Village (LC1) *</Label>
                    <Input
                      required
                      value={form.village}
                      onChange={(e) => setField('village', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Home plot / street *</Label>
                    <Input
                      required
                      placeholder="e.g. Plot 29 Main Street"
                      value={form.homePlotStreet}
                      onChange={(e) => setField('homePlotStreet', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>P.O. Box number</Label>
                    <Input
                      value={form.poBoxNumber}
                      onChange={(e) => setField('poBoxNumber', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Country *</Label>
                    <Input
                      required
                      placeholder="e.g. Nigeria"
                      value={form.intlCountry}
                      onChange={(e) => setField('intlCountry', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State / province *</Label>
                    <Input
                      required
                      value={form.intlStateProvince}
                      onChange={(e) => setField('intlStateProvince', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City / town *</Label>
                    <Input
                      required
                      value={form.intlCity}
                      onChange={(e) => setField('intlCity', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Area / LGA / neighbourhood</Label>
                    <Input
                      value={form.intlAreaLga}
                      onChange={(e) => setField('intlAreaLga', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal / ZIP code</Label>
                    <Input
                      value={form.intlPostalCode}
                      onChange={(e) => setField('intlPostalCode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Street / house address *</Label>
                    <Input
                      required
                      placeholder="e.g. 12 Admiralty Way, Lekki"
                      value={form.intlStreetAddress}
                      onChange={(e) => setField('intlStreetAddress', e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Academic background</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  {isUgandaAddress
                    ? "Secondary School (O' Level) *"
                    : 'Secondary school (O-Level / JSS / equivalent) *'}
                </Label>
                <Input
                  required
                  value={form.oLevelSchool}
                  onChange={(e) => setField('oLevelSchool', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  {isUgandaAddress
                    ? "Secondary School (A' Level) *"
                    : 'Secondary school (A-Level / SS / equivalent)'}
                </Label>
                <Input
                  required={isUgandaAddress}
                  placeholder={
                    isUgandaAddress
                      ? undefined
                      : 'Optional if not applicable to your education pathway'
                  }
                  value={form.aLevelSchool}
                  onChange={(e) => setField('aLevelSchool', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Other information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>How did you hear about us? *</Label>
                <Select
                  value={form.howHeardAboutUs}
                  onValueChange={(v) =>
                    setField('howHeardAboutUs', v as typeof form.howHeardAboutUs)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.howHeardChannels || HOW_HEARD).map((channel) => (
                      <SelectItem key={channel} value={channel}>
                        {channel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.howHeardAboutUs === 'Other' ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Please specify *</Label>
                  <Input
                    required
                    value={form.howHeardAboutUsOther}
                    onChange={(e) => setField('howHeardAboutUsOther', e.target.value)}
                  />
                </div>
              ) : null}
              <div className="space-y-2 sm:col-span-2">
                <Label>Do you have any disability? *</Label>
                <Select
                  value={form.hasDisability ? 'Yes' : 'No'}
                  onValueChange={(v) => {
                    const yes = v === 'Yes';
                    setForm((prev) => ({
                      ...prev,
                      hasDisability: yes,
                      disabilityDetails: yes ? prev.disabilityDetails : '',
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No</SelectItem>
                    <SelectItem value="Yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.hasDisability ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Please describe *</Label>
                  <Textarea
                    required
                    value={form.disabilityDetails}
                    onChange={(e) => setField('disabilityDetails', e.target.value)}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Academic placement</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>School *</Label>
                <Select
                  value={form.schoolId}
                  onValueChange={(v) => {
                    setForm((prev) => ({ ...prev, schoolId: v, programId: '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.schools || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Program *</Label>
                <Select
                  value={form.programId}
                  onValueChange={(v) => {
                    const program = options?.programs.find((p) => p.id === v);
                    setForm((prev) => ({
                      ...prev,
                      programId: v,
                      schoolId: program?.schoolId || prev.schoolId,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programsForSchool.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year *</Label>
                <Select value={form.year} onValueChange={(v) => setField('year', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        Year {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semester *</Label>
                <Select value={form.semester} onValueChange={(v) => setField('semester', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        Semester {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Intake *</Label>
                <Select
                  value={form.intakeType}
                  onValueChange={(v) => setField('intakeType', v as StudentInfoIntakeType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.intakeTypes || ['Day', 'Evening', 'Weekend']).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting || loadingOptions}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className={submitting ? 'ml-2' : ''}>Submit for review</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
