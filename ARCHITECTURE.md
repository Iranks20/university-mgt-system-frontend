# KCU Management System - Architecture Documentation

## Overview
This is a scalable university management system starting with Quality Assurance (QA) functionality, designed to grow into a comprehensive university management platform.

## Project Structure

```
src/
├── components/          # Shared UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── AppShell.tsx    # Main application shell/layout
│   ├── ProtectedRoute.tsx  # Route protection wrapper
│   └── RoleProvider.tsx    # Role-based access control
│
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
│
├── features/           # Feature-based modules (Domain-Driven Design)
│   └── qa/            # Quality Assurance feature module
│       ├── components/    # QA-specific components
│       │   ├── QAAttendanceForm.tsx
│       │   └── QAAttendanceTable.tsx
│       └── index.ts       # Feature exports
│
├── screens/            # Page-level components (organized by domain)
│   ├── qa/            # QA screens (to be organized)
│   ├── admin/         # Admin screens
│   ├── student/       # Student screens
│   ├── lecturer/      # Lecturer screens
│   └── management/    # Management screens
│
├── services/          # Business logic & data access layer
│   ├── qa.service.ts      # QA domain service
│   ├── student.service.ts # Student domain service
│   ├── staff.service.ts   # Staff domain service
│   ├── academic.service.ts # Academic domain service
│   └── report.service.ts  # Report generation service
│
├── types/             # TypeScript type definitions
│   ├── index.ts       # Core types
│   └── qa.ts         # QA-specific types
│
├── utils/            # Utility functions
│   ├── excel.ts       # Excel import/export utilities
│   └── fonts.ts      # Font utilities
│
├── hooks/             # Custom React hooks
│
├── lib/               # Library utilities
│
└── App.tsx            # Main application component with routing
```

## Domain Organization

### Quality Assurance (QA) Domain
- **Purpose**: Track lecturer attendance and teaching quality
- **Key Features**:
  - Record lecturer attendance
  - Generate QA reports matching Excel template format
  - Export reports to Excel maintaining template structure
  - Track attendance statistics by lecturer, department, school

### HR Organisation Structure
- **Screen**: `src/screens/hr/pages/HrOrganisationPage.tsx` (`/hr/organisation`), with dialogs in `src/components/hr/organisation/`
- **Service**: `src/services/organization.service.ts` (API `/hr/organization/*`)
- **Model**: one tree of offices, directorates, units, posts and schools. Staff have one home (academic department or office); leadership (Dean, Deputy Dean, office heads, acting roles) is an appointment on top. Heads of department are set per academic department.
- **Data**: the chart lives only in the database; there is no bundled organogram or bulk staff import. HR edits units and head titles here and adds staff one at a time in Employees.
- **Employee form**: `StaffFormDialog` has four sections: personal details, employment (staff number, date joined, category, job title, academic rank, PhD), placement and reporting ("Works in" an academic department or an office/unit, optional supervisor override), and system access. Supervisors default to the organisation chain. The staff number stays editable after creation so placeholder numbers can be replaced.
- **Single entry point**: HR › Employees is the only place staff (including lecturers) are added or removed, and where their employment details are edited. The Admin Lecturers tab (`/admin-lecturers`) lists every Academic-category staff member (`GET /staff?category=Academic`) and lets Admin do two things: assign courses (each class is one course taught to one intake) and change an existing login's email or password (`src/components/admin/LecturerLoginDialog.tsx`, `PATCH /admin/lecturers/:staffId/login`). Lecturers with no login are left to HR. Class lecturer pickers also list all Academic staff, not just the "Lecturer" job title.

### Staff Attendance (timekeeper)
- **Who records**: a Timekeeper (system role `Timekeeper`, created in HR › Employees) checks every employee in and out. There is no gate selection. Academic lecture attendance stays with QA and the lecturer self check-in on `/presence`.
- **Attendance Desk**: `src/screens/attendance-desk/AttendanceDeskPage.tsx` (`/attendance-desk`). Search by name or staff number, or scan the badge QR code with the camera (`src/components/attendance/BadgeScannerDialog.tsx`, `qr-scanner`). A handheld USB scanner works too: it types the `KCU1.` code into the search box and presses Enter. After picking a person there is one button: Check in if they are off campus, Check out if they are on campus. Entries must alternate (the API refuses a second check-in or a check-out without a check-in); on that error the desk reloads the staff list. Recent entries on the desk are limited to 8; the latest entry for a person can be undone for 5 minutes.
- **My Entries**: `src/screens/attendance-desk/DeskEntriesPage.tsx` (`/attendance-entries`, in the timekeeper sidebar) is a paged table with one row per visit: check-in time, check-out time (blank until they leave), time on campus and a status (On campus, Checked out, Not checked out after 16 hours, No check-in). Filters: date range, status and name.
- **Offline**: `src/lib/attendance-desk.ts` keeps the staff list and unsent entries in `localStorage` per timekeeper. Entries made without a connection keep the device time and sync automatically (every 30 seconds and when the browser comes back online). This works while the desk page stays open; there is no service worker.
- **Camera**: browsers only allow the camera on HTTPS (or `localhost`). On plain HTTP use search or a USB scanner.
- **HR view**: `src/screens/hr/pages/HrAttendancePage.tsx` (`/hr/attendance`) has tabs for the daily register, who is on campus now, the monthly summary (with a per-employee timesheet) and exceptions (missing check-out or check-in, with a Fix action). Clicking a row opens the day's entries, where HR adds a correction or voids an entry; both need a reason. Dialogs live in `src/components/hr/attendance/`.
- **Badges**: `src/lib/staff-badge-print.ts` prints one ID-card-size badge with a QR code for one employee, from the HR Employees row menu or the day-entries drawer on `/hr/attendance`.
- **Paging**: every table on `/hr/attendance` is paged by the server.
- **Service**: `src/services/staff-attendance.service.ts` (API `/staff-attendance/*`).

### Future Domains (Planned)
- **Student Management**: Student records, enrollment, attendance
- **Academic Management**: Courses, classes, timetables
- **Staff Management**: Staff records, performance tracking
- **Administrative**: System settings, user management

## Key Architectural Principles

### 1. Domain-Driven Design (DDD)
- Code organized by business domain (QA, Students, Staff, etc.)
- Each domain has its own types, services, and components
- Clear separation of concerns

### 2. Service Layer Pattern
- All data operations go through service layer
- Services are domain-specific (qa.service.ts, student.service.ts)
- Easy to replace mock data with API calls later

### 3. Feature-Based Components
- Components organized by feature/domain
- Reusable components in `components/ui/`
- Domain-specific components in `features/{domain}/components/`

### 4. Type Safety
- Comprehensive TypeScript types
- Domain-specific types in `types/{domain}.ts`
- Shared types in `types/index.ts`

## Data Flow

```
User Action → Component → Service → (Mock Data / API) → Service → Component → UI Update
```

### Paged tables
Long lists are paged by the server: the page sends `page` and `limit` and the API answers `{ data, total, page, pageSize, totalPages }` (`Paged<T>` in `src/lib/pagination.ts`). The `api` client keeps that envelope intact. Use `usePaging(resetKey)` (`src/hooks/usePaging.ts`) for page state; it goes back to page 1 whenever the filter key changes. Render `TablePagination` (`src/components/ui/table-pagination.tsx`) under the table, and debounce search boxes with `useDebounced`. Paged so far: HR attendance (all tabs), Onboarding, Documents, the Appraisals review queue and All Reviews, HR Employees, and the timekeeper's My Entries.

## Excel Integration

### QA Attendance Records
- **Import**: Supports importing QA records from Excel
- **Export**: Exports reports matching the QA Attendance Record template
- **Format**: Maintains exact template structure for consistency

### Export Features
- Monthly QA reports with summary and detailed records
- Column formatting matching Excel template
- Automatic filename generation

## Authentication & Authorization

### Roles
- **QA**: Quality Assurance staff
- **Lecturer**: Teaching staff
- **Student**: Students
- **Staff**: Administrative staff
- **Management**: Management/executive staff
- **HR**: Human resources
- **Timekeeper**: Records staff check-in and check-out at the attendance desk
- **Admin**: System administrators

The account type (`User.role`) is only a base label. What someone can open comes from **permissions**, built by the API from that base type, extra custom roles, and organisation-chart posts (see the backend README).

### Route and menu protection
- Routes use `requiredPermissions` / `requiredPermissionSets` on `ProtectedRoute` (no `allowedRoles`). Graduation uses `GraduationProtectedRoute`.
- `homePathForUser`, `routeAllowed` and `navAllowed` (`nav-permissions.ts`) decide landing page, routes and menu items from permissions only.
- The sidebar (`AppShell`) is built with `buildNavFromPermissions`: ICT (`admin.console`) and university oversight (`analytics.mgmt_overview`) get organised folders; everyone else gets the same permission-filtered general menu (including Attendance Desk, HR, Graduation, Clinicals when allowed). Extra modules from posts appear under **Additional access**.
- In screens use `usePermissions().can(...)`. Do not gate menus or pages on account-type names.

### Passwords and account security
- When the API answers `403 PASSWORD_CHANGE_REQUIRED`, `src/lib/api.ts` fires `PASSWORD_CHANGE_REQUIRED_EVENT` (`src/lib/auth-events.ts`) and `ProtectedRoute` shows `ForcedPasswordChange` until a new password is set. `applySession` stores the fresh token returned by `/auth/change-password`.
- Password rules for forms come from `src/lib/password-policy.ts`, matching the API.
- Generated temporary passwords (new users, resets, student import, HR new employee) are shown once in `TemporaryCredentialsDialog`, with copy or CSV download.
- Login explains lockout (`ACCOUNT_LOCKED`) and deactivated accounts. "Forgot password?" tells the user to contact HR or ICT until email reset exists.

### Access administration
- People are created in **HR › Employees** and placed on **Organisation Structure**. Account type is Staff, Lecturer or Timekeeper only; QA and office menus come from the post (for example Quality Assurance).
- `/admin-lecturers`: academic staff. `/admin-administration`: non-teaching staff (Administrative, Support, Clinical), with login email/password update.
- `/admin-users` (*Account security*): unlock, reset and review access for existing logins — not for creating day-to-day users.
- `/admin-roles` › *Position access* (`PositionAccessPanel`): which access profile the head and the members of each organisation unit receive. Custom roles show their data scope (whole university or own unit).

## Adding New Features

### Step 1: Define Types
Create `src/types/{domain}.ts` with domain-specific types

### Step 2: Create Service
Create `src/services/{domain}.service.ts` with business logic

### Step 3: Create Components
Create `src/features/{domain}/components/` for domain-specific components

### Step 4: Create Screens
Create `src/screens/{domain}/` for page-level components

### Step 5: Add Routes
Update `src/App.tsx` with new routes

## Development Guidelines

1. **Always use TypeScript types** - No `any` types
2. **Follow domain organization** - Keep related code together
3. **Use service layer** - Don't access data directly in components
4. **Maintain Excel compatibility** - When exporting, match existing templates
5. **Write reusable components** - Use `components/ui/` for base components
6. **Document complex logic** - Add comments for business rules

## Future Enhancements

- [ ] API integration layer
- [ ] Database schema design
- [ ] Real-time updates
- [ ] Advanced reporting
- [ ] Mobile responsive improvements
- [ ] Student management Excel integration
- [ ] Multi-tenant support
- [ ] Audit logging

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Charts**: Recharts
- **Excel**: xlsx library
- **Build Tool**: Vite
- **Package Manager**: npm
