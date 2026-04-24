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
  loadStudents: (
    page: number,
    params?: {
      search?: string;
      programId?: string;
      year?: number;
      semester?: number;
      intakeType?: 'Day' | 'Evening' | 'Weekend';
      status?: string;
    }
  ) => Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    programId: string;
    year: string;
    semester: string;
    intakeType: string;
    status: string;
  }>({ programId: '__all__', year: '__all__', semester: '__all__', intakeType: '__all__', status: '__all__' });
  const [filterPrograms, setFilterPrograms] = useState<any[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string; code?: string; schoolId?: string; schoolName?: string }[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [addForm, setAddForm] = useState({ name: '', email: '', studentId: '', schoolId: '', departmentId: '', programId: '', year: 'Year 1', semester: '1', tempPassword: 'TempPassword123!' });
  const [addPreviewCourses, setAddPreviewCourses] = useState<any[]>([]);
  const [addPreviewLoading, setAddPreviewLoading] = useState(false);
  const [addSelectedCourseIds, setAddSelectedCourseIds] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', studentId: '', schoolId: '', departmentId: '', programId: '', year: 'Year 1', semester: '1' });
  const [programs, setPrograms] = useState<any[]>([]);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [previewCourses, setPreviewCourses] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [currentEnrollments, setCurrentEnrollments] = useState<string[]>([]);
  const [importCreateAccounts, setImportCreateAccounts] = useState(true);
  const [importScope, setImportScope] = useState<{ programId: string; year: number; semester: number }>({ programId: '', year: 1, semester: 1 });
  const [importPrograms, setImportPrograms] = useState<any[]>([]);
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
    const loadFilterPrograms = async () => {
      setFiltersLoading(true);
      try {
        const res = await academicService.getPrograms();
        const arr = Array.isArray(res) ? res : (res as any)?.data ?? [];
        setFilterPrograms(arr);
      } catch {
        setFilterPrograms([]);
      } finally {
        setFiltersLoading(false);
      }
    };
    loadFilterPrograms();
  }, []);

  const buildQueryParams = () => {
    const params: {
      search?: string;
      programId?: string;
      year?: number;
      semester?: number;
      intakeType?: 'Day' | 'Evening' | 'Weekend';
      status?: string;
    } = {};
    const s = searchTerm.trim();
    if (s) params.search = s;
    if (filters.programId !== '__all__') params.programId = filters.programId;
    if (filters.year !== '__all__') params.year = parseInt(filters.year, 10);
    if (filters.semester !== '__all__') params.semester = parseInt(filters.semester, 10);
    if (filters.intakeType !== '__all__') params.intakeType = filters.intakeType as 'Day' | 'Evening' | 'Weekend';
    if (filters.status !== '__all__') params.status = filters.status;
    return params;
  };

  const buildExportFilename = () => {
    const parts: string[] = ['students'];
    const program = filters.programId !== '__all__' ? filterPrograms.find((p: any) => p.id === filters.programId) : null;
    if (program?.code) parts.push(String(program.code).replace(/\s+/g, ''));
    const y = filters.year !== '__all__' ? `Y${filters.year}` : '';
    const s = filters.semester !== '__all__' ? `S${filters.semester}` : '';
    if (y) parts.push(y);
    if (s) parts.push(s);
    if (filters.intakeType !== '__all__') parts.push(filters.intakeType);
    if (filters.status !== '__all__') parts.push(filters.status);
    const today = new Date().toISOString().slice(0, 10);
    parts.push(today);
    return `${parts.join('_')}.xlsx`;
  };

  const runQuery = (pageNum: number) => {
    loadStudents(pageNum, buildQueryParams());
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      runQuery(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchTerm, filters.programId, filters.year, filters.semester, filters.intakeType, filters.status]);

  // Load all programs once when the import dialog is opened
  useEffect(() => {
    if (!importOpen) return;
    academicService.getPrograms().then((raw: any) => {
      const arr = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setImportPrograms(arr);
    }).catch(() => setImportPrograms([]));
  }, [importOpen]);

  useEffect(() => {
    const deptId = addOpen ? addForm.departmentId : (editOpen ? editForm.departmentId : '');
    if (!deptId) {
      setPrograms([]);
      return;
    }
    setProgramsLoading(true);
    academicService.getPrograms(deptId).then((raw: any) => {
      const arr = Array.isArray(raw) ? raw : raw?.data ?? [];
      setPrograms(arr);
    }).finally(() => setProgramsLoading(false));
  }, [addOpen, editOpen, addForm.departmentId, editForm.departmentId]);

  useEffect(() => {
    if (addForm.programId) {
      const prog = programs.find((p: any) => p.id === addForm.programId);
      const duration = prog?.duration ?? 4;
      const currentYear = parseInt(addForm.year.replace('Year ', ''), 10) || 1;
      if (currentYear > duration) {
        setAddForm(prev => ({ ...prev, year: 'Year 1' }));
      }
    }
  }, [addForm.programId, addForm.year, programs]);

  useEffect(() => {
    const loadAddPreview = async () => {
      if (!addForm.programId || !addForm.year || !addOpen) {
        setAddPreviewCourses([]);
        setAddSelectedCourseIds([]);
        return;
      }

      setAddPreviewLoading(true);
      try {
        const year = parseInt(addForm.year.replace('Year ', ''));
        const semester = parseInt(addForm.semester);

        const courses = await enrollmentService.previewCourses({
          departmentId: addForm.departmentId || undefined,
          programId: addForm.programId,
          year,
          semester,
        });

        setAddPreviewCourses(courses);
        setAddSelectedCourseIds((courses as any[]).filter((c: any) => !c.noClass).map((c: any) => c.id));
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
  }, [addForm.programId, addForm.departmentId, addForm.year, addForm.semester, addOpen]);

  useEffect(() => {
    if (editForm.programId) {
      const prog = programs.find((p: any) => p.id === editForm.programId);
      const duration = prog?.duration ?? 4;
      const currentYear = parseInt(editForm.year.replace('Year ', ''), 10) || 1;
      if (currentYear > duration) {
        setEditForm(prev => ({ ...prev, year: 'Year 1' }));
      }
    }
  }, [editForm.programId, editForm.year, programs]);

  useEffect(() => {
    const loadPreview = async () => {
      if (!editForm.programId || !editForm.year || !editingStudent) {
        setPreviewCourses([]);
        setSelectedCourseIds([]);
        return;
      }

      setPreviewLoading(true);
      try {
        const year = parseInt(editForm.year.replace('Year ', ''));
        const semester = parseInt(editForm.semester);

        const [courses, enrollments] = await Promise.all([
          enrollmentService.previewCourses({
            departmentId: editForm.departmentId || undefined,
            programId: editForm.programId,
            year,
            semester,
          }),
          enrollmentService.getStudentEnrollments(editingStudent.id),
        ]);

        setPreviewCourses(courses);
        const enrolledClassIds = (enrollments as any[]).map((e: any) => e.classId || e.class?.id).filter(Boolean);
        setCurrentEnrollments(enrolledClassIds);
        const enrollableIds = (courses as any[]).filter((c: any) => !c.noClass).map((c: any) => c.id);
        setSelectedCourseIds(enrolledClassIds.filter((id: string) => enrollableIds.includes(id)));
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
  }, [editForm.programId, editForm.departmentId, editForm.year, editForm.semester, editOpen, editingStudent]);

  useEffect(() => {
    if (editOpen && editingStudent && programs.length > 0 && !editForm.programId && editingStudent.dept) {
      const match = programs.find((p: any) => p.name === editingStudent.dept || (p.name && editingStudent.dept && String(p.name).includes(editingStudent.dept)));
      if (match) {
        setEditForm(f => ({ ...f, programId: match.id }));
      }
    }
  }, [editOpen, editingStudent, programs, editForm.programId]);

  const listStudents = students;

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const [firstName, ...lastNameParts] = addForm.name.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;
      const year = parseInt(addForm.year.replace('Year ', ''));
      const semester = parseInt(addForm.semester);

      const prog = programs.find(p => p.id === addForm.programId);

      if (!prog) {
        toast.error('Please select a school, department and program');
        return;
      }

      const newStudent = await studentService.createStudent({
        firstName,
        lastName,
        email: addForm.email,
        studentNumber: addForm.studentId,
        programId: prog.id,
        program: prog.name,
        year,
        semester,
        departmentId: prog.departmentId ?? addForm.departmentId,
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
      
      setAddForm({ name: '', email: '', studentId: '', schoolId: schools[0]?.id || '', departmentId: '', programId: '', year: 'Year 1', semester: '1', tempPassword: 'TempPassword123!' });
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
      const scope = importScope.programId ? importScope : undefined;
      const result = await studentService.importStudents(file, importCreateAccounts, scope);
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

  const studentTemplateCsv = 'name,email,studentId,password\nJohn Doe,john.doe@student.kcu.ac.ug,2100101,TempPassword123!\nJane Smith,jane.smith@student.kcu.ac.ug,2100102,TempPassword123!';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Label className="sr-only">Search</Label>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students (name, email, student number)"
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" className="lg:hidden" onClick={() => setMobileFiltersOpen(true)}>
              <Filter className="mr-2 h-4 w-4" /> Filters
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="mr-2 h-4 w-4" /> Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    setExporting(true);
                    try {
                      await studentService.exportStudentsExcel(buildQueryParams(), buildExportFilename());
                      toast.success('Export downloaded');
                    } catch (e: any) {
                      toast.error(e?.message || 'Export failed');
                    } finally {
                      setExporting(false);
                    }
                  }}
                  disabled={exporting}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Export (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({ programId: '__all__', year: '__all__', semester: '__all__', intakeType: '__all__', status: '__all__' });
                    runQuery(1);
                  }}
                >
                  <Filter className="mr-2 h-4 w-4" /> Clear filters
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Import students
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button className="bg-[#015F2B]" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Student
            </Button>
          </div>
        </div>

        <div className="hidden lg:flex gap-3 flex-wrap">
          <div className="min-w-[240px]">
            <Label className="sr-only">Program</Label>
            <Select value={filters.programId} onValueChange={(v) => setFilters((f) => ({ ...f, programId: v }))} disabled={filtersLoading}>
              <SelectTrigger>
                <SelectValue placeholder={filtersLoading ? 'Loading programs…' : 'Program (All)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All programs</SelectItem>
                {filterPrograms.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code ? `${p.code} — ${p.name}` : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[140px]">
            <Label className="sr-only">Year</Label>
            <Select value={filters.year} onValueChange={(v) => setFilters((f) => ({ ...f, year: v }))}>
              <SelectTrigger><SelectValue placeholder="Year (All)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All years</SelectItem>
                {Array.from({ length: 10 }).map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{`Year ${i + 1}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[160px]">
            <Label className="sr-only">Semester</Label>
            <Select value={filters.semester} onValueChange={(v) => setFilters((f) => ({ ...f, semester: v }))}>
              <SelectTrigger><SelectValue placeholder="Semester (All)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All semesters</SelectItem>
                <SelectItem value="1">Semester 1</SelectItem>
                <SelectItem value="2">Semester 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[150px]">
            <Label className="sr-only">Intake</Label>
            <Select value={filters.intakeType} onValueChange={(v) => setFilters((f) => ({ ...f, intakeType: v }))}>
              <SelectTrigger><SelectValue placeholder="Intake (All)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All intakes</SelectItem>
                <SelectItem value="Day">Day</SelectItem>
                <SelectItem value="Evening">Evening</SelectItem>
                <SelectItem value="Weekend">Weekend</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[160px]">
            <Label className="sr-only">Status</Label>
            <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue placeholder="Status (All)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
                <SelectItem value="Graduated">Graduated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-xl">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
            <DialogDescription>Filter students by program, year, semester, intake and status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Program</Label>
              <Select value={filters.programId} onValueChange={(v) => setFilters((f) => ({ ...f, programId: v }))} disabled={filtersLoading}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={filtersLoading ? 'Loading programs…' : 'All programs'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All programs</SelectItem>
                  {filterPrograms.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code ? `${p.code} — ${p.name}` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Select value={filters.year} onValueChange={(v) => setFilters((f) => ({ ...f, year: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All years</SelectItem>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{`Year ${i + 1}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Semester</Label>
              <Select value={filters.semester} onValueChange={(v) => setFilters((f) => ({ ...f, semester: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All semesters</SelectItem>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Intake</Label>
              <Select value={filters.intakeType} onValueChange={(v) => setFilters((f) => ({ ...f, intakeType: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All intakes</SelectItem>
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                  <SelectItem value="Weekend">Weekend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setFilters({ programId: '__all__', year: '__all__', semester: '__all__', intakeType: '__all__', status: '__all__' });
                runQuery(1);
              }}
            >
              Clear
            </Button>
            <Button className="bg-[#015F2B]" onClick={() => setMobileFiltersOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            {listStudents.map((student) => (
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
                          departmentId: studentData?.departmentId ?? dept?.id ?? '',
                          programId: studentData?.programId ?? '',
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
              <Button
                variant="outline"
                size="sm"
                disabled={studentsPage <= 1}
                onClick={() => runQuery(studentsPage - 1)}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {studentsPage} of {Math.max(1, Math.ceil(studentsTotal / pageSize))}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={studentsPage >= Math.ceil(studentsTotal / pageSize)}
                onClick={() => runQuery(studentsPage + 1)}
              >
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
                  <Label>Temporary password (for first login)</Label>
                  <Input type="password" value={addForm.tempPassword} onChange={e => setAddForm(f => ({ ...f, tempPassword: e.target.value }))} placeholder="Leave empty for default" className="w-full" />
                  <p className="text-xs text-gray-500">Default: TempPassword123! if left empty</p>
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
                    <Select value={addForm.schoolId} onValueChange={v => setAddForm(f => ({ ...f, schoolId: v, departmentId: '', programId: '' }))} required>
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
                  <Label>Department</Label>
                  {departmentsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : (
                    <Select value={addForm.departmentId} onValueChange={v => setAddForm(f => ({ ...f, departmentId: v, programId: '' }))} required>
                      <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select department" /></SelectTrigger>
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
                          <div className="px-2 py-1.5 text-sm text-gray-500">No departments in this school</div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Program</Label>
                  {programsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : (
                    <Select value={addForm.programId} onValueChange={v => setAddForm(f => ({ ...f, programId: v }))} required>
                      <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select program" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {addForm.departmentId ? (
                          programs.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} {p.code ? `(${p.code})` : ''}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-gray-500">Select a department first</div>
                        )}
                        {addForm.departmentId && programs.length === 0 && !programsLoading && (
                          <div className="px-2 py-1.5 text-sm text-gray-500">No programs in this department</div>
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
                      {(addForm.programId ? Array.from({ length: Math.max(1, programs.find((p: any) => p.id === addForm.programId)?.duration ?? 4) }, (_, i) => i + 1) : [1, 2, 3, 4]).map((year) => (
                        <SelectItem key={year} value={`Year ${year}`}>
                          Year {year}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                  {addForm.programId && (() => {
                    const selectedProg = programs.find((p: any) => p.id === addForm.programId);
                    const dur = selectedProg?.duration ?? 4;
                  return (
                    <p className="text-xs text-gray-500 mt-1">
                        {selectedProg ? `${selectedProg.name} (${dur}-year program)` : ''}
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
            {addForm.programId && addForm.year && (
              <div className="space-y-4">
                <div className="border-b pb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Course Enrollment</h3>
                  {addPreviewLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                </div>
                {addPreviewLoading ? (
                  <div className="text-sm text-gray-500 py-8 text-center">Loading available courses...</div>
                ) : addPreviewCourses.length === 0 ? (
                  <div className="text-sm text-gray-500 py-8 text-center border rounded-md bg-gray-50 space-y-1">
                    <p>No classes found for {programs.find((p: any) => p.id === addForm.programId)?.name || 'selected program'} — Year {addForm.year.replace('Year ', '')} — Semester {addForm.semester}.</p>
                    <p className="text-xs">Add courses under this program on the Schools page, then create classes in the Classes tab to enroll students.</p>
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
                              const isCourseOnly = (cls as any).noClass === true;
                              const isChecked = !isCourseOnly && addSelectedCourseIds.includes(cls.id);
                        return (
                                <TableRow key={cls.id} className={isChecked ? 'bg-green-50/50' : ''}>
                                  <TableCell className="px-3">
                                    {isCourseOnly ? (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    ) : (
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
                                    )}
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
                                  <TableCell className="text-sm px-3 break-words">
                                    {isCourseOnly ? (
                                      <span className="text-amber-600">No class — create in Classes tab</span>
                                    ) : (
                                      cls.name
                                    )}
                                  </TableCell>
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
                          ? `${addSelectedCourseIds.length} class${addSelectedCourseIds.length !== 1 ? 'es' : ''} selected for enrollment`
                          : 'No classes selected'}
                      </span>
                      {(() => {
                        const enrollableIds = addPreviewCourses.filter((c: any) => !c.noClass).map((c: any) => c.id);
                        return (
                          <>
                            {addSelectedCourseIds.length !== enrollableIds.length && enrollableIds.length > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setAddSelectedCourseIds(enrollableIds)}
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
                          </>
                        );
                      })()}
            </div>
            </div>
                )}
              </div>
            )}

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
        <DialogContent className="w-[98vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
            <DialogDescription>
              Choose the program, year and semester for this list, then upload a CSV/Excel file with columns: <strong>name, email, studentId, password</strong>. All imported students will be created and auto-enrolled into that semester&apos;s courses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Program</Label>
                <Select
                  value={importScope.programId || '__all__'}
                  onValueChange={(v) =>
                    setImportScope(s => ({
                      ...s,
                      programId: v === '__all__' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Optional: select program" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All programs (use file columns)</SelectItem>
                    {importPrograms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Year</Label>
                  <Select
                    value={String(importScope.year)}
                    onValueChange={(v) => setImportScope(s => ({ ...s, year: parseInt(v, 10) || 1 }))}
                    disabled={!importScope.programId}
                  >
                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => i + 1).map((y) => (
                        <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Semester</Label>
                  <Select
                    value={String(importScope.semester)}
                    onValueChange={(v) => setImportScope(s => ({ ...s, semester: parseInt(v, 10) || 1 }))}
                    disabled={!importScope.programId}
                  >
                    <SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
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
              
              const prog = programs.find(p => p.id === editForm.programId);

              if (!prog) {
                toast.error('Please select a school, department and program');
                return;
              }
              
              await studentService.updateStudent(editingStudent.id, {
                firstName,
                lastName,
                email: editForm.email,
                studentNumber: editForm.studentId,
                programId: prog.id,
                program: prog.name,
                departmentId: prog.departmentId ?? editForm.departmentId,
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
                      <Select value={editForm.schoolId} onValueChange={v => setEditForm(f => ({ ...f, schoolId: v, departmentId: '', programId: '' }))} required>
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
                    <Label>Department</Label>
                    {departmentsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                      </div>
                    ) : (
                      <Select value={editForm.departmentId} onValueChange={v => setEditForm(f => ({ ...f, departmentId: v, programId: '' }))} required>
                        <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select department" /></SelectTrigger>
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
                            <div className="px-2 py-1.5 text-sm text-gray-500">No departments in this school</div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Program</Label>
                    {programsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                      </div>
                    ) : (
                      <Select value={editForm.programId} onValueChange={v => setEditForm(f => ({ ...f, programId: v }))} required>
                        <SelectTrigger className="w-full truncate"><SelectValue placeholder="Select program" /></SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {editForm.departmentId ? (
                            programs.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} {p.code ? `(${p.code})` : ''}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="px-2 py-1.5 text-sm text-gray-500">Select a department first</div>
                          )}
                          {editForm.departmentId && programs.length === 0 && !programsLoading && (
                            <div className="px-2 py-1.5 text-sm text-gray-500">No programs in this department</div>
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
                        {(editForm.programId ? Array.from({ length: Math.max(1, programs.find((p: any) => p.id === editForm.programId)?.duration ?? 4) }, (_, i) => i + 1) : [1, 2, 3, 4]).map((year) => (
                          <SelectItem key={year} value={`Year ${year}`}>
                            Year {year}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                    {editForm.programId && (() => {
                      const selectedProg = programs.find((p: any) => p.id === editForm.programId);
                      const dur = selectedProg?.duration ?? 4;
                      return selectedProg ? (
                      <p className="text-xs text-gray-500 mt-1">
                          {selectedProg.name} ({dur}-year program)
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
              {editForm.programId && editForm.year && (
                <div className="space-y-4">
                  <div className="border-b pb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Course Enrollment</h3>
                    {previewLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                  </div>
                  {previewLoading ? (
                    <div className="text-sm text-gray-500 py-8 text-center">Loading available courses...</div>
                  ) : previewCourses.length === 0 ? (
                    <div className="text-sm text-gray-500 py-8 text-center border rounded-md bg-gray-50 space-y-1">
                      <p>No classes found for {programs.find((p: any) => p.id === editForm.programId)?.name || 'selected program'} — Year {editForm.year.replace('Year ', '')} — Semester {editForm.semester}.</p>
                      <p className="text-xs">Add courses under this program on the Schools page, then create classes in the Classes tab to enroll students.</p>
                  </div>
                ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Select classes to enroll the student in:</span>
                        <span className="font-medium">{selectedCourseIds.length} of {previewCourses.filter((c: any) => !c.noClass).length} selected</span>
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
                                const isCourseOnly = (cls as any).noClass === true;
                                const isChecked = !isCourseOnly && selectedCourseIds.includes(cls.id);
                          return (
                                  <TableRow key={cls.id} className={isChecked ? 'bg-green-50/50' : ''}>
                                    <TableCell className="px-3">
                                      {isCourseOnly ? (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      ) : (
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
                                      )}
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
                                    <TableCell className="text-sm px-3 break-words">
                                      {isCourseOnly ? (
                                        <span className="text-amber-600">No class — create in Classes tab</span>
                                      ) : (
                                        cls.name
                                      )}
                                    </TableCell>
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
                            ? `${selectedCourseIds.length} class${selectedCourseIds.length !== 1 ? 'es' : ''} selected for enrollment`
                            : 'No classes selected'}
                        </span>
                        {(() => {
                          const enrollableIds = previewCourses.filter((c: any) => !c.noClass).map((c: any) => c.id);
                          return (
                            <>
                              {selectedCourseIds.length !== enrollableIds.length && enrollableIds.length > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setSelectedCourseIds(enrollableIds)}
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
                            </>
                          );
                        })()}
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
  staffTabMode = 'non-teaching',
}: {
  staff: StaffRow[];
  setStaff: React.Dispatch<React.SetStateAction<StaffRow[]>>;
  staffPage: number;
  staffTotal: number;
  pageSize: number;
  loadStaff: (page: number) => Promise<void>;
  staffTabMode?: 'non-teaching' | 'staff-role';
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

  const isStaffRoleTab = staffTabMode === 'staff-role';
  const listedStaff = isStaffRoleTab
    ? staff.filter(s => s.role === 'Staff')
    : staff.filter(s => s.role !== 'Lecturer');
  const filteredStaff = listedStaff.filter(
    s =>
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
      toast.success(isStaffRoleTab ? 'Staff member added successfully' : 'Non teaching staff member added successfully');
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
            {isStaffRoleTab ? <UserIcon className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            {isStaffRoleTab ? 'Staff' : 'Non Teaching Staff Management'}
          </CardTitle>
          <CardDescription>
            {isStaffRoleTab
              ? 'Manage personnel with the Staff employment role.'
              : 'Manage non-teaching staff members (HR, Administrators, etc.)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search staff..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}><FileSpreadsheet className="mr-2 h-4 w-4" /> Import</Button>
              <Button className="bg-[#015F2B]" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> {isStaffRoleTab ? 'Add Staff' : 'Add Non Teaching Staff'}
              </Button>
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
                      {isStaffRoleTab
                        ? 'No staff records found. Add staff members to get started.'
                        : 'No non teaching staff members found. Add non teaching staff members to get started.'}
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
                                  toast.success(
                                    isStaffRoleTab ? 'Staff member deleted successfully' : 'Non teaching staff member deleted successfully'
                                  );
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
            <DialogTitle>{isStaffRoleTab ? 'Add Staff Member' : 'Add Non Teaching Staff Member'}</DialogTitle>
            <DialogDescription>
              {isStaffRoleTab
                ? 'Create a staff record with the Staff employment role.'
                : 'Create a record for non-teaching personnel (HR, Administrators, etc.)'}
            </DialogDescription>
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
                    {!isStaffRoleTab && (
                      <>
                        <SelectItem value="Administrator">Administrator</SelectItem>
                        <SelectItem value="QA">QA</SelectItem>
                        <SelectItem value="Management">Management</SelectItem>
                      </>
                    )}
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
              <Button type="submit" className="bg-[#015F2B]">{isStaffRoleTab ? 'Add Staff' : 'Add Non Teaching Staff'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isStaffRoleTab ? 'Edit Staff Member' : 'Edit Non Teaching Staff Member'}</DialogTitle>
            <DialogDescription>
              {isStaffRoleTab ? 'Update staff information.' : 'Update non teaching staff information.'}
            </DialogDescription>
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
              toast.success(isStaffRoleTab ? 'Staff member updated successfully' : 'Non teaching staff member updated successfully');
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
                      {!isStaffRoleTab && (
                        <>
                          <SelectItem value="Administrator">Administrator</SelectItem>
                          <SelectItem value="QA">QA</SelectItem>
                          <SelectItem value="Management">Management</SelectItem>
                        </>
                      )}
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
              <Button type="submit" className="bg-[#015F2B]">{isStaffRoleTab ? 'Update Staff' : 'Update Non Teaching Staff'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isStaffRoleTab ? 'Import Staff' : 'Import Non Teaching Staff'}</DialogTitle>
            <DialogDescription>
              {isStaffRoleTab
                ? 'Upload a CSV or Excel (.xlsx) file with columns: name, email, role, dept. Use role Staff for each row. Optionally create login accounts with a temporary password.'
                : 'Upload a CSV or Excel (.xlsx) file with columns: name, email, role, dept. Role should be Staff, Administrator, QA, or Management (not Lecturer). Optionally create login accounts with a temporary password.'}
            </DialogDescription>
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
      if (result.imported === 0 && result.failed > 0) {
        const firstError = result.errors && result.errors.length > 0 ? result.errors[0] : 'Please check that your file matches the lecturer import template (name, email, role, dept).';
        toast.error(`Lecturer import failed. ${firstError}`);
      } else if (result.failed > 0) {
        toast.success(`Imported ${result.imported} lecturers. Some rows could not be imported. Please review your file and try again.`);
      } else {
        toast.success(`Successfully imported ${result.imported} lecturers.`);
      }
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
// SUB-COMPONENT: Schools / Departments Tab (Moodle-like tree: School → Department → Program → Year/Semester → Courses)
// -----------------------------------------------------------------------------
type SchoolsTabRow = { id: string; name: string; dean: string | null; code?: string; deptCount?: number; studentCount?: number; staffCount?: number };
type LevelRow = { id: string; name: string; schoolId: string };
type DepartmentRow = { id: string; name: string; schoolId: string; levelId: string; head: string | null; duration?: number };
type ProgramRow = { id: string; name: string; code: string; departmentId: string; duration: number };
type SelectedNode =
  | { type: 'yearSemester'; programId: string; departmentId: string; level: number; semester: number; programName: string; programCode: string }
  | { type: 'unassignedCourses'; departmentId: string; departmentName: string };
function SchoolsTab() {
  const [schools, setSchools] = useState<SchoolsTabRow[]>([]);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [departmentsBySchool, setDepartmentsBySchool] = useState<Record<string, DepartmentRow[]>>({});
  const [programsByDepartment, setProgramsByDepartment] = useState<Record<string, ProgramRow[]>>({});
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [expandedProgramYears, setExpandedProgramYears] = useState<Set<string>>(new Set());
  const [deptCountBySchool, setDeptCountBySchool] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [schoolSearchTerm, setSchoolSearchTerm] = useState('');
  const [addSchoolOpen, setAddSchoolOpen] = useState(false);
  const [editSchoolOpen, setEditSchoolOpen] = useState(false);
  const [addLevelOpen, setAddLevelOpen] = useState(false);
  const [editLevelOpen, setEditLevelOpen] = useState(false);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [editDeptOpen, setEditDeptOpen] = useState(false);
  const [addProgramOpen, setAddProgramOpen] = useState(false);
  const [editProgramOpen, setEditProgramOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<{ id: string; name: string; dean: string | null; code?: string } | null>(null);
  const [editingLevel, setEditingLevel] = useState<LevelRow | null>(null);
  const [editingDept, setEditingDept] = useState<DepartmentRow | null>(null);
  const [editingProgram, setEditingProgram] = useState<ProgramRow | null>(null);
  const [selectedSchoolForDept, setSelectedSchoolForDept] = useState<string>('');
  const [selectedDeptForProgram, setSelectedDeptForProgram] = useState<string>('');
  const [schoolForm, setSchoolForm] = useState({ name: '', dean: '' });
  const [levelForm, setLevelForm] = useState({ name: '', schoolId: '' });
  const [deptForm, setDeptForm] = useState({ name: '', head: '', schoolId: '', levelId: '', duration: 4 });
  const [programForm, setProgramForm] = useState({ name: '', code: '', departmentId: '', duration: 4 });
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [coursesInNode, setCoursesInNode] = useState<any[]>([]);
  const [coursesInNodeLoading, setCoursesInNodeLoading] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState<string>('');
  const [moveCoursesLoading, setMoveCoursesLoading] = useState(false);
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [addCourseForm, setAddCourseForm] = useState({ code: '', name: '', credits: 3 });
  const [addCourseSaving, setAddCourseSaving] = useState(false);
  const [editingCourse, setEditingCourse] = useState<{ id: string; code: string; name: string; credits: number } | null>(null);
  const [moveTargetOptions, setMoveTargetOptions] = useState<{ value: string; label: string }[]>([]);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const [schoolList, levelsRaw, deptsRaw] = await Promise.all([
        academicService.getSchools(),
        academicService.getLevels(),
        academicService.getDepartments(),
      ]);
      const list = Array.isArray(schoolList) ? schoolList : (schoolList as any)?.data ?? [];
      const levelList = Array.isArray(levelsRaw) ? levelsRaw : (levelsRaw as any)?.data ?? [];
      const deptList = Array.isArray(deptsRaw) ? deptsRaw : (deptsRaw as any)?.data ?? [];

      const levelById: Record<string, LevelRow> = {};
      const levelsBySchool: Record<string, LevelRow[]> = {};
      levelList.forEach((l: any) => {
      const row: LevelRow = { id: l.id, name: l.name, schoolId: l.schoolId };
        levelById[row.id] = row;
        if (!levelsBySchool[row.schoolId]) levelsBySchool[row.schoolId] = [];
        levelsBySchool[row.schoolId].push(row);
      });

      const deptMap: Record<string, DepartmentRow[]> = {};
      const count: Record<string, number> = {};
      const deptRows: DepartmentRow[] = [];
      deptList.forEach((d: any) => {
        const level = levelById[d.levelId];
        const schoolId = level?.schoolId;
        if (!schoolId) return;
        const row: DepartmentRow = {
          id: d.id,
          name: d.name,
          schoolId,
          levelId: d.levelId,
          head: d.head ?? null,
          duration: d.duration ?? 4,
        };
        deptRows.push(row);
        if (!deptMap[schoolId]) deptMap[schoolId] = [];
        deptMap[schoolId].push(row);
        count[schoolId] = (count[schoolId] || 0) + 1;
      });
      
      const withStats = await Promise.all(
        list.map(async (s: any) => {
          const stats = await academicService.getSchoolStats(s.id).catch(() => null);
          return {
            id: s.id,
            name: s.name,
            dean: s.dean ?? null,
            deptCount: count[s.id] ?? 0,
            studentCount: stats?.studentCount,
            staffCount: stats?.staffCount,
          };
        })
      );
      
      setLevels(Object.values(levelById));
      setDepartments(deptRows);
      setDepartmentsBySchool(deptMap);
      setDeptCountBySchool(count);
      setSchools(withStats);

      const programMap: Record<string, ProgramRow[]> = {};
      for (const d of deptList) {
        const progs = await academicService.getPrograms(d.id);
        const arr = Array.isArray(progs) ? progs : (progs as any)?.data ?? [];
        programMap[d.id] = arr.map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          departmentId: p.departmentId,
          duration: p.duration ?? 4,
        }));
      }
      setProgramsByDepartment(programMap);
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

  useEffect(() => {
    if (!selectedNode) {
      setCoursesInNode([]);
      return;
    }
    setCoursesInNodeLoading(true);
    if (selectedNode.type === 'unassignedCourses') {
      academicService
        .getCourses({
          departmentId: selectedNode.departmentId,
          unassigned: true,
          limit: 100,
        })
        .then((r) => setCoursesInNode(r.data ?? []))
        .catch(() => setCoursesInNode([]))
        .finally(() => setCoursesInNodeLoading(false));
    } else {
      academicService
        .getCourses({
          programId: selectedNode.programId,
          level: selectedNode.level,
          semester: selectedNode.semester,
          limit: 100,
        })
        .then((r) => setCoursesInNode(r.data ?? []))
        .catch(() => setCoursesInNode([]))
        .finally(() => setCoursesInNodeLoading(false));
    }
  }, [selectedNode]);

  useEffect(() => {
    if (!selectedNode) {
      setMoveTargetOptions([]);
      return;
    }
    const opts: { value: string; label: string }[] = [];
    const deptsToConsider = selectedNode.type === 'unassignedCourses'
      ? departments.filter((d) => d.id === selectedNode.departmentId)
      : departments;

    deptsToConsider.forEach(dept => {
      const progs = programsByDepartment[dept.id] ?? [];
      progs.forEach((prog: ProgramRow) => {
        for (let y = 1; y <= prog.duration; y++) {
          for (let s = 1; s <= 2; s++) {
            if (selectedNode.type === 'yearSemester' && prog.id === selectedNode.programId && y === selectedNode.level && s === selectedNode.semester) continue;
            opts.push({
              value: `${prog.id}|${y}|${s}|${prog.departmentId}`,
              label: `${prog.name} (${prog.code}) — Year ${y} Sem ${s}`,
            });
          }
        }
      });
    });
    setMoveTargetOptions(opts);
    if (opts.length) setMoveTarget(opts[0].value);
  }, [selectedNode, departments, programsByDepartment]);

  const toggleSchool = (schoolId: string) => {
    setExpandedSchools(prev => {
      const next = new Set(prev);
      if (next.has(schoolId)) next.delete(schoolId);
      else next.add(schoolId);
      return next;
    });
  };

  const toggleLevel = (levelId: string) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      if (next.has(levelId)) next.delete(levelId);
      else next.add(levelId);
      return next;
    });
  };

  const toggleDepartment = (deptId: string) => {
    setExpandedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(deptId)) next.delete(deptId);
      else next.add(deptId);
      return next;
    });
  };

  const toggleProgram = (programId: string) => {
    setExpandedPrograms(prev => {
      const next = new Set(prev);
      if (next.has(programId)) next.delete(programId);
      else next.add(programId);
      return next;
    });
  };

  const toggleProgramYear = (programId: string, year: number) => {
    const key = `${programId}|${year}`;
    setExpandedProgramYears(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openAddProgram = (departmentId: string) => {
    setEditingProgram(null);
    setProgramForm({ name: '', code: '', departmentId, duration: 4 });
    setAddProgramOpen(true);
  };

  const openEditProgram = (prog: ProgramRow) => {
    setEditingProgram(prog);
    setProgramForm({ name: prog.name, code: prog.code, departmentId: prog.departmentId, duration: prog.duration });
    setEditProgramOpen(true);
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProgram) {
        await academicService.updateProgram(editingProgram.id, {
          name: programForm.name,
          code: programForm.code,
          departmentId: programForm.departmentId,
          duration: programForm.duration,
        });
      } else {
        await academicService.createProgram({
          name: programForm.name,
          code: programForm.code,
          departmentId: programForm.departmentId,
          duration: programForm.duration,
        });
      }
      await loadSchools();
      setAddProgramOpen(false);
      setEditProgramOpen(false);
      setEditingProgram(null);
      toast.success(`Degree program ${editingProgram ? 'updated' : 'created'} successfully`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save program');
    }
  };

  const refreshCoursesInNode = async () => {
    if (!selectedNode) return;
    const r =
      selectedNode.type === 'unassignedCourses'
        ? await academicService.getCourses({ departmentId: selectedNode.departmentId, unassigned: true, limit: 100 })
        : await academicService.getCourses({ programId: selectedNode.programId, level: selectedNode.level, semester: selectedNode.semester, limit: 100 });
    setCoursesInNode(r.data ?? []);
  };

  const handleAddCourseInNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCourseForm.code.trim() || !addCourseForm.name.trim()) return;
    if (editingCourse) {
      setAddCourseSaving(true);
      try {
        await academicService.updateCourse(editingCourse.id, {
          code: addCourseForm.code.trim(),
          name: addCourseForm.name.trim(),
          credits: addCourseForm.credits,
        });
        toast.success('Course updated');
        setAddCourseOpen(false);
        setEditingCourse(null);
        setAddCourseForm({ code: '', name: '', credits: 3 });
        await refreshCoursesInNode();
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update course');
      } finally {
        setAddCourseSaving(false);
      }
      return;
    }
    if (!selectedNode) return;
    if (selectedNode.type !== 'yearSemester') return;
    setAddCourseSaving(true);
    try {
      await academicService.createCourse({
        code: addCourseForm.code.trim(),
        name: addCourseForm.name.trim(),
        departmentId: selectedNode.departmentId,
        programId: selectedNode.programId,
        level: selectedNode.level,
        semester: selectedNode.semester,
        credits: addCourseForm.credits,
      });
      toast.success('Course created');
      setAddCourseOpen(false);
      setAddCourseForm({ code: '', name: '', credits: 3 });
      await refreshCoursesInNode();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create course');
    } finally {
      setAddCourseSaving(false);
    }
  };

  const handleMoveCourses = async () => {
    if (!selectedNode || selectedCourseIds.size === 0 || !moveTarget) return;
    const [programId, levelStr, semesterStr, departmentId] = moveTarget.split('|');
    setMoveCoursesLoading(true);
    try {
      await academicService.moveCourses({
        courseIds: Array.from(selectedCourseIds),
        targetProgramId: programId,
        targetDepartmentId: departmentId,
        targetLevel: parseInt(levelStr, 10),
        targetSemester: parseInt(semesterStr, 10),
      });
      toast.success('Courses moved');
      setSelectedCourseIds(new Set());
      await refreshCoursesInNode();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to move courses');
    } finally {
      setMoveCoursesLoading(false);
    }
  };

  const toggleCourseSelection = (id: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddSchool = () => {
    setEditingSchool(null);
    setSchoolForm({ name: '', dean: '' });
    setAddSchoolOpen(true);
  };

  const openAddLevel = (schoolId: string) => {
    setEditingLevel(null);
    setLevelForm({ name: '', schoolId });
    setAddLevelOpen(true);
  };

  const openEditSchool = (school: { id: string; name: string; dean: string | null; code?: string }) => {
    setEditingSchool(school);
    setSchoolForm({ name: school.name, dean: school.dean || '' });
    setEditSchoolOpen(true);
  };

  const openEditLevel = (level: LevelRow) => {
    setEditingLevel(level);
    setLevelForm({ name: level.name, schoolId: level.schoolId });
    setEditLevelOpen(true);
  };

  const openAddDept = (schoolId: string, levelId?: string) => {
    setEditingDept(null);
    setSelectedSchoolForDept(schoolId);
    const targetLevel = levelId
      ? levels.find(l => l.id === levelId)
      : levels.find(l => l.schoolId === schoolId);
    setDeptForm({ name: '', head: '', schoolId, levelId: targetLevel?.id ?? '', duration: 4 });
    setAddDeptOpen(true);
  };

  const openEditDept = (dept: DepartmentRow) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      head: dept.head || '',
      schoolId: dept.schoolId,
      levelId: dept.levelId,
      duration: dept.duration || 4,
    });
    setEditDeptOpen(true);
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSchool) {
        await academicService.updateSchool(editingSchool.id, {
          name: schoolForm.name,
          dean: schoolForm.dean || undefined,
        });
      } else {
        await academicService.createSchool({
          name: schoolForm.name,
          code: schoolForm.name,
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

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLevel) {
        await academicService.updateLevel(editingLevel.id, {
          name: levelForm.name,
          schoolId: levelForm.schoolId,
        });
      } else {
        await academicService.createLevel({
          name: levelForm.name,
          code: levelForm.name,
          schoolId: levelForm.schoolId,
        });
      }
      await loadSchools();
      setAddLevelOpen(false);
      setEditLevelOpen(false);
      setEditingLevel(null);
      toast.success(`Level ${editingLevel ? 'updated' : 'created'} successfully`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save level');
    }
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await academicService.updateDepartment(editingDept.id, {
          name: deptForm.name,
          levelId: deptForm.levelId,
          head: deptForm.head || undefined,
          duration: deptForm.duration || 4,
        });
      } else {
        await academicService.createDepartment({
          name: deptForm.name,
          code: deptForm.name,
          levelId: deptForm.levelId,
          head: deptForm.head || undefined,
          duration: deptForm.duration || 4,
        });
      }
      await loadSchools();
      setAddDeptOpen(false);
      setEditDeptOpen(false);
      setEditingDept(null);
      toast.success(`Department ${editingDept ? 'updated' : 'created'} successfully`);
      window.dispatchEvent(new CustomEvent('department-updated'));
    } catch (error: any) {
      console.error('Error saving department:', error);
      toast.error(`Failed to save department: ${error?.message || 'Unknown error'}`);
    }
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(schoolSearchTerm.toLowerCase()) ||
      (s.dean ?? '').toLowerCase().includes(schoolSearchTerm.toLowerCase())
  );

  const currentProgram =
    selectedNode?.type === 'yearSemester'
      ? (programsByDepartment[selectedNode.departmentId] ?? []).find((p) => p.id === selectedNode.programId) ?? null
      : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schools, departments..."
            className="pl-8"
            value={schoolSearchTerm}
            onChange={(e) => setSchoolSearchTerm(e.target.value)}
          />
        </div>
        <Button className="bg-[#015F2B]" onClick={openAddSchool}><Plus className="mr-2 h-4 w-4" /> Add School</Button>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
      <Card>
        <CardHeader>
            <CardTitle>Schools, Levels, Departments & Courses</CardTitle>
            <CardDescription>School → Level (Undergraduate/Masters/PhD) → Department → Degree program → Year/Semester → Courses.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading...
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No schools found.</div>
          ) : (
            <div className="space-y-2">
              {filteredSchools.map((school) => {
                const schoolDepts = departmentsBySchool[school.id] || [];
                  const schoolLevels = levels.filter(l => l.schoolId === school.id);
                  const isSchoolExpanded = expandedSchools.has(school.id);
                return (
                  <div key={school.id} className="border rounded-lg">
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                      <div className="flex items-center gap-3 flex-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleSchool(school.id)}>
                            {isSchoolExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                        <Building className="h-5 w-5 text-[#015F2B]" />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{school.name}</div>
                          <div className="text-sm text-gray-500">
                            {school.deptCount ?? 0} Dept{school.deptCount !== 1 ? 's' : ''} • {school.studentCount != null ? `${school.studentCount} students` : '—'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openAddLevel(school.id)} className="text-[#015F2B] border-[#015F2B]">
                            <Plus className="h-4 w-4 mr-1" /> Add Level
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditSchool(school)}><Edit className="mr-2 h-4 w-4" /> Edit School</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={async () => {
                                if (confirm(`Delete school "${school.name}"?`)) {
                                try {
                                  await academicService.deleteSchool(school.id);
                                  await loadSchools();
                                    toast.success('School deleted');
                                  } catch (err: any) { toast.error(err?.message); }
                                }
                              }}><Trash2 className="mr-2 h-4 w-4" /> Delete School</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                      {isSchoolExpanded && (
                      <div className="border-t bg-gray-50/50">
                          {schoolLevels.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">No levels for this school. Add a level (e.g. Undergraduate, Masters) before departments.</div>
                        ) : (
                          <div className="divide-y">
                              {schoolLevels.map(level => {
                                const levelDepts = schoolDepts.filter(d => d.levelId === level.id);
                                const isLevelExpanded = expandedLevels.has(level.id);
                                return (
                                  <div key={level.id}>
                                    <div className="flex items-center justify-between p-3 pl-12 hover:bg-white">
                                <div className="flex items-center gap-3 flex-1">
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleLevel(level.id)}>
                                          {isLevelExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                        </Button>
                                  <School className="h-4 w-4 text-gray-400" />
                                  <div>
                                          <div className="font-medium text-gray-900">{level.name}</div>
                                                <div className="text-xs text-gray-500">{level.name}</div>
                                    </div>
                                  </div>
                                      <div className="flex items-center gap-2 pr-2">
                                  <Button
                                          variant="outline"
                                    size="sm"
                                          onClick={() => openAddDept(school.id, level.id)}
                                          className="text-[#015F2B] border-[#015F2B] text-xs"
                                  >
                                          <Plus className="h-3 w-3 mr-1" /> Add Department
                                  </Button>
                                        <Button variant="ghost" size="sm" onClick={() => openEditLevel(level)}><Edit className="h-4 w-4" /></Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                          className="text-red-600"
                                    onClick={async () => {
                                            if (confirm(`Delete level "${level.name}"?`)) {
                                              try {
                                                await academicService.deleteLevel(level.id);
                                                await loadSchools();
                                                toast.success('Level deleted');
                                              } catch (err: any) {
                                                toast.error(err?.message || 'Failed to delete level');
                                              }
                                            }
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                    {isLevelExpanded && (
                                      <div className="pl-16 pr-4 pb-2 space-y-1">
                                        {levelDepts.length === 0 ? (
                                          <div className="text-xs text-gray-500 py-2">
                                            No departments under this level. Use &quot;Add Department&quot; to create one.
                                          </div>
                                        ) : (
                                          levelDepts.map((dept) => {
                                            const progs = programsByDepartment[dept.id] ?? [];
                                            const isDeptExpanded = expandedDepartments.has(dept.id);
                                            return (
                                              <div key={dept.id} className="border rounded bg-white">
                                                <div className="flex items-center justify-between p-3">
                                                  <div className="flex items-center gap-3 flex-1">
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleDepartment(dept.id)}>
                                                      {isDeptExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                    </Button>
                                                    <School className="h-4 w-4 text-gray-400" />
                                                    <div>
                                                      <div className="font-medium text-gray-900">{dept.name}</div>
                        <div className="text-xs text-gray-500">{dept.head ? dept.head : ''}</div>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Button variant="outline" size="sm" onClick={() => openAddProgram(dept.id)} className="text-[#015F2B] border-[#015F2B] text-xs">
                                                      <Plus className="h-3 w-3 mr-1" /> Degree
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => openEditDept(dept)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="sm" className="text-red-600" onClick={async () => {
                                      if (confirm(`Delete department "${dept.name}"?`)) {
                                        try {
                                          await academicService.deleteDepartment(dept.id);
                                          await loadSchools();
                                                          toast.success('Department deleted');
                                                        } catch (err: any) { toast.error(err?.message); }
                                                      }
                                                    }}><Trash2 className="h-4 w-4" /></Button>
                                                  </div>
                                                </div>
                                                {isDeptExpanded && (
                                                  <div className="pl-8 pr-4 pb-2 space-y-1">
                                                    {progs.length === 0 ? (
                                                      <div className="text-xs text-gray-500 py-2">No degree programs. Add one with &quot;Degree&quot;.</div>
                                                    ) : (
                                                      progs.map((prog: ProgramRow) => {
                                                        const isProgExpanded = expandedPrograms.has(prog.id);
                                                        return (
                                                          <div key={prog.id} className="border rounded bg-white">
                                                            <div className="flex items-center justify-between p-2">
                                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleProgram(prog.id)}>
                                                                {isProgExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                                              </Button>
                                                              <span className="font-medium text-sm">{prog.name} ({prog.code})</span>
                                                              <div className="flex gap-1">
                                                                <Button variant="ghost" size="sm" className="h-7" onClick={() => openEditProgram(prog)}><Edit className="h-3 w-3" /></Button>
                                                                <Button variant="ghost" size="sm" className="h-7 text-red-600" onClick={async () => {
                                                                  if (confirm(`Delete degree program "${prog.name}"?`)) {
                                                                    try {
                                                                      await academicService.deleteProgram(prog.id);
                                                                      await loadSchools();
                                                                      toast.success('Program deleted');
                                                                    } catch (err: any) { toast.error(err?.message); }
                                                                  }
                                                                }}><Trash2 className="h-3 w-3" /></Button>
                                                              </div>
                                                            </div>
                                                            {isProgExpanded && (
                                                              <div className="pl-6 pb-3 space-y-2">
                                                                {Array.from({ length: prog.duration }, (_, i) => i + 1).map((year) => {
                                                                  const yearKey = `${prog.id}|${year}`;
                                                                  const isYearExpanded = expandedProgramYears.has(yearKey);
                                                                  return (
                                                                    <div key={yearKey} className="border rounded bg-gray-50">
                                                                      <div className="flex items-center justify-between p-3 pl-6">
                                                                        <div className="flex items-center gap-3 flex-1">
                                                                          <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 w-7 p-0"
                                                                            onClick={() => toggleProgramYear(prog.id, year)}
                                                                          >
                                                                            {isYearExpanded ? (
                                                                              <ChevronDown className="h-3 w-3" />
                                                                            ) : (
                                                                              <ChevronRight className="h-3 w-3" />
                                                                            )}
                                                                          </Button>
                                                                          <div>
                                                                            <div className="font-medium text-gray-900">Year {year}</div>
                                                                          </div>
                                                                        </div>
                                                                      </div>
                                                                      {isYearExpanded && (
                                                                        <div className="pl-6 pr-2 pb-2 space-y-1">
                                                                          {[1, 2].map((sem) => {
                                                                            const active =
                                                                              selectedNode?.type === 'yearSemester' &&
                                                                              selectedNode.programId === prog.id &&
                                                                              selectedNode.level === year &&
                                                                              selectedNode.semester === sem;
                                                                            return (
                                                                              <div key={`${year}-${sem}`} className="border rounded bg-white">
                                                                                <div
                                                                                  className={`flex items-center justify-between p-3 pl-6 ${
                                                                                    active ? 'bg-gray-100' : 'hover:bg-gray-50'
                                                                                  }`}
                                                                                >
                                                                                  <div
                                                                                    role="button"
                                                                                    tabIndex={0}
                                                                                    className="flex items-center gap-3 flex-1 text-left min-w-0 cursor-pointer"
                                                                                    onClick={() =>
                                                                                      setSelectedNode({
                                                                                        type: 'yearSemester',
                                                                                        programId: prog.id,
                                                                                        departmentId: prog.departmentId,
                                                                                        level: year,
                                                                                        semester: sem,
                                                                                        programName: prog.name,
                                                                                        programCode: prog.code,
                                                                                      })
                                                                                    }
                                                                                    onKeyDown={(e) => {
                                                                                      if (e.key === 'Enter' || e.key === ' ') {
                                                                                        e.preventDefault();
                                                                                        setSelectedNode({
                                                                                          type: 'yearSemester',
                                                                                          programId: prog.id,
                                                                                          departmentId: prog.departmentId,
                                                                                          level: year,
                                                                                          semester: sem,
                                                                                          programName: prog.name,
                                                                                          programCode: prog.code,
                                                                                        });
                                                                                      }
                                                                                    }}
                                                                                  >
                                                                                    {active ? (
                                                                                      <ChevronDown className="h-3 w-3 shrink-0" />
                                                                                    ) : (
                                                                                      <ChevronRight className="h-3 w-3 shrink-0" />
                                                                                    )}
                                                                                    <div>
                                                                                      <div className="font-medium text-gray-900">Y{year} S{sem}</div>
                                                                                    </div>
                                                                                  </div>
                                                                                  {active && (
                                                                                    <Button
                                                                                      size="sm"
                                                                                      className="bg-[#015F2B] hover:bg-[#014022] h-7 text-xs shrink-0"
                                                                                      onClick={() => {
                                                                                        setAddCourseForm({ code: '', name: '', credits: 3 });
                                                                                        setAddCourseOpen(true);
                                                                                      }}
                                                                                    >
                                                                                      <Plus className="h-3 w-3 mr-1" /> Course
                                  </Button>
                                                                                  )}
                                                                                </div>
                                                                                {active && (
                                                                                  <div className="px-4 pb-3 space-y-3">
                                                                                    {coursesInNodeLoading ? (
                                                                                      <div className="py-2 text-center">
                                                                                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                                                                      </div>
                                                                                    ) : coursesInNode.length === 0 ? (
                                                                                      <p className="text-xs text-muted-foreground">
                                                                                        No courses in this semester yet.
                                                                                      </p>
                                                                                    ) : (
                                                                                      <>
                                                                                        <div className="rounded border divide-y max-h-72 overflow-auto bg-white">
                                                                                          {coursesInNode.map((c: any) => (
                                                                                            <div
                                                                                              key={c.id}
                                                                                              className="flex items-center gap-3 p-2 hover:bg-gray-50"
                                                                                            >
                                                                                              <Checkbox
                                                                                                checked={selectedCourseIds.has(c.id)}
                                                                                                onCheckedChange={() => toggleCourseSelection(c.id)}
                                                                                              />
                                                                                              <div className="flex-1 min-w-0">
                                                                                                <div className="text-xs font-semibold text-gray-900 truncate">{c.code}</div>
                                                                                                <div className="text-xs text-gray-700 truncate">{c.name}</div>
                                                                                              </div>
                                                                                              <div className="flex items-center gap-1 shrink-0">
                                                                                                <Button
                                                                                                  variant="ghost"
                                                                                                  size="sm"
                                                                                                  className="h-7 w-7 p-0"
                                                                                                  onClick={() => {
                                                                                                    setEditingCourse({ id: c.id, code: c.code, name: c.name, credits: c.credits ?? 3 });
                                                                                                    setAddCourseForm({ code: c.code, name: c.name, credits: c.credits ?? 3 });
                                                                                                    setAddCourseOpen(true);
                                                                                                  }}
                                                                                                >
                                                                                                  <Edit className="h-3 w-3" />
                                                                                                </Button>
                                                                                                <Button
                                                                                                  variant="ghost"
                                                                                                  size="sm"
                                                                                                  className="h-7 w-7 p-0 text-red-600"
                                                                                                  onClick={async () => {
                                                                                                    if (!confirm(`Delete course "${c.name}" (${c.code})?`)) return;
                                                                                                    try {
                                                                                                      await academicService.deleteCourse(c.id);
                                                                                                      toast.success('Course deleted');
                                                                                                      await refreshCoursesInNode();
                                                                                                    } catch (err: any) {
                                                                                                      toast.error(err?.message || 'Failed to delete course');
                                                                                                    }
                                                                                                  }}
                                                                                                >
                                                                                                  <Trash2 className="h-3 w-3" />
                                                                                                </Button>
                                </div>
                              </div>
                            ))}
                                                                                        </div>
                                                                                        {selectedCourseIds.size > 0 && moveTargetOptions.length > 0 && (
                                                                                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t mt-1">
                                                                                            <Select
                                                                                              value={moveTarget || moveTargetOptions[0]?.value}
                                                                                              onValueChange={setMoveTarget}
                                                                                            >
                                                                                              <SelectTrigger className="w-[200px] h-8 text-xs">
                                                                                                <SelectValue placeholder="Move to..." />
                                                                                              </SelectTrigger>
                                                                                              <SelectContent>
                                                                                                {moveTargetOptions.map((o) => (
                                                                                                  <SelectItem key={o.value} value={o.value}>
                                                                                                    {o.label}
                                                                                                  </SelectItem>
                                                                                                ))}
                                                                                              </SelectContent>
                                                                                            </Select>
                                                                                            <Button
                                                                                              size="sm"
                                                                                              variant="outline"
                                                                                              disabled={moveCoursesLoading}
                                                                                              onClick={handleMoveCourses}
                                                                                              className="h-8 text-xs"
                                                                                            >
                                                                                              {moveCoursesLoading
                                                                                                ? 'Moving...'
                                                                                                : `Move ${selectedCourseIds.size} course(s)`}
                                                                                            </Button>
                                                                                          </div>
                                                                                        )}
                                                                                      </>
                                                                                    )}
                                                                                  </div>
                                                                                )}
                                                                              </div>
                                                                            );
                                                                          })}
                                                                        </div>
                                                                      )}
                                                                    </div>
                                                                  );
                                                                })}
                                                              </div>
                                                            )}
                                                          </div>
                                                        );
                                                      })
                                                    )}

                                                    {/* Unassigned courses bucket (courses created without programId) */}
                                                    {(() => {
                                                      const active =
                                                        selectedNode?.type === 'unassignedCourses' &&
                                                        selectedNode.departmentId === dept.id;
                                                      return (
                                                        <div className="border rounded bg-white">
                                                          <div
                                                            className={`flex items-center justify-between p-3 pl-6 ${
                                                              active ? 'bg-gray-100' : 'hover:bg-gray-50'
                                                            }`}
                                                          >
                                                            <div
                                                              role="button"
                                                              tabIndex={0}
                                                              className="flex items-center gap-3 flex-1 text-left min-w-0 cursor-pointer"
                                                              onClick={() =>
                                                                setSelectedNode({
                                                                  type: 'unassignedCourses',
                                                                  departmentId: dept.id,
                                                                  departmentName: dept.name,
                                                                })
                                                              }
                                                              onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                  e.preventDefault();
                                                                  setSelectedNode({
                                                                    type: 'unassignedCourses',
                                                                    departmentId: dept.id,
                                                                    departmentName: dept.name,
                                                                  });
                                                                }
                                                              }}
                                                            >
                                                              {active ? (
                                                                <ChevronDown className="h-3 w-3 shrink-0" />
                                                              ) : (
                                                                <ChevronRight className="h-3 w-3 shrink-0" />
                                                              )}
                                                              <div className="min-w-0">
                                                                <div className="font-medium text-gray-900 truncate">Unassigned courses</div>
                                                                <div className="text-xs text-gray-500 truncate">
                                                                  Courses not yet linked to a degree program (will not appear under Year/Semester).
                                                                </div>
                                                              </div>
                                                            </div>
                                                          </div>

                                                          {active && (
                                                            <div className="px-4 pb-3 space-y-3">
                                                              {coursesInNodeLoading ? (
                                                                <div className="py-2 text-center">
                                                                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                                                </div>
                                                              ) : coursesInNode.length === 0 ? (
                                                                <p className="text-xs text-muted-foreground">
                                                                  No unassigned courses in this department.
                                                                </p>
                                                              ) : (
                                                                <>
                                                                  <div className="rounded border divide-y max-h-72 overflow-auto bg-white">
                                                                    {coursesInNode.map((c: any) => (
                                                                      <div key={c.id} className="flex items-center gap-3 p-2 hover:bg-gray-50">
                                                                        <Checkbox
                                                                          checked={selectedCourseIds.has(c.id)}
                                                                          onCheckedChange={() => toggleCourseSelection(c.id)}
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                          <div className="text-xs font-semibold text-gray-900 truncate">{c.code}</div>
                                                                          <div className="text-xs text-gray-700 truncate">{c.name}</div>
                                                                        </div>
                                                                      </div>
                                                                    ))}
                                                                  </div>

                                                                  {selectedCourseIds.size > 0 && moveTargetOptions.length > 0 && (
                                                                    <div className="flex items-center gap-2">
                                                                      <Select
                                                                        value={moveTarget || moveTargetOptions[0]?.value}
                                                                        onValueChange={(v) => setMoveTarget(v)}
                                                                      >
                                                                        <SelectTrigger className="h-8 text-xs">
                                                                          <SelectValue placeholder="Move selected to..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                          {moveTargetOptions.map((o) => (
                                                                            <SelectItem key={o.value} value={o.value}>
                                                                              {o.label}
                                                                            </SelectItem>
                                                                          ))}
                                                                        </SelectContent>
                                                                      </Select>
                                                                      <Button
                                                                        size="sm"
                                                                        className="bg-[#015F2B] hover:bg-[#014022] h-8 text-xs"
                                                                        disabled={moveCoursesLoading}
                                                                        onClick={handleMoveCourses}
                                                                      >
                                                                        {moveCoursesLoading ? (
                                                                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                                                        ) : null}
                                                                        Link to semester
                                                                      </Button>
                                                                    </div>
                                                                  )}
                                                                </>
                                                              )}
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })()}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
      </div>

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

      {/* Add Level Dialog */}
      <Dialog open={addLevelOpen} onOpenChange={setAddLevelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Level</DialogTitle>
            <DialogDescription>Create an academic level (e.g. Undergraduate, Masters, PhD) under a school.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLevel} className="space-y-4">
            <div>
              <Label>School *</Label>
              <Select
                value={levelForm.schoolId}
                onValueChange={v => setLevelForm(f => ({ ...f, schoolId: v }))}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select a school" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level Name *</Label>
              <Input
                value={levelForm.name}
                onChange={e => setLevelForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="e.g. Undergraduate, Masters"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddLevelOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Create Level</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Level Dialog */}
      <Dialog open={editLevelOpen} onOpenChange={setEditLevelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Level</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveLevel} className="space-y-4">
            <div>
              <Label>School *</Label>
              <Select
                value={levelForm.schoolId}
                onValueChange={v => setLevelForm(f => ({ ...f, schoolId: v }))}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select a school" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level Name *</Label>
              <Input
                value={levelForm.name}
                onChange={e => setLevelForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditLevelOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Update Level</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={addDeptOpen} onOpenChange={setAddDeptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>Create a new department under a school and level.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDept} className="space-y-4">
            <div>
              <Label>School *</Label>
              <Select
                value={deptForm.schoolId}
                onValueChange={v => {
                  const firstLevel = levels.find(l => l.schoolId === v);
                  setDeptForm(f => ({ ...f, schoolId: v, levelId: firstLevel?.id ?? '' }));
                }}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select a school" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level *</Label>
              <Select
                value={deptForm.levelId}
                onValueChange={v => setDeptForm(f => ({ ...f, levelId: v }))}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select level (e.g. Undergraduate, Masters)" /></SelectTrigger>
                <SelectContent>
                  {levels
                    .filter(l => !deptForm.schoolId || l.schoolId === deptForm.schoolId)
                    .map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department Name *</Label>
              <Input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Computing" />
            </div>
            <div>
              <Label>Head of Department</Label>
              <Input value={deptForm.head} onChange={e => setDeptForm(f => ({ ...f, head: e.target.value }))} placeholder="e.g. Prof. Jane Smith" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDeptOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Create Department</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={editDeptOpen} onOpenChange={setEditDeptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDept} className="space-y-4">
            <div>
              <Label>School *</Label>
              <Select
                value={deptForm.schoolId}
                onValueChange={v => {
                  const firstLevel = levels.find(l => l.schoolId === v);
                  setDeptForm(f => ({ ...f, schoolId: v, levelId: firstLevel?.id ?? '' }));
                }}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select a school" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level *</Label>
              <Select
                value={deptForm.levelId}
                onValueChange={v => setDeptForm(f => ({ ...f, levelId: v }))}
                required
              >
                <SelectTrigger><SelectValue placeholder="Select level (e.g. Undergraduate, Masters)" /></SelectTrigger>
                <SelectContent>
                  {levels
                    .filter(l => !deptForm.schoolId || l.schoolId === deptForm.schoolId)
                    .map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department Name *</Label>
              <Input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Head of Department</Label>
              <Input value={deptForm.head} onChange={e => setDeptForm(f => ({ ...f, head: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDeptOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Update Department</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Degree Program Dialog */}
      <Dialog open={addProgramOpen} onOpenChange={setAddProgramOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Degree Program</DialogTitle>
            <DialogDescription>Create a degree program (e.g. BSc, BCFCI) under this department.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProgram} className="space-y-4">
            <div>
              <Label>Department *</Label>
              <Select value={programForm.departmentId} onValueChange={v => setProgramForm(f => ({ ...f, departmentId: v }))} required>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Program Name *</Label>
              <Input value={programForm.name} onChange={e => setProgramForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Bachelor of Computer Forensics" />
            </div>
            <div>
              <Label>Program Code *</Label>
              <Input value={programForm.code} onChange={e => setProgramForm(f => ({ ...f, code: e.target.value }))} required placeholder="e.g. BCFCI" />
            </div>
            <div>
              <Label>Duration (years) *</Label>
              <Select value={programForm.duration.toString()} onValueChange={v => setProgramForm(f => ({ ...f, duration: parseInt(v, 10) }))} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(y => (<SelectItem key={y} value={y.toString()}>{y} year{y !== 1 ? 's' : ''}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddProgramOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Create Program</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Degree Program Dialog */}
      <Dialog open={editProgramOpen} onOpenChange={setEditProgramOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Degree Program</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProgram} className="space-y-4">
            <div>
              <Label>Department *</Label>
              <Select value={programForm.departmentId} onValueChange={v => setProgramForm(f => ({ ...f, departmentId: v }))} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Program Name *</Label>
              <Input value={programForm.name} onChange={e => setProgramForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Program Code *</Label>
              <Input value={programForm.code} onChange={e => setProgramForm(f => ({ ...f, code: e.target.value }))} required />
            </div>
            <div>
              <Label>Duration (years) *</Label>
              <Select value={programForm.duration.toString()} onValueChange={v => setProgramForm(f => ({ ...f, duration: parseInt(v, 10) }))} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(y => (<SelectItem key={y} value={y.toString()}>{y} year{y !== 1 ? 's' : ''}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProgramOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]">Update Program</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create course in selected semester */}
      <Dialog open={addCourseOpen} onOpenChange={(open) => {
        setAddCourseOpen(open);
        if (!open) setEditingCourse(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Edit course' : 'Create course'}</DialogTitle>
            <DialogDescription>
              {editingCourse
                ? `Update course details`
                : selectedNode?.type === 'yearSemester'
                  ? `Add to ${selectedNode.programName} — Year ${selectedNode.level} Semester ${selectedNode.semester}`
                  : ''}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCourseInNode} className="space-y-4">
            <div>
              <Label>Course code *</Label>
              <Input value={addCourseForm.code} onChange={e => setAddCourseForm(f => ({ ...f, code: e.target.value }))} required placeholder="e.g. CS101" />
            </div>
            <div>
              <Label>Course name *</Label>
              <Input value={addCourseForm.name} onChange={e => setAddCourseForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Introduction to Programming" />
            </div>
            <div>
              <Label>Credits</Label>
              <Select value={addCourseForm.credits.toString()} onValueChange={v => setAddCourseForm(f => ({ ...f, credits: parseInt(v, 10) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(c => (<SelectItem key={c} value={c.toString()}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setAddCourseOpen(false); setEditingCourse(null); }}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={addCourseSaving}>
                {addCourseSaving ? (editingCourse ? 'Updating...' : 'Creating...') : (editingCourse ? 'Update course' : 'Create course')}
              </Button>
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
  const [importScope, setImportScope] = useState({ programId: '', year: 1, semester: 1 });
  const [allPrograms, setAllPrograms] = useState<{ id: string; name: string; code: string; duration?: number }[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<TimetableClass | null>(null);
  const [editForm, setEditForm] = useState({ dayOfWeek: 1, lecturerId: '', venueId: '', capacity: 50, startTime: '', endTime: '' });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingClass, setDeletingClass] = useState<TimetableClass | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [lecturers, setLecturers] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState({ programId: '', program: '', year: '', semester: '', intakeType: 'Day', day: '', courseCode: '' });
  const [timetablePrograms, setTimetablePrograms] = useState<{ id: string; name: string; code: string; duration?: number }[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = async () => {
    const programId = filters.programId && filters.programId !== '__all__' ? filters.programId : '';
    const year = filters.year ? parseInt(filters.year, 10) : null;
    const semester = filters.semester ? parseInt(filters.semester, 10) : null;
    if (!programId || year == null || semester == null) {
      toast.error('Select Program, Year and Semester first');
      return;
    }
    try {
      const token = localStorage.getItem('kcu-token');
      const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
      const params = new URLSearchParams();
      params.set('programId', programId);
      params.set('year', String(year));
      params.set('semester', String(semester));
      params.set('intakeType', filters.intakeType || 'Day');
      params.set('format', 'excel');
      const url = `${base}/timetable/export?${params.toString()}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || 'Export failed');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `timetable_${filters.intakeType || 'Day'}_Y${year}_S${semester}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Export downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    }
  };

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const query: any = { page, limit: 20 };
      if (filters.programId && filters.programId !== '__all__') query.programId = filters.programId;
      else if (filters.program) query.program = filters.program;
      if (filters.year) query.year = parseInt(filters.year, 10);
      if (filters.semester) query.semester = parseInt(filters.semester, 10);
      if (filters.intakeType) query.intakeType = filters.intakeType;
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

  useEffect(() => {
    academicService.getPrograms().then((res: any) => {
      const arr = res?.data ?? (Array.isArray(res) ? res : []);
      setTimetablePrograms(arr.map((p: any) => ({ id: p.id, name: p.name, code: p.code || '', duration: p.duration ?? 4 })));
    }).catch(() => setTimetablePrograms([]));
  }, []);

  useEffect(() => {
    if (importOpen) {
      academicService.getPrograms().then((res: any) => {
        const arr = res?.data ?? (Array.isArray(res) ? res : []);
        setAllPrograms(arr.map((p: any) => ({ id: p.id, name: p.name, code: p.code || '', duration: p.duration ?? 4 })));
      }).catch(() => setAllPrograms([]));
    }
  }, [importOpen]);

  const handleImport = async (file: File) => {
    if (!importScope.programId) {
      toast.error('Select a program, year and semester first');
        return;
      }
    setImporting(true);
    setImportResult(null);
    try {
      const result = await timetableService.importTimetable(file, false, {
        programId: importScope.programId,
        year: importScope.year,
        semester: importScope.semester,
      });
      setImportResult(result);
      setFilters(f => ({ ...f, programId: importScope.programId, year: String(importScope.year), semester: String(importScope.semester), program: '' }));
      toast.success(`Import completed! ${result.summary.classesCreated} classes created, ${result.summary.classesUpdated} updated.`);
      loadLecturers();
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
      dayOfWeek: cls.dayOfWeek ?? 1,
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
        dayOfWeek: editForm.dayOfWeek,
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
          <div className="w-[200px]">
            <Select
              value={filters.programId || 'all'}
              onValueChange={(v) => setFilters({ ...filters, programId: v === 'all' ? '__all__' : v, program: '' })}
            >
              <SelectTrigger><SelectValue placeholder="Program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                {timetablePrograms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <Select value={filters.intakeType || "Day"} onValueChange={(v) => setFilters({ ...filters, intakeType: v })}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Intake" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Day">Day</SelectItem>
              <SelectItem value="Evening">Evening</SelectItem>
              <SelectItem value="Weekend">Weekend</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.day || "all"} onValueChange={(v) => setFilters({ ...filters, day: v === "all" ? "" : v })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>
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
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export (Excel)
          </Button>
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
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                  {!((filters.programId && filters.programId !== '__all__') || filters.year || filters.semester) ? 'Select program, year and semester to view timetable.' : 'No classes found for this scope.'}
                </TableCell></TableRow>
              ) : (
                classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell>{(cls.course as any).program?.name ?? cls.course.department?.name ?? '—'}</TableCell>
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
          {total > 20 && (
            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {Math.max(1, Math.ceil(total / 20))}</span>
              <Button variant="outline" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
          )}
        </CardContent>
      </Card>

      {false && (
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <div className="p-5 sm:p-6 border-b bg-muted/30">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Import Timetable</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Set the program and semester, then upload a CSV or Excel file. Columns: Course Code, Course Name, Class Name, Lecturer Name, Day, Start Time, End Time, Venue, Capacity.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-5 sm:p-6 space-y-5">
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <p className="text-sm font-medium text-foreground">Timetable scope</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Program</Label>
                  <Select
                    value={importScope.programId}
                    onValueChange={(v) => setImportScope(s => ({ ...s, programId: v }))}
                  >
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select program" /></SelectTrigger>
                    <SelectContent>
                      {allPrograms.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Year</Label>
                    <Select
                      value={String(importScope.year)}
                      onValueChange={(v) => setImportScope(s => ({ ...s, year: parseInt(v, 10) }))}
                    >
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: Math.max(1, allPrograms.find(p => p.id === importScope.programId)?.duration ?? 5) }, (_, i) => i + 1).map((y) => (
                          <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Semester</Label>
                    <Select
                      value={String(importScope.semester)}
                      onValueChange={(v) => setImportScope(s => ({ ...s, semester: parseInt(v, 10) }))}
                    >
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Semester 1</SelectItem>
                        <SelectItem value="2">Semester 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <p className="text-sm font-medium text-foreground">File</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => timetableService.downloadTemplate('csv').catch((e: any) => toast.error(e.message))}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 mr-1.5" /> Download CSV template
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => timetableService.downloadTemplate('excel').catch((e: any) => toast.error(e.message))}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 mr-1.5" /> Download Excel template
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing || !importScope.programId}
                className="w-full flex flex-col items-center justify-center gap-2 min-h-[100px] rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 hover:bg-muted/50 hover:border-[#015F2B]/50 transition-colors disabled:opacity-50 disabled:pointer-events-none text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[#015F2B] focus-visible:ring-offset-2"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" />
                    <span className="text-sm font-medium">Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Choose CSV or Excel file</span>
                    <span className="text-xs">.csv, .xlsx, .xls</span>
                  </>
                )}
              </button>
            </div>
            {importResult && (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Import summary</p>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Rows</dt>
                  <dd className="font-medium">{importResult.summary.totalRows}</dd>
                  <dt className="text-muted-foreground">Courses</dt>
                  <dd className="font-medium">{importResult.summary.coursesCreated || 0} created, {importResult.summary.coursesMatched || 0} matched</dd>
                  <dt className="text-muted-foreground">Lecturers</dt>
                  <dd className="font-medium">{importResult.summary.lecturersCreated || 0} created, {importResult.summary.lecturersMatched || 0} matched</dd>
                  <dt className="text-muted-foreground">Classes</dt>
                  <dd className="font-medium">{importResult.summary.classesCreated || 0} created, {importResult.summary.classesUpdated || 0} updated</dd>
                </dl>
                {(importResult.errors?.length > 0 || importResult.warnings?.length > 0) && (
                  <div className="flex flex-wrap gap-3 pt-2 border-t text-sm">
                    {importResult.errors?.length > 0 && (
                      <span className="text-destructive font-medium">{importResult.errors.length} error(s)</span>
                    )}
                    {importResult.warnings?.length > 0 && (
                      <span className="text-amber-600 dark:text-amber-500 font-medium">{importResult.warnings.length} warning(s)</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-5 sm:p-6 pt-0 flex justify-end">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

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
              <Label>Day</Label>
              <Select value={String(editForm.dayOfWeek)} onValueChange={(v) => setEditForm({ ...editForm, dayOfWeek: parseInt(v, 10) })}>
                <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.filter(o => o.value !== 'all').map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

export default function AdminView({
  defaultTab = 'students',
  staffTabMode = 'non-teaching',
}: {
  defaultTab?: string;
  staffTabMode?: 'non-teaching' | 'staff-role';
}) {
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

  const loadStudents = async (
    page: number,
    params?: {
      search?: string;
      programId?: string;
      year?: number;
      semester?: number;
      intakeType?: 'Day' | 'Evening' | 'Weekend';
      status?: string;
    }
  ) => {
    try {
      const res = await studentService.getStudents({ page, limit: LIST_PAGE_SIZE, ...params });
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
      const res = await staffService.getStaff({
        page,
        limit: LIST_PAGE_SIZE,
        ...(staffTabMode === 'staff-role' ? { role: 'Staff' } : {}),
      });
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
          <StaffTab
            staff={staff}
            setStaff={setStaff}
            staffPage={staffPage}
            staffTotal={staffTotal}
            pageSize={LIST_PAGE_SIZE}
            loadStaff={loadStaff}
            staffTabMode={staffTabMode}
          />
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
