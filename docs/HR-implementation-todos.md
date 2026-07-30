# HR Build Sequence (Industry-Standard TODO Checklist)

This checklist is designed for a university HR module so you can build in a safe order and keep HR operations stable while you expand features.

## University ERP alignment (confirmed)

This order matches how mature university / higher-ed HR systems are usually sequenced (Banner HCM / PeopleSoft HCM / Workday Higher Ed / SAP HCM-style campuses, and solid local university ERPs):

| Order | Layer | Why universities do it this way |
|------:|-------|----------------------------------|
| 1 | Org structure | Schools → faculties/levels → departments drive every HOD, report filter, and leave/appraisal approver |
| 2 | Employee master | One staff/person record is the spine; teaching and non-teaching share it |
| 3 | Positions / reporting line | Supervisor / HOD must be stable IDs, not free-text names |
| 4 | User accounts & access | Staff must log in before self-service (appraisal, leave, timeclock) |
| 5 | Core processes | Onboarding, attendance, leave keep the master record alive day-to-day |
| 6 | Performance / appraisals | Cycles and forms only work when people + supervisors exist |
| 7 | Documents & reports | Contracts, letters, compliance exports come last on trusted data |

**Verdict:** Yes — this document is university-ERP standard. Keep this order. Do not jump to appraisals until Phases 1–4 are checked off with tests.

### KCU-specific notes (so Phase 1 is realistic)

- Org models already exist: `School` → `Level` → `Department` (plus academic `Program`). Phase 1 is **audit + HR usability**, not a greenfield rebuild.
- `Department.head` is currently a **string name**, not a Staff id. Fixing that belongs mainly in **Phase 3** (reporting line). Phase 1 only confirms org is readable and assignable.
- `Staff` already has identity, dept/school, role, employment type, status, hire date, optional `userId`. Phase 2 is **make HR own this master** (real UI + RBAC), not invent a second Employee table.
- Appraisals already have backend depth. Phase 6 finishes the **standard workflow** on top of a stable foundation.

### What we deliberately defer (still standard, later)

- Full position/job catalog and grades (can stay lightweight: job title + employment type until Phase 3+)
- Payroll / salary (out of scope unless product expands)
- Full leave policy engine before employee master is live
- Document management system beyond appraisal archives until Phase 7

---

## Build Order (the rule)

1. Org structure  
2. Employee master (Staff)  
3. Positions / reporting line  
4. User accounts & access  
5. Core processes (onboarding, attendance/leave)  
6. Performance / appraisals  
7. Documents & reports  

## Definition of Done (DoD)

For every item below, mark it **Done** only after at least one of:

- Automated tests: unit + integration where applicable  
- End-to-end API smoke tests (with real DB) for critical routes  
- Manual verification with a test admin/HR/staff user set, including role access checks  

When uncertain, run the simplest API smoke first, then expand tests.

---

## Phase 1: Org Structure (Schools / Levels / Departments) ✅

**Goal:** Confirm the academic org hierarchy is complete enough for HR to assign staff and filter workforce by school/department — without demo data.

- [x] Confirm data model is usable for HR: `School` → `Level` → `Department` (units = departments for now unless a separate unit table is required later)
- [x] API coverage for reading org hierarchy for HR UI dropdowns (schools, departments; levels if needed)
- [x] HR can select school/department when managing staff (no demo store)
- [x] Empty / missing org data fails gracefully in HR screens (no blank crashes)
- [x] Document current gap for Phase 3: `Department.head` is free text — supervisor must become a Staff reference later

### Tests / Verification

- [x] List schools and departments via API; same options available to Admin and HR where permitted
- [x] Assign a staff member to a department; filter staff by that department
- [x] Verify HR pages do not break when a school has zero departments

**Phase 1 exit criteria:** ✅ Org is readable, assignable, and trusted for Phase 2 employee master work.

**Completed:** 2026-07-29. Changes: HR role added to academic route guards, `academic.read` added to HR RBAC matrix, `HrEmployeesPage` refactored to live Staff + Academic APIs, "UI Preview" badge removed, pre-existing TS errors fixed, 10 API smoke tests passing (`hr-phase1-org.test.ts`).

---

## Phase 2: Employee Master (Staff CRUD + Status) ✅

- [x] `Staff` is the single source of truth (one person record; no parallel Employee demo entity)
- [x] Staff create/edit/delete works for Admin and HR (guards aligned with RBAC)
- [x] Staff record includes:
  - [x] staff identity (names, staffNumber)
  - [x] role/job title type used by appraisal assignment
  - [x] department/unit assignment (and school where applicable)
  - [x] active/inactive status and employment type
  - [x] linked user account reference behavior is consistent
- [x] Staff ↔ User linking is reliable:
  - [x] On create: user is created or linked by email
  - [x] On update: role synchronization behaves correctly
  - [x] On delete: user cleanup matches expected policy (user deleted with staff)
- [x] `/hr/employees` uses live Staff API (remove / quarantine demo store for this screen)

### Tests / Verification

- [x] Integration: `POST /api/v1/staff` then `GET /api/v1/staff/:id`
- [x] Integration: update staff role and verify linked user role sync (system role enum)
- [x] Access control: HR can list/manage staff per matrix; unauthorized roles cannot
- [x] Pagination/search: deterministic ordering for Admin and HR directory views

**Phase 2 exit criteria:** ✅ HR manages real people in one directory that appraisals and leave will use later.

**Completed:** 2026-07-29. Changes: HR added to staff write route guards (create/update/delete/import), reusable `StaffFormDialog` component created, `HrEmployeesPage` upgraded with full CRUD (add/edit/delete + view + pagination), 11 API integration tests passing (`hr-phase2-staff-crud.test.ts`).

---

## Phase 3: Positions / Reporting Line (Supervisor Routing) ✅

Required for a smooth appraisal workflow.

- [x] Each staff member has an explicit supervisor reference, **or** supervisor resolution is deterministic via department HOD → Staff id
- [x] Replace free-text `Department.head` name-matching with stable Staff (or equivalent) linkage
- [x] Appraisal cycle review routing:
  - [x] Self review assigned to correct staff records in scope
  - [x] Supervisor review assigned using the reporting line (not display name)
  - [x] HR review assigned to HR queue participants based on policy
- [x] If org head is used, store stable mapping at cycle launch (or always compute reliably)

### Tests / Verification

- [x] Integration: launch a cycle with at least 3 staff members in 2 departments
- [x] Verify each generated `AppraisalReview` has correct routing stages (self → supervisor → HR)
- [x] Negative: if supervisor missing, cycle launch should warn/fail with a clear message, not silently misroute

**Phase 3 exit criteria:** ✅ Appraisals can route without fragile name matching.

**Completed:** 2026-07-29. Changes: added `Staff.supervisorId` + `Department.headStaffId`, shared `reporting-line` resolver (explicit supervisor → dept HOD), removed name-matching from cycle launch, fail with `SUPERVISOR_REQUIRED` + rollback to Draft, Admin HOD staff picker, HR employee supervisor field, 5 unit + 7 API tests passing.

---

## Phase 4: User Accounts & Access (Login + Permissions) ✅

- [x] Staff accounts can log in
- [x] HR accounts can access workforce screens and appraisal management screens
- [x] Permission matrix aligns with navigation:
  - [x] `nav-permissions` (frontend) matches guards (backend)
  - [x] system role enums include all required HR roles
- [x] Menu present test:
  - [x] HR sees `/hr/employees`, `/hr/appraisals`, `/hr/reports` (as permitted)
  - [x] Staff / Lecturer see only their allowed portal (e.g. `/staff-appraisal`)

### Tests / Verification

- [x] Authentication smoke: HR login, staff login, lecturer login
- [x] Authorization smoke: HR cannot access APIs the matrix forbids; can access what it allows
- [x] Regression: after permissions update, session refresh via `/auth/me` (or re-login) updates menu correctly

**Phase 4 exit criteria:** ✅ Right people can open the right screens; HR is not Admin-blocked on workforce APIs.

**Completed:** 2026-07-29. Changes: added `hr.appraisal_submit` to Staff + HR matrix and synced RBAC; fixed `hr@kcu.ac.ug` role to `HR`; HR nav includes My Appraisal; AuthContext refreshes permissions on load; hardened appraisal review list against orphan rows; fixed `getMatrixPermissionsForRole` case lookup so `guard` no longer over-allows HR/QA via permission fallback; 12 API + 15 nav + RBAC unit tests passing.

---

## Phase 5: Core Processes (Minimum Ops)

Build only the parts that keep the employee master useful day-to-day.

- [x] Onboarding (minimum):
  - [x] HR can view onboarding items linked to staff (or at least staff status flags)
- [x] Attendance / timeclock:
  - [x] If HR attendance screens are shown, they read real check-in/out data — or stay clearly disabled until live
- [x] Leave:
  - [x] Keep leave stubbed until leave policies exist, **or** implement minimal leave record + approval routing
- [x] HR dashboard dependencies:
  - [x] Dashboard tiles use real data or are clearly marked as placeholders (no silent fake counts)

### Tests / Verification

- [x] Integration: at least one staff can check-in/out and HR views reflect it (if HR attendance is live)
- [x] UI/API consistency: HR dashboard tiles match API values within one refresh cycle

**Phase 5 exit criteria:** ✅ No fake “HR ops” pretending to be production for attendance/leave/onboarding.

**Completed:** 2026-07-29. Changes: `GET /staff/check-ins` workforce register for HR/Admin; live `HrAttendancePage`; onboarding page shows Probation + ≤90-day hires from Staff API; leave page clearly Not live (no demo approve); dashboard live headcount/onboarding/appraisals with explicit placeholders for leave requests and documents; `hr-phase5-core-ops.test.ts`.

---

## Phase 6: Performance / Appraisals (Full Workflow)

This is the feature HR wants, but it must run on Phases 1–4 (and preferably 5) being Done.

- [x] Templates (CRUD + editor usability)
- [x] Cycles:
  - [x] create cycle, configure scope, close previous open cycle behavior
  - [x] launch cycle generates review records
  - [x] statuses move correctly (Draft/Open/Review/Closed)
- [x] Review queue:
  - [x] Staff self review save/submit works for all roles that should participate
  - [x] Supervisor review step exists in UI and submission persists
  - [x] HR review step exists in UI (approve/complete + archive)
- [x] Calibration:
  - [x] aggregates by department (or scope) and produces stable results

### Tests / Verification

- [x] Integration: generate a cycle, then run through self → supervisor → HR via API calls
- [x] UI smoke: each screen shows correct queue counts and review detail
- [x] Paper/export smoke: export/print from finalized review works with non-empty data
- [x] Error handling: missing template, missing supervisor, and missing staff data have clear UX messages

**Phase 6 exit criteria:** ✅ Full self → supervisor → HR appraisal path is production-ready.

**Completed:** 2026-07-29. Changes: `GET /reviews/team` + review access control (subject/supervisor/HR); Staff Appraisal Team reviews tab with supervisor submit; template create + `formCapture` preserved on save; cycle Move to Review / Close; launch errors surface `SUPERVISOR_REQUIRED`; notifications point to `/staff-appraisal`; `hr-phase6-appraisal-workflow.test.ts` (self → supervisor → HR + calibration + archives).

---

## Phase 7: Documents & Reports (Compliance Output)

- [x] Appraisal document output (print/export) works for completed reviews
- [x] HR documents area contains real artifacts (or is locked until implemented)
- [x] HR reports export real data (no fake CSV)

### Tests / Verification

- [x] Export report for a completed cycle: fields exist, no empty crashes
- [x] RBAC: only users allowed to see reports can access exports

**Phase 7 exit criteria:** ✅ Compliance outputs come from live Staff + appraisal data only.

**Completed:** 2026-07-29. Changes: `GET /hr/reports/export` (headcount/attendance/appraisal/onboarding CSVs, `hr.reports` RBAC); leave/contracts return `REPORT_NOT_LIVE`; Documents page shows live appraisal archives only (demo docs removed, upload locked); Reports page downloads live CSV; print view includes development fields; `hr-phase7-exports.test.ts`.

---

## Ongoing Regression Gates (run every time you complete a phase)

- [ ] Run backend integration tests for HR endpoints
- [ ] Run frontend route smoke for `/hr/*` and `/staff-appraisal`
- [ ] Verify RBAC: HR sees workforce + appraisals; staff sees self portal
- [ ] Verify no demo store pages accidentally override API data

---

## Suggested check-off cadence

1. Implement one Phase item set end-to-end (API + UI)  
2. Test it with real RBAC users  
3. Mark **Done** on that phase item  
4. Only then start the next Phase  

**Next action:** HR build sequence complete through Phase 7. Run ongoing regression gates before the next feature push.
