/**
 * Student Attendance Table Component
 * Displays student attendance in the CSV format structure
 */

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Download, Upload } from 'lucide-react';
import type { ProgramAttendanceData, StudentAttendanceReport } from '@/types/student';
import { exportStudentAttendanceToCSV, exportStudentAttendanceReport } from '@/utils/excel';

interface StudentAttendanceTableProps {
  programData: ProgramAttendanceData;
  onImport?: (file: File) => void;
}

export default function StudentAttendanceTable({ programData, onImport }: StudentAttendanceTableProps) {
  const handleExport = () => {
    exportStudentAttendanceToCSV(programData);
  };

  const handleExportStudent = (student: StudentAttendanceReport) => {
    exportStudentAttendanceReport(student);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{programData.programName}</CardTitle>
            <CardDescription>
              Student Attendance Records - {programData.students.length} students
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            {onImport && (
              <label>
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV or Excel
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NO</TableHead>
                <TableHead>NAMES</TableHead>
                <TableHead>REGISTRATION NUMBER</TableHead>
                {programData.weekRanges.map((range, index) => (
                  <React.Fragment key={index}>
                    {programData.courses.map((course, courseIndex) => (
                      <TableHead key={`${range}-${course}`} className="text-xs">
                        {course}
                      </TableHead>
                    ))}
                    {index < programData.weekRanges.length - 1 && (
                      <>
                        <TableHead>TOTALS</TableHead>
                        <TableHead>EXPECTED</TableHead>
                      </>
                    )}
                  </React.Fragment>
                ))}
                <TableHead>ATTENDED LECTURES</TableHead>
                <TableHead>EXPECTED LECTURES</TableHead>
                <TableHead>PRESENT PERCENTAGE</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programData.students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    No student records found.
                  </TableCell>
                </TableRow>
              ) : (
                programData.students.map((student, index) => (
                  <TableRow key={student.registrationNumber}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{student.studentName}</TableCell>
                    <TableCell>{student.registrationNumber}</TableCell>
                    {/* Render attendance data for each week */}
                    {student.weeklySummaries.map((week, weekIndex) => (
                      <React.Fragment key={weekIndex}>
                        {week.courses.map((course, courseIndex) => (
                          <TableCell key={courseIndex} className="text-center">
                            {course.days.filter(d => d.attended).length} / {course.days.length}
                          </TableCell>
                        ))}
                        {weekIndex < student.weeklySummaries.length - 1 && (
                          <>
                            <TableCell className="font-medium">
                              {week.totalAttended}
                            </TableCell>
                            <TableCell className="font-medium">
                              {week.totalExpected}
                            </TableCell>
                          </>
                        )}
                      </React.Fragment>
                    ))}
                    <TableCell className="font-medium">
                      {student.overallTotal.attendedLectures}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.overallTotal.expectedLectures}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.overallTotal.presentPercentage.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportStudent(student)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
