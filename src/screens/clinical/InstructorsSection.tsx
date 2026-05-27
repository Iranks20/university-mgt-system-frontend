import { useCallback, useEffect, useState } from 'react';
import { Plus, Edit, UserPlus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { clinicalService } from '@/services/clinical.service';
import { clinicalActiveBadge } from './clinical-ui';
import { ClinicalTableCard } from './ClinicalTableCard';

type SiteOption = { id: string; name: string };

export type InstructorDirectoryRow = {
  id: string;
  clinicalInstructorId: string | null;
  staffId: string | null;
  staffNumber: string | null;
  profileType: 'university_linked' | 'external';
  fullName: string;
  email: string | null;
  phone: string | null;
  cadre: string | null;
  isActive: boolean;
  sites: Array<{ clinicalSiteId: string; siteName: string }>;
  campusCourseUnits: Array<{
    courseId: string;
    code: string;
    name: string;
    level: number | null;
    semester: number | null;
    className: string;
  }>;
  clinicalTopics: Array<{ topic: string; sessionCount: number; lastSessionDate: string | null }>;
  clinicalSessionCount: number;
};

type InstructorsSectionProps = {
  sites: SiteOption[];
  canManage: boolean;
};

const emptyExternalForm = () => ({
  fullName: '',
  cadre: '',
  phone: '',
  email: '',
  clinicalSiteId: '',
  isActive: true,
});

const profileTypeLabel: Record<InstructorDirectoryRow['profileType'], string> = {
  university_linked: 'University lecturer',
  external: 'External / preceptor',
};

function profileBadgeVariant(type: InstructorDirectoryRow['profileType']) {
  if (type === 'university_linked') return 'default' as const;
  return 'outline' as const;
}

function summarizeUnits(row: InstructorDirectoryRow) {
  const campus = row.campusCourseUnits.length;
  const clinical = row.clinicalTopics.length;
  if (campus === 0 && clinical === 0) return '—';
  const parts: string[] = [];
  if (campus > 0) parts.push(`${campus} campus`);
  if (clinical > 0) parts.push(`${clinical} clinical`);
  return parts.join(' · ');
}

export function InstructorsSection({ sites, canManage }: InstructorsSectionProps) {
  const [rows, setRows] = useState<InstructorDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'university' | 'external' | 'teaching'>('all');
  const [siteFilter, setSiteFilter] = useState('');

  const [detailRow, setDetailRow] = useState<InstructorDirectoryRow | null>(null);
  const [externalModalOpen, setExternalModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editing, setEditing] = useState<InstructorDirectoryRow | null>(null);
  const [externalForm, setExternalForm] = useState(emptyExternalForm());
  const [linkForm, setLinkForm] = useState({ staffId: '', cadre: '', clinicalSiteId: '' });
  const [linkLecturerSearch, setLinkLecturerSearch] = useState('');
  const [unlinkedLecturers, setUnlinkedLecturers] = useState<
    Array<{ staffId: string; staffNumber: string; fullName: string; email: string }>
  >([]);
  const [linkLecturersLoading, setLinkLecturersLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicalService.getInstructorDirectory({
        page: 1,
        limit: 200,
        search: search.trim() || undefined,
        clinicalSiteId: siteFilter || undefined,
        scope,
      });
      setRows((res.data || []) as InstructorDirectoryRow[]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load instructors');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, scope, siteFilter]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  const loadUnlinkedLecturers = useCallback(async (q: string) => {
    setLinkLecturersLoading(true);
    try {
      const data = await clinicalService.searchUnlinkedLecturers({
        search: q.trim() || undefined,
        limit: 50,
      });
      setUnlinkedLecturers(data);
    } catch {
      setUnlinkedLecturers([]);
    } finally {
      setLinkLecturersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!linkModalOpen) return;
    const t = setTimeout(() => loadUnlinkedLecturers(linkLecturerSearch), 280);
    return () => clearTimeout(t);
  }, [linkModalOpen, linkLecturerSearch, loadUnlinkedLecturers]);

  const openAddExternal = () => {
    setEditing(null);
    setExternalForm(emptyExternalForm());
    setExternalModalOpen(true);
  };

  const openEdit = (row: InstructorDirectoryRow) => {
    if (!row.clinicalInstructorId) return;
    setEditing(row);
    setExternalForm({
      fullName: row.fullName,
      cadre: row.cadre || '',
      phone: row.phone || '',
      email: row.email || '',
      clinicalSiteId: row.sites[0]?.clinicalSiteId || '',
      isActive: row.isActive,
    });
    setExternalModalOpen(true);
  };

  const openLink = () => {
    setLinkForm({ staffId: '', cadre: '', clinicalSiteId: '' });
    setLinkLecturerSearch('');
    setLinkModalOpen(true);
  };

  const saveExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalForm.fullName.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        fullName: externalForm.fullName.trim(),
        cadre: externalForm.cadre.trim() || undefined,
        phone: externalForm.phone.trim() || undefined,
        email: externalForm.email.trim() || undefined,
        isActive: externalForm.isActive,
        clinicalSiteIds: externalForm.clinicalSiteId ? [externalForm.clinicalSiteId] : undefined,
      };
      if (editing?.clinicalInstructorId) {
        await clinicalService.updateInstructor(editing.clinicalInstructorId, payload);
        toast.success('Instructor updated');
      } else {
        await clinicalService.createInstructor(payload);
        toast.success('External instructor added');
      }
      setExternalModalOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save instructor');
    } finally {
      setSaving(false);
    }
  };

  const saveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkForm.staffId) {
      toast.error('Select a university lecturer');
      return;
    }
    setSaving(true);
    try {
      await clinicalService.linkInstructorFromLecturer({
        staffId: linkForm.staffId,
        cadre: linkForm.cadre.trim() || undefined,
        clinicalSiteIds: linkForm.clinicalSiteId ? [linkForm.clinicalSiteId] : undefined,
      });
      toast.success('Lecturer registered for clinical teaching');
      setLinkModalOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to register lecturer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ClinicalTableCard
        title="Registered clinical instructors"
        total={rows.length}
        loading={loading}
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => openLink()}>
                <UserPlus className="mr-2 h-4 w-4" />
                Register university lecturer
              </Button>
              <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={openAddExternal}>
                <Plus className="mr-2 h-4 w-4" />
                Add external instructor
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Search by name, email, staff number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
            <SelectTrigger className="sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All registered</SelectItem>
              <SelectItem value="university">University (linked staff)</SelectItem>
              <SelectItem value="external">External / preceptors</SelectItem>
              <SelectItem value="teaching">Teaching at clinical (sessions)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={siteFilter || undefined} onValueChange={(v) => setSiteFilter(v)}>
            <SelectTrigger className="sm:w-[200px]">
              <SelectValue placeholder="All sites" />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {siteFilter ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSiteFilter('')}>
              Clear site filter
            </Button>
          ) : null}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Clinical sites</TableHead>
              <TableHead>Course units</TableHead>
              <TableHead>Clinical sessions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No registered instructors yet. Use Register university lecturer or Add external instructor.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.fullName}</div>
                    {row.staffNumber ? (
                      <div className="text-xs text-muted-foreground">{row.staffNumber}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant={profileBadgeVariant(row.profileType)}>{profileTypeLabel[row.profileType]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[160px]">
                    {row.sites.length === 0
                      ? '—'
                      : row.sites.map((s) => s.siteName).join(', ')}
                  </TableCell>
                  <TableCell className="text-sm">{summarizeUnits(row)}</TableCell>
                  <TableCell>{row.clinicalSessionCount > 0 ? row.clinicalSessionCount : '—'}</TableCell>
                  <TableCell>{clinicalActiveBadge(row.isActive)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => setDetailRow(row)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ClinicalTableCard>

      <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailRow && (
            <>
              <DialogHeader>
                <DialogTitle>{detailRow.fullName}</DialogTitle>
                <DialogDescription>
                  {profileTypeLabel[detailRow.profileType]}
                  {detailRow.email ? ` · ${detailRow.email}` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Campus course units (timetable)</h4>
                  {detailRow.campusCourseUnits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No campus class assignments.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Course unit</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Year / Sem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailRow.campusCourseUnits.map((u) => (
                          <TableRow key={`${u.courseId}-${u.className}`}>
                            <TableCell>{u.code}</TableCell>
                            <TableCell>{u.name}</TableCell>
                            <TableCell>{u.className}</TableCell>
                            <TableCell>
                              {u.level != null ? `Y${u.level}` : '—'}
                              {u.semester != null ? ` · S${u.semester}` : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Clinical teaching (recorded sessions)</h4>
                  {detailRow.clinicalTopics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No clinical sessions recorded yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Topic / course unit</TableHead>
                          <TableHead>Sessions</TableHead>
                          <TableHead>Last session</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailRow.clinicalTopics.map((t) => (
                          <TableRow key={t.topic}>
                            <TableCell>{t.topic}</TableCell>
                            <TableCell>{t.sessionCount}</TableCell>
                            <TableCell>{t.lastSessionDate || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {canManage && (
        <>
          <Dialog open={externalModalOpen} onOpenChange={setExternalModalOpen}>
            <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit instructor' : 'Add external instructor'}</DialogTitle>
                <DialogDescription>
                  Preceptors and guest tutors who are not on the university staff list.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={saveExternal} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input
                    value={externalForm.fullName}
                    onChange={(e) => setExternalForm((f) => ({ ...f, fullName: e.target.value }))}
                    required
                    disabled={!!editing?.staffId}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cadre</Label>
                  <Input
                    value={externalForm.cadre}
                    onChange={(e) => setExternalForm((f) => ({ ...f, cadre: e.target.value }))}
                    placeholder="e.g. Consultant"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={externalForm.phone}
                      onChange={(e) => setExternalForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={externalForm.email}
                      onChange={(e) => setExternalForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Primary clinical site (optional)</Label>
                  <Select
                    value={externalForm.clinicalSiteId || undefined}
                    onValueChange={(v) => setExternalForm((f) => ({ ...f, clinicalSiteId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={externalForm.isActive ? 'active' : 'inactive'}
                    onValueChange={(v) => setExternalForm((f) => ({ ...f, isActive: v === 'active' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setExternalModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]" disabled={saving}>
                    {saving ? 'Saving…' : editing ? 'Update' : 'Add instructor'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
            <DialogContent className="w-[96vw] max-w-lg">
              <DialogHeader>
                <DialogTitle>Register university lecturer</DialogTitle>
                <DialogDescription>
                  Link a staff lecturer to the clinical registry so they appear in session records and reports.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={saveLink} className="space-y-4">
                <div className="space-y-2">
                  <Label>University lecturer</Label>
                  <Input
                    placeholder="Search staff lecturers not yet registered…"
                    value={linkLecturerSearch}
                    onChange={(e) => setLinkLecturerSearch(e.target.value)}
                  />
                  <Select value={linkForm.staffId || undefined} onValueChange={(v) => setLinkForm((f) => ({ ...f, staffId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={linkLecturersLoading ? 'Loading…' : 'Select lecturer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {unlinkedLecturers.map((r) => (
                        <SelectItem key={r.staffId} value={r.staffId}>
                          {r.fullName}
                          {r.staffNumber ? ` (${r.staffNumber})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!linkLecturersLoading && unlinkedLecturers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No matching university lecturers to register.</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Clinical cadre (optional)</Label>
                  <Input
                    value={linkForm.cadre}
                    onChange={(e) => setLinkForm((f) => ({ ...f, cadre: e.target.value }))}
                    placeholder="e.g. Consultant"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Primary clinical site (optional)</Label>
                  <Select
                    value={linkForm.clinicalSiteId || undefined}
                    onValueChange={(v) => setLinkForm((f) => ({ ...f, clinicalSiteId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setLinkModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]" disabled={saving}>
                    {saving ? 'Registering…' : 'Register lecturer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
