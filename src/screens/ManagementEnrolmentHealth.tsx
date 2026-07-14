import React, { useEffect, useState } from 'react';
import { Loader2, School, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { analyticsService } from '@/services/analytics.service';

type EnrolmentHealth = {
  totalActiveStudents?: number;
  unassignedProgram?: number;
  bySchool?: Array<{ schoolName: string; schoolCode: string; studentCount: number }>;
  byProgram?: Array<{
    programName: string;
    programCode: string;
    schoolName: string;
    studentCount: number;
  }>;
  byYear?: Array<{ year: number; studentCount: number }>;
  intakes?: Array<{
    id: string;
    programName: string;
    programCode: string;
    year: number;
    semester: number;
    intakeType: string;
    activeStudents: number;
  }>;
};

export default function ManagementEnrolmentHealth() {
  const [data, setData] = useState<EnrolmentHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await analyticsService.getManagementEnrolmentHealth();
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Enrolment Health</h1>
        <p className="text-gray-500">
          Active cohort distribution by school, programme, year, and intake for oversight.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-[#015F2B]">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-500">Active students</p>
            <h3 className="text-3xl font-bold mt-1">
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
              ) : (
                (data?.totalActiveStudents ?? 0).toLocaleString()
              )}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#F6A000]">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-500">Schools represented</p>
            <h3 className="text-3xl font-bold mt-1">
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
              ) : (
                (data?.bySchool?.length ?? 0)
              )}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-gray-500">No programme assigned</p>
            <h3 className="text-3xl font-bold mt-1">
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin text-gray-400" />
              ) : (
                (data?.unassignedProgram ?? 0)
              )}
            </h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5 text-[#015F2B]" />
              By school
            </CardTitle>
            <CardDescription>Active students grouped by school.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.bySchool ?? []).map((row) => (
                    <TableRow key={`${row.schoolCode}-${row.schoolName}`}>
                      <TableCell className="font-medium">{row.schoolName}</TableCell>
                      <TableCell>{row.schoolCode}</TableCell>
                      <TableCell className="text-right">{row.studentCount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#015F2B]" />
              By year of study
            </CardTitle>
            <CardDescription>Active headcount by student year.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.byYear ?? []).map((row) => (
                    <TableRow key={row.year}>
                      <TableCell className="font-medium">Year {row.year}</TableCell>
                      <TableCell className="text-right">{row.studentCount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By programme</CardTitle>
          <CardDescription>Largest active programmes first.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Programme</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.byProgram ?? []).slice(0, 40).map((row) => (
                  <TableRow key={row.programCode + row.programName}>
                    <TableCell className="font-medium">{row.programName}</TableCell>
                    <TableCell>{row.programCode}</TableCell>
                    <TableCell>{row.schoolName}</TableCell>
                    <TableCell className="text-right">{row.studentCount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent intakes</CardTitle>
          <CardDescription>Programme intakes with active student counts.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Programme</TableHead>
                  <TableHead>Year / Sem</TableHead>
                  <TableHead>Intake</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.intakes ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.programName} ({row.programCode})
                    </TableCell>
                    <TableCell>
                      Y{row.year} · S{row.semester}
                    </TableCell>
                    <TableCell>{row.intakeType}</TableCell>
                    <TableCell className="text-right">{row.activeStudents.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
