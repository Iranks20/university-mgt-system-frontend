import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu, X, LayoutDashboard, BookOpen, Users, FileText, Calendar, CalendarX,
  MapPin, BarChart, Settings, School, Building,
  Clock, UserCheck, LogOut, GraduationCap, Bell, KeyRound, UserCog, TrendingUp, Briefcase, ClipboardList, UsersRound,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import kcuUniversityLogo from '@/assets/images/kcu-university-logo.png';
import { Link, useLocation, useNavigate } from 'react-router';
import { useRole, UserRole } from './RoleProvider';
import { useAuth } from '../contexts/AuthContext';
import { notificationService, type Notification } from '@/services/notification.service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

function roleLabel(r: string): string {
  if (r === 'QA') return 'QA Officer';
  if (r === 'Staff') return 'Non-Teaching Staff';
  return r;
}

const ADMIN_USERS_CHILD_PATHS = [
  '/admin-students',
  '/admin-lecturers',
  '/admin-staff-role',
  '/admin-staff',
  '/admin-users',
  '/admin-roles',
] as const;

function isPathUnderAdminUsersSection(pathname: string): boolean {
  return ADMIN_USERS_CHILD_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

type SidebarChild = { label: string; path: string; icon: LucideIcon };

type SidebarItem =
  | { type: 'single'; label: string; path: string; icon: LucideIcon }
  | { type: 'folder'; id: string; label: string; icon: LucideIcon; children: SidebarChild[] };

const NAV_PERMISSION: Record<string, string[] | string[][]> = {
  '/admin-users': ['admin.console'],
  '/admin-roles': ['admin.console'],
  '/admin-students': ['admin.console'],
  '/admin-lecturers': ['admin.console'],
  '/admin-staff-role': ['admin.console'],
  '/admin-staff': ['admin.console'],
  '/admin-courses': ['academic.write'],
  '/admin-classes': ['academic.write'],
  '/admin-timetables': ['timetable.ops'],
  '/admin-schools': ['academic.write'],
  '/admin-venues': ['academic.venues'],
  '/admin-calendar': ['academic.write'],
  '/admin-strategic-goals': ['admin.console'],
  '/admin-settings': ['settings.read'],
  '/timetable': [['timetable.student_me'], ['academic.personal_schedule', 'qa.lecturer_portal'], ['timetable.ops']],
  '/timetable-builder': [['academic.read', 'academic.venues', 'academic.program_intakes', 'academic.write', 'staff.read']],
  '/lecture-records': [['qa.review', 'qa.write', 'qa.import', 'staff.read', 'enrollment.class_read', 'students.attendance_staff']],
  '/student-records': [['students.read', 'students.attendance_staff', 'academic.read']],
  '/reports': [['reports.access', 'qa.review', 'analytics.core_dashboard', 'analytics.ops', 'academic.read', 'timetable.ops']],
  '/management-overview': [['analytics.mgmt_overview']],
  '/management-departments': [['academic.read', 'academic.mgmt_read']],
  '/management-staff-performance': [['staff.read', 'reports.access']],
  '/management-lecturer-performance': [['settings.read', 'staff.read', 'qa.review', 'analytics.ops', 'academic.mgmt_read', 'reports.access']],
  '/management-student-performance': [['students.read', 'analytics.ops', 'analytics.mgmt_overview', 'settings.read', 'reports.access']],
  '/cancellations': [['cancellations.lecturer', 'timetable.lecturer_me'], ['cancellations.queue'], ['cancellations.queue', 'cancellations.decide']],
  '/curriculum-management': ['academic.read'],
  '/lecturer-course-attendance': [['academic.personal_schedule', 'enrollment.class_read', 'qa.review', 'students.attendance_staff']],
  '/lecturer-performance': [['analytics.lecturer_private', 'staff.lecturer_me']],
  '/student-classes': [['students.self', 'enrollment.self', 'settings.read', 'students.attendance_self']],
  '/student-history': [['students.self', 'enrollment.self', 'students.attendance_self'], ['staff.timeclock']],
  '/presence': [['academic.personal_schedule', 'qa.lecturer_portal'], ['academic.personal_schedule', 'students.self', 'students.attendance_self'], ['staff.timeclock']],
};

function hasAnyPermission(userPermissions: string[] | undefined, required: string[] | string[][] | undefined): boolean {
  if (!required || (Array.isArray(required) && required.length === 0)) return true;
  const have = new Set(userPermissions || []);
  if (Array.isArray(required) && Array.isArray(required[0])) {
    const sets = required as string[][];
    return sets.some((set) => set.length > 0 && set.every((p) => have.has(p)));
  }
  const list = required as string[];
  return list.some((p) => have.has(p));
}

function getHeaderTitle(pathname: string, items: SidebarItem[]): string {
  for (const item of items) {
    if (item.type === 'single') {
      if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
        return item.label;
      }
    } else {
      for (const c of item.children) {
        if (pathname === c.path || pathname.startsWith(`${c.path}/`)) {
          return c.label;
        }
      }
    }
  }
  return 'Dashboard';
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { role } = useRole();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [usersNavOpen, setUsersNavOpen] = useState(() => isPathUnderAdminUsersSection(location.pathname));

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    if (role === 'Admin' && isPathUnderAdminUsersSection(location.pathname)) {
      setUsersNavOpen(true);
    }
  }, [role, location.pathname]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const fetchNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await notificationService.getNotifications({ limit: 20, offset: 0 });
      setNotifications(res.data);
      setUnreadCount(res.unreadCount);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const handleNotificationClick = async (n: Notification) => {
    if (!n.readAt) {
      try {
        await notificationService.markAsRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // ignore
      }
    }
    if (n.link) navigate(n.link);
    setNotificationsOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully. Please log in again.');
      setChangePasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await logout();
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const getNavItems = (currentRole: UserRole): SidebarItem[] => {
    if (!currentRole || !['QA', 'Lecturer', 'Student', 'Staff', 'Management', 'Admin'].includes(currentRole)) {
      console.warn('Invalid role detected:', currentRole);
      return [
        { type: 'single', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { type: 'single', label: 'Mark Presence', icon: MapPin, path: '/presence' },
        { type: 'single', label: 'Reports', icon: FileText, path: '/reports' },
      ];
    }

    switch (currentRole) {
      case 'QA':
        return [
          { type: 'single', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { type: 'single', label: 'Timetable', icon: Calendar, path: '/timetable' },
          { type: 'single', label: 'Timetable Builder', icon: Calendar, path: '/timetable-builder' },
          { type: 'single', label: 'Lecture Records', icon: BookOpen, path: '/lecture-records' },
          { type: 'single', label: 'Cancellations', icon: CalendarX, path: '/cancellations' },
          { type: 'single', label: 'Student Records', icon: Users, path: '/student-records' },
          { type: 'single', label: 'Reports', icon: FileText, path: '/reports' },
        ];
      case 'Lecturer':
        return [
          { type: 'single', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { type: 'single', label: 'My Timetable', icon: Calendar, path: '/timetable' },
          { type: 'single', label: 'Curriculum', icon: ClipboardList, path: '/curriculum-management' },
          { type: 'single', label: 'Cancellations', icon: CalendarX, path: '/cancellations' },
          { type: 'single', label: 'Mark Presence', icon: MapPin, path: '/presence' },
          { type: 'single', label: 'Course Attendance', icon: UserCheck, path: '/lecturer-course-attendance' },
          { type: 'single', label: 'Performance', icon: BarChart, path: '/lecturer-performance' },
        ];
      case 'Student':
        return [
          { type: 'single', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { type: 'single', label: 'My Classes', icon: BookOpen, path: '/student-classes' },
          { type: 'single', label: 'Mark Presence', icon: MapPin, path: '/presence' },
          { type: 'single', label: 'Attendance History', icon: Clock, path: '/student-history' },
        ];
      case 'Staff':
        return [
          { type: 'single', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { type: 'single', label: 'Mark Presence', icon: MapPin, path: '/presence' },
          { type: 'single', label: 'Attendance History', icon: Clock, path: '/student-history' },
        ];
      case 'Management':
        return [
          { type: 'single', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { type: 'single', label: 'University Overview', icon: BarChart, path: '/management-overview' },
          { type: 'single', label: 'Curriculum', icon: ClipboardList, path: '/curriculum-management' },
          { type: 'single', label: 'Timetable Builder', icon: Calendar, path: '/timetable-builder' },
          { type: 'single', label: 'Department Stats', icon: School, path: '/management-departments' },
          { type: 'single', label: 'Staff Performance', icon: Users, path: '/management-staff-performance' },
          { type: 'single', label: 'Lecturer Performance', icon: UserCheck, path: '/management-lecturer-performance' },
          { type: 'single', label: 'Student Performance', icon: GraduationCap, path: '/management-student-performance' },
          { type: 'single', label: 'Cancellations', icon: CalendarX, path: '/cancellations' },
          { type: 'single', label: 'Reports', icon: FileText, path: '/reports' },
        ];
      case 'Admin':
        return [
          { type: 'single', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { type: 'single', label: 'Curriculum', icon: ClipboardList, path: '/curriculum-management' },
          { type: 'single', label: 'Timetable Builder', icon: Calendar, path: '/timetable-builder' },
          {
            type: 'folder',
            id: 'users',
            label: 'Users',
            icon: Users,
            children: [
              { label: 'Students', path: '/admin-students', icon: Users },
              { label: 'Lecturers', path: '/admin-lecturers', icon: GraduationCap },
              { label: 'Staff', path: '/admin-staff-role', icon: UsersRound },
              { label: 'Non-teaching staff', path: '/admin-staff', icon: Briefcase },
              { label: 'System accounts', path: '/admin-users', icon: UserCog },
              { label: 'Roles & Permissions', path: '/admin-roles', icon: KeyRound },
            ],
          },
          { type: 'single', label: 'Courses', icon: BookOpen, path: '/admin-courses' },
          { type: 'single', label: 'Classes', icon: School, path: '/admin-classes' },
          { type: 'single', label: 'Timetables', icon: Calendar, path: '/admin-timetables' },
          { type: 'single', label: 'Schools', icon: Building, path: '/admin-schools' },
          { type: 'single', label: 'Venues', icon: MapPin, path: '/admin-venues' },
          { type: 'single', label: 'Calendar', icon: Calendar, path: '/admin-calendar' },
          { type: 'single', label: 'Strategic Goals', icon: TrendingUp, path: '/admin-strategic-goals' },
          { type: 'single', label: 'Cancellations', icon: CalendarX, path: '/cancellations' },
          { type: 'single', label: 'Settings', icon: Settings, path: '/admin-settings' },
        ];
      default:
        return [
          { type: 'single', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { type: 'single', label: 'Mark Presence', icon: MapPin, path: '/presence' },
          { type: 'single', label: 'Reports', icon: FileText, path: '/reports' },
        ];
    }
  };

  const navItems = getNavItems(role);
  const enforcePermissions = String(import.meta.env.VITE_RBAC_UI_ENFORCE_PERMISSIONS || '') === 'true';
  const userPermissions = user?.permissions || [];
  const allowedByPermission = (path: string) => {
    if (!enforcePermissions) return true;
    return hasAnyPermission(userPermissions, NAV_PERMISSION[path]);
  };
  const filteredNavItems = enforcePermissions
    ? navItems
        .map((item) => {
          if (item.type === 'single') {
            return allowedByPermission(item.path) ? item : null;
          }
          const children = item.children.filter((c) => allowedByPermission(c.path));
          return children.length ? { ...item, children } : null;
        })
        .filter(Boolean) as SidebarItem[]
    : navItems;
  const displayName = user?.name?.trim() || user?.email || 'User';
  const avatarInitial = (displayName.charAt(0) || 'U').toUpperCase();
  const headerPageTitle = getHeaderTitle(location.pathname, filteredNavItems);

  const renderNavLinks = (onNavigate?: () => void) =>
    filteredNavItems.map(item => {
      if (item.type === 'single') {
        const isActive =
          location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
        return (
          <li key={item.path}>
            <Link
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          </li>
        );
      }
      const folderActive = item.children.some(
        c => location.pathname === c.path || location.pathname.startsWith(`${c.path}/`)
      );
      return (
        <li key={item.id}>
          <Collapsible open={usersNavOpen} onOpenChange={setUsersNavOpen}>
            <CollapsibleTrigger
              className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-gray-50 ${
                folderActive ? 'text-primary font-medium' : 'text-gray-600'
              }`}
            >
              <span className="flex items-center gap-3">
                <item.icon size={20} />
                {item.label}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${usersNavOpen ? 'rotate-180' : ''}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul className="ml-2 border-l border-gray-200 py-1 pl-2 space-y-0.5">
                {item.children.map(child => {
                  const childActive =
                    location.pathname === child.path ||
                    location.pathname.startsWith(`${child.path}/`);
                  return (
                    <li key={child.path}>
                      <Link
                        to={child.path}
                        onClick={onNavigate}
                        className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
                          childActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <child.icon size={18} className="shrink-0 opacity-90" />
                        {child.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </li>
      );
    });

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center">
            <img
              src={kcuUniversityLogo}
              alt=""
              className="max-h-full max-w-full object-contain drop-shadow-sm"
            />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-primary">KCU ERP System</h1>
            <p className="text-xs text-gray-500">Enterprise resource planning</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">{renderNavLinks()}</ul>
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {avatarInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{roleLabel(role)}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform duration-200 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center">
              <img
                src={kcuUniversityLogo}
                alt=""
                className="max-h-full max-w-full object-contain drop-shadow-sm"
              />
            </div>
            <span className="font-bold text-lg text-primary">KCU ERP System</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-500">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">{renderNavLinks(() => setSidebarOpen(false))}</ul>
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {avatarInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{roleLabel(role)}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar}
              className="md:hidden mr-4 text-gray-600 hover:text-gray-900"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 hidden sm:block">{headerPageTitle}</h2>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu open={notificationsOpen} onOpenChange={(open) => { setNotificationsOpen(open); if (open) fetchNotifications(); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-[min(24rem,70vh)] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                  <span className="font-semibold text-sm text-gray-900">Notifications</span>
                  {unreadCount > 0 && (
                    <button type="button" onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center py-8 text-gray-500 text-sm">Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-500 text-sm px-4">
                      <Bell className="h-8 w-8 mb-2 opacity-50" />
                      No new notifications
                    </div>
                  ) : (
                    <ul className="py-1">
                      {notifications.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => handleNotificationClick(n)}
                            className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors ${!n.readAt ? 'bg-primary/5' : ''}`}
                          >
                            <p className="font-medium text-sm text-gray-900 truncate">{n.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {avatarInitial}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500">{roleLabel(role)}</p>
                </div>
                <DropdownMenuItem onClick={() => { setChangePasswordOpen(true); }}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new password.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setChangePasswordOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={changingPassword} className="bg-[#015F2B] hover:bg-[#014022]">
                {changingPassword ? 'Changing…' : 'Change password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShellInner>
      {children}
    </AppShellInner>
  );
}
