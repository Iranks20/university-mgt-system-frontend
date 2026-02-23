import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, BookOpen, Calendar, Settings, Database, 
  Plus, Search, Filter, Edit, Trash2, MapPin, Building,
  MoreHorizontal, FileSpreadsheet, Shield, School, User as UserIcon,
  Upload, Download, BookMarked, Loader2, ChevronDown, ChevronRight,
  GraduationCap, Briefcase, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { studentService, staffService, academicService, enrollmentService } from '@/services';
import { adminService } from '@/services/admin.service';
import { timetableService, type TimetableClass } from '@/services/timetable.service';
import { downloadStudentImportTemplateExcel, downloadStaffImportTemplateExcel, downloadLecturerImportTemplateExcel } from '@/utils/excel';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router';

type StudentRow = { id: string; name: string; email: string; studentId: string; dept: string; year: string; status: string; programId?: string; departmentId?: string; semester?: number };
type StaffRow = { id: string; name: string; email: string; role: string; dept: string; departmentId?: string; status: string };
type ClassRow = { id: string; name: string; course: string; courseId: string; lecturerId: string | null; lecturerName: string; students: number; room: string };
type CourseRow = { id: string; code: string; name: string; dept: string; credits?: number };
type SchoolRow = { id: string; name: string; dean: string | null; depts: number; students: number; staff: number };
type VenueRow = { id: string; name: string; code: string; type: string; capacity: number; building: string; floor: number | null; facilities: string | null };

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Student Management Tab (with Import, Add, Enroll in classes)
// -----------------------------------------------------------------------------
function StudentsTab({
  students,
  setStudents,
  classes,
  setClasses,
  enrollmentsByClassId,
  setEnrollmentsByClassId,
  studentsPage,
  studentsTotal,
  pageSize,
  loadStudents,
}: {
  students: StudentRow[];
  setStudents: React.Dispatch<React.SetStateAction<StudentRow[]>>;
  classes: ClassRow[];
  setClasses: React.Dispatch<React.SetStateAction<ClassRow[]>>;
  enrollmentsByClassId: Record<string, string[]>;
  setEnrollmentsByClassId: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  studentsPage: number;
  studentsTotal: number;
  pageSize: number;
  loadStudents: (page: number) => Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string; code?: string; schoolId?: string; schoolName?: string }[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [addForm, setAddForm] = useState({ name: '', email: '', studentId: '', schoolId: '', program: '', year: 'Year 1', semester: '1', tempPassword: 'TempPassword123!' });
  const [addPreviewCourses, setAddPreviewCourses] = useState<any[]>([]);
  const [addPreviewLoading, setAddPreviewLoading] = useState(false);
  const [addSelectedCourseIds, setAddSelectedCourseIds] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', studentId: '', schoolId: '', program: '', year: 'Year 1', semester: '1' });
  const [previewCourses, setPreviewCourses] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [currentEnrollments, setCurrentEnrollments] = useState<string[]>([]);
  const [importCreateAccounts, setImportCreateAccounts] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      setDepartmentsLoading(true);
      try {
        const [schoolsList, depts] = await Promise.all([
          academicService.getSchools(),
          academicService.getDepartments(),
        ]);
        const schoolsData = Array.isArray(schoolsList) ? schoolsList : (schoolsList as any)?.data ?? [];
        const deptList = Array.isArray(depts) ? depts : (depts as any)?.data ?? [];
        const schoolMap = new Map(schoolsData.map((s: any) => [s.id, s.name]));
        const deptsWithSchools = deptList.map((d: any) => ({
          id: d.id || d.name,
          name: d.name,
          code: d.code,
          schoolId: d.schoolId,
          schoolName: d.schoolId ? schoolMap.get(d.schoolId) : undefined,
        }));
        setSchools(schoolsData.map((s: any) => ({ id: s.id, name: s.name })));
        setDepartments(deptsWithSchools);
        if (!addForm.schoolId && schoolsData.length > 0) {
          setAddForm(prev => ({ ...prev, schoolId: (schoolsData as any)[0].id }));
        }
      } catch (error) {
        console.error('Error loading schools/departments:', error);
      } finally {
        setDepartmentsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (addForm.program) {
      const duration = 4;
      const currentYear = parseInt(addForm.year.replace('Year ', ''));
      if (currentYear > duration) {
        setAddForm(prev => ({ ...prev, year: 'Year 1' }));
      }
    }
  }, [addForm.program]);

  useEffect(() => {
    const loadAddPreview = async () => {
      if (!addForm.program || !addForm.year || !addOpen) {
        setAddPreviewCourses([]);
        setAddSelectedCourseIds([]);
        return;
      }

      setAddPreviewLoading(true);
      try {
        const dept = departments.find(d => d.id === addForm.program);
        const year = parseInt(addForm.year.replace('Year ', ''));
        const semester = parseInt(addForm.semester);

        const courses = await enrollmentService.previewCourses({
          departmentId: dept?.id,
          program: dept?.name || '',
          year,
          semester,
        });

        setAddPreviewCourses(courses);
        setAddSelectedCourseIds(courses.map((c: any) => c.id));
      } catch (error) {
        console.error('Error loading preview courses:', error);
        setAddPreviewCourses([]);
        setAddSelectedCourseIds([]);
      } finally {
        setAddPreviewLoading(false);
      }
    };

    if (addOpen) {
      loadAddPreview();
    }
  }, [addForm.program, addForm.year, addForm.semester, addOpen, departments]);

  useEffect(() => {
    if (editForm.program) {
      const duration = 4;
      const currentYear = parseInt(editForm.year.replace('Year ', ''));
      if (currentYear > duration) {
        setEditForm(prev => ({ ...prev, year: 'Year 1' }));
      }
    }
  }, [editForm.program]);

  useEffect(() => {
    const loadPreview = async () => {
      if (!editForm.program || !editForm.year || !editingStudent) {
        setPreviewCourses([]);
        setSelectedCourseIds([]);
        return;
      }

      setPreviewLoading(true);
      try {
        const dept = departments.find(d => d.id === editForm.program);
        const year = parseInt(editForm.year.replace('Year ', ''));
        const semester = parseInt(editForm.semester);

        const [courses, enrollments] = await Promise.all([
          enrollmentService.previewCourses({
            departmentId: dept?.id,
            program: dept?.name || editForm.program,
            year,
            semester,
          }),
          enrollmentService.getStudentEnrollments(editingStudent.id),
        ]);

        setPreviewCourses(courses);
        const enrolledClassIds = (enrollments as any[]).map((e: any) => e.classId || e.class?.id).filter(Boolean);
        setCurrentEnrollments(enrolledClassIds);
        setSelectedCourseIds(enrolledClassIds);
      } catch (error) {
        console.error('Error loading preview courses:', error);
        setPreviewCourses([]);
        setSelectedCourseIds([]);
      } finally {
        setPreviewLoading(false);
      }
    };

    if (editOpen && editingStudent) {
      loadPreview();
    }
  }, [editForm.program, editForm.year, editForm.semester, editOpen, editingStudent, departments]);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.includes(searchTerm) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const [firstName, ...lastNameParts] = addForm.name.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;
      const year = parseInt(addForm.year.replace('Year ', ''));
      const semester = parseInt(addForm.semester);

      const dept = departments.find(d => d.id === addForm.program);

      if (!dept) {
        toast.error('Please select a school and program');
        return;
      }

      const newStudent = await studentService.createStudent({
        firstName,
        lastName,
        email: addForm.email,
        studentNumber: addForm.studentId,
        programId: null,
        program: dept.name,
        year,
        semester,
        departmentId: dept.id,
        createAccount: true,
        tempPassword: addForm.tempPassword || undefined,
      } as any);

      // Handle enrollments if courses are selected
      if (addSelectedCourseIds.length > 0) {
        let enrollmentSuccessCount = 0;
        let enrollmentSkippedCount = 0;
        const enrollmentErrors: string[] = [];

        for (const classId of addSelectedCourseIds) {
          try {
            await enrollmentService.createEnrollment({
              studentId: newStudent.id,
              classId,
              status: 'Active',
            });
            enrollmentSuccessCount++;
          } catch (error: any) {
            if (error?.code === 'ENROLLMENT_ALREADY_EXISTS') {
              enrollmentSkippedCount++;
            } else {
              enrollmentErrors.push(error?.message || 'Failed to enroll in class');
            }
          }
        }

        if (enrollmentSuccessCount > 0 || enrollmentSkippedCount > 0) {
          toast.success(`Student created. Enrollments: ${enrollmentSuccessCount} added${enrollmentSkippedCount > 0 ? `, ${enrollmentSkippedCount} skipped` : ''}`);
        }
        if (enrollmentErrors.length > 0) {
          toast.error(`Some enrollment operations failed: ${enrollmentErrors.slice(0, 3).join(', ')}`);
        }
      }
      
      await loadStudents(1);

      // Refresh enrollments
      const allEnrollments: Record<string, string[]> = {};
      for (const cls of classes) {
        const clsEnrollments = await enrollmentService.getClassEnrollments(cls.id);
        const clsEnrollmentsData = (clsEnrollments as any)?.data || clsEnrollments;
        allEnrollments[cls.id] = Array.isArray(clsEnrollmentsData) 
          ? clsEnrollmentsData.map((e: any) => e.studentId || e.student?.id).filter(Boolean)
          : [];
      }
      setEnrollmentsByClassId(allEnrollments);
      
      setAddForm({ name: '', email: '', studentId: '', schoolId: schools[0]?.id || '', program: '', year: 'Year 1', semester: '1', tempPassword: 'TempPassword123!' });
      setAddPreviewCourses([]);
      setAddSelectedCourseIds([]);
      setAddOpen(false);
      toast.success('Student added successfully');
    } catch (error: any) {
      console.error('Error adding student:', error);
      const errorMessage = error?.message || error?.errors?.[0]?.message || 'Failed to add student';
      toast.error(`Failed to add student: ${errorMessage}`);
    }
  };


  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { toast.error('Please select a CSV or Excel file.'); return; }
    
    try {
      const result = await studentService.importStudents(file, importCreateAccounts);
      const resultData = result as { imported: number; failed: number; errors?: string[]; enrolled?: number; enrollmentSkipped?: number; enrollmentErrors?: string[] };
      const enrolledMsg = (resultData.enrolled ?? 0) > 0 ? `, Enrolled: ${resultData.enrolled}` : '';
      const skippedMsg = (resultData.enrollmentSkipped ?? 0) > 0 ? `, Skipped: ${resultData.enrollmentSkipped}` : '';
      toast.success(`Import completed! Imported: ${resultData.imported}, Failed: ${resultData.failed}${enrolledMsg}${skippedMsg}${resultData.errors && resultData.errors.length > 0 ? `. Errors: ${resultData.errors.slice(0, 3).join(', ')}${resultData.errors.length > 3 ? '...' : ''}` : ''}`);
      if (resultData.enrollmentErrors && resultData.enrollmentErrors.length > 0) {
        toast.warning(`Some enrollment issues: ${resultData.enrollmentErrors.slice(0, 2).join(', ')}${resultData.enrollmentErrors.length > 2 ? '...' : ''}`);
      }
      
      await loadStudents(1);
      setImportOpen(false);
    } catch (error: any) {
      console.error('Error importing students:', error);
      toast.error(`Failed to import students: ${error?.message || 'Unknown error'}`);
    }
  };

  const studentTemplateCsv = 'name,email,studentId,school,program,year,semester,password\nJohn Doe,john.doe@student.kcu.ac.ug,2100101,School of Business,Business Administration,Year 1,1,TempPassword123!\nJane Smith,jane.smith@student.kcu.ac.ug,2100102,School of Medicine,Medicine and Surgery,Year 1,2,TempPassword123!';

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Import</Button>
          <Button className="bg-[#015F2B]" onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Student</Button>
        </div>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#015F2B]/10 text-[#015F2B]">{student.name.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{student.studentId}</TableCell>
                <TableCell>{student.dept}</TableCell>
                <TableCell>{student.year}</TableCell>
                <TableCell>
                  <Badge variant={student.status === 'Active' ? 'default' : 'destructive'} className={student.status === 'Active' ? 'bg-[#015F2B] hover:bg-[#015F2B]/90' : ''}>{student.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingStudent(student);
                        const studentData = students.find(s => s.id === student.id);
                        const dept = studentData?.departmentId
                          ? departments.find(d => d.id === studentData.departmentId)
                          : departments.find(d => d.name === student.dept);
                        setEditForm({
                          name: student.name,
                          email: student.email,
                          studentId: student.studentId,
                          schoolId: dept?.schoolId ?? '',
                          program: dept?.id ?? '',
                          year: student.year,
                          semester: String(studentData?.semester ?? 1),
                        });
                        setPreviewCourses([]);
                        setSelectedCourseIds([]);
                        setCurrentEnrollments([]);
                        setEditOpen(true);
                      }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={async () => {
                        if (confirm(`Delete student "${student.name}"?`)) {
                          try {
                            await studentService.deleteStudent(student.id);
                            setStudents(prev => prev.filter(s => s.id !== student.id));
                          } catch (error: any) {
                            console.error('Error deleting student:', error);
                            toast.error(`Failed to delete student: ${error?.message || 'Unknown error'}`);
                          }
                        }
                      }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {studentsTotal > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-2">
            <span className="text-sm text-muted-foreground">
              {studentsTotal} total
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={studentsPage <= 1} onClick={() => loadStudents(studentsPage - 1)}>
                Previous
              </Button>
              <span className="text-sm">
                Page {studentsPage} of {Math.max(1, Math.ceil(studentsTotal / pageSize))}
              </span>
              <Button variant="outline" size="sm" disabled={studentsPage >= Math.ceil(studentsTotal / pageSize)} onClick={() => loadStudents(studentsPage + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => {
        setAddOpen(open);
        if (open && !addForm.schoolId && schools.length > 0) {
          setAddForm(prev => ({ ...prev, schoolId: schools[0].id }));
        }
        if (!open) {
          setAddPreviewCourses([]);
          setAddSelectedCourseIds([]);
        }
      }}>
        <DialogContent className="w-[98vw] max-w-[1600px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Student & Manage Enrollment</DialogTitle>
            <DialogDescription>Create a student record and manage course enrollments.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-6 px-1">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label>Full Name</Label>
                  <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. John Doe" className="w-full" />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Email</Label>
                  <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required placeholder="name@student.kcu.ac.ug" className="w-full" />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Registration / Student ID</Label>
                  <Input value={addForm.studentId} onChange={e => setAddForm(f => ({ ...f, studentId: e.target.value }))} required placeholder="e.g. 2100123" className="w-full" />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Password (for account creation)</Label>
                  <Input type="password" value={addForm.tempPassword} onChange={e => setAddForm(f => ({ ...f, tempPassword: e.target.value }))} placeholder="Leave empty for default password" className="w-full" />
                  <p className="text-xs text-gray-500">Default: TempPassword123! (if left empty)</p>
                </div>
              </div>
            </div>

            {/* Academic Information Section */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold text-gray-900">Academic Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label>School</Label>
                  {departmentsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : (
                    <Select value={addForm.schoolId} onValueChange={v => setAddForm(f => ({ ...f, schoolId: v, program: '' }))} required>
                      <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select school" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Program</Label>
                  {departmentsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : (
                    <Select value={addForm.program} onValueChange={v => setAddForm(f => ({ ...f, program: v }))} required>
                      <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select program" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {addForm.schoolId ? (
                          departments
                            .filter(d => String(d.schoolId) === String(addForm.schoolId))
                            .map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name} {d.code ? `(${d.code})` : ''}
                              </SelectItem>
                            ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-gray-500">Select a school first</div>
                        )}
                        {addForm.schoolId && departments.filter(d => String(d.schoolId) === String(addForm.schoolId)).length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-gray-500">No programs in this school</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Year</Label>
                  <Select value={addForm.year} onValueChange={v => setAddForm(f => ({ ...f, year: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 4 }, (_, i) => i + 1).map((year) => (
                        <SelectItem key={year} value={`Year ${year}`}>
                          Year {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {addForm.program && (() => {
                    const selectedDept = departments.find(d => d.id === addForm.program);
                    return (
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedDept ? `${selectedDept.name} (4-year program)` : ''}
                      </p>
                    );
                  })()}
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Semester</Label>
                  <Select value={addForm.semester} onValueChange={v => setAddForm(f => ({ ...f, semester: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select semester" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Course Enrollment Section */}
            {addForm.program && addForm.year && (
              <div className="space-y-4">
                <div className="border-b pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Course Enrollment</h3>
                  {addPreviewLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                </div>
                {addPreviewLoading ? (
                  <div className="text-sm text-gray-500 py-8 text-center">Loading available courses...</div>
                ) : addPreviewCourses.length === 0 ? (
                  <div className="text-sm text-gray-500 py-8 text-center border rounded-md bg-gray-50">
                    No courses found for {departments.find(d => d.id === addForm.program)?.name || addForm.program} - Year {addForm.year.replace('Year ', '')} - Semester {addForm.semester}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Select courses to enroll the student in:</span>
                      <span className="font-medium">{addSelectedCourseIds.length} of {addPreviewCourses.length} selected</span>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                      <div className="overflow-x-visible">
                        <Table className="w-full table-auto">
                          <TableHeader className="sticky top-0 bg-white z-10 border-b">
                            <TableRow>
                              <TableHead className="w-12 px-3"></TableHead>
                              <TableHead className="w-[120px] px-3">Course Code</TableHead>
                              <TableHead className="min-w-[250px] px-3">Course Name</TableHead>
                              <TableHead className="w-[140px] px-3">Class</TableHead>
                              <TableHead className="min-w-[180px] px-3">Lecturer</TableHead>
                              <TableHead className="w-[130px] px-3">Schedule</TableHead>
                              <TableHead className="w-[140px] px-3">Venue</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {addPreviewCourses.map((cls) => {
                              const isChecked = addSelectedCourseIds.includes(cls.id);
                              return (
                                <TableRow key={cls.id} className={isChecked ? 'bg-green-50/50' : ''}>
                                  <TableCell className="px-3">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setAddSelectedCourseIds(prev => [...prev, cls.id]);
                                        } else {
                                          setAddSelectedCourseIds(prev => prev.filter(id => id !== cls.id));
                                        }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium px-3">{cls.course?.code || '—'}</TableCell>
                                  <TableCell className="px-3">
                                    <div className="text-sm break-words">{cls.course?.name || '—'}</div>
                                    {cls.course && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        {cls.course.credits} credit{cls.course.credits !== 1 ? 's' : ''}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm px-3 break-words">{cls.name}</TableCell>
                                  <TableCell className="text-sm px-3 break-words">{cls.lecturer?.name || '—'}</TableCell>
                                  <TableCell className="text-sm px-3 whitespace-nowrap">
                                    {cls.dayOfWeek !== null && cls.startTime && cls.endTime ? (
                                      <div>
                                        <div className="font-medium">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][cls.dayOfWeek]}</div>
                                        <div className="text-xs text-gray-500">{cls.startTime} - {cls.endTime}</div>
                                      </div>
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm px-3 break-words">
                                    {cls.venue ? (
                                      <div>
                                        <div>{cls.venue.name}</div>
                                        {cls.venue.code && <div className="text-xs text-gray-500">{cls.venue.code}</div>}
                                      </div>
                                    ) : (
                                      '—'
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <span>
                        {addSelectedCourseIds.length > 0 
                          ? `${addSelectedCourseIds.length} course${addSelectedCourseIds.length !== 1 ? 's' : ''} will be enrolled`
                          : 'No courses selected'}
                      </span>
                      {addSelectedCourseIds.length !== addPreviewCourses.length && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setAddSelectedCourseIds(addPreviewCourses.map(c => c.id))}
                        >
                          Select All
                        </Button>
                      )}
                      {addSelectedCourseIds.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setAddSelectedCourseIds([])}
                        >
                          Deselect All
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Account Settings */}
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold text-gray-900">Account Settings</h3>
              </div>
              <div className="space-y-2">
                <Label>Temporary password (for first login)</Label>
                <Input type="password" value={addForm.tempPassword} onChange={e => setAddForm(f => ({ ...f, tempPassword: e.target.value }))} placeholder="Leave blank to send reset link" />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setAddOpen(false);
                  setAddPreviewCourses([]);
                  setAddSelectedCourseIds([]);
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#015F2B] w-full sm:w-auto"
                disabled={addPreviewLoading}
              >
                {addPreviewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Add Student${addSelectedCourseIds.length > 0 ? ` & Enroll (${addSelectedCourseIds.length})` : ''}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Students Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
            <DialogDescription>Upload a CSV or Excel (.xlsx) file with columns: name, email, studentId, dept, program, year, semester, password. Password column is optional - if not provided, default password "TempPassword123!" will be used. Students will be automatically enrolled in courses matching their program, year, and semester. Optionally create login accounts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(studentTemplateCsv)}`} download="students_template.csv" className="flex items-center gap-2 text-sm text-[#015F2B] hover:underline">
                <Download className="h-4 w-4" /> Download CSV template
              </a>
              <span className="text-muted-foreground">or</span>
              <button type="button" onClick={downloadStudentImportTemplateExcel} className="flex items-center gap-2 text-sm text-[#015F2B] hover:underline">
                <Download className="h-4 w-4" /> Download Excel template
              </button>
            </div>
            <div className="space-y-2">
              <Label>Select file (CSV or Excel)</Label>
              <Input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={() => {}} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="import-accounts" checked={importCreateAccounts} onCheckedChange={(c) => setImportCreateAccounts(!!c)} />
              <Label htmlFor="import-accounts">Create login accounts (email + temporary password) for imported students</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} className="bg-[#015F2B]"><Upload className="mr-2 h-4 w-4" /> Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open);
        if (!open) {
          setEditingStudent(null);
          setPreviewCourses([]);
          setSelectedCourseIds([]);
          setCurrentEnrollments([]);
        }
      }}>
        <DialogContent className="w-[98vw] max-w-[1600px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student & Manage Enrollment</DialogTitle>
            <DialogDescription>Update student information and manage course enrollments.</DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editingStudent) return;
            try {
              const [firstName, ...lastNameParts] = editForm.name.split(' ');
              const lastName = lastNameParts.join(' ') || firstName;
              const year = parseInt(editForm.year.replace('Year ', ''));
              const semester = parseInt(editForm.semester);
              
              const dept = departments.find(d => d.id === editForm.program);

              if (!dept) {
                toast.error('Please select a school and program');
                return;
              }

              await studentService.updateStudent(editingStudent.id, {
                firstName,
                lastName,
                email: editForm.email,
                studentNumber: editForm.studentId,
                programId: null,
                program: dept.name,
                departmentId: dept.id,
                year,
                semester,
              } as any);

              // Handle enrollments
              const toRemove = currentEnrollments.filter(cid => !selectedCourseIds.includes(cid));
              const toAdd = selectedCourseIds.filter(cid => !currentEnrollments.includes(cid));

              let enrollmentSuccessCount = 0;
              let enrollmentSkippedCount = 0;
              const enrollmentErrors: string[] = [];

              for (const classId of toAdd) {
                try {
                  await enrollmentService.createEnrollment({
                    studentId: editingStudent.id,
                    classId,
                    status: 'Active',
                  });
                  enrollmentSuccessCount++;
                } catch (error: any) {
                  if (error?.code === 'ENROLLMENT_ALREADY_EXISTS') {
                    enrollmentSkippedCount++;
                  } else {
                    enrollmentErrors.push(error?.message || 'Failed to enroll in class');
                  }
                }
              }

              for (const classId of toRemove) {
                try {
                  const enrollments = await enrollmentService.getStudentEnrollments(editingStudent.id);
                  const enrollmentsData = (enrollments as any)?.data || enrollments;
                  const enrollment = enrollmentsData.find((e: any) => (e.classId || e.class?.id) === classId);
                  if (enrollment?.id) {
                    await enrollmentService.deleteEnrollment(enrollment.id);
                  }
                } catch (error: any) {
                  console.error('Error removing enrollment:', error);
                  enrollmentErrors.push(`Failed to remove enrollment: ${error?.message || 'Unknown error'}`);
                }
              }

              await loadStudents(1);

              // Refresh enrollments
              const allEnrollments: Record<string, string[]> = {};
              for (const cls of classes) {
                const clsEnrollments = await enrollmentService.getClassEnrollments(cls.id);
                const clsEnrollmentsData = (clsEnrollments as any)?.data || clsEnrollments;
                allEnrollments[cls.id] = Array.isArray(clsEnrollmentsData) 
                  ? clsEnrollmentsData.map((e: any) => e.studentId || e.student?.id).filter(Boolean)
                  : [];
              }
              setEnrollmentsByClassId(allEnrollments);
              
              setEditOpen(false);
              setEditingStudent(null);
              setPreviewCourses([]);
              setSelectedCourseIds([]);
              setCurrentEnrollments([]);

              if (enrollmentSuccessCount > 0 || enrollmentSkippedCount > 0) {
                toast.success(`Student updated. Enrollments: ${enrollmentSuccessCount} added, ${enrollmentSkippedCount} skipped${toRemove.length > 0 ? `, ${toRemove.length} removed` : ''}`);
              } else {
                toast.success('Student updated successfully');
              }
              if (enrollmentErrors.length > 0) {
                toast.error(`Some enrollment operations failed: ${enrollmentErrors.slice(0, 3).join(', ')}`);
              }
            } catch (error: any) {
              console.error('Error updating student:', error);
              toast.error(`Failed to update student: ${error?.message || 'Unknown error'}`);
            }
          }} className="space-y-6">
            <div className="grid gap-6 py-4">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>Full Name</Label>
                    <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. John Doe" className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Email</Label>
                    <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required placeholder="name@student.kcu.ac.ug" className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Registration / Student ID</Label>
                    <Input value={editForm.studentId} onChange={e => setEditForm(f => ({ ...f, studentId: e.target.value }))} required placeholder="e.g. 2100123" className="w-full" />
                  </div>
                </div>
              </div>

              {/* Academic Information Section */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Academic Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>School</Label>
                    {departmentsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                      </div>
                    ) : (
                      <Select value={editForm.schoolId} onValueChange={v => setEditForm(f => ({ ...f, schoolId: v, program: '' }))} required>
                        <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select school" /></SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {schools.map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Program</Label>
                    {departmentsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                      </div>
                    ) : (
                      <Select value={editForm.program} onValueChange={v => setEditForm(f => ({ ...f, program: v }))} required>
                        <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select program" /></SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {editForm.schoolId ? (
                            departments
                              .filter(d => String(d.schoolId) === String(editForm.schoolId))
                              .map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name} {d.code ? `(${d.code})` : ''}
                                </SelectItem>
                              ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-gray-500">Select a school first</div>
                          )}
                          {editForm.schoolId && departments.filter(d => String(d.schoolId) === String(editForm.schoolId)).length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-gray-500">No programs in this school</div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Year</Label>
                    <Select value={editForm.year} onValueChange={v => setEditForm(f => ({ ...f, year: v }))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select year" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 4 }, (_, i) => i + 1).map((year) => (
                          <SelectItem key={year} value={`Year ${year}`}>
                            Year {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editForm.program && (() => {
                      const selectedDept = departments.find(d => d.id === editForm.program);
                      return selectedDept ? (
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedDept.name} (4-year program)
                        </p>
                      ) : null;
                    })()}
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Semester</Label>
                    <Select value={editForm.semester} onValueChange={v => setEditForm(f => ({ ...f, semester: v }))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select semester" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Semester 1</SelectItem>
                        <SelectItem value="2">Semester 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Course Enrollment Section */}
              {editForm.program && editForm.year && (
                <div className="space-y-4">
                  <div className="border-b pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Course Enrollment</h3>
                    {previewLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                  </div>
                  {previewLoading ? (
                    <div className="text-sm text-gray-500 py-8 text-center">Loading available courses...</div>
                  ) : previewCourses.length === 0 ? (
                    <div className="text-sm text-gray-500 py-8 text-center border rounded-md bg-gray-50">
                      No courses found for {departments.find(d => d.id === editForm.program)?.name || editForm.program} - Year {editForm.year.replace('Year ', '')} - Semester {editForm.semester}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Select courses to enroll the student in:</span>
                        <span className="font-medium">{selectedCourseIds.length} of {previewCourses.length} selected</span>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto border rounded-md">
                        <div className="overflow-x-visible">
                          <Table className="w-full table-auto">
                            <TableHeader className="sticky top-0 bg-white z-10 border-b">
                              <TableRow>
                                <TableHead className="w-12 px-3"></TableHead>
                                <TableHead className="w-[120px] px-3">Course Code</TableHead>
                                <TableHead className="min-w-[250px] px-3">Course Name</TableHead>
                                <TableHead className="w-[140px] px-3">Class</TableHead>
                                <TableHead className="min-w-[180px] px-3">Lecturer</TableHead>
                                <TableHead className="w-[130px] px-3">Schedule</TableHead>
                                <TableHead className="w-[140px] px-3">Venue</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {previewCourses.map((cls) => {
                                const isChecked = selectedCourseIds.includes(cls.id);
                                return (
                                  <TableRow key={cls.id} className={isChecked ? 'bg-green-50/50' : ''}>
                                    <TableCell className="px-3">
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            setSelectedCourseIds(prev => [...prev, cls.id]);
                                          } else {
                                            setSelectedCourseIds(prev => prev.filter(id => id !== cls.id));
                                          }
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium px-3">{cls.course?.code || '—'}</TableCell>
                                    <TableCell className="px-3">
                                      <div className="text-sm break-words">{cls.course?.name || '—'}</div>
                                      {cls.course && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {cls.course.credits} credit{cls.course.credits !== 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm px-3 break-words">{cls.name}</TableCell>
                                    <TableCell className="text-sm px-3 break-words">{cls.lecturer?.name || '—'}</TableCell>
                                    <TableCell className="text-sm px-3 whitespace-nowrap">
                                      {cls.dayOfWeek !== null && cls.startTime && cls.endTime ? (
                                        <div>
                                          <div className="font-medium">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][cls.dayOfWeek]}</div>
                                          <div className="text-xs text-gray-500">{cls.startTime} - {cls.endTime}</div>
                                        </div>
                                      ) : (
                                        '—'
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm px-3 break-words">
                                      {cls.venue ? (
                                        <div>
                                          <div>{cls.venue.name}</div>
                                          {cls.venue.code && <div className="text-xs text-gray-500">{cls.venue.code}</div>}
                                        </div>
                                      ) : (
                                        '—'
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                        <span>
                          {selectedCourseIds.length > 0 
                            ? `${selectedCourseIds.length} course${selectedCourseIds.length !== 1 ? 's' : ''} will be enrolled`
                            : 'No courses selected'}
                        </span>
                        {selectedCourseIds.length !== previewCourses.length && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setSelectedCourseIds(previewCourses.map(c => c.id))}
                          >
                            Select All
                          </Button>
                        )}
                        {selectedCourseIds.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setSelectedCourseIds([])}
                          >
                            Deselect All
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setEditOpen(false);
                  setEditingStudent(null);
                  setPreviewCourses([]);
                  setSelectedCourseIds([]);
                  setCurrentEnrollments([]);
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#015F2B] w-full sm:w-auto"
                disabled={previewLoading}
              >
                {previewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Save Changes${selectedCourseIds.length > 0 ? ` & Enroll (${selectedCourseIds.length})` : ''}`
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Staff Management Tab (Non-teaching staff: HR, Administrators, etc.)
// -----------------------------------------------------------------------------
function StaffTab({
  staff,
  setStaff,
  staffPage,
  staffTotal,
  pageSize,
  loadStaff,
}: {
  staff: StaffRow[];
  setStaff: React.Dispatch<React.SetStateAction<StaffRow[]>>;
  staffPage: number;
  staffTotal: number;
  pageSize: number;
  loadStaff: (page: number) => Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'Staff', dept: '', tempPassword: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'Staff', dept: '' });
  const [importCreateAccounts, setImportCreateAccounts] = useState(true);
  const staffFileRef = useRef<HTMLInputElement>(null);

  // Filter only non-teaching staff (exclude Lecturers)
  const nonTeachingStaff = staff.filter(s => s.role !== 'Lecturer');
  const filteredStaff = nonTeachingStaff.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch departments on mount
  useEffect(() => {
    const loadDepartments = async () => {
      setDepartmentsLoading(true);
      try {
        const depts = await academicService.getDepartments();
        setDepartments(Array.isArray(depts) ? depts.map((d: any) => ({ id: d.id || d.name, name: d.name })) : []);
        // Set default department if available
        if (depts.length > 0 && !addForm.dept) {
          const firstDept = Array.isArray(depts) ? depts[0] : null;
          setAddForm(prev => ({ ...prev, dept: firstDept?.id || firstDept?.name || '' }));
        }
      } catch (error) {
        console.error('Error loading departments:', error);
      } finally {
        setDepartmentsLoading(false);
      }
    };
    loadDepartments();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const [firstName, ...lastNameParts] = addForm.name.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;
      
      await staffService.createStaff({
        firstName,
        lastName,
        email: addForm.email,
        staffNumber: `STF${Date.now()}`, // Generate temporary staff number
        role: addForm.role as any,
        departmentId: addForm.dept,
        employmentType: 'Full-time', // Default to Full-time
        userRole: addForm.role as any, // Set user role
        tempPassword: addForm.tempPassword || undefined, // Optional temporary password
      } as any);
      
      await loadStaff(1);
      setAddForm({ name: '', email: '', role: 'Staff', dept: departments[0]?.id || departments[0]?.name || '', tempPassword: '' });
      setAddOpen(false);
      toast.success('Non teaching staff member added successfully');
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast.error(`Failed to add staff: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleStaffImport = async () => {
    const file = staffFileRef.current?.files?.[0];
    if (!file) { 
      toast.error('Please select a CSV or Excel file.');
      return; 
    }
    try {
      const result = await staffService.importStaff(file, importCreateAccounts);
      toast.success(`Import completed! Imported: ${result.imported}, Failed: ${result.failed}${result.errors && result.errors.length > 0 ? `. Errors: ${result.errors.slice(0, 3).join(', ')}${result.errors.length > 3 ? '...' : ''}` : ''}`);
      
      await loadStaff(1);
      setImportOpen(false);
    } catch (error: any) {
      console.error('Error importing staff:', error);
      toast.error(`Failed to import staff: ${error?.message || 'Unknown error'}`);
    }
  };

  const staffTemplateCsv = 'name,email,role,dept\nExample Staff,example@kcu.ac.ug,Staff,Example Department\nHR Manager,hr@kcu.ac.ug,Administrator,Example Department';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Non Teaching Staff Management
          </CardTitle>
          <CardDescription>Manage non-teaching staff members (HR, Administrators, etc.)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search staff..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Import</Button>
              <Button className="bg-[#015F2B]" onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Non Teaching Staff</Button>
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No non teaching staff members found. Add non teaching staff members to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-800">{s.name.substring(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{s.role}</TableCell>
                      <TableCell>{s.dept}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'Active' ? 'outline' : 'secondary'} className={s.status==='Active' ? 'text-[#015F2B] border-[#015F2B]/20 bg-[#015F2B]/5' : ''}>{s.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingStaff(s);
                              setEditForm({ name: s.name, email: s.email, role: s.role, dept: s.departmentId ?? s.dept });
                              setEditOpen(true);
                            }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={async () => {
                              if (confirm(`Delete staff "${s.name}"?`)) {
                                try {
                                  await staffService.deleteStaff(String(s.id));
                                  setStaff(prev => prev.filter(st => st.id !== s.id));
                                  toast.success('Non teaching staff member deleted successfully');
                                } catch (error: any) {
                                  console.error('Error deleting staff:', error);
                                  toast.error(`Failed to delete staff: ${error?.message || 'Unknown error'}`);
                                }
                              }
                            }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {staffTotal > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">{staffTotal} total</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={staffPage <= 1} onClick={() => loadStaff(staffPage - 1)}>Previous</Button>
                  <span className="text-sm">Page {staffPage} of {Math.max(1, Math.ceil(staffTotal / pageSize))}</span>
                  <Button variant="outline" size="sm" disabled={staffPage >= Math.ceil(staffTotal / pageSize)} onClick={() => loadStaff(staffPage + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Non Teaching Staff Member</DialogTitle>
            <DialogDescription>Create a record for non-teaching personnel (HR, Administrators, etc.)</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required placeholder="name@kcu.ac.ug" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addForm.role} onValueChange={v => setAddForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="QA">QA</SelectItem>
                    <SelectItem value="Management">Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                {departmentsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading departments...
                  </div>
                ) : (
                  <Combobox
                    options={departments.map((dept) => ({
                      value: dept.id || dept.name,
                      label: dept.name,
                    }))}
                    value={addForm.dept}
                    onValueChange={(v) => setAddForm((f) => ({ ...f, dept: v }))}
                    placeholder="Select department"
                    searchPlaceholder="Search departments..."
                    emptyText="No department found."
                    initialDisplayCount={10}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Temporary password (for first login)</Label>
              <Input type="password" value={addForm.tempPassword} onChange={e => setAddForm(f => ({ ...f, tempPassword: e.target.value }))} placeholder="Leave blank to send reset link" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Add Non Teaching Staff</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Non Teaching Staff Member</DialogTitle>
            <DialogDescription>Update non teaching staff information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editingStaff) return;
            try {
              const [firstName, ...lastNameParts] = editForm.name.split(' ');
              const lastName = lastNameParts.join(' ') || firstName;
              
              await staffService.updateStaff(editingStaff.id, {
                firstName,
                lastName,
                email: editForm.email,
                role: editForm.role as any,
                departmentId: editForm.dept,
              });
              
              await loadStaff(staffPage);
              setEditOpen(false);
              setEditingStaff(null);
              toast.success('Non teaching staff member updated successfully');
            } catch (error: any) {
              console.error('Error updating staff:', error);
              toast.error(`Failed to update staff: ${error?.message || 'Unknown error'}`);
            }
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required placeholder="name@kcu.ac.ug" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Administrator">Administrator</SelectItem>
                      <SelectItem value="QA">QA</SelectItem>
                      <SelectItem value="Management">Management</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  {departmentsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading departments...
                    </div>
                  ) : (
                    <Combobox
                      options={departments.map((dept) => ({
                        value: dept.id || dept.name,
                        label: dept.name,
                      }))}
                      value={editForm.dept}
                      onValueChange={(v) => setEditForm((f) => ({ ...f, dept: v }))}
                      placeholder="Select department"
                      searchPlaceholder="Search departments..."
                      emptyText="No department found."
                      initialDisplayCount={10}
                    />
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Update Non Teaching Staff</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Non Teaching Staff</DialogTitle>
            <DialogDescription>Upload a CSV or Excel (.xlsx) file with columns: name, email, role, dept. Role should be Staff, Administrator, QA, or Management (not Lecturer). Optionally create login accounts with a temporary password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(staffTemplateCsv)}`} download="staff_template.csv" className="flex items-center gap-2 text-sm text-[#015F2B] hover:underline">
                <Download className="h-4 w-4" /> Download CSV template
              </a>
              <span className="text-muted-foreground">or</span>
              <button type="button" onClick={downloadStaffImportTemplateExcel} className="flex items-center gap-2 text-sm text-[#015F2B] hover:underline">
                <Download className="h-4 w-4" /> Download Excel template
              </button>
            </div>
            <div className="space-y-2">
              <Label>Select file (CSV or Excel)</Label>
              <Input ref={staffFileRef} type="file" accept=".csv,.xlsx,.xls" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="staff-import-accounts" checked={importCreateAccounts} onCheckedChange={(c) => setImportCreateAccounts(!!c)} />
              <Label htmlFor="staff-import-accounts">Create login accounts (email + temporary password) for imported non teaching staff</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleStaffImport} className="bg-[#015F2B]"><Upload className="mr-2 h-4 w-4" /> Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Lecturers Management Tab (Teaching staff with class assignment)
// -----------------------------------------------------------------------------
function LecturersTab({
  staff,
  setStaff,
  classes,
  setClasses,
  staffPage,
  staffTotal,
  pageSize,
  loadStaff,
}: {
  staff: StaffRow[];
  setStaff: React.Dispatch<React.SetStateAction<StaffRow[]>>;
  classes: ClassRow[];
  setClasses: React.Dispatch<React.SetStateAction<ClassRow[]>>;
  staffPage: number;
  staffTotal: number;
  pageSize: number;
  loadStaff: (page: number) => Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<StaffRow | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [addForm, setAddForm] = useState({ name: '', email: '', dept: '', tempPassword: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<StaffRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', dept: '' });
  const [importCreateAccounts, setImportCreateAccounts] = useState(true);
  const lecturerFileRef = useRef<HTMLInputElement>(null);

  // Filter only Lecturers
  const lecturers = staff.filter(s => s.role === 'Lecturer');
  const filteredLecturers = lecturers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const refreshLecturerData = async () => {
    setDepartmentsLoading(true);
    try {
      await loadStaff(1);
      const depts = await academicService.getDepartments();
      setDepartments(Array.isArray(depts) ? depts.map((d: any) => ({ id: d.id || d.name, name: d.name })) : []);
      if (depts.length > 0 && !addForm.dept) {
        const firstDept = Array.isArray(depts) ? depts[0] : null;
        setAddForm(prev => ({ ...prev, dept: firstDept?.id || firstDept?.name || '' }));
      }
    } catch (error) {
      console.error('Error refreshing lecturer data:', error);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  useEffect(() => {
    refreshLecturerData();
    const handleImportComplete = () => {
      refreshLecturerData();
    };
    window.addEventListener('timetable-import-complete', handleImportComplete);
    return () => window.removeEventListener('timetable-import-complete', handleImportComplete);
  }, []);

  const handleAddLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const [firstName, ...lastNameParts] = addForm.name.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;
      
      await staffService.createStaff({
        firstName,
        lastName,
        email: addForm.email,
        staffNumber: `LEC${Date.now()}`, // Generate temporary lecturer number
        role: 'Lecturer' as any,
        departmentId: addForm.dept,
        employmentType: 'Full-time',
        userRole: 'Lecturer', // Set user role
        tempPassword: addForm.tempPassword || undefined, // Optional temporary password
      } as any);
      
      await refreshLecturerData();
      setAddForm({ name: '', email: '', dept: departments[0]?.id || departments[0]?.name || '', tempPassword: '' });
      setAddOpen(false);
      toast.success('Lecturer added successfully');
    } catch (error: any) {
      console.error('Error adding lecturer:', error);
      toast.error(`Failed to add lecturer: ${error?.message || 'Unknown error'}`);
    }
  };

  const openAssign = (lecturer: StaffRow) => {
    setSelectedLecturer(lecturer);
    setSelectedClassIds(classes.filter(c => c.lecturerId === lecturer.id).map(c => c.id));
    setAssignOpen(true);
  };

  const saveAssignments = () => {
    if (!selectedLecturer) return;
    setClasses(prev => prev.map(c => {
      const shouldAssign = selectedClassIds.includes(c.id);
      if (shouldAssign) return { ...c, lecturerId: selectedLecturer!.id, lecturerName: selectedLecturer!.name };
      if (c.lecturerId === selectedLecturer.id) return { ...c, lecturerId: null, lecturerName: '—' };
      return c;
    }));
    setAssignOpen(false);
    setSelectedLecturer(null);
    toast.success('Class assignments updated successfully');
  };

  const handleLecturerImport = async () => {
    const file = lecturerFileRef.current?.files?.[0];
    if (!file) { 
      toast.error('Please select a CSV or Excel file.');
      return; 
    }
    try {
      const result = await staffService.importStaff(file, importCreateAccounts);
      toast.success(`Import completed! Imported: ${result.imported}, Failed: ${result.failed}${result.errors && result.errors.length > 0 ? `. Errors: ${result.errors.slice(0, 3).join(', ')}${result.errors.length > 3 ? '...' : ''}` : ''}`);
      await refreshLecturerData();
      setImportOpen(false);
    } catch (error: any) {
      console.error('Error importing lecturers:', error);
      toast.error(`Failed to import lecturers: ${error?.message || 'Unknown error'}`);
    }
  };

  const lecturerTemplateCsv = 'name,email,role,dept\nDr. Jane Smith,jsmith@kcu.ac.ug,Lecturer,Computer Science';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Lecturers Management
          </CardTitle>
          <CardDescription>Manage teaching staff who conduct classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search lecturers..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Import</Button>
              <Button className="bg-[#015F2B]" onClick={() => setAddOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Lecturer</Button>
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lecturer Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Classes Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLecturers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No lecturers found. Add lecturers to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLecturers.map((lecturer) => {
                    const assignedClasses = classes.filter(c => c.lecturerId === lecturer.id);
                    return (
                      <TableRow key={lecturer.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-green-100 text-green-800">{lecturer.name.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900">{lecturer.name}</div>
                              <div className="text-xs text-muted-foreground">{lecturer.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{lecturer.dept}</TableCell>
                        <TableCell>
                          <Badge variant={lecturer.status === 'Active' ? 'outline' : 'secondary'} className={lecturer.status==='Active' ? 'text-[#015F2B] border-[#015F2B]/20 bg-[#015F2B]/5' : ''}>{lecturer.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{assignedClasses.length} {assignedClasses.length === 1 ? 'class' : 'classes'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openAssign(lecturer)}><BookMarked className="mr-2 h-4 w-4" /> Assign classes</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setEditingLecturer(lecturer);
                                setEditForm({ name: lecturer.name, email: lecturer.email, dept: lecturer.departmentId ?? lecturer.dept });
                                setEditOpen(true);
                              }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={async () => {
                                if (confirm(`Delete lecturer "${lecturer.name}"?`)) {
                                  try {
                                    await staffService.deleteStaff(String(lecturer.id));
                                    setStaff(prev => prev.filter(st => st.id !== lecturer.id));
                                    toast.success('Lecturer deleted successfully');
                                  } catch (error: any) {
                                    console.error('Error deleting lecturer:', error);
                                    toast.error(`Failed to delete lecturer: ${error?.message || 'Unknown error'}`);
                                  }
                                }
                              }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {staffTotal > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">{staffTotal} total</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={staffPage <= 1} onClick={() => loadStaff(staffPage - 1)}>Previous</Button>
                  <span className="text-sm">Page {staffPage} of {Math.max(1, Math.ceil(staffTotal / pageSize))}</span>
                  <Button variant="outline" size="sm" disabled={staffPage >= Math.ceil(staffTotal / pageSize)} onClick={() => loadStaff(staffPage + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Lecturer</DialogTitle>
            <DialogDescription>Create a lecturer record for teaching staff who conduct classes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLecturer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Dr. Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required placeholder="name@kcu.ac.ug" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              {departmentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading departments...
                </div>
              ) : (
                <Combobox
                  options={departments.map((dept) => ({
                    value: dept.id || dept.name,
                    label: dept.name,
                  }))}
                  value={addForm.dept}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, dept: v }))}
                  placeholder="Select department"
                  searchPlaceholder="Search departments..."
                  emptyText="No department found."
                  initialDisplayCount={10}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Temporary password (for first login)</Label>
              <Input type="password" value={addForm.tempPassword} onChange={e => setAddForm(f => ({ ...f, tempPassword: e.target.value }))} placeholder="Leave blank to send reset link" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Add Lecturer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Lecturer Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lecturer</DialogTitle>
            <DialogDescription>Update lecturer information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!editingLecturer) return;
            try {
              const [firstName, ...lastNameParts] = editForm.name.split(' ');
              const lastName = lastNameParts.join(' ') || firstName;
              
              await staffService.updateStaff(editingLecturer.id, {
                firstName,
                lastName,
                email: editForm.email,
                role: 'Lecturer' as any,
                departmentId: editForm.dept,
              });
              
              await loadStaff(staffPage);
              setEditOpen(false);
              setEditingLecturer(null);
              toast.success('Lecturer updated successfully');
            } catch (error: any) {
              console.error('Error updating lecturer:', error);
              toast.error(`Failed to update lecturer: ${error?.message || 'Unknown error'}`);
            }
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Dr. Jane Smith" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} required placeholder="name@kcu.ac.ug" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                {departmentsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading departments...
                  </div>
                ) : (
                  <Combobox
                    options={departments.map((dept) => ({
                      value: dept.id || dept.name,
                      label: dept.name,
                    }))}
                    value={editForm.dept}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, dept: v }))}
                    placeholder="Select department"
                    searchPlaceholder="Search departments..."
                    emptyText="No department found."
                    initialDisplayCount={10}
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Update Lecturer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Lecturers</DialogTitle>
            <DialogDescription>Upload a CSV or Excel (.xlsx) file with columns: name, email, role (must be "Lecturer"), dept. Optionally create login accounts with a temporary password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(lecturerTemplateCsv)}`} download="lecturers_template.csv" className="flex items-center gap-2 text-sm text-[#015F2B] hover:underline">
                <Download className="h-4 w-4" /> Download CSV template
              </a>
              <span className="text-muted-foreground">or</span>
              <button type="button" onClick={downloadLecturerImportTemplateExcel} className="flex items-center gap-2 text-sm text-[#015F2B] hover:underline">
                <Download className="h-4 w-4" /> Download Excel template
              </button>
            </div>
            <div className="space-y-2">
              <Label>Select file (CSV or Excel)</Label>
              <Input ref={lecturerFileRef} type="file" accept=".csv,.xlsx,.xls" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="lecturer-import-accounts" checked={importCreateAccounts} onCheckedChange={(c) => setImportCreateAccounts(!!c)} />
              <Label htmlFor="lecturer-import-accounts">Create login accounts (email + temporary password) for imported lecturers</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleLecturerImport} className="bg-[#015F2B]"><Upload className="mr-2 h-4 w-4" /> Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={(open) => !open && setAssignOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign lecturer to classes</DialogTitle>
            <DialogDescription>{selectedLecturer ? `${selectedLecturer.name} – select classes to teach.` : 'Select classes.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No classes available. Create classes first.</p>
            ) : (
              classes.map(cls => (
                <div key={cls.id} className="flex items-center gap-2">
                  <Checkbox 
                    id={`assign-cls-${cls.id}`} 
                    checked={selectedClassIds.includes(cls.id)} 
                    onCheckedChange={(c) => {
                      if (c) {
                        setSelectedClassIds(prev => [...prev, cls.id]);
                      } else {
                        setSelectedClassIds(prev => prev.filter(id => id !== cls.id));
                      }
                    }} 
                  />
                  <Label htmlFor={`assign-cls-${cls.id}`} className="font-normal cursor-pointer">
                    {cls.name} ({cls.course})
                  </Label>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAssignOpen(false);
              setSelectedLecturer(null);
              setSelectedClassIds([]);
            }}>Cancel</Button>
            <Button onClick={saveAssignments} className="bg-[#015F2B]">Save assignments</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Course/Academic Tab
// -----------------------------------------------------------------------------
type CoursesTabRow = { id: string; code: string; name: string; departmentId: string; dept?: string; credits: number };
const COURSES_PAGE_SIZE = 20;

function CoursesTab() {
  const [courses, setCourses] = useState<CoursesTabRow[]>([]);
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesTotal, setCoursesTotal] = useState(0);
  const [depts, setDepts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CoursesTabRow | null>(null);
  const [courseForm, setCourseForm] = useState({ code: '', name: '', departmentId: '', credits: 0, level: 1, semester: 1 });

  const loadCourses = async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const [courseRes, departmentList] = await Promise.all([
        academicService.getCourses({ page: pageNum, limit: COURSES_PAGE_SIZE }),
        academicService.getDepartments(),
      ]);
      const list = courseRes.data ?? [];
      const deptMap: Record<string, string> = {};
      (Array.isArray(departmentList) ? departmentList : (departmentList as any)?.data ?? []).forEach((d: any) => { deptMap[d.id] = d.name; });
      setDepts(deptMap);
      setCourses(list.map((c: any) => ({ id: c.id, code: c.code, name: c.name, departmentId: c.departmentId, dept: deptMap[c.departmentId], credits: c.credits ?? 0 })));
      setCoursesTotal(courseRes.total ?? 0);
      setCoursesPage(courseRes.page ?? pageNum);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses(coursesPage);
  }, [coursesPage]);

  useEffect(() => {
    const handleImportComplete = () => loadCourses(1);
    window.addEventListener('timetable-import-complete', handleImportComplete);
    return () => window.removeEventListener('timetable-import-complete', handleImportComplete);
  }, []);

  const filteredCourses = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
      (c.dept ?? '').toLowerCase().includes(courseSearchTerm.toLowerCase())
  );

  const openAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({ code: '', name: '', departmentId: Object.keys(depts)[0] ?? '', credits: 0, level: 1, semester: 1 });
    setAddCourseOpen(true);
  };

  const openEditCourse = (course: CoursesTabRow) => {
    setEditingCourse(course);
    const courseData = course as any;
    setCourseForm({ 
      code: course.code, 
      name: course.name, 
      departmentId: course.departmentId, 
      credits: course.credits,
      level: courseData.level || 1,
      semester: courseData.semester || 1,
    });
    setEditCourseOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await academicService.updateCourse(editingCourse.id, {
          code: courseForm.code,
          name: courseForm.name,
          departmentId: courseForm.departmentId || undefined,
          credits: courseForm.credits,
          level: courseForm.level,
          semester: courseForm.semester,
        });
      } else {
        await academicService.createCourse({
          code: courseForm.code,
          name: courseForm.name,
          departmentId: courseForm.departmentId,
          credits: courseForm.credits,
          level: courseForm.level,
          semester: courseForm.semester,
        });
      }
      await loadCourses(coursesPage);
      setAddCourseOpen(false);
      setEditCourseOpen(false);
      setEditingCourse(null);
      window.dispatchEvent(new CustomEvent('course-updated'));
    } catch (error: any) {
      console.error('Error saving course:', error);
      toast.error(`Failed to save course: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-8"
            value={courseSearchTerm}
            onChange={(e) => setCourseSearchTerm(e.target.value)}
          />
        </div>
        <Button className="bg-[#015F2B]" onClick={openAddCourse}><Plus className="mr-2 h-4 w-4" /> Add Course</Button>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Course Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : (
              filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-bold">{course.code}</TableCell>
                  <TableCell>{course.name}</TableCell>
                  <TableCell>{course.dept ?? course.departmentId}</TableCell>
                  <TableCell>{course.credits}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditCourse(course)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={async () => {
                          if (confirm(`Delete course "${course.name}"?`)) {
                            try {
                              await academicService.deleteCourse(course.id);
                              await loadCourses(coursesPage);
                            } catch (error: any) {
                              console.error('Error deleting course:', error);
                              toast.error(`Failed to delete course: ${error?.message || 'Unknown error'}`);
                            }
                          }
                        }}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {coursesTotal > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-2">
            <span className="text-sm text-muted-foreground">{coursesTotal} total</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={coursesPage <= 1} onClick={() => setCoursesPage(p => p - 1)}>Previous</Button>
              <span className="text-sm">Page {coursesPage} of {Math.max(1, Math.ceil(coursesTotal / COURSES_PAGE_SIZE))}</span>
              <Button variant="outline" size="sm" disabled={coursesPage >= Math.ceil(coursesTotal / COURSES_PAGE_SIZE)} onClick={() => setCoursesPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Course</DialogTitle>
            <DialogDescription>Create a new course and assign it to a department.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCourse} className="space-y-4">
            <div>
              <Label>Course Code</Label>
              <Input value={courseForm.code} onChange={e => setCourseForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CSC3102" required />
            </div>
            <div>
              <Label>Course Name</Label>
              <Input value={courseForm.name} onChange={e => setCourseForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Advanced Algorithms" required />
            </div>
            <div>
              <Label>Department</Label>
              <Combobox
                options={Object.entries(depts).map(([id, name]) => ({
                  value: id,
                  label: name as string,
                }))}
                value={courseForm.departmentId}
                onValueChange={(v) => setCourseForm((f) => ({ ...f, departmentId: v }))}
                placeholder="Select department"
                searchPlaceholder="Search departments..."
                emptyText="No department found."
                initialDisplayCount={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Level</Label>
                <Select value={String(courseForm.level)} onValueChange={v => setCourseForm(f => ({ ...f, level: parseInt(v, 10) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Level 1</SelectItem>
                    <SelectItem value="2">Level 2</SelectItem>
                    <SelectItem value="3">Level 3</SelectItem>
                    <SelectItem value="4">Level 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Semester</Label>
                <Select value={String(courseForm.semester)} onValueChange={v => setCourseForm(f => ({ ...f, semester: parseInt(v, 10) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Credits</Label>
              <Input type="number" min={0} value={courseForm.credits} onChange={e => setCourseForm(f => ({ ...f, credits: parseInt(e.target.value, 10) || 0 }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddCourseOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editCourseOpen} onOpenChange={setEditCourseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>Update course details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCourse} className="space-y-4">
            <div>
              <Label>Course Code</Label>
              <Input value={courseForm.code} onChange={e => setCourseForm(f => ({ ...f, code: e.target.value }))} required />
            </div>
            <div>
              <Label>Course Name</Label>
              <Input value={courseForm.name} onChange={e => setCourseForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Department</Label>
              <Combobox
                options={Object.entries(depts).map(([id, name]) => ({
                  value: id,
                  label: name as string,
                }))}
                value={courseForm.departmentId}
                onValueChange={(v) => setCourseForm((f) => ({ ...f, departmentId: v }))}
                placeholder="Select department"
                searchPlaceholder="Search departments..."
                emptyText="No department found."
                initialDisplayCount={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Level</Label>
                <Select value={String(courseForm.level)} onValueChange={v => setCourseForm(f => ({ ...f, level: parseInt(v, 10) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Level 1</SelectItem>
                    <SelectItem value="2">Level 2</SelectItem>
                    <SelectItem value="3">Level 3</SelectItem>
                    <SelectItem value="4">Level 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Semester</Label>
                <Select value={String(courseForm.semester)} onValueChange={v => setCourseForm(f => ({ ...f, semester: parseInt(v, 10) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Credits</Label>
              <Input type="number" min={0} value={courseForm.credits} onChange={e => setCourseForm(f => ({ ...f, credits: parseInt(e.target.value, 10) || 0 }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCourseOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Venues Tab
// -----------------------------------------------------------------------------
function VenuesTab({
  venues,
  setVenues,
  venuesPage,
  venuesTotal,
  pageSize,
  loadVenues,
}: {
  venues: VenueRow[];
  setVenues: React.Dispatch<React.SetStateAction<VenueRow[]>>;
  venuesPage: number;
  venuesTotal: number;
  pageSize: number;
  loadVenues: (page: number) => Promise<void>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueRow | null>(null);
  const [form, setForm] = useState({ name: '', code: '', type: 'Lecture Hall', capacity: 50, building: '', floor: '', facilities: '' });

  const openAdd = () => {
    setEditingVenue(null);
    setForm({ name: '', code: '', type: 'Lecture Hall', capacity: 50, building: '', floor: '', facilities: '' });
    setAddOpen(true);
  };

  const openEdit = (venue: VenueRow) => {
    setEditingVenue(venue);
    setForm({ name: venue.name, code: venue.code || '', type: venue.type, capacity: venue.capacity, building: venue.building || '', floor: String(venue.floor || ''), facilities: venue.facilities || '' });
    setEditOpen(true);
  };

  const saveVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVenue) {
        await academicService.updateVenue(editingVenue.id, {
          name: form.name,
          code: form.code,
          type: form.type as 'Lecture Hall' | 'Laboratory' | 'Seminar Room' | 'Office',
          capacity: form.capacity,
          building: form.building,
          floor: form.floor ? parseInt(form.floor, 10) : undefined,
          facilities: form.facilities ? form.facilities.split(',').map(f => f.trim()) : undefined,
        });
      } else {
        await academicService.createVenue({
          name: form.name,
          code: form.code,
          type: form.type as 'Lecture Hall' | 'Laboratory' | 'Seminar Room' | 'Office',
          capacity: form.capacity,
          building: form.building,
          floor: form.floor ? parseInt(form.floor, 10) : undefined,
          facilities: form.facilities ? form.facilities.split(',').map(f => f.trim()) : undefined,
        });
      }
      await loadVenues(venuesPage);
      setAddOpen(false);
      setEditOpen(false);
    } catch (error) {
      console.error('Error saving venue:', error);
      toast.error('Failed to save venue');
    }
  };

  const deleteVenue = async (id: string) => {
    if (!confirm('Delete this venue?')) return;
    try {
      await academicService.deleteVenue(id);
      await loadVenues(venuesPage);
    } catch (error) {
      console.error('Error deleting venue:', error);
      toast.error('Failed to delete venue');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Venues & Locations</CardTitle>
            <CardDescription>Manage lecture halls, labs, and offices.</CardDescription>
          </div>
          <Button size="sm" className="bg-[#015F2B]" onClick={openAdd}><Plus className="mr-2 h-4 w-4"/> Add Venue</Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Facilities</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venues.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No venues. Click "Add Venue" to create one.</TableCell></TableRow>
                ) : (
                  venues.map((venue) => (
                    <TableRow key={venue.id}>
                      <TableCell className="font-medium">{venue.name}</TableCell>
                      <TableCell>{venue.type}</TableCell>
                      <TableCell>{venue.capacity}</TableCell>
                      <TableCell>{venue.facilities || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(venue)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteVenue(venue.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {venuesTotal > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">{venuesTotal} total</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={venuesPage <= 1} onClick={() => loadVenues(venuesPage - 1)}>Previous</Button>
                  <span className="text-sm">Page {venuesPage} of {Math.max(1, Math.ceil(venuesTotal / pageSize))}</span>
                  <Button variant="outline" size="sm" disabled={venuesPage >= Math.ceil(venuesTotal / pageSize)} onClick={() => loadVenues(venuesPage + 1)}>Next</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Venue</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveVenue} className="space-y-4">
            <div>
              <Label>Venue Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lecture Hall">Lecture Hall</SelectItem>
                  <SelectItem value="Laboratory">Laboratory</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Seminar Room">Seminar Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Capacity</Label>
                <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value, 10) }))} required />
              </div>
              <div>
                <Label>Floor</Label>
                <Input type="number" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Building</Label>
              <Input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} required />
            </div>
            <div>
              <Label>Facilities</Label>
              <Input value={form.facilities} onChange={e => setForm(f => ({ ...f, facilities: e.target.value }))} placeholder="e.g. Projector, AC" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveVenue} className="space-y-4">
            <div>
              <Label>Venue Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lecture Hall">Lecture Hall</SelectItem>
                  <SelectItem value="Laboratory">Laboratory</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Seminar Room">Seminar Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Capacity</Label>
                <Input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value, 10) }))} required />
              </div>
              <div>
                <Label>Floor</Label>
                <Input type="number" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Building</Label>
              <Input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))} required />
            </div>
            <div>
              <Label>Facilities</Label>
              <Input value={form.facilities} onChange={e => setForm(f => ({ ...f, facilities: e.target.value }))} placeholder="e.g. Projector, AC" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Settings / Config Tab
// -----------------------------------------------------------------------------
function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    geofenceName: 'Main Campus',
    geofenceLat: '0.3476',
    geofenceLng: '32.5825',
    geofenceRadius: '500',
    lateThreshold: '15',
    minAttendance: '75',
    autoMarkAbsent: 'true',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await adminService.getSettings();
      setSettings(data);
      // Populate form from settings
      if (data.Geofence) {
        setForm(f => ({
          ...f,
          geofenceName: data.Geofence['geofence.name'] || f.geofenceName,
          geofenceLat: data.Geofence['geofence.latitude'] || f.geofenceLat,
          geofenceLng: data.Geofence['geofence.longitude'] || f.geofenceLng,
          geofenceRadius: data.Geofence['geofence.radius'] || f.geofenceRadius,
        }));
      }
      if (data.Attendance) {
        setForm(f => ({
          ...f,
          lateThreshold: data.Attendance['attendance.lateThreshold'] || f.lateThreshold,
          minAttendance: data.Attendance['attendance.minAttendance'] || f.minAttendance,
          autoMarkAbsent: data.Attendance['attendance.autoMarkAbsent'] || f.autoMarkAbsent,
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveGeofence = async () => {
    setSaving(true);
    try {
      await adminService.updateSettings({
        'geofence.name': form.geofenceName,
        'geofence.latitude': form.geofenceLat,
        'geofence.longitude': form.geofenceLng,
        'geofence.radius': form.geofenceRadius,
      });
      await loadSettings();
      toast.success('Geofence settings saved');
    } catch (error) {
      console.error('Error saving geofence:', error);
      toast.error('Failed to save geofence settings');
    } finally {
      setSaving(false);
    }
  };

  const saveAttendanceRules = async () => {
    setSaving(true);
    try {
      await adminService.updateSettings({
        'attendance.lateThreshold': form.lateThreshold,
        'attendance.minAttendance': form.minAttendance,
        'attendance.autoMarkAbsent': form.autoMarkAbsent,
      });
      await loadSettings();
      toast.success('Attendance rules saved');
    } catch (error) {
      console.error('Error saving attendance rules:', error);
      toast.error('Failed to save attendance rules');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Geofence Configuration</CardTitle>
          <CardDescription>Set the campus boundaries for location verification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Campus Zone Name</Label>
                <Input value={form.geofenceName} onChange={e => setForm(f => ({ ...f, geofenceName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input value={form.geofenceLat} onChange={e => setForm(f => ({ ...f, geofenceLat: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input value={form.geofenceLng} onChange={e => setForm(f => ({ ...f, geofenceLng: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Radius (meters)</Label>
                <Input type="number" value={form.geofenceRadius} onChange={e => setForm(f => ({ ...f, geofenceRadius: e.target.value }))} />
              </div>
              <div className="h-32 bg-gray-100/50 rounded flex items-center justify-center text-gray-400 border border-dashed">
                <MapPin className="mr-2" /> Map Preview
              </div>
              <Button className="w-full bg-[#015F2B]" onClick={saveGeofence} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Zone
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Rules</CardTitle>
          <CardDescription>Configure late policies and thresholds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Late Threshold</Label>
                  <div className="text-sm text-gray-500">Minutes after start time to mark as late</div>
                </div>
                <Input className="w-20" type="number" value={form.lateThreshold} onChange={e => setForm(f => ({ ...f, lateThreshold: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                  <Label>Minimum Attendance</Label>
                  <div className="text-sm text-gray-500">Required % for exam eligibility</div>
                </div>
                <Input className="w-20" type="number" value={form.minAttendance} onChange={e => setForm(f => ({ ...f, minAttendance: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                  <Label>Auto-mark Absent</Label>
                  <div className="text-sm text-gray-500">Mark absent if not checked in by session end</div>
                </div>
                <Switch checked={form.autoMarkAbsent === 'true'} onCheckedChange={v => setForm(f => ({ ...f, autoMarkAbsent: v ? 'true' : 'false' }))} />
              </div>
              <Button variant="outline" className="w-full" onClick={saveAttendanceRules} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Update Rules
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>System Maintenance</CardTitle>
          <CardDescription>Backup and critical system actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between border-b pb-4">
             <div>
               <h4 className="font-medium">Database Backup</h4>
               <p className="text-sm text-gray-500">Create a full backup of student and attendance data.</p>
             </div>
             <Button variant="outline">Run Backup Now</Button>
           </div>
           <div className="flex items-center justify-between pt-2">
             <div>
               <h4 className="font-medium text-red-600">Danger Zone</h4>
               <p className="text-sm text-gray-500">Reset academic year or archive old data.</p>
             </div>
             <Button variant="destructive">Archive Data</Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Schools / Departments Tab
// -----------------------------------------------------------------------------
type SchoolsTabRow = { id: string; name: string; dean: string | null; code?: string; deptCount?: number; studentCount?: number; staffCount?: number };
type DepartmentRow = { id: string; name: string; code: string; schoolId: string; head: string | null; duration?: number };
function SchoolsTab() {
  const [schools, setSchools] = useState<SchoolsTabRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [departmentsBySchool, setDepartmentsBySchool] = useState<Record<string, DepartmentRow[]>>({});
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [deptCountBySchool, setDeptCountBySchool] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
  const [addSchoolOpen, setAddSchoolOpen] = useState(false);
  const [editSchoolOpen, setEditSchoolOpen] = useState(false);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [editDeptOpen, setEditDeptOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<{ id: string; name: string; dean: string | null; code?: string } | null>(null);
  const [editingDept, setEditingDept] = useState<DepartmentRow | null>(null);
  const [selectedSchoolForDept, setSelectedSchoolForDept] = useState<string>('');
  const [schoolForm, setSchoolForm] = useState({ name: '', code: '', dean: '' });
  const [deptForm, setDeptForm] = useState({ name: '', code: '', head: '', schoolId: '', duration: 4 });

  const loadSchools = async () => {
    setLoading(true);
    try {
      const schoolList = await academicService.getSchools();
      const list = Array.isArray(schoolList) ? schoolList : (schoolList as any)?.data ?? [];
      const depts = await academicService.getDepartments();
      const deptList = Array.isArray(depts) ? depts : (depts as any)?.data ?? [];
      
      // Map departments by school
      const deptMap: Record<string, DepartmentRow[]> = {};
      const count: Record<string, number> = {};
      deptList.forEach((d: any) => {
        if (!deptMap[d.schoolId]) deptMap[d.schoolId] = [];
        deptMap[d.schoolId].push({
          id: d.id,
          name: d.name,
          code: d.code,
          schoolId: d.schoolId,
          head: d.head ?? null,
          duration: d.duration ?? 4, // Default to 4 years
        });
        count[d.schoolId] = (count[d.schoolId] || 0) + 1;
      });
      
      const withStats = await Promise.all(
        list.map(async (s: any) => {
          const stats = await academicService.getSchoolStats(s.id).catch(() => null);
          return {
            id: s.id,
            name: s.name,
            dean: s.dean ?? null,
            code: s.code,
            deptCount: count[s.id] ?? 0,
            studentCount: stats?.studentCount,
            staffCount: stats?.staffCount,
          };
        })
      );
      
      setDepartments(deptList.map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        schoolId: d.schoolId,
        head: d.head ?? null,
        duration: d.duration ?? 4, // Default to 4 years
      })));
      setDepartmentsBySchool(deptMap);
      setDeptCountBySchool(count);
      setSchools(withStats);
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
    const handleImportComplete = () => {
      loadSchools();
    };
    window.addEventListener('timetable-import-complete', handleImportComplete);
    return () => window.removeEventListener('timetable-import-complete', handleImportComplete);
  }, []);

  const toggleSchool = (schoolId: string) => {
    setExpandedSchools(prev => {
      const next = new Set(prev);
      if (next.has(schoolId)) {
        next.delete(schoolId);
      } else {
        next.add(schoolId);
      }
      return next;
    });
  };

  const openAddSchool = () => {
    setEditingSchool(null);
    setSchoolForm({ name: '', code: '', dean: '' });
    setAddSchoolOpen(true);
  };

  const openEditSchool = (school: { id: string; name: string; dean: string | null; code?: string }) => {
    setEditingSchool(school);
    setSchoolForm({ name: school.name, code: school.code || '', dean: school.dean || '' });
    setEditSchoolOpen(true);
  };

  const openAddDept = (schoolId: string) => {
    setEditingDept(null);
    setSelectedSchoolForDept(schoolId);
    setDeptForm({ name: '', code: '', head: '', schoolId, duration: 4 });
    setAddDeptOpen(true);
  };

  const openEditDept = (dept: DepartmentRow) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, code: dept.code, head: dept.head || '', schoolId: dept.schoolId, duration: dept.duration || 4 });
    setEditDeptOpen(true);
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSchool) {
        await academicService.updateSchool(editingSchool.id, {
          name: schoolForm.name,
          code: schoolForm.code || undefined,
          dean: schoolForm.dean || undefined,
        });
      } else {
        await academicService.createSchool({
          name: schoolForm.name,
          code: schoolForm.code,
          dean: schoolForm.dean || undefined,
        });
      }
      await loadSchools();
      setAddSchoolOpen(false);
      setEditSchoolOpen(false);
      setEditingSchool(null);
      toast.success(`School ${editingSchool ? 'updated' : 'created'} successfully`);
      window.dispatchEvent(new CustomEvent('school-updated'));
    } catch (error: any) {
      console.error('Error saving school:', error);
      toast.error(`Failed to save school: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await academicService.updateDepartment(editingDept.id, {
          name: deptForm.name,
          code: deptForm.code,
          schoolId: deptForm.schoolId,
          head: deptForm.head || undefined,
          duration: deptForm.duration || 4,
        });
      } else {
        await academicService.createDepartment({
          name: deptForm.name,
          code: deptForm.code,
          schoolId: deptForm.schoolId,
          head: deptForm.head || undefined,
          duration: deptForm.duration || 4,
        });
      }
      await loadSchools();
      setAddDeptOpen(false);
      setEditDeptOpen(false);
      setEditingDept(null);
      toast.success(`Program ${editingDept ? 'updated' : 'created'} successfully`);
      window.dispatchEvent(new CustomEvent('department-updated'));
    } catch (error: any) {
      console.error('Error saving program:', error);
      toast.error(`Failed to save program: ${error?.message || 'Unknown error'}`);
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
      (s.code ?? '').toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
      (s.dean ?? '').toLowerCase().includes(schoolSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools and programs..."
            className="pl-8"
            value={schoolSearchTerm}
            onChange={(e) => setSchoolSearchTerm(e.target.value)}
          />
        </div>
        <Button className="bg-[#015F2B]" onClick={openAddSchool}><Plus className="mr-2 h-4 w-4" /> Add School</Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Schools & Programs</CardTitle>
          <CardDescription>Manage academic structure: Schools contain Programs.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading schools and programs...
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No schools found.</div>
          ) : (
            <div className="space-y-2">
              {filteredSchools.map((school) => {
                const schoolDepts = departmentsBySchool[school.id] || [];
                const isExpanded = expandedSchools.has(school.id);
                return (
                  <div key={school.id} className="border rounded-lg">
                    {/* School Row */}
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                      <div className="flex items-center gap-3 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleSchool(school.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Building className="h-5 w-5 text-[#015F2B]" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{school.name}</div>
                          <div className="text-sm text-gray-500">
                            Code: {school.code || '—'} • Dean: {school.dean || 'Not assigned'} •
                            {school.deptCount ?? 0} Program{school.deptCount !== 1 ? 's' : ''} •
                            {school.studentCount != null ? `${school.studentCount} Students` : '—'} •
                            {school.staffCount != null ? `${school.staffCount} Staff` : '—'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddDept(school.id)}
                          className="text-[#015F2B] border-[#015F2B]"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Program
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditSchool(school)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit School
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={async () => {
                              if (confirm(`Delete school "${school.name}"? This will also delete all programs under this school.`)) {
                                try {
                                  await academicService.deleteSchool(school.id);
                                  await loadSchools();
                                  toast.success('School deleted successfully');
                                } catch (error: any) {
                                  console.error('Error deleting school:', error);
                                  toast.error(`Failed to delete school: ${error?.message || 'Unknown error'}`);
                                }
                              }
                            }}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete School
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    {/* Programs list (collapsible) */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50/50">
                        {schoolDepts.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No programs yet. Click &quot;Add Program&quot; to create one.
                          </div>
                        ) : (
                          <div className="divide-y">
                            {schoolDepts.map((dept) => (
                              <div key={dept.id} className="flex items-center justify-between p-3 pl-12 hover:bg-white">
                                <div className="flex items-center gap-3 flex-1">
                                  <School className="h-4 w-4 text-gray-400" />
                                  <div>
                                    <div className="font-medium text-gray-900">{dept.name}</div>
                                    <div className="text-xs text-gray-500">
                                      Code: {dept.code} {dept.head ? `• Head: ${dept.head}` : ''} {dept.duration ? `• ${dept.duration}-year` : ''}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDept(dept)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={async () => {
                                      if (confirm(`Delete program "${dept.name}"?`)) {
                                        try {
                                          await academicService.deleteDepartment(dept.id);
                                          await loadSchools();
                                          toast.success('Program deleted successfully');
                                        } catch (error: any) {
                                          console.error('Error deleting program:', error);
                                          toast.error(`Failed to delete program: ${error?.message || 'Unknown error'}`);
                                        }
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add School Dialog */}
      <Dialog open={addSchoolOpen} onOpenChange={setAddSchoolOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add School</DialogTitle>
            <DialogDescription>Create a new school/faculty. Programs will be added under schools.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSchool} className="space-y-4">
            <div>
              <Label>School Name *</Label>
              <Input value={schoolForm.name} onChange={e => setSchoolForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. School of Computing & Forensics" />
            </div>
            <div>
              <Label>Code *</Label>
              <Input value={schoolForm.code} onChange={e => setSchoolForm(f => ({ ...f, code: e.target.value }))} required placeholder="e.g. SCF" />
            </div>
            <div>
              <Label>Dean / Head</Label>
              <Input value={schoolForm.dean} onChange={e => setSchoolForm(f => ({ ...f, dean: e.target.value }))} placeholder="e.g. Dr. John Doe" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddSchoolOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Create School</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={editSchoolOpen} onOpenChange={setEditSchoolOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSchool} className="space-y-4">
            <div>
              <Label>School Name *</Label>
              <Input value={schoolForm.name} onChange={e => setSchoolForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Code *</Label>
              <Input value={schoolForm.code} onChange={e => setSchoolForm(f => ({ ...f, code: e.target.value }))} required />
            </div>
            <div>
              <Label>Dean / Head</Label>
              <Input value={schoolForm.dean} onChange={e => setSchoolForm(f => ({ ...f, dean: e.target.value }))} placeholder="e.g. Dr. John Doe" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditSchoolOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Update School</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Program Dialog */}
      <Dialog open={addDeptOpen} onOpenChange={setAddDeptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Program</DialogTitle>
            <DialogDescription>Create a new program under a school.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDept} className="space-y-4">
            <div>
              <Label>School *</Label>
              <Select value={deptForm.schoolId} onValueChange={v => setDeptForm(f => ({ ...f, schoolId: v }))} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Program Name *</Label>
              <Input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Computer Science" />
            </div>
            <div>
              <Label>Program Code *</Label>
              <Input value={deptForm.code} onChange={e => setDeptForm(f => ({ ...f, code: e.target.value }))} required placeholder="e.g. CS" />
            </div>
            <div>
              <Label>Head of Program</Label>
              <Input value={deptForm.head} onChange={e => setDeptForm(f => ({ ...f, head: e.target.value }))} placeholder="e.g. Prof. Jane Smith" />
            </div>
            <div>
              <Label>Duration (Years) *</Label>
              <Select value={deptForm.duration.toString()} onValueChange={v => setDeptForm(f => ({ ...f, duration: parseInt(v) }))} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((years) => (
                    <SelectItem key={years} value={years.toString()}>
                      {years} {years === 1 ? 'Year' : 'Years'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Number of year levels for this program</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDeptOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Create Program</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={editDeptOpen} onOpenChange={setEditDeptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDept} className="space-y-4">
            <div>
              <Label>School *</Label>
              <Select value={deptForm.schoolId} onValueChange={v => setDeptForm(f => ({ ...f, schoolId: v }))} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Program Name *</Label>
              <Input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Program Code *</Label>
              <Input value={deptForm.code} onChange={e => setDeptForm(f => ({ ...f, code: e.target.value }))} required />
            </div>
            <div>
              <Label>Head of Program</Label>
              <Input value={deptForm.head} onChange={e => setDeptForm(f => ({ ...f, head: e.target.value }))} placeholder="e.g. Prof. Jane Smith" />
            </div>
            <div>
              <Label>Duration (Years) *</Label>
              <Select value={deptForm.duration.toString()} onValueChange={v => setDeptForm(f => ({ ...f, duration: parseInt(v) }))} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((years) => (
                    <SelectItem key={years} value={years.toString()}>
                      {years} {years === 1 ? 'Year' : 'Years'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Number of year levels for this program</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDeptOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Update Program</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Classes / Groups Tab (enrollments + lecturer assignment from Admin)
// -----------------------------------------------------------------------------

function ClassesTab({
  classes,
  setClasses,
  students,
  staff,
  enrollmentsByClassId,
  setEnrollmentsByClassId,
  classesPage,
  classesTotal,
  pageSize,
  loadClasses,
}: {
  classes: ClassRow[];
  setClasses: React.Dispatch<React.SetStateAction<ClassRow[]>>;
  students: StudentRow[];
  staff: StaffRow[];
  enrollmentsByClassId: Record<string, string[]>;
  setEnrollmentsByClassId: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  classesPage: number;
  classesTotal: number;
  pageSize: number;
  loadClasses: (page: number) => Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [lecturerFilter, setLecturerFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollClass, setEnrollClass] = useState<ClassRow | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [form, setForm] = useState({ 
    name: '', 
    courseId: '', 
    lecturerId: '', 
    venueId: '', 
    dayOfWeek: '1', 
    startTime: '08:00', 
    endTime: '10:00', 
    capacity: 50 
  });
  const [adminCourses, setAdminCourses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string; code: string }[]>([]);

  const refreshClassData = async () => {
    try {
      const [coursesRes, venuesRes] = await Promise.all([
        academicService.getCourses({ limit: 50 }),
        academicService.getVenues({ limit: 50 }),
      ]);
      setAdminCourses((coursesRes.data ?? []).map((c: any) => ({ id: c.id, code: c.code ?? '', name: c.name ?? '' })));
      setVenues((venuesRes.data ?? []).map((v: any) => ({ id: v.id, name: v.name, code: v.code || '' })));
      await loadClasses(classesPage);
    } catch (error) {
      console.error('Error refreshing class data:', error);
    }
  };

  useEffect(() => {
    refreshClassData();
    const handleImportComplete = () => {
      refreshClassData();
    };
    window.addEventListener('timetable-import-complete', handleImportComplete);
    return () => window.removeEventListener('timetable-import-complete', handleImportComplete);
  }, []);

  const lecturers = staff.filter(s => s.role === 'Lecturer');
  const filteredClasses = classes.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.course.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (lecturerFilter !== 'all' && c.lecturerId !== lecturerFilter) return false;
    if (assignmentFilter === 'assigned' && !c.lecturerId) return false;
    if (assignmentFilter === 'unassigned' && c.lecturerId) return false;
    return true;
  });

  const assignLecturerToClass = async (classId: string, lecturerId: string) => {
    if (!lecturerId) return;
    try {
      await academicService.updateClass(classId, { lecturerId });
      await refreshClassData();
      toast.success('Lecturer assigned');
      window.dispatchEvent(new CustomEvent('class-updated'));
    } catch (error: any) {
      toast.error(`Failed to assign: ${error?.message || 'Unknown error'}`);
    }
  };

  const openAdd = () => {
    setEditingClass(null);
    setForm({ 
      name: '', 
      courseId: '', 
      lecturerId: '', 
      venueId: '', 
      dayOfWeek: '1', 
      startTime: '08:00', 
      endTime: '10:00', 
      capacity: 50 
    });
    setAddEditOpen(true);
  };

  const openEdit = async (cls: ClassRow) => {
    setEditingClass(cls);
    // Fetch class details to get full information
    try {
      const classDetails = await academicService.getClassById(cls.id);
      setForm({ 
        name: cls.name, 
        courseId: cls.courseId, 
        lecturerId: cls.lecturerId || '', 
        venueId: (classDetails as any)?.venueId || '', 
        dayOfWeek: String((classDetails as any)?.dayOfWeek ?? 1), 
        startTime: (classDetails as any)?.startTime || '08:00', 
        endTime: (classDetails as any)?.endTime || '10:00', 
        capacity: (classDetails as any)?.capacity ?? 50 
      });
    } catch (error) {
      // Fallback to basic info if API fails
      setForm({ 
        name: cls.name, 
        courseId: cls.courseId, 
        lecturerId: cls.lecturerId || '', 
        venueId: '', 
        dayOfWeek: '1', 
        startTime: '08:00', 
        endTime: '10:00', 
        capacity: 50 
      });
    }
    setAddEditOpen(true);
  };

  const saveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!editingClass && !form.lecturerId) {
        toast.error('Please select a lecturer');
        return;
      }
      const course = adminCourses.find(co => co.id === form.courseId);
      const lecturer = lecturers.find(l => l.id === form.lecturerId);
      const venue = venues.find(v => v.id === form.venueId);

      if (editingClass) {
        await academicService.updateClass(editingClass.id, {
          courseId: form.courseId,
          lecturerId: form.lecturerId || undefined,
          venueId: form.venueId || undefined,
          dayOfWeek: parseInt(form.dayOfWeek, 10),
          startTime: form.startTime,
          endTime: form.endTime,
          capacity: form.capacity,
        });
        await refreshClassData();
      } else {
        await academicService.createClass({
          name: form.name,
          courseId: form.courseId,
          lecturerId: form.lecturerId || '',
          venueId: form.venueId || '',
          capacity: form.capacity,
          dayOfWeek: parseInt(form.dayOfWeek, 10),
          startTime: form.startTime,
          endTime: form.endTime,
          enrolledCount: 0,
        } as any);
        await refreshClassData();
      }
      setAddEditOpen(false);
      toast.success(editingClass ? 'Class updated successfully' : 'Class created successfully');
      window.dispatchEvent(new CustomEvent('class-updated'));
    } catch (error) {
      console.error('Error saving class:', error);
      toast.error('Failed to save class. Please try again.');
    }
  };

  const openEnrollForClass = async (cls: ClassRow) => {
    setEnrollClass(cls);
    try {
      // Load current enrollments from API
      const currentEnrollments = await enrollmentService.getClassEnrollments(cls.id);
      const currentStudentIds = currentEnrollments.map((e: any) => e.studentId || e.student?.id);
      setSelectedStudentIds(currentStudentIds);
      // Update local state
      setEnrollmentsByClassId(prev => ({ ...prev, [cls.id]: currentStudentIds }));
    } catch (error) {
      console.error('Error loading enrollments:', error);
      // Fallback to local state if API fails
      setSelectedStudentIds(enrollmentsByClassId[cls.id] ?? []);
    }
    setEnrollOpen(true);
  };

  const saveEnrollmentsForClass = async () => {
    if (!enrollClass) return;
    try {
      // Get current enrollments for this class
      const currentEnrollments = await enrollmentService.getClassEnrollments(enrollClass.id);
      const currentStudentIds = currentEnrollments.map((e: any) => e.studentId || e.student?.id);
      
      // Find students to add and remove
      const toAdd = selectedStudentIds.filter(id => !currentStudentIds.includes(id));
      const toRemove = currentStudentIds.filter((id: string) => !selectedStudentIds.includes(id));
      
      // Remove enrollments
      for (const studentId of toRemove) {
        const enrollment = (currentEnrollments as { id?: string; studentId?: string; student?: { id?: string } }[]).find(e => (e.studentId || e.student?.id) === studentId);
        if (enrollment?.id) {
          await enrollmentService.deleteEnrollment(enrollment.id);
        }
      }
      
      // Bulk add new enrollments
      if (toAdd.length > 0) {
        await enrollmentService.bulkEnroll({
          classId: enrollClass.id,
          studentIds: toAdd,
          status: 'Active',
        });
      }
      
      setEnrollmentsByClassId(prev => ({ ...prev, [enrollClass.id]: selectedStudentIds }));
      setClasses(prev => prev.map(c => c.id === enrollClass.id ? { ...c, students: selectedStudentIds.length } : c));
      setEnrollOpen(false);
      setEnrollClass(null);
      toast.success('Enrollments updated.');
    } catch (error) {
      console.error('Error saving enrollments:', error);
      toast.error('Failed to save enrollments. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search classes..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={lecturerFilter} onValueChange={setLecturerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Lecturer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All lecturers</SelectItem>
            {lecturers.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assignmentFilter} onValueChange={(v: 'all' | 'assigned' | 'unassigned') => setAssignmentFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Assignment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            <SelectItem value="assigned">With lecturer</SelectItem>
            <SelectItem value="unassigned">Without lecturer</SelectItem>
          </SelectContent>
        </Select>
        <Button className="bg-[#015F2B]" onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Class Group</Button>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class Name</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Lecturer</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Default Venue</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClasses.map((cls) => (
              <TableRow key={cls.id}>
                <TableCell className="font-medium">{cls.name}</TableCell>
                <TableCell>{cls.course}</TableCell>
                <TableCell>
                  <Select
                    value={cls.lecturerId || ''}
                    onValueChange={(v) => v && assignLecturerToClass(cls.id, v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select lecturer" />
                    </SelectTrigger>
                    <SelectContent>
                      {lecturers.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{cls.students}</TableCell>
                <TableCell>{cls.room}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEnrollForClass(cls)}><Users className="h-4 w-4 mr-1" /> Enrollments</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(cls)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      if (confirm(`Delete class "${cls.name}"?`)) {
                        try {
                          await academicService.deleteClass(cls.id);
                          await refreshClassData();
                          setEnrollmentsByClassId(prev => {
                            const next = { ...prev };
                            delete next[cls.id];
                            return next;
                          });
                          window.dispatchEvent(new CustomEvent('class-updated'));
                        } catch (error: any) {
                          console.error('Error deleting class:', error);
                          const errorMsg = error?.response?.data?.message || error?.message || 'Failed to delete class';
                          toast.error(`Failed to delete class: ${errorMsg}. It may have active enrollments.`);
                        }
                      }
                    }}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {classesTotal > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-2">
            <span className="text-sm text-muted-foreground">{classesTotal} total</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={classesPage <= 1} onClick={() => loadClasses(classesPage - 1)}>Previous</Button>
              <span className="text-sm">Page {classesPage} of {Math.max(1, Math.ceil(classesTotal / pageSize))}</span>
              <Button variant="outline" size="sm" disabled={classesPage >= Math.ceil(classesTotal / pageSize)} onClick={() => loadClasses(classesPage + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={addEditOpen} onOpenChange={setAddEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClass ? 'Edit class' : 'Add class group'}</DialogTitle>
            <DialogDescription>Set course, lecturer assignment, schedule, and venue. Use Enrollments on the table to assign students.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveClass} className="space-y-4">
            <div className="space-y-2">
              <Label>Class name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. SWE II - Group A" />
            </div>
            <div className="space-y-2">
              <Label>Course</Label>
                <Combobox
                  options={adminCourses.map((co) => ({
                    value: co.id,
                    label: `${co.code} – ${co.name}`,
                  }))}
                  value={form.courseId || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, courseId: v }))}
                  placeholder="Select course"
                  searchPlaceholder="Search courses..."
                  emptyText="No course found."
                  initialDisplayCount={10}
                />
            </div>
            <div className="space-y-2">
              <Label>Lecturer *</Label>
              <Combobox
                options={
                  editingClass
                    ? [
                        { value: 'none', label: '— None —' },
                        ...lecturers.map((l) => ({
                          value: String(l.id),
                          label: l.name,
                        })),
                      ]
                    : lecturers.map((l) => ({
                        value: String(l.id),
                        label: l.name,
                      }))
                }
                value={form.lecturerId || (editingClass ? 'none' : '')}
                onValueChange={(v) => setForm((f) => ({ ...f, lecturerId: v === 'none' ? '' : v }))}
                placeholder={editingClass ? 'Select lecturer' : 'Select lecturer (required)'}
                searchPlaceholder="Search lecturers..."
                emptyText="No lecturer found."
                initialDisplayCount={10}
              />
              {!editingClass && (
                <p className="text-xs text-muted-foreground">Assign a lecturer to this class</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Venue</Label>
              <Combobox
                options={[
                  { value: 'none', label: '— None —' },
                  ...venues.map((v) => ({
                    value: v.id,
                    label: `${v.name}${v.code ? ` (${v.code})` : ''}`,
                  })),
                ]}
                value={form.venueId || 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, venueId: v === 'none' ? '' : v }))}
                placeholder="Select venue"
                searchPlaceholder="Search venues..."
                emptyText="No venue found."
                initialDisplayCount={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select value={form.dayOfWeek} onValueChange={v => setForm(f => ({ ...f, dayOfWeek: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input 
                  type="number" 
                  value={form.capacity} 
                  onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value, 10) || 50 }))} 
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input 
                  type="time" 
                  value={form.startTime} 
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input 
                  type="time" 
                  value={form.endTime} 
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} 
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">{editingClass ? 'Save' : 'Add class'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={enrollOpen} onOpenChange={(open) => !open && setEnrollOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage enrollments</DialogTitle>
            <DialogDescription>{enrollClass ? `Class: ${enrollClass.name}. Select students to enroll.` : 'Select students.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {students.map(st => (
              <div key={st.id} className="flex items-center gap-2">
                <Checkbox id={`st-${st.id}`} checked={selectedStudentIds.includes(st.id)} onCheckedChange={(c) => setSelectedStudentIds(prev => c ? [...prev, st.id] : prev.filter(id => id !== st.id))} />
                <Label htmlFor={`st-${st.id}`} className="font-normal">{st.name} ({st.studentId})</Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</Button>
            <Button onClick={saveEnrollmentsForClass} className="bg-[#015F2B]">Save enrollments</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Timetables Tab (from academic classes API)
// -----------------------------------------------------------------------------
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_OPTIONS = [
  { value: 'all', label: 'All days' },
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

function TimetablesTab({ onScheduleClass }: { onScheduleClass?: () => void }) {
  const [classes, setClasses] = useState<TimetableClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TimetableClass | null>(null);
  const [editForm, setEditForm] = useState({ lecturerId: '', venueId: '', capacity: 50, startTime: '', endTime: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingClass, setDeletingClass] = useState<TimetableClass | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [lecturers, setLecturers] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState({ program: '', year: '', semester: '', day: '', courseCode: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const query: any = { page, limit: 20 };
      if (filters.program) query.program = filters.program;
      if (filters.year) query.year = parseInt(filters.year);
      if (filters.semester) query.semester = parseInt(filters.semester);
      if (filters.day) query.day = filters.day;
      if (filters.courseCode) query.courseCode = filters.courseCode;
      const result = await timetableService.getTimetable(query);
      setClasses(result.data);
      setTotal(result.total);
    } catch (error: any) {
      toast.error(`Failed to load timetable: ${error?.message || 'Unknown error'}`);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [page, filters]);

  useEffect(() => {
    const handleCourseUpdate = () => loadTimetable();
    const handleSchoolUpdate = () => loadTimetable();
    const handleDepartmentUpdate = () => loadTimetable();
    const handleClassUpdate = () => loadTimetable();
    
    window.addEventListener('course-updated', handleCourseUpdate);
    window.addEventListener('school-updated', handleSchoolUpdate);
    window.addEventListener('department-updated', handleDepartmentUpdate);
    window.addEventListener('class-updated', handleClassUpdate);
    
    return () => {
      window.removeEventListener('course-updated', handleCourseUpdate);
      window.removeEventListener('school-updated', handleSchoolUpdate);
      window.removeEventListener('department-updated', handleDepartmentUpdate);
      window.removeEventListener('class-updated', handleClassUpdate);
    };
  }, []);

  const loadLecturers = async () => {
    try {
      const result = await staffService.getStaff({ role: 'Lecturer', limit: 50 });
      const lecturers = Array.isArray(result) ? result : (result.data || []);
      setLecturers(lecturers.filter((s: any) => s.role === 'Lecturer').map((s: any) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
      })));
    } catch (error) {
      console.error('Error loading lecturers:', error);
      setLecturers([]);
    }
  };

  useEffect(() => {
    academicService.getVenues({ limit: 50 }).then((res: any) => {
      const arr = res?.data ?? [];
      setVenues(arr.map((v: any) => ({ id: v.id, name: v.name })));
    }).catch(() => setVenues([]));
    loadLecturers();
  }, []);

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const result = await timetableService.importTimetable(file, false);
      setImportResult(result);
      toast.success(`Import completed! ${result.summary.classesCreated} classes created, ${result.summary.classesUpdated} updated.`);
      await loadTimetable();
      await loadLecturers();
      window.dispatchEvent(new CustomEvent('timetable-import-complete', { detail: result }));
    } catch (error: any) {
      toast.error(`Import failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleEdit = (cls: TimetableClass) => {
    setEditingClass(cls);
    setEditForm({
      lecturerId: cls.lecturerId || '',
      venueId: cls.venueId || '',
      capacity: cls.capacity,
      startTime: cls.startTime || '',
      endTime: cls.endTime || '',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingClass) return;
    try {
      await timetableService.updateClass(editingClass.id, {
        lecturerId: editForm.lecturerId || null,
        venueId: editForm.venueId || null,
        capacity: parseInt(String(editForm.capacity)),
        startTime: editForm.startTime,
        endTime: editForm.endTime,
      });
      toast.success('Class updated successfully');
      setEditOpen(false);
      await loadTimetable();
      await loadLecturers();
    } catch (error: any) {
      toast.error(`Failed to update: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDelete = (cls: TimetableClass) => {
    setDeletingClass(cls);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingClass) return;
    setDeleting(true);
    try {
      await timetableService.deleteClass(deletingClass.id);
      toast.success('Class deleted successfully');
      setDeleteOpen(false);
      setDeletingClass(null);
      await loadTimetable();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error?.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Program"
            value={filters.program}
            onChange={(e) => setFilters({ ...filters, program: e.target.value })}
            className="w-[150px]"
          />
          <Select value={filters.year || "all"} onValueChange={(v) => setFilters({ ...filters, year: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="1">Year 1</SelectItem>
              <SelectItem value="2">Year 2</SelectItem>
              <SelectItem value="3">Year 3</SelectItem>
              <SelectItem value="4">Year 4</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.semester || "all"} onValueChange={(v) => setFilters({ ...filters, semester: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="1">Semester 1</SelectItem>
              <SelectItem value="2">Semester 2</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.day || "all"} onValueChange={(v) => setFilters({ ...filters, day: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {DAY_NAMES.map((d, i) => (
                <SelectItem key={i} value={d.toLowerCase()}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Course Code"
            value={filters.courseCode}
            onChange={(e) => setFilters({ ...filters, courseCode: e.target.value })}
            className="w-[150px]"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import File
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Download Template
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => timetableService.downloadTemplate('csv').catch((e: any) => toast.error(e.message))}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => timetableService.downloadTemplate('excel').catch((e: any) => toast.error(e.message))}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel Template (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="bg-[#015F2B]" onClick={onScheduleClass}>
            <Plus className="mr-2 h-4 w-4" /> Schedule Class
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>University Timetable</CardTitle>
          <CardDescription>View and manage all class schedules. Total: {total} classes</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Lecturer</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : classes.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">No classes found. Import a timetable CSV file.</TableCell></TableRow>
              ) : (
                classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell>{cls.course.department.name}</TableCell>
                    <TableCell>{cls.course.level}</TableCell>
                    <TableCell>{cls.course.semester}</TableCell>
                    <TableCell>{cls.course.code}</TableCell>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{cls.dayOfWeek !== null ? DAY_NAMES[cls.dayOfWeek] : '—'}</TableCell>
                    <TableCell>{cls.startTime && cls.endTime ? `${cls.startTime} - ${cls.endTime}` : '—'}</TableCell>
                    <TableCell>{cls.venue?.name || '—'}</TableCell>
                    <TableCell className={cls.lecturer ? '' : 'text-amber-600 font-medium'}>{cls.lecturer?.name || 'Not assigned'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(cls)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(cls)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {total > 50 && (
            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {Math.max(1, Math.ceil(total / 20))}</span>
              <Button variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Timetable</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file with timetable data. Format: Program, Year, Semester, Course Code, Course Name, Class Name, Lecturer Name, Day, Start Time, End Time, Venue, Capacity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => timetableService.downloadTemplate('csv').catch((e: any) => toast.error(e.message))}>
                <Download className="h-4 w-4 mr-2" /> CSV Template
              </Button>
              <Button variant="outline" onClick={() => timetableService.downloadTemplate('excel').catch((e: any) => toast.error(e.message))}>
                <Download className="h-4 w-4 mr-2" /> Excel Template
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const isExcel = /\.(xlsx|xls)$/i.test(file.name);
                  const isCsv = /\.csv$/i.test(file.name);
                  if (!isExcel && !isCsv) {
                    toast.error('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
                    return;
                  }
                  handleImport(file);
                }
              }}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={importing} className="w-full">
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              {importing ? 'Importing...' : 'Select CSV or Excel File'}
            </Button>
            {importResult && (
              <div className="space-y-2 p-4 bg-gray-50 rounded">
                <div className="font-semibold">Import Summary:</div>
                <div>Total Rows: {importResult.summary.totalRows}</div>
                <div>Departments: {importResult.summary.departmentsCreated || 0} created, {importResult.summary.departmentsMatched || 0} matched</div>
                <div>Courses: {importResult.summary.coursesCreated || 0} created, {importResult.summary.coursesMatched || 0} matched</div>
                <div>Lecturers: {importResult.summary.lecturersCreated || 0} created, {importResult.summary.lecturersMatched || 0} matched</div>
                <div>Classes: {importResult.summary.classesCreated || 0} created, {importResult.summary.classesUpdated || 0} updated</div>
                {importResult.errors?.length > 0 && (
                  <div className="text-red-600">Errors: {importResult.errors.length}</div>
                )}
                {importResult.warnings?.length > 0 && (
                  <div className="text-yellow-600">Warnings: {importResult.warnings.length}</div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingClass?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>Update class details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Lecturer</Label>
              <Combobox
                options={[
                  { value: 'none', label: 'None' },
                  ...lecturers.map((l) => ({
                    value: l.id,
                    label: l.name,
                  })),
                ]}
                value={editForm.lecturerId || 'none'}
                onValueChange={(v) => setEditForm({ ...editForm, lecturerId: v === 'none' ? '' : v })}
                placeholder="Select lecturer"
                searchPlaceholder="Search lecturers..."
                emptyText="No lecturer found."
                initialDisplayCount={10}
              />
            </div>
            <div>
              <Label>Venue</Label>
              <Combobox
                options={[
                  { value: 'none', label: 'None' },
                  ...venues.map((v) => ({
                    value: v.id,
                    label: v.name,
                  })),
                ]}
                value={editForm.venueId || 'none'}
                onValueChange={(v) => setEditForm({ ...editForm, venueId: v === 'none' ? '' : v })}
                placeholder="Select venue"
                searchPlaceholder="Search venues..."
                emptyText="No venue found."
                initialDisplayCount={10}
              />
            </div>
            <div>
              <Label>Start Time (HH:MM)</Label>
              <Input value={editForm.startTime} onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })} placeholder="08:00" />
            </div>
            <div>
              <Label>End Time (HH:MM)</Label>
              <Input value={editForm.endTime} onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })} placeholder="10:00" />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 50 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Strategic Goals Tab (backoffice config for Management Overview)
// -----------------------------------------------------------------------------
function StrategicGoalsTab() {
  const [goals, setGoals] = useState<{ name: string; progress: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminService.getStrategicGoals().then(setGoals).catch(() => setGoals([])).finally(() => setLoading(false));
  }, []);

  const updateGoal = (index: number, field: 'name' | 'progress', value: string | number) => {
    setGoals((prev) => {
      const next = [...prev];
      if (!next[index]) return next;
      if (field === 'name') next[index] = { ...next[index], name: String(value) };
      else next[index] = { ...next[index], progress: Math.min(100, Math.max(0, Number(value) || 0)) };
      return next;
    });
  };

  const addGoal = () => {
    setGoals((prev) => [...prev, { name: '', progress: 0 }]);
  };

  const removeGoal = (index: number) => {
    setGoals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const valid = goals.filter((g) => g.name.trim());
    if (!valid.length) {
      toast.error('Add at least one goal with a name');
      return;
    }
    setSaving(true);
    try {
      await adminService.updateStrategicGoals(valid.map((g) => ({ name: g.name.trim(), progress: g.progress })));
      setGoals(valid);
      toast.success('Strategic goals saved. They will appear on Management Overview.');
    } catch {
      toast.error('Failed to save strategic goals');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Strategic Goals</CardTitle>
          <CardDescription>
            Configure goals shown on the Management Overview dashboard. Progress is 0–100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.map((goal, idx) => (
            <div key={idx} className="flex gap-4 items-center flex-wrap">
              <Input
                placeholder="Goal name"
                value={goal.name}
                onChange={(e) => updateGoal(idx, 'name', e.target.value)}
                className="max-w-[280px]"
              />
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="Progress %"
                value={goal.progress}
                onChange={(e) => updateGoal(idx, 'progress', e.target.value)}
                className="w-24"
              />
              <Button variant="ghost" size="sm" onClick={() => removeGoal(idx)} className="text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addGoal}>
              <Plus className="h-4 w-4 mr-2" /> Add goal
            </Button>
            <Button className="bg-[#015F2B] hover:bg-[#014022]" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save goals
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Users Management Tab
// -----------------------------------------------------------------------------
type UserRow = { id: string; email: string; name: string; role: string; isActive: boolean; lastLoginAt: string | null; createdAt: string };
function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', isActive: true });
  const [resetPassword, setResetPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const userList = await adminService.getUsers();
      const list = Array.isArray(userList) ? userList : (userList as any)?.data ?? [];
      setUsers(list.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        linkedRecord: u.linkedRecord || null, // Include linked record info
      })));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setEditForm({ name: user.name, role: user.role, isActive: user.isActive });
    setResetPassword(false);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setEditOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Validate password reset if enabled
    if (resetPassword) {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }
    }

    try {
      // Update user details
      await adminService.updateUser(editingUser.id, {
        name: editForm.name,
        role: editForm.role,
        isActive: editForm.isActive,
      });

      // Reset password if requested
      if (resetPassword) {
        await adminService.resetUserPassword(editingUser.id, passwordForm.newPassword);
      }

      await loadUsers();
      setEditOpen(false);
      setEditingUser(null);
      setResetPassword(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      toast.success(resetPassword ? 'User updated and password reset successfully' : 'User updated successfully');
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`Failed to update user: ${error?.message || 'Unknown error'}`);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by email, name, or role..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Linked Record</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No users found.</TableCell></TableRow>
                ) : (
                  filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.linkedRecord ? (
                          <div className="text-xs">
                            <Badge variant="outline" className="mr-1">
                              {user.linkedRecord.type === 'student' ? 'Student' : user.linkedRecord.role}
                            </Badge>
                            <span className="text-muted-foreground">
                              {user.linkedRecord.number}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No linked record</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(user)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details for {editingUser?.name} ({editingUser?.email})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                  <SelectItem value="QA">QA</SelectItem>
                  <SelectItem value="Lecturer">Lecturer</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={editForm.isActive}
                onCheckedChange={(checked) => setEditForm(f => ({ ...f, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="resetPassword"
                  checked={resetPassword}
                  onCheckedChange={setResetPassword}
                />
                <Label htmlFor="resetPassword" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Reset Password
                </Label>
              </div>

              {resetPassword && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div>
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder="Enter new password (min 8 characters)"
                      required={resetPassword}
                      minLength={8}
                    />
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      required={resetPassword}
                      minLength={8}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The user will need to use this new password to login.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setEditOpen(false);
                setResetPassword(false);
                setPasswordForm({ newPassword: '', confirmPassword: '' });
              }}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">
                {resetPassword ? 'Update User & Reset Password' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SUB-COMPONENT: Academic Calendar Tab
// -----------------------------------------------------------------------------
function AcademicCalendarTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', type: 'Academic', startDate: '', endDate: '', status: 'Scheduled', description: '' });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const list = await academicService.getCalendarEvents();
      setEvents(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingEvent(null);
    setForm({ name: '', type: 'Academic', startDate: '', endDate: '', status: 'Scheduled', description: '' });
    setAddOpen(true);
  };

  const openEdit = (event: any) => {
    setEditingEvent(event);
    setForm({
      name: event.name || '',
      type: event.type || 'Academic',
      startDate: event.startDate ? event.startDate.split('T')[0] : '',
      endDate: event.endDate ? event.endDate.split('T')[0] : '',
      status: event.status || 'Scheduled',
      description: event.description || '',
    });
    setEditOpen(true);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await academicService.updateCalendarEvent(editingEvent.id, form);
      } else {
        await academicService.createCalendarEvent({
          ...form,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
        });
      }
      await loadEvents();
      setAddOpen(false);
      setEditOpen(false);
    } catch (error) {
      console.error('Error saving calendar event:', error);
      toast.error('Failed to save event');
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this calendar event?')) return;
    try {
      await academicService.deleteCalendarEvent(id);
      await loadEvents();
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      toast.error('Failed to delete event');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search calendar..." className="pl-8" />
        </div>
        <Button className="bg-[#015F2B]" onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Event</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event / Period Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : events.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No calendar events. Click "Add Event" to create one.</TableCell></TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>{event.type}</TableCell>
                  <TableCell>{event.startDate ? new Date(event.startDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>{event.endDate ? new Date(event.endDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell><Badge>{event.status || 'Scheduled'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(event)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteEvent(event.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Calendar Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEvent} className="space-y-4">
            <div>
              <Label>Event Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="Holiday">Holiday</SelectItem>
                  <SelectItem value="Exam">Exam</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Calendar Event</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEvent} className="space-y-4">
            <div>
              <Label>Event Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="Holiday">Holiday</SelectItem>
                  <SelectItem value="Exam">Exam</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT: Admin View
// -----------------------------------------------------------------------------
const LIST_PAGE_SIZE = 20;

export default function AdminView({ defaultTab = 'students' }: { defaultTab?: string }) {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(defaultTab);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffPage, setStaffPage] = useState(1);
  const [staffTotal, setStaffTotal] = useState(0);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [enrollmentsByClassId, setEnrollmentsByClassId] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadStudents = async (page: number) => {
    try {
      const res = await studentService.getStudents({ page, limit: LIST_PAGE_SIZE });
      const data = res.data || res;
      setStudents(Array.isArray(data) ? data.map((s: any) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        studentId: s.studentNumber,
        dept: s.program || '',
        year: `Year ${s.year || 1}`,
        status: s.status || 'Active',
        programId: s.programId,
        departmentId: s.departmentId,
        semester: s.semester,
      })) : []);
      setStudentsTotal(res.total ?? 0);
      setStudentsPage(res.page ?? page);
    } catch (e) {
      setStudents([]);
      setStudentsTotal(0);
    }
  };

  const loadStaff = async (page: number) => {
    try {
      const res = await staffService.getStaff({ page, limit: LIST_PAGE_SIZE });
      const data = res.data || res;
      setStaff(Array.isArray(data) ? data.map((s: any) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        role: s.role,
        dept: s.departmentName || s.departmentId || '',
        departmentId: s.departmentId,
        status: s.status || 'Active',
      })) : []);
      setStaffTotal(res.total ?? 0);
      setStaffPage(res.page ?? page);
    } catch (e) {
      setStaff([]);
      setStaffTotal(0);
    }
  };

  const [classesPage, setClassesPage] = useState(1);
  const [classesTotal, setClassesTotal] = useState(0);
  const loadClasses = async (pageNum: number) => {
    try {
      const res = await academicService.getClasses({ page: pageNum, limit: LIST_PAGE_SIZE });
      const arr = res.data ?? [];
      setClasses(arr.map((c: any) => ({
        id: c.id,
        name: c.name,
        course: c.course?.name || '',
        courseId: c.courseId,
        lecturerId: c.lecturerId,
        lecturerName: c.lecturer ? `${c.lecturer.firstName} ${c.lecturer.lastName}` : '—',
        students: c.enrolledCount || 0,
        room: c.venue?.name || '',
      })));
      setClassesTotal(res.total ?? 0);
      setClassesPage(res.page ?? pageNum);
    } catch (e) {
      setClasses([]);
      setClassesTotal(0);
    }
  };

  const [venuesPage, setVenuesPage] = useState(1);
  const [venuesTotal, setVenuesTotal] = useState(0);
  const loadVenues = async (pageNum: number) => {
    try {
      const res = await academicService.getVenues({ page: pageNum, limit: LIST_PAGE_SIZE });
      const arr = res.data ?? [];
      setVenues(arr.map((v: any) => ({
        id: v.id,
        name: v.name,
        code: v.code || '',
        type: v.type,
        capacity: v.capacity,
        building: v.building || '',
        floor: v.floor,
        facilities: v.facilities,
      })));
      setVenuesTotal(res.total ?? 0);
      setVenuesPage(res.page ?? pageNum);
    } catch (e) {
      setVenues([]);
      setVenuesTotal(0);
    }
  };

  useEffect(() => {
    setCurrentTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    loadData();
    const handleImportComplete = () => {
      loadData();
    };
    window.addEventListener('timetable-import-complete', handleImportComplete);
    return () => window.removeEventListener('timetable-import-complete', handleImportComplete);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, schoolsRes] = await Promise.all([
        academicService.getCourses({ page: 1, limit: LIST_PAGE_SIZE }),
        academicService.getSchools(),
      ]);

      const coursesArr = (coursesRes as any)?.data ?? [];
      const schoolsData = Array.isArray(schoolsRes) ? schoolsRes : (schoolsRes as any)?.data ?? [];

      await loadClasses(1);
      await loadVenues(1);

      setCourses(coursesArr.map((c: any) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        dept: c.departmentId || '',
        credits: c.credits,
      })));

      setSchools(schoolsData.map((s: any) => ({
        id: s.id,
        name: s.name,
        dean: s.dean || null,
        depts: 0,
        students: 0,
        staff: 0,
      })));

      await loadStudents(1);
      await loadStaff(1);

      let enrollmentsPage = 1;
      const enrollmentsMap: Record<string, string[]> = {};
      while (true) {
        const res = await enrollmentService.getEnrollments({ page: enrollmentsPage, limit: LIST_PAGE_SIZE });
        const enrollmentsData = (res as any)?.data || res;
        const arr = Array.isArray(enrollmentsData) ? enrollmentsData : [];
        arr.forEach((e: any) => {
          if (!enrollmentsMap[e.classId]) enrollmentsMap[e.classId] = [];
          enrollmentsMap[e.classId].push(e.studentId);
        });
        if (arr.length < LIST_PAGE_SIZE) break;
        enrollmentsPage++;
      }
      setEnrollmentsByClassId(enrollmentsMap);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Admin Backoffice</h1>
          <p className="text-gray-500">Manage master data and system configuration.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate('/admin-audit-log')}>
             <Shield size={16} /> Audit Log
          </Button>
        </div>
      </div>

      <Tabs value={currentTab} className="space-y-6">
        <TabsContent value="students" className="mt-0">
          <StudentsTab students={students} setStudents={setStudents} classes={classes} setClasses={setClasses} enrollmentsByClassId={enrollmentsByClassId} setEnrollmentsByClassId={setEnrollmentsByClassId} studentsPage={studentsPage} studentsTotal={studentsTotal} pageSize={LIST_PAGE_SIZE} loadStudents={loadStudents} />
        </TabsContent>
        
        <TabsContent value="staff" className="mt-0">
          <StaffTab staff={staff} setStaff={setStaff} staffPage={staffPage} staffTotal={staffTotal} pageSize={LIST_PAGE_SIZE} loadStaff={loadStaff} />
        </TabsContent>
        
        <TabsContent value="lecturers" className="mt-0">
          <LecturersTab staff={staff} setStaff={setStaff} classes={classes} setClasses={setClasses} staffPage={staffPage} staffTotal={staffTotal} pageSize={LIST_PAGE_SIZE} loadStaff={loadStaff} />
        </TabsContent>

        <TabsContent value="courses" className="mt-0">
          <CoursesTab />
        </TabsContent>

        <TabsContent value="classes" className="mt-0">
          <ClassesTab classes={classes} setClasses={setClasses} students={students} staff={staff} enrollmentsByClassId={enrollmentsByClassId} setEnrollmentsByClassId={setEnrollmentsByClassId} classesPage={classesPage} classesTotal={classesTotal} pageSize={LIST_PAGE_SIZE} loadClasses={loadClasses} />
        </TabsContent>

        <TabsContent value="timetables" className="mt-0">
          <TimetablesTab onScheduleClass={() => navigate('/admin-classes')} />
        </TabsContent>

        <TabsContent value="schools" className="mt-0">
          <SchoolsTab />
        </TabsContent>
        
        <TabsContent value="venues" className="mt-0">
          <VenuesTab venues={venues} setVenues={setVenues} venuesPage={venuesPage} venuesTotal={venuesTotal} pageSize={LIST_PAGE_SIZE} loadVenues={loadVenues} />
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          <AcademicCalendarTab />
        </TabsContent>

        <TabsContent value="users" className="mt-0">
          <UsersTab />
        </TabsContent>

        <TabsContent value="strategic-goals" className="mt-0">
          <StrategicGoalsTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
