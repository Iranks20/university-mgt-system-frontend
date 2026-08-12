# Clinical Cohorts

## Why

Rotation rosters used to enroll students per rotation with a free-text cohort label. That made it hard when:

- Retake students sit with a different year/class
- One class is split across clinical sites

Cohorts are now a first-class group of students. Rotations link to a cohort and stay **live-synced**.

## Flow

1. Open **Clinicals → Cohorts** (`/clinical/cohorts`).
2. Create a cohort (name, program, year, semester).
3. **Enroll students**: choose year and semester for the cohort’s program, select students, save. Repeat for other years/semesters as needed (e.g. retakes).
4. Optionally **Copy from cohort** or **Export CSV**.
5. Open **Clinicals → Rotations**, add a rotation, choose the cohort from the dropdown.
6. The rotation roster is filled from the cohort and stays in sync when cohort membership changes.

## Rules

- Cohort program must be an **active** clinical eligibility policy program.
- Year + semester on the cohort are defaults for the enroll picker; you can load any year/semester under that program to cherry-pick students.
- Editing students happens only on the cohort page. Rotation roster is view-only.
- Changing a rotation’s cohort re-syncs that rotation’s roster to the new cohort’s members.
- Legacy rotation cohort labels are backfilled into `ClinicalCohort` records on migrate.
