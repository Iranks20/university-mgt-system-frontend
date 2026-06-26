import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AdminGraduationRegistrationDialog from '@/screens/AdminGraduationRegistrationDialog';
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
  const [dialogEditing, setDialogEditing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GraduationRegistrationRow | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const openView = (row: GraduationRegistrationRow) => {
    setDialogEditing(false);
    setSelected(row);
  };

  const openEdit = (row: GraduationRegistrationRow) => {
    setDialogEditing(true);
    setSelected(row);
  };

  const handleSaved = (updated: GraduationRegistrationRow) => {
    setSelected(updated);
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleted = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    setSelected(null);
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await graduationRegistrationService.remove(deleteTarget.id);
      handleDeleted(deleteTarget.id);
      toast.success('Registration deleted.');
    } catch {
      toast.error('Delete failed.');
    } finally {
      setDeleting(false);
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
                placeholder="Search name, registration number, email…"
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
                  <TableHead>Registration number</TableHead>
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
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openView(row)}>
                            <Eye className="mr-1 h-4 w-4" /> View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            <Pencil className="mr-1 h-4 w-4" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      <AdminGraduationRegistrationDialog
        row={selected}
        open={!!selected}
        initialEditing={dialogEditing}
        onClose={() => setSelected(null)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this registration?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently remove the application for ${deleteTarget.fullName} (${deleteTarget.studentId}), including the stored signature.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
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
    </div>
  );
}
