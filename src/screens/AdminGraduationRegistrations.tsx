import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  graduationRegistrationService,
  type GraduationClearanceStatus,
  type GraduationRegistrationRow,
  type GraduationRsvpStatus,
} from '@/services/graduation-registration.service';
import { toast } from 'sonner';

const ALL = '__all__';

function rsvpLabel(status: GraduationRsvpStatus) {
  return status === 'InAbsentia' ? 'In absentia' : 'Attending';
}

export default function AdminGraduationRegistrations() {
  const [rows, setRows] = useState<GraduationRegistrationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [cohort, setCohort] = useState(ALL);
  const [school, setSchool] = useState(ALL);
  const [program, setProgram] = useState(ALL);
  const [rsvp, setRsvp] = useState(ALL);
  const [clearance, setClearance] = useState(ALL);
  const [filterOptions, setFilterOptions] = useState({
    graduationCohorts: [] as string[],
    facultySchools: [] as string[],
    programNames: [] as string[],
  });
  const [selected, setSelected] = useState<GraduationRegistrationRow | null>(null);
  const [editClearance, setEditClearance] = useState<GraduationClearanceStatus>('Pending');
  const [editEscort, setEditEscort] = useState('');
  const [saving, setSaving] = useState(false);

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await graduationRegistrationService.list({
        page,
        limit: pageSize,
        search: search || undefined,
        graduationCohort: cohort !== ALL ? cohort : undefined,
        facultySchool: school !== ALL ? school : undefined,
        programName: program !== ALL ? program : undefined,
        rsvpStatus: rsvp !== ALL ? (rsvp as GraduationRsvpStatus) : undefined,
        institutionalClearance:
          clearance !== ALL ? (clearance as GraduationClearanceStatus) : undefined,
      });
      setRows(res.data);
      setTotal(res.total);
    } catch {
      toast.error('Unable to load registrations.');
    } finally {
      setLoading(false);
    }
  }, [page, search, cohort, school, program, rsvp, clearance]);

  useEffect(() => {
    graduationRegistrationService
      .getFilterOptions()
      .then((opts) => {
        if (opts) setFilterOptions(opts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await graduationRegistrationService.exportExcel({
        search: search || undefined,
        graduationCohort: cohort !== ALL ? cohort : undefined,
        facultySchool: school !== ALL ? school : undefined,
        programName: program !== ALL ? program : undefined,
        rsvpStatus: rsvp !== ALL ? (rsvp as GraduationRsvpStatus) : undefined,
        institutionalClearance:
          clearance !== ALL ? (clearance as GraduationClearanceStatus) : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded.');
    } catch {
      toast.error('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const openDetails = (row: GraduationRegistrationRow) => {
    setSelected(row);
    setEditClearance(row.institutionalClearance);
    setEditEscort(row.staffEscortAssigned || '');
  };

  const saveAdminFields = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await graduationRegistrationService.update(selected.id, {
        institutionalClearance: editClearance,
        staffEscortAssigned: editEscort.trim() || null,
      });
      setSelected(updated);
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success('Registration updated.');
    } catch {
      toast.error('Update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Graduation registrations</h1>
            <p className="text-sm text-muted-foreground">
              Submissions from the public form at /graduation-registration
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting} className="bg-[#015F2B] hover:bg-[#014a22]">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Excel
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, ID, email…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1);
                      setSearch(searchInput.trim());
                    }
                  }}
                />
              </div>
              <Button variant="outline" onClick={() => { setPage(1); setSearch(searchInput.trim()); }}>
                Search
              </Button>
              <Select value={cohort} onValueChange={(v) => { setCohort(v); setPage(1); }}>
                <SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Cohort" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All cohorts</SelectItem>
                  {filterOptions.graduationCohorts.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={school} onValueChange={(v) => { setSchool(v); setPage(1); }}>
                <SelectTrigger className="w-full lg:w-[200px]"><SelectValue placeholder="School" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All schools</SelectItem>
                  {filterOptions.facultySchools.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={program} onValueChange={(v) => { setProgram(v); setPage(1); }}>
                <SelectTrigger className="w-full lg:w-[200px]"><SelectValue placeholder="Program" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All programs</SelectItem>
                  {filterOptions.programNames.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={rsvp} onValueChange={(v) => { setRsvp(v); setPage(1); }}>
                <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="RSVP" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All RSVP</SelectItem>
                  <SelectItem value="Attending">Attending</SelectItem>
                  <SelectItem value="InAbsentia">In absentia</SelectItem>
                </SelectContent>
              </Select>
              <Select value={clearance} onValueChange={(v) => { setClearance(v); setPage(1); }}>
                <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Clearance" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All clearance</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="FullyCleared">Fully cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead>RSVP</TableHead>
                    <TableHead>Clearance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                        No registrations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, idx) => (
                      <TableRow key={row.id}>
                        <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                        <TableCell>{row.studentId}</TableCell>
                        <TableCell className="font-medium">{row.fullName}</TableCell>
                        <TableCell>{row.programName}</TableCell>
                        <TableCell>{row.graduationCohort}</TableCell>
                        <TableCell>{rsvpLabel(row.rsvpStatus)}</TableCell>
                        <TableCell>
                          <Badge variant={row.institutionalClearance === 'FullyCleared' ? 'default' : 'secondary'}>
                            {row.institutionalClearance === 'FullyCleared' ? 'Cleared' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDetails(row)}>
                            <Eye className="mr-1 h-4 w-4" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{total} total</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.fullName}</DialogTitle>
            <DialogDescription>{selected?.studentId} · {selected?.programName}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <Detail label="Email" value={selected.permanentContactEmail} />
              <Detail label="Date of birth" value={selected.dateOfBirth} />
              <Detail label="Nationality" value={selected.nationality} />
              <Detail label="School" value={selected.facultySchool} />
              <Detail label="Award" value={selected.awardClassification} />
              <Detail label="Cohort" value={selected.graduationCohort} />
              <Detail label="RSVP" value={rsvpLabel(selected.rsvpStatus)} />
              <Detail label="Gown size" value={selected.gownSize} />
              <Detail label="Guests" value={String(selected.guestCount)} />
              <Detail label="Parent / guardian" value={selected.parentGuardianName} />
              <Detail label="Sponsor" value={selected.sponsorOrganization || '—'} />
              <Detail label="Contact" value={selected.parentSponsorContact} />
              <Detail label="High school" value={selected.highSchoolAttended} className="md:col-span-2" />
              <Detail label="Previous qualifications" value={selected.previousQualifications || '—'} className="md:col-span-2" />
              <Detail label="Bio" value={selected.briefBioNotes || '—'} className="md:col-span-2" />
              <div className="space-y-2 md:col-span-2 border-t pt-4">
                <Label>Institutional clearance</Label>
                <Select value={editClearance} onValueChange={(v) => setEditClearance(v as GraduationClearanceStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="FullyCleared">Fully cleared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Staff escort assigned</Label>
                <Input value={editEscort} onChange={(e) => setEditEscort(e.target.value)} placeholder="Marshal or staff name" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            <Button onClick={saveAdminFields} disabled={saving} className="bg-[#015F2B] hover:bg-[#014a22]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
