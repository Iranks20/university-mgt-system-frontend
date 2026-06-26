import { Routes, Route, Navigate } from 'react-router'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { Toaster } from 'sonner'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'
import Presence from './screens/Presence'
import StudentHistory from './screens/StudentHistory'
import ManagementStaffPerformance from './screens/ManagementStaffPerformance'
import ManagementStudentPerformance from './screens/ManagementStudentPerformance'
import ManagementLecturerPerformance from './screens/ManagementLecturerPerformance'
import ManagementStudentDetails from './screens/ManagementStudentDetails'
import ManagementDepartments from './screens/ManagementDepartments'
import ManagementOverview from './screens/ManagementOverview'
import StudentClasses from './screens/StudentClasses'
import LecturerPerformance from './screens/LecturerPerformance'
import LecturerCourseAttendance from './screens/LecturerCourseAttendance'
import AdminSchools from './screens/AdminSchools'
import AdminClasses from './screens/AdminClasses'
import AdminSettings from './screens/AdminSettings'
import AdminAuditLog from './screens/AdminAuditLog'
import AdminVenues from './screens/AdminVenues'
import AdminUsers from './screens/AdminUsers'
import AdminCustomRoles from './screens/AdminCustomRoles'
import AdminTimetables from './screens/AdminTimetables'
import AdminCourses from './screens/AdminCourses'
import AdminLecturers from './screens/AdminLecturers'
import AdminStudents from './screens/AdminStudents'
import AdminCalendar from './screens/AdminCalendar'
import AdminStrategicGoals from './screens/AdminStrategicGoals'
import Timetable from './screens/Timetable'
import Reports from './screens/Reports'
import StudentRecords from './screens/StudentRecords'
import LectureRecords from './screens/LectureRecords'
import Cancellations from './screens/Cancellations'
import CurriculumManagement from './screens/CurriculumManagement'
import TimetableBuilder from './screens/TimetableBuilder'
import ClinicalLegacyRedirect from './screens/clinical/ClinicalLegacyRedirect'
import ClinicalSitesPage from './screens/clinical/pages/ClinicalSitesPage'
import ClinicalSiteTeamPage from './screens/clinical/pages/ClinicalSiteTeamPage'
import ClinicalInstructorsPage from './screens/clinical/pages/ClinicalInstructorsPage'
import ClinicalRotationsListPage from './screens/clinical/pages/ClinicalRotationsListPage'
import ClinicalSessionsPage from './screens/clinical/pages/ClinicalSessionsPage'
import ClinicalAttendancePage from './screens/clinical/pages/ClinicalAttendancePage'
import ClinicalReportsPage from './screens/clinical/pages/ClinicalReportsPage'
import ClinicalProgramPoliciesPage from './screens/clinical/pages/ClinicalProgramPoliciesPage'
import HrDashboardPage from './screens/hr/pages/HrDashboardPage'
import HrEmployeesPage from './screens/hr/pages/HrEmployeesPage'
import HrLeavePage from './screens/hr/pages/HrLeavePage'
import HrAttendancePage from './screens/hr/pages/HrAttendancePage'
import HrOnboardingPage from './screens/hr/pages/HrOnboardingPage'
import HrDocumentsPage from './screens/hr/pages/HrDocumentsPage'
import HrAppraisalsPage from './screens/hr/pages/HrAppraisalsPage'
import HrReportsPage from './screens/hr/pages/HrReportsPage'
import StaffAppraisal from './screens/StaffAppraisal'
import { homePathForRole } from './lib/clinical-access'
import { routeGuardProps } from './lib/nav-permissions'

// Public route wrapper for login
function PublicRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, userRole, user } = useAuth()
	
	if (isAuthenticated) {
		return <Navigate to={homePathForRole(userRole, user?.permissions)} replace />
	}
	
	return <>{children}</>
}

function AppRoutes() {
	return (
		<Routes>
			{/* Public Routes */}
			<Route 
				path="/login" 
				element={
					<PublicRoute>
						<Login />
					</PublicRoute>
				} 
			/>
			
			{/* Protected Routes - All users */}
			<Route 
				path="/dashboard" 
				element={
					<ProtectedRoute {...routeGuardProps('/dashboard')}>
						<Dashboard />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/presence" 
				element={
					<ProtectedRoute {...routeGuardProps('/presence')}>
						<Presence />
					</ProtectedRoute>
				} 
			/>
			
			{/* Student Routes */}
			<Route 
				path="/student-classes" 
				element={
					<ProtectedRoute allowedRoles={['Student']} {...routeGuardProps('/student-classes')}>
						<StudentClasses />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/student-history" 
				element={
					<ProtectedRoute allowedRoles={['Student', 'Staff']} {...routeGuardProps('/student-history')}>
						<StudentHistory />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/student-records" 
				element={
					<ProtectedRoute {...routeGuardProps('/student-records')}>
						<StudentRecords />
					</ProtectedRoute>
				} 
			/>
			
			{/* Timetable Routes */}
			<Route 
				path="/timetable" 
				element={
					<ProtectedRoute {...routeGuardProps('/timetable')}>
						<Timetable />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/lecturer-performance" 
				element={
					<ProtectedRoute allowedRoles={['Lecturer']} {...routeGuardProps('/lecturer-performance')}>
						<LecturerPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/lecturer-course-attendance" 
				element={
					<ProtectedRoute {...routeGuardProps('/lecturer-course-attendance')}>
						<LecturerCourseAttendance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/cancellations" 
				element={
					<ProtectedRoute {...routeGuardProps('/cancellations')}>
						<Cancellations />
					</ProtectedRoute>
				} 
			/>
			
			{/* Management Routes */}
			<Route 
				path="/management-overview" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']} {...routeGuardProps('/management-overview')}>
						<ManagementOverview />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-departments" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']} {...routeGuardProps('/management-departments')}>
						<ManagementDepartments />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-staff-performance" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']} {...routeGuardProps('/management-staff-performance')}>
						<ManagementStaffPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-student-performance" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']} {...routeGuardProps('/management-student-performance')}>
						<ManagementStudentPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-lecturer-performance" 
				element={
					<ProtectedRoute {...routeGuardProps('/management-lecturer-performance')}>
						<ManagementLecturerPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-student-details" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']} {...routeGuardProps('/management-student-details')}>
						<ManagementStudentDetails />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/curriculum-management" 
				element={
					<ProtectedRoute {...routeGuardProps('/curriculum-management')}>
						<CurriculumManagement />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/timetable-builder" 
				element={
					<ProtectedRoute {...routeGuardProps('/timetable-builder')}>
						<TimetableBuilder />
					</ProtectedRoute>
				} 
			/>
			<Route path="/clinical-rotations" element={<ProtectedRoute {...routeGuardProps('/clinical-rotations')}><ClinicalLegacyRedirect /></ProtectedRoute>} />
			<Route path="/clinical/sites" element={<ProtectedRoute {...routeGuardProps('/clinical/sites')}><ClinicalSitesPage /></ProtectedRoute>} />
			<Route path="/clinical/site-team" element={<ProtectedRoute {...routeGuardProps('/clinical/site-team')}><ClinicalSiteTeamPage /></ProtectedRoute>} />
			<Route path="/clinical/instructors" element={<ProtectedRoute {...routeGuardProps('/clinical/instructors')}><ClinicalInstructorsPage /></ProtectedRoute>} />
			<Route path="/clinical/rotations" element={<ProtectedRoute {...routeGuardProps('/clinical/rotations')}><ClinicalRotationsListPage /></ProtectedRoute>} />
			<Route path="/clinical/sessions" element={<ProtectedRoute {...routeGuardProps('/clinical/sessions')}><ClinicalSessionsPage /></ProtectedRoute>} />
			<Route path="/clinical/attendance" element={<ProtectedRoute {...routeGuardProps('/clinical/attendance')}><ClinicalAttendancePage /></ProtectedRoute>} />
			<Route path="/clinical/reports" element={<ProtectedRoute {...routeGuardProps('/clinical/reports')}><ClinicalReportsPage /></ProtectedRoute>} />
			<Route path="/clinical/policies" element={<ProtectedRoute {...routeGuardProps('/clinical/policies')}><ClinicalProgramPoliciesPage /></ProtectedRoute>} />

			<Route path="/hr/dashboard" element={<ProtectedRoute allowedRoles={['HR', 'Admin']} {...routeGuardProps('/hr/dashboard')}><HrDashboardPage /></ProtectedRoute>} />
			<Route path="/hr/employees" element={<ProtectedRoute allowedRoles={['HR', 'Admin']} {...routeGuardProps('/hr/employees')}><HrEmployeesPage /></ProtectedRoute>} />
			<Route path="/hr/leave" element={<ProtectedRoute allowedRoles={['HR', 'Admin']} {...routeGuardProps('/hr/leave')}><HrLeavePage /></ProtectedRoute>} />
			<Route path="/hr/attendance" element={<ProtectedRoute allowedRoles={['HR', 'Admin']} {...routeGuardProps('/hr/attendance')}><HrAttendancePage /></ProtectedRoute>} />
			<Route path="/hr/onboarding" element={<ProtectedRoute allowedRoles={['HR', 'Admin']} {...routeGuardProps('/hr/onboarding')}><HrOnboardingPage /></ProtectedRoute>} />
			<Route path="/hr/documents" element={<ProtectedRoute allowedRoles={['HR', 'Admin']} {...routeGuardProps('/hr/documents')}><HrDocumentsPage /></ProtectedRoute>} />
			<Route path="/hr/appraisals" element={<ProtectedRoute allowedRoles={['HR', 'Admin']} {...routeGuardProps('/hr/appraisals')}><HrAppraisalsPage /></ProtectedRoute>} />
			<Route path="/hr/reports" element={<ProtectedRoute allowedRoles={['HR', 'Admin']} {...routeGuardProps('/hr/reports')}><HrReportsPage /></ProtectedRoute>} />
			<Route path="/staff-appraisal" element={<ProtectedRoute {...routeGuardProps('/staff-appraisal')}><StaffAppraisal /></ProtectedRoute>} />
			
			{/* Admin Routes */}
			<Route 
				path="/admin-students" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-students')}>
						<AdminStudents />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-lecturers" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-lecturers')}>
						<AdminLecturers />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-courses" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-courses')}>
						<AdminCourses />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-classes" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-classes')}>
						<AdminClasses />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-timetables" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-timetables')}>
						<AdminTimetables />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-schools" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-schools')}>
						<AdminSchools />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-venues" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-venues')}>
						<AdminVenues />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-users" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-users')}>
						<AdminUsers />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-roles" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-roles')}>
						<AdminCustomRoles />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-settings" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-settings')}>
						<AdminSettings />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-calendar" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-calendar')}>
						<AdminCalendar />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-strategic-goals" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-strategic-goals')}>
						<AdminStrategicGoals />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-audit-log" 
				element={
					<ProtectedRoute {...routeGuardProps('/admin-audit-log')}>
						<AdminAuditLog />
					</ProtectedRoute>
				} 
			/>
			
			{/* QA Routes */}
			<Route 
				path="/lecture-records" 
				element={
					<ProtectedRoute {...routeGuardProps('/lecture-records')}>
						<LectureRecords />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/reports" 
				element={
					<ProtectedRoute {...routeGuardProps('/reports')}>
						<Reports />
					</ProtectedRoute>
				} 
			/>
			
			{/* Root redirect */}
			<Route path="/" element={<Navigate to="/login" replace />} />
			
			{/* Catch all - redirect to dashboard if authenticated, otherwise login */}
			<Route path="*" element={<Navigate to="/dashboard" replace />} />
		</Routes>
	)
}

export default function App() {
	return (
		<AuthProvider>
			<AppRoutes />
			<Toaster position="top-right" richColors />
		</AuthProvider>
	)
}
