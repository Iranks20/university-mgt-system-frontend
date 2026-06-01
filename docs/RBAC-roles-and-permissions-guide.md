# Roles & Permissions Guide (for QA and administrators)

This guide explains how access works in KCU Management System and how to configure it on **Roles & Permissions** (`/admin-roles`). Give this document to QA staff who assign access to lecturers, clinical staff, and other users.

## How access works (simple)

1. Every user has a **system role** on their account (e.g. `QA`, `Lecturer`, `Student`) set under **Users → System accounts**.
2. Each user is also linked to a **role definition** on `/admin-roles` with the **same code** (e.g. role `QA`). That role holds the **permission checkboxes**.
3. After login, the **sidebar** and **pages** show only what those permissions allow.
4. After you change permissions, the user must **sign out and sign in again** to refresh the menu.

**Important:** The sidebar is driven only by permissions—not by hard-coded role names. If a menu item is missing, add the permission listed below to that user’s role on `/admin-roles`.

---

## Built-in system roles (default templates)

Use **Sync system roles** on `/admin-roles` to reset these to the standard matrix after a mistake.

| Role code | Who it is for | University QA scope | Clinical scope |
|-----------|---------------|---------------------|----------------|
| **Admin** | IT / full administrators | Full access including user admin | Full clinical access |
| **Management** | Deans, registry leadership | Overview, reports, read-mostly academic data | Clinical read/coordination (no student write) |
| **QA** | University quality assurance | Lecture records, timetables, cancellations queue, student records (read), reports | **No** `clinical.*` permissions |
| **QAClinicals** | Hospital / clinical QA | Read students & academic catalog only | Record sessions, instructors, rotations, clinical reports |
| **ClinicalCoordinator** | Clinical placement coordinator | Read students & academic catalog | Sites, assignments, policies, verify sessions, reports |
| **Lecturer** | Teaching staff | Own timetable, presence, course attendance, cancellations (own), substitutions (own) | None |
| **Staff** | Non-teaching staff | Time clock & own record only | None |
| **Student** | Students | Own classes, timetable, attendance history | None |

### Rules QA must not break

- **University QA (`QA`)** must **not** receive any permission starting with `clinical.` (clinical menus are for QA Clinicals / Clinical Coordinator).
- **QA Clinicals (`QAClinicals`)** should **not** receive university QA tools such as `qa.review`, `lecture-records` menu, or `reports.access` unless you intentionally want overlap.
- Only users with **`admin.console`** should manage **Users**, **Roles & Permissions**, and **Audit log**.

---

## Permission groups (tabs on `/admin-roles`)

Permissions are grouped for easier editing. Groups are labels only; what matters is each **permission code**.

| Group | What it controls |
|-------|------------------|
| **Admin** | User administration, roles page, strategic goals |
| **Academics** | Schools, courses, classes, venues, program intakes, curriculum read |
| **Students** | Student directory, self-service, attendance (staff vs self) |
| **Staff** | Staff directory, lecturer profile, time clock |
| **Enrollment** | Class rosters, enrollments, class read for QA |
| **Timetable** | Timetable views, builder, ops, lecturer/student personal views |
| **Quality Assurance** | Lecture records, QA review/write/import, lecturer portal |
| **Clinical Rotations** | Sites, rotations, sessions, attendance, clinical reports |
| **Analytics** | Dashboards, management overview, lecturer/mgmt analytics |
| **Reports** | Reports module |
| **Cancellations** | Session cancellation requests |
| **Substitutions** | Substitute lecturer requests (same page as cancellations) |
| **Settings** | System settings, performance thresholds |
| **Notifications** | In-app notifications for self |

---

## Permission codes (reference)

Format: `area.action` (e.g. `qa.review`).

### Admin

| Code | Meaning |
|------|---------|
| `admin.console` | Users folder (students, lecturers, accounts, roles, audit log) |

### Academics

| Code | Meaning |
|------|---------|
| `academic.read` | View academic structure, curriculum, catalog |
| `academic.mgmt_read` | Management views of departments/programmes |
| `academic.write` | Create/edit schools, courses, **classes**, calendar |
| `academic.venues` | Manage venues |
| `academic.program_intakes` | Program intakes (cohorts) |
| `academic.personal_schedule` | Personal timetable / schedule views |

### Students

| Code | Meaning |
|------|---------|
| `students.read` | Student records (QA/management) |
| `students.write` | Create/edit students |
| `students.self` | Student sees own profile |
| `students.attendance_staff` | Mark or review attendance as staff |
| `students.attendance_self` | Student marks own attendance |

### Staff

| Code | Meaning |
|------|---------|
| `staff.read` | View staff/lecturer lists |
| `staff.write` | Edit staff records |
| `staff.timeclock` | Staff check-in / attendance history |
| `staff.lecturer_me` | Lecturer’s own staff profile |
| `staff.record_read` | View own staff record (non-teaching) |

### Enrollment

| Code | Meaning |
|------|---------|
| `enrollment.read` | View enrollments |
| `enrollment.write` | Change enrollments |
| `enrollment.self` | Student enrollment self-service |
| `enrollment.class_read` | Class roster for lecture/attendance flows |
| `enrollment.preview` | Preview enrollment impact |

### Timetable

| Code | Meaning |
|------|---------|
| `timetable.admin` | Full timetable administration |
| `timetable.ops` | Operations timetable (QA/admin timetables page) |
| `timetable.lecturer_me` | Lecturer’s own timetable |
| `timetable.student_me` | Student timetable |
| `timetable.student_view` | Student timetable view variant |

### Quality Assurance (university)

| Code | Meaning |
|------|---------|
| `qa.review` | **Lecture Records** and QA review workflows |
| `qa.write` | Edit QA records |
| `qa.import` | Import QA/timetable data |
| `qa.lecturer_portal` | Lecturer-facing QA/timetable portal actions |
| `qa.seed_timetable` | Timetable builder seeding |

### Clinical (rotations)

| Code | Meaning |
|------|---------|
| `clinical.sites.manage` | Clinical sites |
| `clinical.assignments.manage` | Site team assignments |
| `clinical.instructors.manage` | Clinical instructors directory |
| `clinical.rotations.manage` | Rotation groups |
| `clinical.policies.manage` | Program eligibility policies |
| `clinical.sessions.record` | Record clinical sessions / attendance |
| `clinical.sessions.verify` | Verify/coordinate sessions |
| `clinical.reports.view` | Clinical reports |

### Cancellations & substitutions

| Code | Meaning |
|------|---------|
| `cancellations.lecturer` | Submit own cancellation requests |
| `cancellations.queue` | View cancellation queue |
| `cancellations.decide` | Approve/reject cancellations |
| `substitutions.lecturer` | Submit substitute lecturer requests |
| `substitutions.queue` | View substitution queue |
| `substitutions.decide` | Approve/reject substitutions |

### Analytics & reports

| Code | Meaning |
|------|---------|
| `analytics.core_dashboard` | Main dashboard tiles |
| `analytics.ops` | Operations analytics |
| `analytics.mgmt_overview` | University overview (management) |
| `analytics.lecturer_shared` | Shared lecturer analytics |
| `analytics.lecturer_private` | Lecturer private performance page |
| `reports.access` | Reports module |

### Settings & notifications

| Code | Meaning |
|------|---------|
| `settings.read` | System settings |
| `notifications.self` | User notifications |

---

## Sidebar menu → required permissions

A menu item appears if the user has **any one** of the listed permission sets (comma-separated codes in a set mean **all** of that set; multiple sets mean **OR**).

| Menu item | Path | Needs one of |
|-----------|------|----------------|
| Dashboard | `/dashboard` | (always shown) |
| Timetable | `/timetable` | `timetable.student_me` **OR** `academic.personal_schedule` + `qa.lecturer_portal` **OR** `timetable.ops` |
| Timetable Builder | `/timetable-builder` | `academic.write` **OR** `timetable.ops` **OR** `qa.seed_timetable` |
| Lecture Records | `/lecture-records` | `qa.review` |
| Cancellations | `/cancellations` | Lecturer cancel **OR** queue **OR** queue+decide **OR** substitution equivalents |
| Student Records | `/student-records` | `students.read` + `academic.read` |
| Curriculum | `/curriculum-management` | `academic.read` |
| Mark Presence | `/presence` | Lecturer portal **OR** student self attendance **OR** `staff.timeclock` |
| Course Attendance | `/lecturer-course-attendance` | Lecturer schedule+roster **OR** `qa.review` + `students.attendance_staff` |
| Performance (lecturer) | `/lecturer-performance` | `analytics.lecturer_private` + `staff.lecturer_me` |
| My Classes | `/student-classes` | `students.self` + `enrollment.self` + `settings.read` + `students.attendance_self` |
| Attendance History | `/student-history` | Student self **OR** `staff.timeclock` |
| University Overview | `/management-overview` | `analytics.mgmt_overview` |
| Department Stats | `/management-departments` | `academic.read` + `academic.mgmt_read` |
| Staff Performance | `/management-staff-performance` | `staff.read` + `reports.access` |
| Lecturer Performance | `/management-lecturer-performance` | mgmt read combo **OR** analytics+reports **OR** `qa.review` + `analytics.ops` |
| Student Performance | `/management-student-performance` | `students.read` + `analytics.ops` **OR** `students.read` + mgmt overview **OR** mgmt overview + `reports.access` |
| Reports | `/reports` | `reports.access` **OR** `qa.review` **OR** `analytics.*` / `academic.read` / `timetable.ops` (see app config) |
| Courses / Classes / Schools / Calendar | `/admin-*` | `academic.write` (classes, courses, schools, calendar) |
| Timetables (admin) | `/admin-timetables` | `timetable.admin` **OR** `admin.console` |
| Timetable (view) | `/timetable` | `timetable.ops` (and other OR sets) |
| Venues | `/admin-venues` | `academic.venues` |
| Settings | `/admin-settings` | `settings.read` |
| Strategic Goals | `/admin-strategic-goals` | `admin.console` |
| **Users** folder | | |
| → Students | `/admin-students` | `admin.console` |
| → Lecturers | `/admin-lecturers` | `admin.console` |
| → System accounts | `/admin-users` | `admin.console` |
| → Roles & Permissions | `/admin-roles` | `admin.console` |
| → Audit log | `/admin-audit-log` | `admin.console` |
| **Clinicals** folder | | |
| → Clinical Sites | `/clinical/sites` | `clinical.sites.manage` **OR** `clinical.reports.view` |
| → Site Team | `/clinical/site-team` | `clinical.assignments.manage` |
| → Instructors | `/clinical/instructors` | `clinical.instructors.manage` **OR** session record/verify |
| → Rotations | `/clinical/rotations` | `clinical.rotations.manage` **OR** session record/verify |
| → Eligibility Policies | `/clinical/policies` | policies / sites / rotations manage |
| → Sessions | `/clinical/sessions` | `clinical.sessions.record` **OR** `clinical.sessions.verify` |
| → Attendance | `/clinical/attendance` | `clinical.sessions.record` |
| → Clinical Reports | `/clinical/reports` | `clinical.reports.view` |

---

## Step-by-step: assign access to a user

1. Sign in as **Admin** (or a user with `admin.console`).
2. Open **Users → System accounts** (`/admin-users`). Confirm the user’s **Role** column (e.g. `Lecturer`, `QA`, `QAClinicals`).
3. Open **Users → Roles & Permissions** (`/admin-roles`).
4. Find the role with the **same code** as the user’s system role (e.g. `Lecturer`). Click **Permissions**.
5. Check the permissions from the tables above. Use **Permission groups** to expand related codes.
6. Click **Save**.
7. Ask the user to **sign out and sign in again**.
8. Verify the sidebar matches expectation (use the menu table above).

### Custom roles (optional)

You may create a **custom role** (e.g. `SeniorQA`) and assign it to users via **System accounts** instead of a built-in role. Custom roles do not change the user’s `Role` column unless you also update it—prefer one built-in role per user type for clarity.

---

## Recommended permission sets (copy checklist)

### University QA officer (`QA`)

- `qa.review`, `qa.write`, `qa.import`, `qa.seed_timetable`
- `enrollment.class_read`, `students.read`, `academic.read`
- `timetable.ops`, `cancellations.queue`, `cancellations.decide`
- `substitutions.queue`, `substitutions.decide`
- `analytics.core_dashboard`, `settings.read`, `notifications.self`
- **Do not assign:** any `clinical.*`, `admin.console`, `academic.write`, `academic.mgmt_read`, `staff.read`, `staff.timeclock`, `staff.lecturer_me`, `students.attendance_staff`, `analytics.ops`, `analytics.lecturer_private`, `reports.access`
- **Reports menu** uses `qa.review` (not `reports.access`). Route guards match sidebar rules in `nav-permissions.ts`.

### QA Clinicals (`QAClinicals`)

- `clinical.sessions.record`, `clinical.instructors.manage`, `clinical.rotations.manage`, `clinical.reports.view`
- `students.read`, `academic.read`, `settings.read`, `notifications.self`
- **Do not assign:** `qa.review`, `lecture-records` path access, `admin.console`

### Clinical Coordinator (`ClinicalCoordinator`)

- `clinical.sites.manage`, `clinical.assignments.manage`, `clinical.rotations.manage`, `clinical.policies.manage`
- `clinical.sessions.verify`, `clinical.reports.view`
- `students.read`, `academic.read`, `settings.read`, `notifications.self`

### Lecturer (`Lecturer`)

- `academic.read`, `academic.personal_schedule`, `academic.venues`
- `staff.lecturer_me`, `enrollment.class_read`, `students.attendance_staff`
- `timetable.lecturer_me`, `qa.lecturer_portal`
- `cancellations.lecturer`, `substitutions.lecturer`
- `analytics.lecturer_shared`, `analytics.lecturer_private`, `analytics.core_dashboard`
- `settings.read`, `notifications.self`

### Student (`Student`)

- `students.self`, `students.attendance_self`, `enrollment.self`
- `academic.read`, `academic.personal_schedule`
- `timetable.student_me`, `timetable.student_view`
- `analytics.core_dashboard`, `settings.read`, `notifications.self`

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Menu item missing | Role on `/admin-roles` lacks permission from menu table; user did not re-login |
| Page opens but menu hidden | Route may allow access with a different permission set—align role with table |
| User sees clinical menus | Remove all `clinical.*` from university QA roles |
| QA cannot open Lecture Records | Ensure `qa.review` is checked |
| Permissions look wrong after edit | Click **Sync system roles** (built-in roles only) or re-save role |
| Changes have no effect | User must sign out/in; confirm correct role code on system account |

---

## Technical note (developers)

- Permission matrix source: `kcu-mgt-backend/src/lib/rbac-role-permissions.ts`
- Sidebar rules: `kcu-mgt-frontend/src/lib/nav-permissions.ts`
- Sync command: `npm run db:sync-rbac` (backend)

Last updated: May 2026
