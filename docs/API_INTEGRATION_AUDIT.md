# Frontend API Integration Audit

This document lists areas in **kcu-mgt-frontend** that still use mock data, hardcoded values, or are not integrated with backend APIs, so they can be implemented for a fully functional frontend.

**Last audit:** 2025-02-15

---

## 1. Hardcoded / mock data

### 1.1 Reports – Lecturers tab school filter

- **File:** `src/screens/Reports.tsx`
- **Issue:** The "Filter School" dropdown in the Lecturers tab uses hardcoded options: `All Schools`, `Computing`, `Business`.
- **Required change:** Populate school options from API or from existing data (e.g. `schoolPerformance` from `getSchoolSummaryReport()` or unique schools from `lecturerTableData`).
- **Status:** Can be fixed in-app by deriving options from already-loaded data (no new API needed).

---

### 1.2 Dashboard – Lecturer “Today’s schedule” empty state

- **File:** `src/screens/Dashboard.tsx`
- **Issue:** When there are no classes today, the UI shows a single fallback row: `"No classes today"` with time `08:00 AM`. This is an empty-state placeholder, not real mock data.
- **Required change:** Optional: extract to a named constant or a small “empty schedule” component. Data itself comes from `academicService.getTimetable()`.
- **Priority:** Low (cosmetic/organization only).

---

## 2. Not integrated with APIs (no backend yet)

### 2.1 Notifications (header bell) — **Implemented**

- **Backend:** `Notification` model and `notifications` table; `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PUT /api/v1/notifications/:id/read`, `PUT /api/v1/notifications/read-all`. Notifications are created when: (1) a student is enrolled (single or bulk) — type `Enrollment`, link `/student-classes`; (2) a QA lecture record is saved with comment `UNTAUGHT` — type `Warning` to the lecturer's linked user, link `/lecture-records`.
- **Frontend:** `notification.service.ts` and AppShell bell: fetches list on dropdown open, shows unread count badge, "Mark all read", and per-item click (mark read + navigate to link if present).
- **Status:** Integrated and tested (backend API tests; frontend unit tests for notification service).
- (obsolete) The notifications dropdown always shows static text: “No new notifications”. There is no call to any notifications API.
- **Required change:**
  - Backend: Add a notifications (or activity) API (e.g. list/read for the current user, optional mark-as-read).
  - Frontend: Call that API when opening the dropdown (or on load), store result in state, and render list (or empty state). Wire “mark as read” if the API supports it.

---

## 3. Already integrated (reference only)

The following were previously audited and are now wired to APIs:

- **Admin Timetables tab:** Schools from API; day and school filters wired; “Schedule Class” navigates to Classes tab.
- **Management Lecturer Performance:** Uses `qaService.getLectureRecords()` (all lecturers), grouped by lecturer for on-time rate.
- **Management Overview strategic goals:** Backend GET/PUT `/admin/strategic-goals`; Admin “Strategic Goals” tab and Management Overview read/update via API.
- **Audit log:** Backend GET `/admin/audit-log`; frontend `AdminAuditLog.tsx` and Admin “Audit Log” button use `adminService.getAuditLog()`.
- **Sidebar / header:** User name and role from `useAuth().user`; profile dropdown with Change password and Logout; change password uses `POST /auth/change-password`.

---

## 4. Domain enums (intentionally static)

These are fixed domain values, not missing API integration:

- Role options (Admin, Management, QA, Lecturer, Staff, Student) in Admin user/management UIs.
- Level/Semester (1–4, 1–2) in courses and programs.
- Venue types (Lecture Hall, Laboratory, Office, Seminar Room).
- Day of week (Sunday–Saturday) in timetables.
- Comment types in lecture records (TAUGHT, UNTAUGHT, COMPENSATION, etc.).
- Attendance status (Present, Absent, Late, Excused, etc.).
- Performance bands (Excellent, Good, Warning, Critical) and ranges.
- Calendar event types and statuses (Academic, Holiday, Exam, Meeting; Scheduled, Active, Completed, Cancelled).

No change needed unless the backend later exposes these as configurable lookup data.

---

## 5. Summary and next steps

| Area                         | Type           | Action                                      |
|-----------------------------|----------------|---------------------------------------------|
| Reports – Lecturers school filter | Hardcoded list | Derive from `schoolPerformance` or lecturer list |
| Notifications (bell)         | ~~No API~~     | **Done:** API + frontend integrated          |
| Dashboard empty schedule    | Placeholder    | Optional refactor (constant/component)      |

Reports filter has been fixed. Notifications API and frontend integration are in place. The frontend has no remaining known mock/hardcoded data for core flows and is fully functionable against the existing APIs.
