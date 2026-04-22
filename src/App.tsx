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
import AdminStaff from './screens/AdminStaff'
import AdminStaffRole from './screens/AdminStaffRole'
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

// Public route wrapper for login
function PublicRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated } = useAuth()
	
	if (isAuthenticated) {
		return <Navigate to="/dashboard" replace />
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
					<ProtectedRoute
						requiredPermissionSets={[
							// QA dashboard widgets
							['analytics.core_dashboard', 'analytics.ops', 'qa.review'],
							// Management/Admin dashboard widgets
							['analytics.core_dashboard', 'analytics.ops', 'analytics.mgmt_overview', 'reports.access'],
							// Lecturer dashboard widgets
							['academic.personal_schedule', 'qa.lecturer_portal', 'staff.lecturer_me'],
							['academic.personal_schedule', 'qa.lecturer_portal', 'staff.timeclock'],
							// Student dashboard widgets
							['students.self', 'settings.read', 'timetable.student_me', 'enrollment.self', 'students.attendance_self'],
							// Staff dashboard widgets
							['staff.timeclock'],
						]}
					>
						<Dashboard />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/presence" 
				element={
					<ProtectedRoute
						requiredPermissionSets={[
							// Lecturer flow (current class + QA portal actions)
							['academic.personal_schedule', 'qa.lecturer_portal'],
							// Student flow (current class + self attendance + student identity)
							['academic.personal_schedule', 'students.self', 'students.attendance_self'],
							// Staff timeclock flow
							['staff.timeclock'],
						]}
					>
						<Presence />
					</ProtectedRoute>
				} 
			/>
			
			{/* Student Routes */}
			<Route 
				path="/student-classes" 
				element={
					<ProtectedRoute
						allowedRoles={['Student']}
						requiredPermissionSets={[
							['students.self', 'enrollment.self', 'settings.read', 'students.attendance_self'],
						]}
					>
						<StudentClasses />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/student-history" 
				element={
					<ProtectedRoute
						allowedRoles={['Student', 'Staff']}
						requiredPermissionSets={[
							// Student attendance history flow
							['students.self', 'enrollment.self', 'students.attendance_self'],
							// Staff check-in history flow
							['staff.timeclock'],
						]}
					>
						<StudentHistory />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/student-records" 
				element={
					<ProtectedRoute
						allowedRoles={['QA']}
						requiredPermissionSets={[
							['students.read', 'students.attendance_staff', 'academic.read'],
						]}
					>
						<StudentRecords />
					</ProtectedRoute>
				} 
			/>
			
			{/* Timetable Routes */}
			<Route 
				path="/timetable" 
				element={
					<ProtectedRoute
						allowedRoles={['Lecturer', 'QA', 'Student']}
						requiredPermissionSets={[
							// Student timetable flow
							['timetable.student_me'],
							// Lecturer timetable + QA portal checks
							['academic.personal_schedule', 'qa.lecturer_portal'],
							// QA/ops timetable view
							['timetable.ops'],
						]}
					>
						<Timetable />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/lecturer-performance" 
				element={
					<ProtectedRoute
						allowedRoles={['Lecturer']}
						requiredPermissionSets={[
							['analytics.lecturer_private', 'staff.lecturer_me'],
						]}
					>
						<LecturerPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/lecturer-course-attendance" 
				element={
					<ProtectedRoute
						allowedRoles={['Lecturer']}
						requiredPermissionSets={[
							['academic.personal_schedule', 'enrollment.class_read', 'qa.review', 'students.attendance_staff'],
						]}
					>
						<LecturerCourseAttendance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/cancellations" 
				element={
					<ProtectedRoute
						allowedRoles={['Lecturer', 'QA', 'Admin', 'Management']}
						requiredPermissionSets={[
							// Lecturer: see own + pick scheduled sessions + submit
							['cancellations.lecturer', 'timetable.lecturer_me'],
							// Management: view queue/history
							['cancellations.queue'],
							// QA/Admin: view queue/history + approve/reject
							['cancellations.queue', 'cancellations.decide'],
						]}
					>
						<Cancellations />
					</ProtectedRoute>
				} 
			/>
			
			{/* Management Routes */}
			<Route 
				path="/management-overview" 
				element={
					<ProtectedRoute
						allowedRoles={['Management', 'Admin']}
						requiredPermissionSets={[
							['analytics.mgmt_overview'],
						]}
					>
						<ManagementOverview />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-departments" 
				element={
					<ProtectedRoute
						allowedRoles={['Management', 'Admin']}
						requiredPermissionSets={[
							['academic.read', 'academic.mgmt_read'],
						]}
					>
						<ManagementDepartments />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-staff-performance" 
				element={
					<ProtectedRoute
						allowedRoles={['Management', 'Admin']}
						requiredPermissionSets={[
							['staff.read', 'reports.access'],
						]}
					>
						<ManagementStaffPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-student-performance" 
				element={
					<ProtectedRoute
						allowedRoles={['Management', 'Admin']}
						requiredPermissionSets={[
							['students.read', 'analytics.ops', 'analytics.mgmt_overview', 'settings.read', 'reports.access'],
						]}
					>
						<ManagementStudentPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-lecturer-performance" 
				element={
					<ProtectedRoute
						allowedRoles={['Management', 'Admin']}
						requiredPermissionSets={[
							['settings.read', 'staff.read', 'qa.review', 'analytics.ops', 'academic.mgmt_read', 'reports.access'],
						]}
					>
						<ManagementLecturerPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-student-details" 
				element={
					<ProtectedRoute
						allowedRoles={['Management', 'Admin']}
						requiredPermissionSets={[
							['students.read', 'students.attendance_staff', 'settings.read', 'reports.access'],
						]}
					>
						<ManagementStudentDetails />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/curriculum-management" 
				element={
					<ProtectedRoute
						allowedRoles={['Management', 'Admin', 'Lecturer']}
						requiredPermissionSets={[
							['academic.read'],
						]}
					>
						<CurriculumManagement />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/timetable-builder" 
				element={
					<ProtectedRoute
						allowedRoles={['Admin', 'Management', 'QA']}
						requiredPermissionSets={[
							['academic.read', 'academic.venues', 'academic.program_intakes', 'academic.write', 'staff.read'],
						]}
					>
						<TimetableBuilder />
					</ProtectedRoute>
				} 
			/>
			
			{/* Admin Routes */}
			<Route 
				path="/admin-students" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['admin.console']]}>
						<AdminStudents />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-staff-role" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['admin.console']]}>
						<AdminStaffRole />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-staff" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['admin.console']]}>
						<AdminStaff />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-lecturers" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['admin.console']]}>
						<AdminLecturers />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-courses" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['academic.write']]}>
						<AdminCourses />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-classes" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['academic.write']]}>
						<AdminClasses />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-timetables" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['timetable.ops']]}>
						<AdminTimetables />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-schools" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['academic.write']]}>
						<AdminSchools />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-venues" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['academic.venues']]}>
						<AdminVenues />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-users" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['admin.console']]}>
						<AdminUsers />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-roles" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['admin.console']]}>
						<AdminCustomRoles />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-settings" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['settings.read']]}>
						<AdminSettings />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-calendar" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['academic.write']]}>
						<AdminCalendar />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-strategic-goals" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['admin.console']]}>
						<AdminStrategicGoals />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-audit-log" 
				element={
					<ProtectedRoute allowedRoles={['Admin']} requiredPermissionSets={[['admin.console']]}>
						<AdminAuditLog />
					</ProtectedRoute>
				} 
			/>
			
			{/* QA Routes */}
			<Route 
				path="/lecture-records" 
				element={
					<ProtectedRoute
						allowedRoles={['QA']}
						requiredPermissionSets={[
							['qa.review', 'qa.write', 'qa.import', 'staff.read', 'enrollment.class_read', 'students.attendance_staff'],
						]}
					>
						<LectureRecords />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/reports" 
				element={
					<ProtectedRoute
						allowedRoles={['QA', 'Management', 'Admin']}
						requiredPermissionSets={[
							['reports.access', 'qa.review', 'analytics.core_dashboard', 'analytics.ops', 'academic.read', 'timetable.ops'],
						]}
					>
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
