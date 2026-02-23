# Frontend API Integration TODO List

This document lists all places in the frontend that are still using mock/dummy data or are not fully integrated with backend APIs.

## Completed in this pass

- **Backend**: Analytics; Student/Staff dashboard-stats; Academic current-class, getClasses (with course/venue/lecturer include); QA; Reports. **New**: `GET /qa/me/lecture-records` (Lecturer); `GET /staff/me/check-in-history` (Staff, returns [] until StaffCheckIn).
- **Frontend**: Dashboard (all roles); Reports; Management screens; **Student Records**; **Student History** (Student + Staff: Staff uses check-in API, mock removed); **Worst Performers**; **Admin View**; **Lecturer Dashboard** (notifications + attendance chart from `getMyLectureRecords()`); **Staff Dashboard** (attendance table + notifications from `getCheckInHistory()`); **Reports Students tab** (worst-performing students from analytics API); LecturerPerformance, ManagementDepartments, LecturerCourseAttendance, LectureRecords, StudentClasses verified integrated.

## Dashboard (`src/screens/Dashboard.tsx`)

### QA Dashboard
- ✅ **Integrated**: Uses `analyticsService.getDashboardStats()`, `qaService.getSchoolSummaryReport()`, `qaService.getLectureRecords()`, `analyticsService.getAttendanceTrends()`
- ✅ Stats cards use API data (untaughtLectures, studentAttendancePercent, teachingRatePercent)
- ✅ Attendance trend chart uses API when available; fallback to ATTENDANCE_TREND
- ✅ Recent lectures from API; RECENT_LECTURES fallback when empty

### Lecturer Dashboard
- ✅ **Integrated**: Uses `staffService.getDashboardStats()`, `academicService.getTimetable()` for profile and today's schedule
- ✅ **Notifications & attendance chart**: Uses `qaService.getMyLectureRecords()` (backend `GET /qa/me/lecture-records`). Chart = monthly TAUGHT count; notifications = recent UNTAUGHT count + performance review from stats

### Student Dashboard
- ✅ **Integrated**: Uses `studentService.getDashboardStats()` for stats cards (attendance rate, classes today, assignments, GPA)
- ✅ **My Classes table & Attendance limit**: Loaded from `enrollmentService.getStudentEnrollments(user.id)` and `studentService.getStudentAttendance()` per class; table and progress bars use API data

### Staff Dashboard
- ✅ **Integrated**: Uses `staffService.getDashboardStats()` for stats cards
- ✅ **Attendance table & notifications**: Uses `staffService.getCheckInHistory()` (backend `GET /staff/me/check-in-history`). Returns empty array until StaffCheckIn table/feature is implemented; UI shows empty state. Notifications are API-aware (check-in reminder, "N records" when non-empty)

### Management Dashboard
- ✅ **Integrated**: Uses `analyticsService.getDashboardStats()`, `analyticsService.getTopPerformingStaff()`, `analyticsService.getAttendanceTrends()`
- ✅ Top performing staff table from API; department pie and line chart use API or fallback

## Reports Screen (`src/screens/Reports.tsx`)

- ✅ **Integrated**: Overview tab uses `analyticsService.getDashboardStats()`, `getAttendanceTrends()`, `getAttendanceDistribution()`, `reportService.getReports()` for stats cards, trend chart, pie chart, and recent reports table.
- ✅ **Integrated**: Schools tab uses `qaService.getSchoolSummaryReport()` for school performance chart and table.
- ✅ **Integrated**: Lecturers tab uses `analyticsService.getTopPerformingStaff()` for lecturer performance table.
- ✅ **Students tab**: Uses `analyticsService.getWorstPerformingStudents(50)` for at-risk student attendance table (student name, program, attendance %, missed).

**Note**: School Summary and Lecturer Summary tabs use integrated components (`QASchoolSummary`, `QALecturerSummary`)

## Timetable Screen (`src/screens/Timetable.tsx`)

- ✅ **Integrated**: Uses `academicService.getTimetable()` and `qaService.checkIn()`/`checkOut()`
- ✅ **Status**: Fully integrated

## Presence Screen (`src/screens/Presence.tsx`)

- ✅ **Integrated**: Uses `academicService.getCurrentClass()` for current class; fallback to mock when API returns null
- ✅ **GPS verification**: Real browser geolocation; verifies user is within Kampala (15km radius of 0.3476°N, 32.5825°E). Config in `src/utils/geolocation.ts` — change `GEOFENCE_RADIUS_METERS` and `KAMPALA_CENTER` to restrict to university later.

## Student History (`src/screens/StudentHistory.tsx`)

- ✅ **Integrated (Student role)**: Uses `enrollmentService.getStudentEnrollments(user.id)` then `studentService.getStudentAttendance(studentId)` to load attendance history; stats and table from API data.
- ✅ **Integrated (Staff role)**: Uses `staffService.getCheckInHistory()` (backend `GET /staff/me/check-in-history`). Mock removed; empty state when no records (API returns [] until StaffCheckIn is implemented).

## Student Records (`src/screens/StudentRecords.tsx`)

- ✅ **Integrated**: Records loaded from `studentService.getProgramCodes()`, `getStudents(program)`, and `getStudentAttendance(studentId)` per student (capped); stats cards (total students, present today, absent today, attendance rate) computed from API data. Program selector uses API codes. CSV view uses `getProgramAttendanceData()` when available.

## Management Student Details (`src/screens/ManagementStudentDetails.tsx`)

- ✅ **Integrated**: Student list from `studentService.getStudents()`; program codes and per-student attendance report from API
- ✅ Stats cards calculated from loaded students

## Management Student Performance (`src/screens/ManagementStudentPerformance.tsx`)

- ✅ **Integrated**: Uses `studentService.getStudents()` and `analyticsService.getStudentPerformance(student.id)` per student; table and stats from API data. Mock array removed from use.

## Management Lecturer Performance (`src/screens/ManagementLecturerPerformance.tsx`)

- ✅ **Integrated**: Uses `staffService.getLecturers()` and `analyticsService.getLecturerPerformance(lecturer.id)` per lecturer; table and stats from API data (taught/untaught/attendanceRate). Mock array removed from use.

## Management Staff Performance (`src/screens/ManagementStaffPerformance.tsx`)

- ✅ **Integrated**: Uses `staffService.getStaff()` for staff list; stats cards derived from API data (avg attendance from performanceScore when present, top performer). Mock array removed from use.

## Worst Performers Component (`src/components/WorstPerformers.tsx`)

- ✅ **Integrated**: Uses API calls (`/analytics/worst-lecturers`, `/analytics/worst-students`). Fallback mock arrays removed; empty state shown when API fails.

## Admin View (`src/components/AdminView.tsx`)

- ✅ **Integrated**: Courses tab uses `academicService.getCourses()` + `getDepartments()`; Schools tab uses `academicService.getSchools()` + `getDepartments()`; Classes tab course dropdown uses `academicService.getCourses()` (adminCourses).
- ✅ **Timetables tab**: Uses `academicService.getClasses()` for master schedule (day, time, course, venue, lecturer). Backend `getClasses` now includes course, venue, lecturer.
- ✅ **Academic Calendar tab**: Empty state (no calendar API); message prompts for backend endpoint.

## QA Service (`src/services/qa.service.ts`)

- ✅ **Integrated**: `getLecturerSummaryReport()` calls `/qa/lecturer-summary-report` API

## Other Screens (verified)

- `src/screens/LecturerCourseAttendance.tsx` - ✅ Uses `academicService.getClasses()`, `enrollmentService.getClassEnrollments()`, `studentService.getStudentAttendance()`
- `src/screens/LecturerPerformance.tsx` - ✅ Uses `staffService.getDashboardStats()` and `analyticsService.getLecturerPerformance()` for stats and compliance chart
- `src/screens/LectureRecords.tsx` - ✅ Uses `qaService.getLectureRecords()`, `getSchools()`, `getClassesBySchool()`
- `src/screens/ManagementDepartments.tsx` - ✅ Uses `academicService.getSchools()` and `getDepartments()` for department list
- `src/screens/StudentClasses.tsx` - ✅ Uses `enrollmentService.getStudentEnrollments()`, `studentService.getStudentAttendance()`

## Summary by Priority

### High Priority (Core Functionality)
1. **Dashboard** - All role dashboards need real data
2. **Reports Screen** - Most data is mock
3. **Management Screens** - Student/Lecturer/Staff performance screens
4. **Student Records** - Main attendance records screen
5. **Student History** - Attendance history

### Medium Priority
6. **Presence Screen** - Needs real class data
7. **Admin View** - All admin management screens
8. **QA Service** - Complete lecturer summary report integration

### Low Priority (Fallbacks)
9. **Worst Performers** - Already integrated, just remove fallback mocks
10. **Various fallback mock data** - Remove after APIs are stable

## Required Backend APIs

Based on this analysis, the following APIs need to be created/verified:

1. **Analytics APIs**:
   - `/api/v1/analytics/dashboard-stats` ✅
   - `/api/v1/analytics/attendance-trends` ✅
   - `/api/v1/analytics/recent-lectures` ✅
   - `/api/v1/analytics/attendance-distribution` ✅
   - `/api/v1/analytics/top-performing-staff` ✅

2. **Lecturer/Staff (timetable = schedule)**:
   - Lecturer dashboard uses `/api/v1/academic/timetable` + `/api/v1/staff/me/dashboard-stats` ✅
   - Lecturer notifications/chart: `GET /api/v1/qa/me/lecture-records` ✅ (Lecturer-only; returns current user's QA lecture records)

3. **Student APIs**:
   - `/api/v1/students/me/dashboard-stats` ✅ (student dashboard)
   - `/api/v1/students` (list) ✅ (management student details)
   - `/api/v1/students/{id}/attendance` ✅ (attendance history)

4. **Staff APIs**:
   - `/api/v1/staff/me/dashboard-stats` ✅
   - `/api/v1/staff/me/check-in-history` ✅ (returns [] until StaffCheckIn table/feature; used by Staff dashboard & Attendance History)

5. **Reports APIs**:
   - `POST /api/v1/reports` (generate) ✅ (backend exists; Reports Overview uses `reportService.getReports()`)
   - `GET /api/v1/reports` (list) ✅
   - School performance: uses `GET /api/v1/qa/school-summary-report` ✅
   - Lecturer performance: uses `GET /api/v1/analytics/top-performing-staff` ✅

6. **Admin APIs** (use academic routes):
   - `/api/v1/academic/courses` ✅ (use for admin courses)
   - `/api/v1/academic/schools` ✅ (use for admin schools)
   - `/api/v1/academic/classes` ✅ (use for admin timetables/classes)

7. **Academic APIs**:
   - `/api/v1/academic/timetable` ✅
   - `/api/v1/academic/current-class` ✅

## Next Steps

1. Create missing backend APIs listed above
2. Update frontend services to call real APIs
3. Remove all mock data arrays and fallbacks
4. Add proper error handling and loading states
5. Test each screen after integration
6. Update types/interfaces to match API responses
