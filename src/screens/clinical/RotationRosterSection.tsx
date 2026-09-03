import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { clinicalService } from '@/services/clinical.service';
import { CLINICAL_ROUTES } from '@/lib/clinical-routes';

type RotationRow = {
  id: string;
  name: string;
  clinicalCohortId?: string | null;
  cohort?: string | null;
  clinicalCohort?: { id: string; name: string } | null;
};

type RotationRosterSectionProps = {
  rotation: RotationRow | null;
  allRotations: RotationRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
};

export function RotationRosterSection({ rotation, open, onOpenChange }: RotationRosterSectionProps) {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRoster = useCallback(async () => {
    if (!rotation?.id) return;
    setLoading(true);
    try {
      const data = await clinicalService.getRotationRoster(rotation.id);
      setRoster(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load roster');
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [rotation?.id]);

  useEffect(() => {
    if (open && rotation) {
      loadRoster();
    }
  }, [open, rotation, loadRoster]);

  const cohortName = rotation?.clinicalCohort?.name || rotation?.cohort || 'linked cohort';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rotation?.name || 'Rotation roster'}</DialogTitle>
          <DialogDescription>
            Roster is live-linked to <strong>{cohortName}</strong>. Add or remove students under{' '}
            <a className="underline text-[#015F2B]" href={CLINICAL_ROUTES.cohorts}>
              Clinicals → Cohorts
            </a>
            .
          </DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Year / Sem</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : roster.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No students on this roster. Enroll them on the linked cohort.
                </TableCell>
              </TableRow>
            ) : (
              roster.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.student?.lastName}, {row.student?.firstName}
                  </TableCell>
                  <TableCell>{row.student?.studentNumber}</TableCell>
                  <TableCell>{row.student?.programRef?.code || row.student?.programRef?.name || '—'}</TableCell>
                  <TableCell>
                    Y{row.student?.year ?? '—'} · S{row.student?.semester ?? '—'}
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
