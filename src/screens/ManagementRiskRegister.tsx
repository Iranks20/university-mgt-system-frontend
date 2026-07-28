import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, CalendarX, Loader2, TrendingDown, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { analyticsService } from '@/services/analytics.service';

type RiskPack = {
  thresholdPercent?: number;
  minSessions?: number;
  atRiskStudents?: Array<{
    id?: string;
    studentId?: string;
    name?: string;
    studentNumber?: string;
    attendanceRate?: number;
    percentage?: number;
  }>;
  worstLecturers?: Array<{
    id?: string;
    lecturerId?: string;
    name?: string;
    attendanceRate?: number;
    attendance?: number;
    untaught?: number;
    classesMissed?: number;
    issues?: string[];
  }>;
  queues?: {
    pendingCancellations?: number;
    pendingSubstitutions?: number;
  };
  teaching?: {
    taughtCount?: number;
    untaughtCount?: number;
    substitutedCount?: number;
    teachingRateFromRecorded?: number;
  };
};

export default function ManagementRiskRegister() {
  const [pack, setPack] = useState<RiskPack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await analyticsService.getManagementRiskPack(15);
        if (!cancelled) setPack(data);
      } catch {
        if (!cancelled) setPack(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const students = pack?.atRiskStudents ?? [];
  const lecturers = pack?.worstLecturers ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Risk Register</h1>
        <p className="text-gray-500">
          At-risk students, teaching shortfalls, and pending disruption queues for leadership review.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-500">At-risk students</p>
            <h3 className="text-3xl font-bold mt-1">
              {loading ? <Loader2 className="h-7 w-7 animate-spin text-gray-400" /> : students.length}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Below {pack?.thresholdPercent ?? '—'}% attendance
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-500">Untaught (30d)</p>
            <h3 className="text-3xl font-bold mt-1">
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
              ) : (
                (pack?.teaching?.untaughtCount ?? 0)
              )}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Teaching rate {pack?.teaching?.teachingRateFromRecorded != null
                ? `${pack.teaching.teachingRateFromRecorded.toFixed(1)}%`
                : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#F6A000]">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-500">Pending cancellations</p>
            <h3 className="text-3xl font-bold mt-1">
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
              ) : (
                (pack?.queues?.pendingCancellations ?? 0)
              )}
            </h3>
            <Button asChild variant="link" className="px-0 mt-1 h-auto">
              <Link to="/cancellations">Open queue</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-500">Pending substitutions</p>
            <h3 className="text-3xl font-bold mt-1">
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
              ) : (
                (pack?.queues?.pendingSubstitutions ?? 0)
              )}
            </h3>
            <Button asChild variant="link" className="px-0 mt-1 h-auto">
              <Link to="/cancellations">Open queue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#015F2B]" />
              Students below attendance threshold
            </CardTitle>
            <CardDescription>
              Same policy as analytics worst-students (min {pack?.minSessions ?? '—'} taught sessions).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No at-risk students in scope.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead className="text-right">Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s, idx) => {
                    const rate = s.attendanceRate ?? s.percentage ?? 0;
                    const id = s.id ?? s.studentId ?? String(idx);
                    return (
                      <TableRow key={id}>
                        <TableCell className="font-medium">{s.name ?? '—'}</TableCell>
                        <TableCell>{s.studentNumber ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={rate < 50 ? 'destructive' : 'secondary'}>
                            {Number(rate).toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <Link to="/management-student-performance">Student performance</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Lecturers with delivery issues
            </CardTitle>
            <CardDescription>Lowest teaching delivery rates and recurring untaught sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : lecturers.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No lecturer risks flagged.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lecturer</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lecturers.map((l, idx) => {
                    const rate = l.attendanceRate ?? l.attendance;
                    const missed = l.untaught ?? l.classesMissed;
                    return (
                    <TableRow key={l.id ?? l.lecturerId ?? String(idx)}>
                      <TableCell className="font-medium">{l.name ?? '—'}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {(l.issues && l.issues.length > 0
                          ? l.issues.join(', ')
                          : missed != null
                            ? `${missed} untaught`
                            : '—')}
                      </TableCell>
                      <TableCell className="text-right">
                        {rate != null ? `${Number(rate).toFixed(1)}%` : '—'}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <div className="mt-4 flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/management-lecturer-performance">Lecturer performance</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/cancellations">
                  <CalendarX className="h-4 w-4 mr-1" />
                  Disruptions
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {!loading && !pack && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-900">Could not load the risk pack. Try again later.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
