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
import AdminTimetables from './screens/AdminTimetables'
import AdminCourses from './screens/AdminCourses'
import AdminStaff from './screens/AdminStaff'
import AdminLecturers from './screens/AdminLecturers'
import AdminStudents from './screens/AdminStudents'
import AdminCalendar from './screens/AdminCalendar'
import AdminStrategicGoals from './screens/AdminStrategicGoals'
import Timetable from './screens/Timetable'
import Reports from './screens/Reports'
import StudentRecords from './screens/StudentRecords'
import LectureRecords from './screens/LectureRecords'
import Cancellations from './screens/Cancellations'

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
					<ProtectedRoute>
						<Dashboard />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/presence" 
				element={
					<ProtectedRoute>
						<Presence />
					</ProtectedRoute>
				} 
			/>
			
			{/* Student Routes */}
			<Route 
				path="/student-classes" 
				element={
					<ProtectedRoute allowedRoles={['Student']}>
						<StudentClasses />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/student-history" 
				element={
					<ProtectedRoute allowedRoles={['Student', 'Staff']}>
						<StudentHistory />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/student-records" 
				element={
					<ProtectedRoute allowedRoles={['QA']}>
						<StudentRecords />
					</ProtectedRoute>
				} 
			/>
			
			{/* Lecturer Routes */}
			<Route 
				path="/timetable" 
				element={
					<ProtectedRoute allowedRoles={['Lecturer']}>
						<Timetable />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/lecturer-performance" 
				element={
					<ProtectedRoute allowedRoles={['Lecturer']}>
						<LecturerPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/lecturer-course-attendance" 
				element={
					<ProtectedRoute allowedRoles={['Lecturer']}>
						<LecturerCourseAttendance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/cancellations" 
				element={
					<ProtectedRoute allowedRoles={['Lecturer', 'QA', 'Admin', 'Management']}>
						<Cancellations />
					</ProtectedRoute>
				} 
			/>
			
			{/* Management Routes */}
			<Route 
				path="/management-overview" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']}>
						<ManagementOverview />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-departments" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']}>
						<ManagementDepartments />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-staff-performance" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']}>
						<ManagementStaffPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-student-performance" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']}>
						<ManagementStudentPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-lecturer-performance" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']}>
						<ManagementLecturerPerformance />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/management-student-details" 
				element={
					<ProtectedRoute allowedRoles={['Management', 'Admin']}>
						<ManagementStudentDetails />
					</ProtectedRoute>
				} 
			/>
			
			{/* Admin Routes */}
			<Route 
				path="/admin-students" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminStudents />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-staff" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminStaff />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-lecturers" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminLecturers />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-courses" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminCourses />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-classes" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminClasses />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-timetables" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminTimetables />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-schools" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminSchools />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-venues" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminVenues />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-users" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminUsers />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-settings" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminSettings />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-calendar" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminCalendar />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-strategic-goals" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminStrategicGoals />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/admin-audit-log" 
				element={
					<ProtectedRoute allowedRoles={['Admin']}>
						<AdminAuditLog />
					</ProtectedRoute>
				} 
			/>
			
			{/* QA Routes */}
			<Route 
				path="/lecture-records" 
				element={
					<ProtectedRoute allowedRoles={['QA']}>
						<LectureRecords />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/reports" 
				element={
					<ProtectedRoute allowedRoles={['QA', 'Management', 'Admin']}>
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
