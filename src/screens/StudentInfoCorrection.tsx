import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, X } from 'lucide-react';
import kcuUniversityLogo from '@/assets/images/kcu-university-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  type StudentInfoSearchResult,
  studentInfoFormService,
  type StudentInfoFormOptions,
  type StudentInfoIntakeType,
} from '@/services/student-info-form.service';
import { toast } from 'sonner';

const emptyForm = {
  studentNumber: '',
  fullName: '',
  email: '',
  phone: '',
  gender: '' as '' | 'Male' | 'Female' | 'Other',
  dateOfBirth: '',
  nationality: '',
  oLevelSchool: '',
  aLevelSchool: '',
  homeDistrict: '',
  maritalStatus: '' as '' | 'Married' | 'Single',
  sponsorType: '' as '' | 'Private' | 'Funded',
  physicalAddress: '',
  howHeardAboutUs: '',
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
          oLevelSchool: s.oLevelSchool || '',
          aLevelSchool: s.aLevelSchool || '',
          homeDistrict: s.homeDistrict || '',
          maritalStatus: (s.maritalStatus as typeof emptyForm.maritalStatus) || '',
          sponsorType: (s.sponsorType as typeof emptyForm.sponsorType) || '',
          physicalAddress: s.physicalAddress || '',
          howHeardAboutUs: s.howHeardAboutUs || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.programId) {
      toast.error('Select a program');
      return;
    }
    if (!form.gender || !form.maritalStatus || !form.sponsorType) {
      toast.error('Please complete all required fields');
      return;
    }
    if (form.hasDisability && !form.disabilityDetails.trim()) {
      toast.error('Please describe the disability');
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
        oLevelSchool: form.oLevelSchool.trim(),
        aLevelSchool: form.aLevelSchool.trim(),
        homeDistrict: form.homeDistrict.trim(),
        maritalStatus: form.maritalStatus,
        sponsorType: form.sponsorType,
        physicalAddress: form.physicalAddress.trim(),
        howHeardAboutUs: form.howHeardAboutUs.trim(),
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
                <Label>Home District *</Label>
                <Input
                  required
                  value={form.homeDistrict}
                  onChange={(e) => setField('homeDistrict', e.target.value)}
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
                <Label>Sponsor *</Label>
                <Select
                  value={form.sponsorType}
                  onValueChange={(v) => setField('sponsorType', v as typeof form.sponsorType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="Funded">Funded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Secondary School (O' Level) *</Label>
                <Input
                  required
                  value={form.oLevelSchool}
                  onChange={(e) => setField('oLevelSchool', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Secondary School (A' Level) *</Label>
                <Input
                  required
                  value={form.aLevelSchool}
                  onChange={(e) => setField('aLevelSchool', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Physical Address *</Label>
                <Textarea
                  required
                  value={form.physicalAddress}
                  onChange={(e) => setField('physicalAddress', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>How did you hear about us? *</Label>
                <Input
                  required
                  value={form.howHeardAboutUs}
                  onChange={(e) => setField('howHeardAboutUs', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.hasDisability}
                    onCheckedChange={(v) => setField('hasDisability', Boolean(v))}
                    id="hasDisability"
                  />
                  <Label htmlFor="hasDisability">Any Disability</Label>
                </div>
                {form.hasDisability && (
                  <Textarea
                    required
                    placeholder="Please describe"
                    value={form.disabilityDetails}
                    onChange={(e) => setField('disabilityDetails', e.target.value)}
                  />
                )}
              </div>
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
