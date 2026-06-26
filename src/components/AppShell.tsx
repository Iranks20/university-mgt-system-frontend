import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu, X, LayoutDashboard, BookOpen, Users, FileText, Calendar, CalendarX,
  MapPin, BarChart, Settings, School, Building,
  Clock, UserCheck, LogOut, GraduationCap, Bell, KeyRound, UserCog, TrendingUp, Briefcase, ClipboardList, UsersRound, UserPlus,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import kcuUniversityLogo from '@/assets/images/kcu-university-logo.png';
import { Link, useLocation, useNavigate } from 'react-router';
import { useRole } from './RoleProvider';
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
import { navAllowed, shouldNestClinicalNavItems, shouldNestHrNavItems } from '@/lib/nav-permissions';

function roleLabel(r: string): string {
  if (r === 'QA') return 'QA Officer';
  if (r === 'QAClinicals') return 'QA Clinicals';
  if (r === 'ClinicalCoordinator') return 'Clinical Coordinator';
  if (r === 'Staff') return 'Non-Teaching Staff';
  if (r === 'HR') return 'HR Officer';
  return r;
}

const ADMIN_USERS_CHILD_PATHS = [
  '/admin-students',
  '/admin-lecturers',
  '/admin-users',
  '/admin-roles',
  '/admin-audit-log',
] as const;

const ADMIN_CLINICAL_CHILD_PATHS = [
  '/clinical/sites',
  '/clinical/site-team',
  '/clinical/instructors',
  '/clinical/rotations',
  '/clinical/policies',
  '/clinical/sessions',
  '/clinical/attendance',
  '/clinical/reports',
] as const;

function isPathUnderAdminUsersSection(pathname: string): boolean {
  return ADMIN_USERS_CHILD_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

function isPathUnderAdminClinicalSection(pathname: string): boolean {
  return ADMIN_CLINICAL_CHILD_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

type SidebarChild = { label: string; path: string; icon: LucideIcon };

type SidebarItem =
  | { type: 'single'; label: string; path: string; icon: LucideIcon }
  | { type: 'folder'; id: string; label: string; icon: LucideIcon; children: SidebarChild[] };

function navTarget(path: string): { pathname: string; search: string } {
  const [pathname, query = ''] = path.split('?');
  return { pathname, search: query ? `?${query}` : '' };
}

const ADMIN_CLINICAL_NAV_CHILDREN: SidebarChild[] = [
  { label: 'Clinical Sites', icon: MapPin, path: '/clinical/sites' },
  { label: 'Site Team', icon: UsersRound, path: '/clinical/site-team' },
  { label: 'Instructors', icon: UsersRound, path: '/clinical/instructors' },
  { label: 'Rotations', icon: ClipboardList, path: '/clinical/rotations' },
  { label: 'Eligibility Policies', icon: UserCheck, path: '/clinical/policies' },
  { label: 'Sessions', icon: BookOpen, path: '/clinical/sessions' },
  { label: 'Attendance', icon: UserCheck, path: '/clinical/attendance' },
  { label: 'Clinical Reports', icon: FileText, path: '/clinical/reports' },
];

const ADMIN_USERS_NAV_CHILDREN: SidebarChild[] = [
  { label: 'Students', icon: Users, path: '/admin-students' },
  { label: 'Lecturers', icon: GraduationCap, path: '/admin-lecturers' },
  { label: 'System accounts', icon: UserCog, path: '/admin-users' },
  { label: 'Roles & Permissions', icon: KeyRound, path: '/admin-roles' },
  { label: 'Audit log', icon: FileText, path: '/admin-audit-log' },
];

const HR_MODULE_NAV_CHILDREN: SidebarChild[] = [
  { label: 'HR Dashboard', icon: LayoutDashboard, path: '/hr/dashboard' },
  { label: 'Employees', icon: Users, path: '/hr/employees' },
  { label: 'Leave', icon: CalendarX, path: '/hr/leave' },
  { label: 'Staff Attendance', icon: Clock, path: '/hr/attendance' },
  { label: 'Onboarding', icon: UserPlus, path: '/hr/onboarding' },
  { label: 'HR Documents', icon: FileText, path: '/hr/documents' },
  { label: 'Performance Appraisal', icon: ClipboardList, path: '/hr/appraisals' },
  { label: 'HR Reports', icon: BarChart, path: '/hr/reports' },
];

const HR_ROLE_NAV_CHILDREN: SidebarChild[] = [
  ...HR_MODULE_NAV_CHILDREN,
  { label: 'Settings', icon: Settings, path: '/admin-settings' },
];

const FLAT_NAV_CANDIDATES: Array<{ label: string; path: string; icon: LucideIcon }> = [
  { label: 'Timetable', path: '/timetable', icon: Calendar },
  { label: 'Timetable Builder', path: '/timetable-builder', icon: Calendar },
  { label: 'Lecture Records', path: '/lecture-records', icon: BookOpen },
  { label: 'Cancellations', path: '/cancellations', icon: CalendarX },
  { label: 'Student Records', path: '/student-records', icon: Users },
  { label: 'Curriculum', path: '/curriculum-management', icon: ClipboardList },
  { label: 'Mark Presence', path: '/presence', icon: MapPin },
  { label: 'Course Attendance', path: '/lecturer-course-attendance', icon: UserCheck },
  { label: 'Performance', path: '/lecturer-performance', icon: BarChart },
  { label: 'My Appraisal', path: '/staff-appraisal', icon: ClipboardList },
  { label: 'My Classes', path: '/student-classes', icon: BookOpen },
  { label: 'Attendance History', path: '/student-history', icon: Clock },
  { label: 'University Overview', path: '/management-overview', icon: BarChart },
  { label: 'Department Stats', path: '/management-departments', icon: School },
  { label: 'Staff Performance', path: '/management-staff-performance', icon: Users },
  { label: 'Lecturer Performance', path: '/management-lecturer-performance', icon: UserCheck },
  { label: 'Student Performance', path: '/management-student-performance', icon: GraduationCap },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Courses', path: '/admin-courses', icon: BookOpen },
  { label: 'Classes', path: '/admin-classes', icon: School },
  { label: 'Timetables', path: '/admin-timetables', icon: Calendar },
  { label: 'Schools', path: '/admin-schools', icon: Building },
  { label: 'Venues', path: '/admin-venues', icon: MapPin },
  { label: 'Calendar', path: '/admin-calendar', icon: Calendar },
  { label: 'Strategic Goals', path: '/admin-strategic-goals', icon: TrendingUp },
  { label: 'Settings', path: '/admin-settings', icon: Settings },
];

function isPathUnderHrSection(pathname: string): boolean {
  return HR_MODULE_NAV_CHILDREN.some((p) => pathname === p.path || pathname.startsWith(`${p.path}/`));
}

function buildNavFromPermissions(userPermissions: string[], role: string): SidebarItem[] {
  const allow = (path: string) => navAllowed(userPermissions, path, role);

  if (role === 'HR') {
    return HR_ROLE_NAV_CHILDREN.filter((entry) => allow(entry.path)).map((entry) => ({
      type: 'single' as const,
      label: entry.label,
      icon: entry.icon,
      path: entry.path,
    }));
  }

  const items: SidebarItem[] = [
    { type: 'single', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  ];

  const clinicalChildren = ADMIN_CLINICAL_NAV_CHILDREN.filter((c) => allow(c.path));
  const nestClinicalNav = shouldNestClinicalNavItems(role);
  if (clinicalChildren.length > 0) {
    if (nestClinicalNav && clinicalChildren.length > 1) {
      items.push({
        type: 'folder',
        id: 'clinicals',
        label: 'Clinicals',
        icon: Briefcase,
        children: clinicalChildren,
      });
    } else {
      for (const child of clinicalChildren) {
        items.push({ type: 'single', label: child.label, icon: child.icon, path: child.path });
      }
    }
  }

  const hrModuleChildren = HR_MODULE_NAV_CHILDREN.filter((c) => allow(c.path));
  const nestHrNav = shouldNestHrNavItems(role);
  if (hrModuleChildren.length > 0) {
    if (nestHrNav && hrModuleChildren.length > 1) {
      items.push({
        type: 'folder',
        id: 'human-resources',
        label: 'Human Resources',
        icon: UsersRound,
        children: hrModuleChildren,
      });
    } else {
      for (const child of hrModuleChildren) {
        items.push({ type: 'single', label: child.label, icon: child.icon, path: child.path });
      }
    }
  }

  for (const entry of FLAT_NAV_CANDIDATES) {
    if (allow(entry.path)) {
      items.push({ type: 'single', label: entry.label, path: entry.path, icon: entry.icon });
    }
  }

  const adminUserChildren = ADMIN_USERS_NAV_CHILDREN.filter((c) => allow(c.path));
  if (adminUserChildren.length === 1) {
    const only = adminUserChildren[0];
    items.push({ type: 'single', label: only.label, icon: only.icon, path: only.path });
  } else if (adminUserChildren.length > 1) {
    items.push({
      type: 'folder',
      id: 'users',
      label: 'Users',
      icon: Users,
      children: adminUserChildren,
    });
  }

  return items;
}

function navItemMatches(path: string, pathname: string, search: string): boolean {
  const target = navTarget(path);
  if (pathname !== target.pathname && !pathname.startsWith(`${target.pathname}/`)) return false;
  if (!target.search) return true;
  return search === target.search;
}

function getHeaderTitle(pathname: string, search: string, items: SidebarItem[]): string {
  for (const item of items) {
    if (item.type === 'single') {
      if (navItemMatches(item.path, pathname, search)) {
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
  const [openNavFolders, setOpenNavFolders] = useState<Record<string, boolean>>(() => ({
    users: isPathUnderAdminUsersSection(location.pathname),
    clinicals: isPathUnderAdminClinicalSection(location.pathname),
    'human-resources': isPathUnderHrSection(location.pathname),
  }));

  const setNavFolderOpen = (id: string, open: boolean) => {
    setOpenNavFolders(prev => ({ ...prev, [id]: open }));
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    if (isPathUnderAdminUsersSection(location.pathname)) {
      setNavFolderOpen('users', true);
    }
    if (isPathUnderAdminClinicalSection(location.pathname)) {
      setNavFolderOpen('clinicals', true);
    }
    if (isPathUnderHrSection(location.pathname)) {
      setNavFolderOpen('human-resources', true);
    }
  }, [location.pathname]);

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

  const userPermissions = user?.permissions || [];
  const filteredNavItems = buildNavFromPermissions(userPermissions, role);
  const displayName = user?.name?.trim() || user?.email || 'User';
  const avatarInitial = (displayName.charAt(0) || 'U').toUpperCase();
  const headerPageTitle = getHeaderTitle(location.pathname, location.search, filteredNavItems);

  const renderNavLinks = (onNavigate?: () => void) =>
    filteredNavItems.map(item => {
      if (item.type === 'single') {
        const isActive = navItemMatches(item.path, location.pathname, location.search);
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
      const folderOpen = openNavFolders[item.id] ?? false;
      return (
        <li key={item.id}>
          <Collapsible open={folderOpen} onOpenChange={open => setNavFolderOpen(item.id, open)}>
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
                className={`h-4 w-4 shrink-0 transition-transform ${folderOpen ? 'rotate-180' : ''}`}
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
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
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
