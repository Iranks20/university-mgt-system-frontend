import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { clinicalService } from '@/services/clinical.service';
import { academicService } from '@/services/academic.service';
import { studentService } from '@/services/student.service';

export default function ClinicalRotations() {
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [rotations, setRotations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [siteSummary, setSiteSummary] = useState<any[]>([]);
  const [instructorFrequency, setInstructorFrequency] = useState<any[]>([]);

  const [newSite, setNewSite] = useState({ code: '', name: '', location: '' });
  const [newInstructor, setNewInstructor] = useState({ fullName: '', cadre: '', phone: '', email: '', clinicalSiteId: '' });
  const [newRotation, setNewRotation] = useState({
    name: '',
    clinicalSiteId: '',
    programId: '',
    cohort: '',
    year: '',
    intakeType: 'Day',
    startDate: '',
    endDate: '',
  });
  const [newSession, setNewSession] = useState({
    clinicalSiteId: '',
    clinicalRotationId: '',
    clinicalInstructorId: '',
    instructorName: '',
    topic: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
  });
  const [attendanceSessionId, setAttendanceSessionId] = useState('');
  const [attendanceRows, setAttendanceRows] = useState<Array<{ studentId: string; status: 'Present' | 'Absent' | 'Late' | 'Excused'; remarks: string }>>([]);

  const selectedSession = useMemo(() => sessions.find(s => s.id === attendanceSessionId) || null, [sessions, attendanceSessionId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sitesRes, instructorsRes, rotationsRes, sessionsRes, programsRes, studentsRes, siteSummaryRes, instructorFrequencyRes] = await Promise.all([
        clinicalService.getSites({ page: 1, limit: 200 }),
        clinicalService.getInstructors({ page: 1, limit: 200 }),
        clinicalService.getRotations({ page: 1, limit: 200 }),
        clinicalService.getSessions({ page: 1, limit: 200 }),
        academicService.getPrograms(),
        studentService.getStudents({ page: 1, limit: 200 }),
        clinicalService.getSiteSummary(),
        clinicalService.getInstructorFrequency(),
      ]);
      setSites(sitesRes.data || []);
      setInstructors(instructorsRes.data || []);
      setRotations(rotationsRes.data || []);
      setSessions(sessionsRes.data || []);
      setPrograms(Array.isArray(programsRes) ? programsRes : []);
      setStudents(studentsRes.data || []);
      setSiteSummary(siteSummaryRes || []);
      setInstructorFrequency(instructorFrequencyRes || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load clinical data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedSession) {
      setAttendanceRows([]);
      return;
    }
    const existing = new Map<string, any>((selectedSession.attendances || []).map((a: any) => [a.studentId, a]));
    setAttendanceRows(
      students.slice(0, 80).map((s: any) => ({
        studentId: s.id,
        status: existing.get(s.id)?.status || 'Present',
        remarks: existing.get(s.id)?.remarks || '',
      }))
    );
  }, [selectedSession, students]);

  const createSite = async () => {
    if (!newSite.code.trim() || !newSite.name.trim()) return toast.error('Site code and name are required');
    try {
      await clinicalService.createSite({ code: newSite.code.trim(), name: newSite.name.trim(), location: newSite.location.trim() || undefined });
      setNewSite({ code: '', name: '', location: '' });
      toast.success('Clinical site created');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create site');
    }
  };

  const createInstructor = async () => {
    if (!newInstructor.fullName.trim()) return toast.error('Instructor name is required');
    try {
      await clinicalService.createInstructor({
        fullName: newInstructor.fullName.trim(),
        cadre: newInstructor.cadre.trim() || undefined,
        phone: newInstructor.phone.trim() || undefined,
        email: newInstructor.email.trim() || undefined,
        clinicalSiteIds: newInstructor.clinicalSiteId ? [newInstructor.clinicalSiteId] : undefined,
      });
      setNewInstructor({ fullName: '', cadre: '', phone: '', email: '', clinicalSiteId: '' });
      toast.success('Instructor saved');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save instructor');
    }
  };

  const createRotation = async () => {
    if (!newRotation.name.trim() || !newRotation.clinicalSiteId) return toast.error('Rotation name and site are required');
    try {
      await clinicalService.createRotation({
        name: newRotation.name.trim(),
        clinicalSiteId: newRotation.clinicalSiteId,
        programId: newRotation.programId || null,
        cohort: newRotation.cohort || undefined,
        year: newRotation.year ? Number(newRotation.year) : null,
        intakeType: (newRotation.intakeType as any) || null,
        startDate: newRotation.startDate || undefined,
        endDate: newRotation.endDate || undefined,
      });
      setNewRotation({ name: '', clinicalSiteId: '', programId: '', cohort: '', year: '', intakeType: 'Day', startDate: '', endDate: '' });
      toast.success('Rotation created');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create rotation');
    }
  };

  const createSession = async () => {
    if (!newSession.clinicalSiteId || !newSession.topic.trim() || !newSession.date) return toast.error('Site, topic, and date are required');
    if (!newSession.clinicalInstructorId && !newSession.instructorName.trim()) return toast.error('Select an instructor or enter new name');
    try {
      await clinicalService.createSession({
        clinicalSiteId: newSession.clinicalSiteId,
        clinicalRotationId: newSession.clinicalRotationId || null,
        clinicalInstructorId: newSession.clinicalInstructorId || null,
        instructorName: newSession.instructorName.trim() || null,
        topic: newSession.topic.trim(),
        date: newSession.date,
        startTime: newSession.startTime || null,
        endTime: newSession.endTime || null,
        notes: newSession.notes || null,
      });
      setNewSession({
        clinicalSiteId: '',
        clinicalRotationId: '',
        clinicalInstructorId: '',
        instructorName: '',
        topic: '',
        date: '',
        startTime: '',
        endTime: '',
        notes: '',
      });
      toast.success('Clinical session recorded');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record session');
    }
  };

  const submitAttendance = async () => {
    if (!attendanceSessionId || attendanceRows.length === 0) return toast.error('Select session and attendance list');
    try {
      await clinicalService.markAttendance(attendanceSessionId, { attendances: attendanceRows });
      toast.success('Attendance saved');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save attendance');
    }
  };

  const verifySession = async (sessionId: string) => {
    try {
      await clinicalService.verifySession(sessionId);
      toast.success('Session verified');
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to verify session');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clinical Rotations</h1>
        <p className="text-sm text-gray-600">Presentation-ready flow for non-timetabled clinical teaching, attendance, and reporting.</p>
      </div>

      <Tabs defaultValue="sites" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="instructors">Instructors</TabsTrigger>
          <TabsTrigger value="rotations">Rotations</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="sites" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Clinical Site</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Input placeholder="Code (e.g. MNRH)" value={newSite.code} onChange={(e) => setNewSite(s => ({ ...s, code: e.target.value }))} />
              <Input placeholder="Site name" value={newSite.name} onChange={(e) => setNewSite(s => ({ ...s, name: e.target.value }))} />
              <Input placeholder="Location" value={newSite.location} onChange={(e) => setNewSite(s => ({ ...s, location: e.target.value }))} />
              <Button onClick={createSite}>Save Site</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Clinical Sites ({sites.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sites.map((s) => <TableRow key={s.id}><TableCell>{s.code}</TableCell><TableCell>{s.name}</TableCell><TableCell>{s.location || '-'}</TableCell><TableCell>{s.isActive ? 'Active' : 'Inactive'}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructors" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Instructor</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <Input placeholder="Full name" value={newInstructor.fullName} onChange={(e) => setNewInstructor(s => ({ ...s, fullName: e.target.value }))} />
              <Input placeholder="Cadre" value={newInstructor.cadre} onChange={(e) => setNewInstructor(s => ({ ...s, cadre: e.target.value }))} />
              <Input placeholder="Phone" value={newInstructor.phone} onChange={(e) => setNewInstructor(s => ({ ...s, phone: e.target.value }))} />
              <Input placeholder="Email" value={newInstructor.email} onChange={(e) => setNewInstructor(s => ({ ...s, email: e.target.value }))} />
              <Select value={newInstructor.clinicalSiteId} onValueChange={(v) => setNewInstructor(s => ({ ...s, clinicalSiteId: v }))}>
                <SelectTrigger><SelectValue placeholder="Attach site (optional)" /></SelectTrigger>
                <SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              <Button className="md:col-span-5" onClick={createInstructor}>Save Instructor</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Instructors ({instructors.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Cadre</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
                <TableBody>
                  {instructors.map((i) => <TableRow key={i.id}><TableCell>{i.fullName}</TableCell><TableCell>{i.cadre || '-'}</TableCell><TableCell>{i.phone || '-'}</TableCell><TableCell>{i.email || '-'}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rotations" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Create Rotation</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Input placeholder="Rotation name" value={newRotation.name} onChange={(e) => setNewRotation(s => ({ ...s, name: e.target.value }))} />
              <Select value={newRotation.clinicalSiteId} onValueChange={(v) => setNewRotation(s => ({ ...s, clinicalSiteId: v }))}>
                <SelectTrigger><SelectValue placeholder="Clinical site" /></SelectTrigger>
                <SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newRotation.programId} onValueChange={(v) => setNewRotation(s => ({ ...s, programId: v }))}>
                <SelectTrigger><SelectValue placeholder="Program (optional)" /></SelectTrigger>
                <SelectContent>{programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Cohort (e.g. MBChB Y3)" value={newRotation.cohort} onChange={(e) => setNewRotation(s => ({ ...s, cohort: e.target.value }))} />
              <Input placeholder="Year" type="number" value={newRotation.year} onChange={(e) => setNewRotation(s => ({ ...s, year: e.target.value }))} />
              <Select value={newRotation.intakeType} onValueChange={(v) => setNewRotation(s => ({ ...s, intakeType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Day">Day</SelectItem><SelectItem value="Evening">Evening</SelectItem><SelectItem value="Weekend">Weekend</SelectItem></SelectContent>
              </Select>
              <Input type="date" value={newRotation.startDate} onChange={(e) => setNewRotation(s => ({ ...s, startDate: e.target.value }))} />
              <Input type="date" value={newRotation.endDate} onChange={(e) => setNewRotation(s => ({ ...s, endDate: e.target.value }))} />
              <Button className="md:col-span-4" onClick={createRotation}>Save Rotation</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Rotations ({rotations.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Site</TableHead><TableHead>Cohort</TableHead><TableHead>Period</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rotations.map((r) => <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{r.clinicalSite?.name || '-'}</TableCell><TableCell>{r.cohort || '-'}</TableCell><TableCell>{r.startDate ? String(r.startDate).slice(0, 10) : '-'} to {r.endDate ? String(r.endDate).slice(0, 10) : '-'}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Record Clinical Session</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Select value={newSession.clinicalSiteId} onValueChange={(v) => setNewSession(s => ({ ...s, clinicalSiteId: v }))}>
                <SelectTrigger><SelectValue placeholder="Clinical site" /></SelectTrigger>
                <SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newSession.clinicalRotationId} onValueChange={(v) => setNewSession(s => ({ ...s, clinicalRotationId: v }))}>
                <SelectTrigger><SelectValue placeholder="Rotation (optional)" /></SelectTrigger>
                <SelectContent>{rotations.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={newSession.clinicalInstructorId} onValueChange={(v) => setNewSession(s => ({ ...s, clinicalInstructorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Existing instructor (optional)" /></SelectTrigger>
                <SelectContent>{instructors.map((i) => <SelectItem key={i.id} value={i.id}>{i.fullName}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Or type new instructor name" value={newSession.instructorName} onChange={(e) => setNewSession(s => ({ ...s, instructorName: e.target.value }))} />
              <Input placeholder="Session topic" value={newSession.topic} onChange={(e) => setNewSession(s => ({ ...s, topic: e.target.value }))} />
              <Input type="date" value={newSession.date} onChange={(e) => setNewSession(s => ({ ...s, date: e.target.value }))} />
              <Input type="time" value={newSession.startTime} onChange={(e) => setNewSession(s => ({ ...s, startTime: e.target.value }))} />
              <Input type="time" value={newSession.endTime} onChange={(e) => setNewSession(s => ({ ...s, endTime: e.target.value }))} />
              <Input className="md:col-span-3" placeholder="Notes (optional)" value={newSession.notes} onChange={(e) => setNewSession(s => ({ ...s, notes: e.target.value }))} />
              <Button onClick={createSession}>Save Session</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Sessions ({sessions.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Topic</TableHead><TableHead>Site</TableHead><TableHead>Instructor</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{String(s.date).slice(0, 10)}</TableCell>
                      <TableCell>{s.topic}</TableCell>
                      <TableCell>{s.clinicalSite?.name || '-'}</TableCell>
                      <TableCell>{s.instructorNameSnapshot || s.clinicalInstructor?.fullName || '-'}</TableCell>
                      <TableCell>{s.status}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => verifySession(s.id)} disabled={s.status === 'Verified'}>Verify</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Mark Student Attendance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Session</Label>
                  <Select value={attendanceSessionId} onValueChange={setAttendanceSessionId}>
                    <SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger>
                    <SelectContent>{sessions.map((s) => <SelectItem key={s.id} value={s.id}>{`${String(s.date).slice(0, 10)} - ${s.topic}`}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex items-end"><Button onClick={submitAttendance}>Save Attendance</Button></div>
              </div>
              {attendanceRows.length > 0 && (
                <div className="max-h-[420px] overflow-auto border rounded-md">
                  <Table>
                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {attendanceRows.map((row, idx) => {
                        const student = students.find((s: any) => s.id === row.studentId);
                        return (
                          <TableRow key={row.studentId}>
                            <TableCell>{student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.registrationNumber : row.studentId}</TableCell>
                            <TableCell>
                              <Select value={row.status} onValueChange={(v) => setAttendanceRows((prev) => prev.map((p, i) => i === idx ? { ...p, status: v as any } : p))}>
                                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Present">Present</SelectItem>
                                  <SelectItem value="Absent">Absent</SelectItem>
                                  <SelectItem value="Late">Late</SelectItem>
                                  <SelectItem value="Excused">Excused</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><Input value={row.remarks} onChange={(e) => setAttendanceRows((prev) => prev.map((p, i) => i === idx ? { ...p, remarks: e.target.value } : p))} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Site Activity Summary</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Site</TableHead><TableHead>Code</TableHead><TableHead>Total Sessions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {siteSummary.map((r, i) => <TableRow key={`${r.clinicalSiteId}-${i}`}><TableCell>{r.clinicalSiteName}</TableCell><TableCell>{r.clinicalSiteCode}</TableCell><TableCell>{r.totalSessions}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Instructor Frequency</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Instructor</TableHead><TableHead>Cadre</TableHead><TableHead>Sessions Taught</TableHead></TableRow></TableHeader>
                <TableBody>
                  {instructorFrequency.map((r, i) => <TableRow key={`${r.clinicalInstructorId}-${i}`}><TableCell>{r.fullName}</TableCell><TableCell>{r.cadre || '-'}</TableCell><TableCell>{r.sessionsTaught}</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && <div className="text-sm text-gray-500">Loading clinical workspace...</div>}
    </div>
  );
}
