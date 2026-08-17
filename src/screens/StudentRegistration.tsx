import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { enrollmentService } from '@/services';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type CatalogOffering = {
  classId: string;
  name: string;
  capacity: number;
  enrolledCount: number;
  seatsLeft: number;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  alreadyEnrolled: boolean;
  enrollmentId: string | null;
  course: { id: string; code: string; name: string; credits: number } | null;
};

type Catalog = {
  registrationOpen: boolean;
  eligible: boolean;
  term: {
    id: string;
    name: string;
    registrationStatus: string;
    registrationOpensAt: string | null;
    registrationClosesAt: string | null;
  } | null;
  offerings: CatalogOffering[];
};

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StudentRegistration() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await enrollmentService.getRegistrationCatalog();
      setCatalog(data as Catalog);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load registration catalog'));
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleEnroll = async (classId: string) => {
    setBusyId(classId);
    try {
      await enrollmentService.selfEnroll(classId);
      toast.success('Enrolled');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not enroll'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDrop = async (enrollmentId: string, classId: string) => {
    setBusyId(classId);
    try {
      await enrollmentService.selfDrop(enrollmentId);
      toast.success('Dropped');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not drop'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Course registration</h1>
        <p className="text-gray-500">
          Self-enroll into elective (Self) offerings while the Active term registration window is open.
          Required (Auto) courses are seated by the registrar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration status</CardTitle>
          <CardDescription>
            {catalog?.term?.name ?? 'No Active term'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-center">
          {catalog?.registrationOpen ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Open</Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Closed</Badge>
          )}
          {catalog?.eligible === false ? (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Not eligible</Badge>
          ) : null}
          <span className="text-sm text-muted-foreground">
            Status: {catalog?.term?.registrationStatus ?? '—'}
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Self courses</CardTitle>
          <CardDescription>
            Only courses marked Self appear here. Capacity and cohort rules still apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-muted-foreground">Loading…</p>
          ) : !catalog?.offerings?.length ? (
            <p className="p-6 text-muted-foreground">
              No self-enrollment offerings for your program and year right now.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalog.offerings.map((row) => {
                  const schedule =
                    row.dayOfWeek != null && row.startTime && row.endTime
                      ? `${dayNames[row.dayOfWeek] ?? ''} ${row.startTime}–${row.endTime}`
                      : 'Not scheduled';
                  return (
                    <TableRow key={row.classId}>
                      <TableCell>
                        <div className="font-medium">
                          {row.course?.code ?? ''} {row.course?.name ?? row.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{row.name}</div>
                      </TableCell>
                      <TableCell className="text-sm">{schedule}</TableCell>
                      <TableCell className="text-sm">
                        {row.enrolledCount}/{row.capacity} ({row.seatsLeft} left)
                      </TableCell>
                      <TableCell className="text-right">
                        {row.alreadyEnrolled && row.enrollmentId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              busyId === row.classId ||
                              !catalog.registrationOpen ||
                              !catalog.eligible
                            }
                            onClick={() => handleDrop(row.enrollmentId!, row.classId)}
                          >
                            {busyId === row.classId ? '…' : 'Drop'}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-[#015F2B] hover:bg-[#014a22]"
                            disabled={
                              busyId === row.classId ||
                              !catalog.registrationOpen ||
                              !catalog.eligible ||
                              row.seatsLeft <= 0
                            }
                            onClick={() => handleEnroll(row.classId)}
                          >
                            {busyId === row.classId ? '…' : 'Enroll'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
