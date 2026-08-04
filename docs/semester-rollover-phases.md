# Semester rollover — implementation phases

Approved approach: freeze the closed term, open a new term, publish offerings, promote standing, then register by policy. Do not wipe historical data.

QA manual test guide: [semester-rollover-qa-test-guide.md](./semester-rollover-qa-test-guide.md)

## Phase 1 — Academic Term foundation (done)

- [x] Phase plan documented
- [x] `AcademicTerm` model (name, academicYear, semester, start/end dates, status Draft|Active|Closed)
- [x] CRUD + activate + close APIs under `/api/v1/academic/terms`
- [x] Only one Active term at a time
- [x] Admin UI to manage terms (Calendar area)
- [x] Reports attendance date filters default to Active term date range
- [x] `GET /academic/terms/active` for clients

## Phase 2 — Close term + deactivate offerings (done)

- [x] Link classes to `academicTermId` (nullable for legacy)
- [x] New classes default to the Active term
- [x] Close term action: mark Closed + deactivate linked classes (+ unscoped when closing an Active term)
- [x] Cancel future timetable slots for deactivated classes
- [x] Guard enrollments / attendance on inactive or Closed-term classes
- [x] Close preview API + Admin confirm dialog
- [x] Activating a new term auto-closes the previous Active term (linked classes only; use Close on Active to also freeze unscoped classes)

## Phase 3 — Promote students + publish offerings (done)

- [x] Bulk promote preview / execute (`POST /academic/terms/promote/preview`, `POST /academic/terms/promote`)
- [x] Progression: Sem1→Sem2, Sem2→Year+1 Sem1; holdbacks by student ID; end-of-program → Completed
- [x] Promote updates year/semester only by default (`enrollAfterPromote` optional legacy)
- [x] Generate / publish class offerings for Active term (`POST /academic/terms/class-lists/preview|generate`)
- [x] Modes: clone-from-term and from-curriculum; default no auto-enroll on create
- [x] Admin Calendar UI: Publish offerings + Promote + Register panels
- [x] API tests: `academic-rollover.test.ts`

## Phase 4 — Timetable scoped to Active term (done)

- [x] Builder defaults semester from Active term; blocks load/save without Active term
- [x] Import requires Active term and stamps `academicTermId` on created/updated classes
- [x] `GET /timetable` and `GET /academic/classes` default active lists to Active term (+ legacy unscoped)
- [x] Builder scope / export prefer Active-term classes
- [x] Schedule edits blocked on Closed-term or inactive classes
- [x] API tests: `timetable-term-scope.test.ts`

## Phase 5 — Rollover wizard + audit (done)

- [x] Guided orchestrator: `POST /academic/terms/rollover/preview` + `POST /academic/terms/rollover`
- [x] Flow: close → create/activate next → publish offerings → promote → register by policy → timetable handoff
- [x] Preview aggregates close / offerings / promote / register counts
- [x] Single `AuditLog` entry (`UPDATE` / `AcademicTermRollover`) with JSON summary
- [x] Admin Calendar UI: `AcademicRolloverWizard`
- [x] API tests: `academic-rollover-wizard.test.ts`

## Phase 6 — Industry registration layer (done)

- [x] Term registration window: `registrationStatus` Closed|Open|AddDropOnly + open/close APIs
- [x] Course `enrollmentPolicy`: Auto | Self | StaffOnly (Hybrid = Auto seating + open Self window)
- [x] Student `registrationEligible` flag set on promote
- [x] Explicit register step: `POST /academic/terms/register(/preview)` with policy auto|hybrid|self|none
- [x] Auto-enroll filters to Auto courses; Self courses via student portal
- [x] Student Course registration page (`/student-registration`) + self-enroll/drop APIs
- [x] Close registration from Academic Terms panel
- [x] QA guide updated for industry-shaped flow

## Out of scope for now

- Retake / deferred rules engine
- Graduating exit automation beyond existing Graduation module
- Hard delete / wipe of attendance or QA data
- Per-class enrollment mode override (course-level policy only)
- Credit-hour / clash / prerequisite engine for self-enroll
