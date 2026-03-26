import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useRole } from '@/components/RoleProvider'
import { toast } from 'sonner'

type CurriculumStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Changes Requested' | 'Approved'
type CurriculumRow = {
  id: string
  courseCode: string
  courseTitle: string
  program: string
  semester: string
  assignedTo: string
  assignedBy: string
  assignedDate: string
  submissionDate?: string
  status: CurriculumStatus
  reviewRound: number
  reviewNotes?: string
}

const mockCurriculums: CurriculumRow[] = [
  {
    id: 'cur-001',
    courseCode: 'CSC 210',
    courseTitle: 'Operating Systems',
    program: 'BCS',
    semester: 'Year 2 Semester 1',
    assignedTo: 'Dr. Ronald Ssemanda',
    assignedBy: 'Dean - School of Computing',
    assignedDate: '2026-01-16',
    submissionDate: '2026-02-04',
    status: 'Under Review',
    reviewRound: 2,
  },
  {
    id: 'cur-002',
    courseCode: 'CSC 204',
    courseTitle: 'Database Systems',
    program: 'BCS',
    semester: 'Year 2 Semester 1',
    assignedTo: 'Dr. Peter Kato',
    assignedBy: 'Dean - School of Computing',
    assignedDate: '2026-01-18',
    submissionDate: '2026-01-31',
    status: 'Changes Requested',
    reviewRound: 1,
  },
  {
    id: 'cur-003',
    courseCode: 'BBA 112',
    courseTitle: 'Principles of Marketing',
    program: 'BBA',
    semester: 'Year 1 Semester 2',
    assignedTo: 'Ms. Lillian Namuli',
    assignedBy: 'Dean - School of Business',
    assignedDate: '2026-01-21',
    submissionDate: '2026-02-03',
    status: 'Approved',
    reviewRound: 1,
  },
  {
    id: 'cur-004',
    courseCode: 'CSC 118',
    courseTitle: 'Discrete Mathematics',
    program: 'BCS',
    semester: 'Year 1 Semester 2',
    assignedTo: 'Dr. Ronald Ssemanda',
    assignedBy: 'Dean - School of Computing',
    assignedDate: '2026-02-01',
    status: 'Draft',
    reviewRound: 0,
  },
]

const lecturerDirectory = ['Dr. Ronald Ssemanda', 'Dr. Peter Kato', 'Ms. Lillian Namuli', 'Mr. Denis Lubega']

const statusStyles: Record<CurriculumStatus, string> = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  'Under Review': 'bg-amber-100 text-amber-700 border-amber-200',
  'Changes Requested': 'bg-orange-100 text-orange-700 border-orange-200',
  Approved: 'bg-green-100 text-green-700 border-green-200',
}

const lifecycle = ['Draft', 'Submitted', 'Under Review', 'Approved'] as const
const mockCurrentLecturer = 'Dr. Ronald Ssemanda'

export default function CurriculumManagement() {
  const { role } = useRole()
  const [rows, setRows] = useState<CurriculumRow[]>(mockCurriculums)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [activeRow, setActiveRow] = useState<CurriculumRow | null>(null)
  const [assignmentForm, setAssignmentForm] = useState({
    courseCode: '',
    courseTitle: '',
    program: '',
    semester: '',
    assignedTo: '',
  })
  const [reviewDecision, setReviewDecision] = useState<'Approved' | 'Changes Requested'>('Approved')
  const [reviewNotes, setReviewNotes] = useState('')

  const isManagement = role === 'Management' || role === 'Admin'
  const isLecturer = role === 'Lecturer'

  const visibleRows = useMemo(() => {
    const roleScoped = isLecturer ? rows.filter(r => r.assignedTo === mockCurrentLecturer) : rows
    return roleScoped.filter(r => {
      const matchesSearch =
        !search ||
        r.courseCode.toLowerCase().includes(search.toLowerCase()) ||
        r.courseTitle.toLowerCase().includes(search.toLowerCase()) ||
        r.program.toLowerCase().includes(search.toLowerCase()) ||
        r.assignedTo.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [isLecturer, rows, search, statusFilter])

  const pendingReviewCount = rows.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length
  const approvedCount = rows.filter(r => r.status === 'Approved').length
  const changesRequestedCount = rows.filter(r => r.status === 'Changes Requested').length

  const openReview = (row: CurriculumRow) => {
    setActiveRow(row)
    setReviewDecision('Approved')
    setReviewNotes('')
    setReviewOpen(true)
  }

  const submitReview = () => {
    if (!activeRow) return
    if (activeRow.status !== 'Under Review') {
      toast.error('Only items under review can be reviewed.')
      return
    }
    setRows(prev =>
      prev.map(row =>
        row.id === activeRow.id
          ? {
              ...row,
              status: reviewDecision,
              reviewRound: row.reviewRound + 1,
              reviewNotes,
            }
          : row
      )
    )
    setReviewOpen(false)
    toast.success('Mock review submitted.')
  }

  const submitForReview = (row: CurriculumRow) => {
    if (row.status !== 'Draft' && row.status !== 'Changes Requested') {
      toast.error('This curriculum cannot be submitted in its current status.')
      return
    }
    setRows(prev =>
      prev.map(item =>
        item.id === row.id
          ? {
              ...item,
              status: 'Submitted',
              submissionDate: new Date().toISOString().slice(0, 10),
            }
          : item
      )
    )
    toast.success('Mock submission sent for review.')
  }

  const startReview = (row: CurriculumRow) => {
    if (row.status !== 'Submitted') {
      toast.error('Only submitted curriculums can move to review.')
      return
    }
    setRows(prev =>
      prev.map(item =>
        item.id === row.id
          ? {
              ...item,
              status: 'Under Review',
            }
          : item
      )
    )
    toast.success('Mock review started.')
  }

  const saveAssignment = () => {
    if (!assignmentForm.courseCode || !assignmentForm.courseTitle || !assignmentForm.program || !assignmentForm.semester || !assignmentForm.assignedTo) {
      toast.error('Fill all assignment fields.')
      return
    }
    const row: CurriculumRow = {
      id: `cur-${Math.random().toString(16).slice(2, 8)}`,
      courseCode: assignmentForm.courseCode,
      courseTitle: assignmentForm.courseTitle,
      program: assignmentForm.program,
      semester: assignmentForm.semester,
      assignedTo: assignmentForm.assignedTo,
      assignedBy: 'Curriculum Committee',
      assignedDate: new Date().toISOString().slice(0, 10),
      status: 'Draft',
      reviewRound: 0,
    }
    setRows(prev => [row, ...prev])
    setAssignmentOpen(false)
    setAssignmentForm({ courseCode: '', courseTitle: '', program: '', semester: '', assignedTo: '' })
    toast.success('Mock curriculum assignment created.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Curriculum Management</h1>
          <p className="text-gray-500">
            {isManagement
              ? 'Track curriculum assignment, lecturer submissions, and review decisions.'
              : 'View your assigned curriculum items and submission status.'}
          </p>
        </div>
        {isManagement && (
          <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={() => setAssignmentOpen(true)}>
            Assign Curriculum
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-[#015F2B]">
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-2xl">{pendingReviewCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl">{approvedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-l-4 border-l-orange-600">
          <CardHeader className="pb-2">
            <CardDescription>Changes Requested</CardDescription>
            <CardTitle className="text-2xl">{changesRequestedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle</CardTitle>
          <CardDescription>Draft to Submitted to Under Review to Approved</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {lifecycle.map(step => (
            <Badge key={step} variant="outline" className={statusStyles[step]}>
              {step}
            </Badge>
          ))}
          <Badge variant="outline" className={statusStyles['Changes Requested']}>
            Changes Requested (loops back to Submitted)
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>{isManagement ? 'Assignments and Reviews' : 'My Curriculum Assignments'}</CardTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              placeholder="Search by code, title, program, lecturer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
                <SelectItem value="Changes Requested">Changes Requested</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center text-sm text-muted-foreground">{visibleRows.length} item(s)</div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={isManagement ? 'all' : 'mine'}>
            <TabsList>
              {isManagement && <TabsTrigger value="all">All Curriculums</TabsTrigger>}
              <TabsTrigger value="mine">{isManagement ? 'Review Queue' : 'My Curriculums'}</TabsTrigger>
            </TabsList>
            {isManagement && (
              <TabsContent value="all" className="pt-4">
                <CurriculumTable rows={visibleRows} showAssignedTo onReview={openReview} canReview />
              </TabsContent>
            )}
            <TabsContent value="mine" className="pt-4">
              <CurriculumTable
                rows={isManagement ? visibleRows.filter(r => r.status === 'Submitted' || r.status === 'Under Review') : visibleRows}
                showAssignedTo={isManagement}
                onReview={openReview}
                canReview={isManagement}
                isLecturer={isLecturer}
                onSubmit={submitForReview}
                onStartReview={startReview}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Curriculum</DialogTitle>
            <DialogDescription>Create a mock curriculum assignment for UI review flow.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Course Code</Label>
              <Input value={assignmentForm.courseCode} onChange={e => setAssignmentForm(p => ({ ...p, courseCode: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Course Title</Label>
              <Input value={assignmentForm.courseTitle} onChange={e => setAssignmentForm(p => ({ ...p, courseTitle: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Program</Label>
              <Input value={assignmentForm.program} onChange={e => setAssignmentForm(p => ({ ...p, program: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Semester</Label>
              <Input value={assignmentForm.semester} onChange={e => setAssignmentForm(p => ({ ...p, semester: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Assign To Lecturer</Label>
              <Select value={assignmentForm.assignedTo} onValueChange={value => setAssignmentForm(p => ({ ...p, assignedTo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lecturer" />
                </SelectTrigger>
                <SelectContent>
                  {lecturerDirectory.map(name => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={saveAssignment}>
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Review Curriculum Submission</DialogTitle>
            <DialogDescription>
              {activeRow ? `${activeRow.courseCode} - ${activeRow.courseTitle}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Decision</Label>
              <Select value={reviewDecision} onValueChange={value => setReviewDecision(value as 'Approved' | 'Changes Requested')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Approved">Approve</SelectItem>
                  <SelectItem value="Changes Requested">Request Changes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Review Notes</Label>
              <Textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Enter clear feedback for lecturer revision or approval note."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={submitReview}>
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CurriculumTable({
  rows,
  showAssignedTo,
  onReview,
  canReview,
  isLecturer = false,
  onSubmit,
  onStartReview,
}: {
  rows: CurriculumRow[]
  showAssignedTo: boolean
  onReview: (row: CurriculumRow) => void
  canReview: boolean
  isLecturer?: boolean
  onSubmit?: (row: CurriculumRow) => void
  onStartReview?: (row: CurriculumRow) => void
}) {
  if (rows.length === 0) {
    return <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">No curriculum records found.</div>
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Semester</TableHead>
            {showAssignedTo && <TableHead>Assigned To</TableHead>}
            <TableHead>Submission Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Round</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                <div>{row.courseCode}</div>
                <div className="text-xs text-muted-foreground">{row.courseTitle}</div>
              </TableCell>
              <TableCell>{row.program}</TableCell>
              <TableCell>{row.semester}</TableCell>
              {showAssignedTo && <TableCell>{row.assignedTo}</TableCell>}
              <TableCell>{row.submissionDate || 'Not submitted'}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusStyles[row.status]}>
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell>{row.reviewRound}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {isLecturer && (row.status === 'Draft' || row.status === 'Changes Requested') && onSubmit && (
                    <Button size="sm" variant="outline" onClick={() => onSubmit(row)}>
                      Submit
                    </Button>
                  )}
                  {canReview && row.status === 'Submitted' && onStartReview && (
                    <Button size="sm" variant="outline" onClick={() => onStartReview(row)}>
                      Start Review
                    </Button>
                  )}
                  {canReview && row.status === 'Under Review' && (
                    <Button size="sm" variant="outline" onClick={() => onReview(row)}>
                      Review
                    </Button>
                  )}
                  {!((isLecturer && (row.status === 'Draft' || row.status === 'Changes Requested') && onSubmit) || (canReview && row.status === 'Submitted' && onStartReview) || (canReview && row.status === 'Under Review')) && (
                    <span className="text-xs text-muted-foreground">View</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
