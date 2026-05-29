# UAT: Combined classes, lecturer pools, clinical QA, and attribution

**Release scope:** Class cohort pools, lecturer pools, multi-class session attendance, university vs clinical QA navigation, clinical reports UX, substitute lecturer attribution in QA reports and analytics.

**Environment:** Staging (or local: frontend `http://localhost:5173`, API `http://localhost:3000`).

**Sign-off:** Tester name · Date · Pass / Fail · Notes

---

## Prerequisites

| Item | Requirement |
|------|-------------|
| Accounts | `admin@…`, `qa@…` (university QA), `qaclinicals@…` or `clinicalcoordinator@…` (clinical), `management@…` (optional) |
| Data | ≥2 program intakes (e.g. DCM Year 1, DMLT Year 1), ≥4 lecturers, one shared course code used by two classes in the same venue/time block, students enrolled in both cohorts |
| Migrations | `npx prisma migrate deploy` applied on target DB (includes `20260528153000_class_cohorts_and_lecturer_pools`, `20260528180000_align_class_lecturers_drop_staff_id`, `20260527180000_backfill_clinical_system_roles`) |
| Substitution (sections F–G) | One lecture record with **STATUS** = Substituted and a substitute lecturer assigned, within the report date range |

---

## A. Admin — combined cohort class

| Step | Action (exact clicks) | Expected result |
|------|------------------------|-----------------|
| A1 | Log in as **Admin** → sidebar **Classes** (`/admin-classes`) | Classes list loads |
| A2 | Click **Add class** (or edit an existing test class) | Class form opens |
| A3 | Fill **Name**, **Course**, **Venue**, schedule fields as required | No validation errors on required fields |
| A4 | Under **Combined cohort intakes**, check **two** program intakes (e.g. DCM + DMLT) | Both checkboxes stay checked |
| A5 | Click **Save** / **Update** | Success toast; dialog closes or list refreshes |
| A6 | Re-open the same class (Edit) | **Combined cohort intakes** shows the same two intakes checked |
| A7 | Open **Enroll students** for that class | Candidate list text mentions multiple cohorts (e.g. “Students in 2 linked intake cohorts”) |
| A8 | Enroll at least one student from each cohort → **Save enrollment** | Enrollment succeeds; enrolled count increases |

---

## B. Admin — lecturer pool

| Step | Action (exact clicks) | Expected result |
|------|------------------------|-----------------|
| B1 | **Classes** → Add or edit a class | Form opens |
| B2 | In **Lecturer pool — search above to add**, search and add **four** lecturers | All four appear in the pool list |
| B3 | **Primary lecturer** dropdown → select lecturer **B** (not the first in the list) | Primary shows lecturer B |
| B4 | **Save** | Success; no duplicate-key or server error |
| B5 | Re-open class → Edit | Pool still has four lecturers; **Primary lecturer** is still B |
| B6 | Remove one lecturer from pool (uncheck) → change primary to another → **Save** | Updates without error; pool count = 3 |

---

## C. University QA — lecture record and multi-class attendance

| Step | Action (exact clicks) | Expected result |
|------|------------------------|-----------------|
| C1 | Log out → log in as **QA** (university) | Dashboard loads; role shows QA (not clinical) |
| C2 | Sidebar → **Lecture Records** (`/lecture-records`) | Page title **Lecture Records**; table visible |
| C3 | Confirm sidebar: **Reports** visible; **Clinicals** folder / **Clinical Reports** **not** visible | University QA nav only (no clinical module) |
| C4 | **Record session** (or row ⋮ menu) → complete required fields (department, lecturer, class, date, times, **STATUS** = Conducted) → **Save** | New row appears in list |
| C5 | On that row → ⋮ → **Record student attendance** | Modal **Record student attendance** opens with class name and date |
| C6 | If **Combined cohort intakes** has 2+ intakes on the lecture class: section **Include related classes for combined attendance** lists only classes tied to those intakes (labels show program cohort, e.g. `HEC-BS Y1S1 Day — DCM Y1 S1 Day`) | One row per related class; no LLB/BPG/other programs unless their intake was selected on the class |
| C7 | Uncheck one class, leave at least one checked → mark students **Present** / **Absent** → **Save attendance** | Toast **Attendance saved.** with student count; modal closes |
| C8 | Re-open **Record student attendance** for same lecture/date | Previously saved statuses pre-filled (“already marked” count > 0) |
| C9 | Check **both** related classes → **Save attendance** again | Saves for both scopes; no error |

---

## D. University QA — reports and lecturer assignments

| Step | Action (exact clicks) | Expected result |
|------|------------------------|-----------------|
| D1 | Sidebar → **Reports** (`/reports`) | Reports page with tabs (Overview, Lecturer Summary, …) |
| D2 | Tab **Lecturer Summary** | Tab activates; filters and table area visible (data may load automatically) |
| D3 | Set **date range** to include recent lecture records → wait for load | Table rows appear or empty state (no crash) |
| D4 | Tab **School Summary** → set date range | Report loads without error |
| D5 | **Lecture Records** → **Record session** → choose a lecturer from the **pool** who is **not** the class primary | Class appears in class dropdown (assignment from pool, not only primary) |

---

## E. Clinical QA — roles and reports

| Step | Action (exact clicks) | Expected result |
|------|------------------------|-----------------|
| E1 | Log in as **QA Clinicals** or **Clinical Coordinator** | Clinical dashboard or default clinical route loads |
| E2 | Sidebar: **Clinicals** folder visible; **Lecture Records** and university **Reports** (`/reports`) **not** in nav (unless user also has university permissions) | Clinical-only navigation |
| E3 | **Clinicals** → **Clinical Reports** (`/clinical/reports`) | Clinical reports page opens |
| E4 | Click tab **Daily Student Register** | Tab switches; filter bar visible; report preview loads without clicking a separate “Generate” (spinner then table or empty state) |
| E5 | Click tab **Student Summary** | Tab switches; new request; preview updates |
| E6 | Click tab **Site & instructor summaries** | Site summary and instructor frequency sections load |
| E7 | Change **date preset** (e.g. Last 30 days) → observe preview | Data refreshes for new range |
| E8 | Click **Export** (if enabled for tab) | File download starts or success toast; no 403 |

---

## F. Admin — clinical system roles (production migration check)

| Step | Action (exact clicks) | Expected result |
|------|------------------------|-----------------|
| F1 | Log in as **Admin** → **Users** → **System accounts** (`/admin-users`) | User list loads |
| F2 | **Create user** → Role dropdown | Options include **QA Clinicals** and **Clinical Coordinator** |
| F3 | **Users** → **Roles & Permissions** (`/admin-roles`) | Custom/system roles list loads |
| F4 | Search or locate roles **QAClinicals** / **ClinicalCoordinator** (system-synced) | Roles exist with clinical permissions; existing users unchanged |

---

## G. Substitution attribution (QA reports + management analytics)

| Step | Action (exact clicks) | Expected result |
|------|------------------------|-----------------|
| G1 | As **QA**, create or use a lecture record: **STATUS** = **Substituted**, set **Substitute lecturer** to staff member **S** (scheduled owner = **O**) | Record saved |
| G2 | **Reports** → **Lecturer Summary** → date range including that session | Row for **S** shows session taught; **O** does not get credit for that session as taught |
| G3 | Log in as **Management** → **Lecturer Performance** or overview with **Top performing lecturers** | **S** gains credit; leaderboard not attributed to **O** for substituted session |
| G4 | **Reports** → **School Summary** (same date range) | School aggregates consistent with substitute attribution (no double-count for **O**) |

---

## H. Regression smoke

| Step | Action | Expected result |
|------|--------|-----------------|
| H1 | **QA** → **Student Records** → open a class attendance view | Loads; percentages use standard policy (Present=1, Late=0.5) |
| H2 | **Admin** → **Classes** → single-intake class (legacy) | Saves with one cohort; attendance still works |
| H3 | API health: `GET /api/v1/health` (if exposed) or login | 200 / successful auth |

---

## Automated verification (engineering)

Run from `kcu-mgt-backend`:

```bash
npm test -- class-relation-ids session-attendance
npx jest -c jest.api.config.js academic-class-pools --runInBand
```

| Command | Covers |
|---------|--------|
| `class-relation-ids` unit tests | Pool/cohort ID resolution |
| `session-attendance` DTO tests | Session payload validation |
| `academic-class-pools` API tests | Create/update/get class with pool + cohorts |

---

## Defect log (if any)

| Step | Actual result | Severity | Ticket |
|------|---------------|----------|--------|
| | | | |

---

## Sign-off

| Role | Name | Signature | Date | Result |
|------|------|-----------|------|--------|
| QA Lead | | | | ☐ Pass ☐ Fail |
| Product / Registrar | | | | ☐ Pass ☐ Fail |
| Engineering | | | | ☐ Pass ☐ Fail |
