/**
 * QA Attendance Table Component
 * Displays QA attendance records in a table format
 */

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Filter, Clock, LogIn, LogOut } from 'lucide-react';
import type { QALecturerRecord } from '@/types/qa';
import { exportQARecords } from '@/utils/excel';

interface QAAttendanceTableProps {
  records: QALecturerRecord[];
  onExport?: () => void;
}

export function QAAttendanceTable({ records, onExport }: QAAttendanceTableProps) {
  const handleExport = () => {
    exportQARecords(records);
    onExport?.();
  };

  const getStatusBadgeVariant = (status: QALecturerRecord['status']) => {
    switch (status) {
      case 'Present':
        return 'default';
      case 'Absent':
        return 'destructive';
      case 'Late':
        return 'secondary';
      case 'Cancelled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Attendance Records ({records.length})</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lecturer</TableHead>
              <TableHead>Staff #</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Scheduled Time</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-gray-500 py-8">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              records.map((record, index) => {
                const formatTime = (date?: Date): string => {
                  if (!date) return '-';
                  const hours = date.getHours().toString().padStart(2, '0');
                  const minutes = date.getMinutes().toString().padStart(2, '0');
                  const seconds = date.getSeconds().toString().padStart(2, '0');
                  return `${hours}:${minutes}:${seconds}`;
                };

                const calculateDuration = (start?: Date, end?: Date): string => {
                  if (!start || !end) return '-';
                  const diff = end.getTime() - start.getTime();
                  const hours = Math.floor(diff / (1000 * 60 * 60));
                  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
                };

                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{record.lecturerName}</TableCell>
                    <TableCell>{record.staffNumber}</TableCell>
                    <TableCell>{record.department}</TableCell>
                    <TableCell>
                      <div>{record.courseCode}</div>
                      <div className="text-xs text-gray-500">{record.courseName}</div>
                    </TableCell>
                    <TableCell>{new Date(record.scheduledDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="text-sm">{record.scheduledTime || '-'}</div>
                    </TableCell>
                    <TableCell>
                      {record.actualStartTime ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <LogIn className="h-3 w-3" />
                          <span className="text-sm font-medium">{formatTime(record.actualStartTime)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.actualEndTime ? (
                        <div className="flex items-center gap-1 text-blue-600">
                          <LogOut className="h-3 w-3" />
                          <span className="text-sm font-medium">{formatTime(record.actualEndTime)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {record.actualStartTime && record.actualEndTime ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span className="text-sm font-medium">{calculateDuration(record.actualStartTime, record.actualEndTime)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{record.venue}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(record.status)}>
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{record.remarks || '-'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
