import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu, X, LayoutDashboard, BookOpen, Users, FileText,   Calendar, CalendarX,
  MapPin, BarChart, Settings, School, Building,
  Clock, UserCheck, Shield, LogOut, GraduationCap, Bell, KeyRound, UserCog, TrendingUp, Briefcase
} from 'lucide-react';
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

function roleLabel(r: string): string {
  if (r === 'QA') return 'QA Officer';
  if (r === 'Staff') return 'Non-Teaching Staff';
  return r;
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

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

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

  const getNavItems = (currentRole: UserRole) => {
    // Ensure we have a valid role
    if (!currentRole || !['QA', 'Lecturer', 'Student', 'Staff', 'Management', 'Admin'].includes(currentRole)) {
      console.warn('Invalid role detected:', currentRole);
      return [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { label: 'Mark Presence', icon: MapPin, path: '/presence' },
        { label: 'Reports', icon: FileText, path: '/reports' },
      ];
    }

    switch (currentRole) {
      case 'QA':
        return [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { label: 'Timetable', icon: Calendar, path: '/timetable' },
          { label: 'Lecture Records', icon: BookOpen, path: '/lecture-records' },
          { label: 'Cancellations', icon: CalendarX, path: '/cancellations' },
          { label: 'Student Records', icon: Users, path: '/student-records' },
          { label: 'Reports', icon: FileText, path: '/reports' },
        ];
      case 'Lecturer':
        return [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { label: 'My Timetable', icon: Calendar, path: '/timetable' },
          { label: 'Cancellations', icon: CalendarX, path: '/cancellations' },
          { label: 'Mark Presence', icon: MapPin, path: '/presence' },
          { label: 'Course Attendance', icon: UserCheck, path: '/lecturer-course-attendance' },
          { label: 'Performance', icon: BarChart, path: '/lecturer-performance' },
        ];
      case 'Student':
        return [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { label: 'My Classes', icon: BookOpen, path: '/student-classes' },
          { label: 'Mark Presence', icon: MapPin, path: '/presence' },
          { label: 'Attendance History', icon: Clock, path: '/student-history' },
        ];
      case 'Staff':
        return [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { label: 'Mark Presence', icon: MapPin, path: '/presence' },
          { label: 'Attendance History', icon: Clock, path: '/student-history' },
        ];
      case 'Management':
        return [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { label: 'University Overview', icon: BarChart, path: '/management-overview' },
          { label: 'Department Stats', icon: School, path: '/management-departments' },
          { label: 'Staff Performance', icon: Users, path: '/management-staff-performance' },
          { label: 'Lecturer Performance', icon: UserCheck, path: '/management-lecturer-performance' },
          { label: 'Student Performance', icon: GraduationCap, path: '/management-student-performance' },
          { label: 'Cancellations', icon: CalendarX, path: '/cancellations' },
          { label: 'Reports', icon: FileText, path: '/reports' },
        ];
      case 'Admin':
        return [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { label: 'Students', icon: Users, path: '/admin-students' },
          { label: 'Non Teaching Staff', icon: Briefcase, path: '/admin-staff' },
          { label: 'Lecturers', icon: GraduationCap, path: '/admin-lecturers' },
          { label: 'Users', icon: UserCog, path: '/admin-users' },
          { label: 'Courses', icon: BookOpen, path: '/admin-courses' },
          { label: 'Classes', icon: School, path: '/admin-classes' },
          { label: 'Timetables', icon: Calendar, path: '/admin-timetables' },
          { label: 'Schools', icon: Building, path: '/admin-schools' },
          { label: 'Venues', icon: MapPin, path: '/admin-venues' },
          { label: 'Calendar', icon: Calendar, path: '/admin-calendar' },
          { label: 'Strategic Goals', icon: TrendingUp, path: '/admin-strategic-goals' },
          { label: 'Cancellations', icon: CalendarX, path: '/cancellations' },
          { label: 'Settings', icon: Settings, path: '/admin-settings' },
        ];
      default:
        return [
          { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
          { label: 'Mark Presence', icon: MapPin, path: '/presence' },
          { label: 'Reports', icon: FileText, path: '/reports' },
        ];
    }
  };

  const navItems = getNavItems(role);
  const displayName = user?.name?.trim() || user?.email || 'User';
  const avatarInitial = (displayName.charAt(0) || 'U').toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-bold text-lg leading-tight text-primary">KCU QA System</h1>
            <p className="text-xs text-gray-500">Quality Assurance</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
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
            })}
          </ul>
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
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg text-primary">KCU System</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-500">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md ${
                      isActive 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
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
            <h2 className="text-xl font-semibold text-gray-800 hidden sm:block">
              {navItems.find(i => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))?.label || 'Dashboard'}
            </h2>
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
