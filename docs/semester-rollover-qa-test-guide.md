# QA test guide — Semester rollover

Manual test guide for academic terms, closing a semester, publishing offerings, promoting students, registering by policy (auto / hybrid / self), timetable behaviour, and the guided rollover wizard.

**What this feature does (industry-shaped)**

1. **Close** the old teaching period (freeze classes; history kept; registration closed).
2. **Activate** the next teaching period.
3. **Publish offerings** (create class lists for the new term — no seating yet).
4. **Promote** students (year/semester standing only; mark registration-eligible).
5. **Register** by policy:
   - **Auto** — seat eligible students into **Auto** (required) courses
   - **Hybrid** — Auto seating + open student self-enrollment for **Self** courses
   - **Self** — open registration window only
6. **Close registration** when add/drop ends; attendance and timetable continue.

**Important:** Prefer testing on **staging**, not live production. Promote and close change student year/semester and which classes are active.

---

## Before you start

### Accounts you need

| Who to log in as | What you will test |
|------------------|--------------------|
| **Admin** | Calendar, terms, wizard, promote, publish, register, Timetable Builder |
| **Student** | Course registration page (self-enroll / drop) when window is Open |
| **QA** | Timetable screen (inactive classes should not be editable) |
| **Lecturer or Student** (optional) | Confirm they cannot run rollover |
| **Admin who can open Audit log** | Confirm a log entry after the wizard runs |

### Where to go in the app

| What | How to open |
|------|-------------|
| Terms, wizard, promote, publish, register | Left menu → **Calendar** (tabs: Terms, Rollover, Offerings, Promote, Register, Events) |
| Timetable Builder | Left menu → **Timetable Builder** |
| Student course registration | Student menu → **Course registration** |
| Student my classes | Student menu → **My Classes** |
| Admin timetables | Admin area → **Timetables** |
| Reports | Left menu → **Reports** |
| Audit log | Admin → **Settings** → **Audit log** |

### Test data to prepare

1. A **program** that lasts at least 2 years.
2. A few **Active students** on that program (Year 1 Sem 1 at least).
3. One student to **hold back** individually — copy their student **UUID** for the individual holdback box, **or** prepare a whole cohort (program + year + semester) for cohort holdback with a reason.
4. **Courses** for the relevant year/semester:
   - At least one course with enrollment policy **Auto** (default)
   - At least one course marked **Self** (elective) for self-enroll tests
5. At least **one scheduled class** on the current Active term.

**Tip:** Write down the current **Active term name** and a few student numbers before you start.

---

## Test area 1 — Academic terms

### TC-1.1 Create a Draft term

**Steps**

1. Log in as Admin → open **Calendar**.
2. Under **Academic Terms**, click **New term**.
3. Fill in name, academic year, **Coverage** (prefer **Both** when Sem 1 and Sem 2 classes share the same dates), start date, end date.
4. **Uncheck** “Set as Active term”.
5. Click **Create**.

**Pass if**

- The new term appears with status **Draft**.
- Coverage shows **Both** (or Sem 1 / Sem 2 if you chose those).
- **Registration** column shows **Closed**.

### TC-1.1a Combined term (Sem 1 and Sem 2 together)

**Steps**

1. Create/activate a term with Coverage = **Both**.
2. Publish Sem 1 and Sem 2 class offerings onto that Active term.
3. On **Promote**, leave Year/Semester as All (or run Sem 1 then Sem 2 separately).

**Pass if**

- Both Sem 1 and Sem 2 classes can sit on the same Active term.
- Promote advances Sem 1 students to Sem 2 and Sem 2 students to next year Sem 1 (or scoped groups as selected).

### TC-1.1b Historical term + attach legacy classes

**Steps**

1. Create a term with **Create as Closed (historical archive)** for the semester already run.
2. Confirm attach prompt (or click **Attach legacy** on the Closed term).
3. Create & **Activate** a new current term (Coverage = Both recommended).
4. On **Classes**, **Timetable**, or **Reports**, use **Academic term** filter: Active (default), a Closed term, or All.

**Pass if**

- Legacy classes (`academicTermId` was empty) are linked to the Closed term and deactivated.
- Day-to-day lists default to the Active term.
- Selecting the Closed term shows archived classes without reactivating that term.

### TC-1.1c Term picker on academic pages

**Steps**

1. After creating Active + Closed historical terms, open: Student Records, Lecture Records, My Classes, Timetable (any role), Lecturer Course Attendance, Cancellations, Timetable Builder, Reports (attendance / course-wise / at-risk / weekly matrix), and performance dashboards.
2. Confirm **Academic term** defaults to **Active term**.
3. Switch to the Closed historical term and confirm lists/dates reflect that period (or archived classes).
4. On Timetable Builder, confirm schedule writes are disabled when not on Active.

**Pass if**

- Active is the default on each of those pages.
- Closed-term browse does not require reactivating the old term.
- Dashboard and Presence remain without a term picker (today / live session only).

### TC-1.2 Activate a term (only one Active)

**Steps**

1. On a Draft term, click **Activate**.
2. Look at the full terms list.

**Pass if**

- That term is **Active**.
- Any previous Active term is now **Closed** (linked classes deactivated).

### TC-1.3 Open and close student registration

**Steps**

1. On the **Active** term, click **Open reg**.
2. Confirm Registration column shows **Open**.
3. Click **Close reg**.

**Pass if**

- Registration toggles between **Open** and **Closed**.
- Closing the whole term also closes registration.

### TC-1.4 Reports default to Active term dates

**Steps**

1. Open **Reports**.
2. Check attendance date filters.

**Pass if**

- Default from/to dates match the Active term start/end (or are clearly derived from it).

### TC-1.5 Non-admin cannot run rollover

**Steps**

1. Log in as Lecturer or Student.
2. Try to open Calendar rollover controls (or call APIs if you have a tool).

**Pass if**

- They cannot execute promote / register / wizard.

---

## Test area 2 — Closing a term and freezing classes

### TC-2.1 Close preview counts

**Steps**

1. As Admin on Calendar, click **Close term** on the Active term.
2. Read the confirmation message (class counts).

**Pass if**

- Counts look plausible (linked + unscoped if Active).

### TC-2.2 Close freezes classes

**Steps**

1. Confirm close.
2. Check Timetables / classes for that term.

**Pass if**

- Those classes are inactive.
- You cannot mark new attendance / enroll into them as if they were live.
- Historical attendance still exists.

### TC-2.3–TC-2.4 (optional)

- Activate a new term and confirm previous Active closed automatically (linked only).
- Confirm future timetable slots for deactivated classes are cancelled.

---

## Test area 3 — Publish offerings, promote, register

### TC-3.1 Publish offerings (class lists) without seating

**Steps**

1. Ensure an **Active** term exists.
2. On Calendar → **Publish offerings**, choose mode (clone or curriculum).
3. Preview, then Publish.

**Pass if**

- New Active-term classes appear.
- Students are **not** automatically enrolled solely because offerings were created (unless you later run Register).

### TC-3.2 Promote updates standing only

**Steps**

1. Note a Year 1 Sem 1 student.
2. **Promote** (preview then promote) without holdback.
3. Refresh the student.

**Pass if**

- Student is Year 1 Sem 2 (or Year 2 Sem 1 if they were Sem 2).
- They are registration-eligible.
- They are **not** necessarily enrolled yet until Register runs (unless an Admin used legacy enroll-after-promote).

### TC-3.2a Promote by group (program + year + semester)

**Steps**

1. On Calendar → Promote, select a **program**, **year**, and **semester** (not All).
2. Preview — only students in that group appear in the promote sample.
3. Promote.
4. Confirm a student in another year/semester (same or other program) is unchanged.

**Pass if**

- Scope line shows the selected program / Yn / Sn.
- Only the selected group advances (e.g. Y2S1 → Y2S2).
- Leaving Program/Year/Semester as **All** still promotes every Active student (bulk).

### TC-3.3 Holdbacks (individual)

**Steps**

1. Paste a student ID in individual holdbacks.
2. Preview promote — that student listed as holdback.
3. Promote.

**Pass if**

- Holdback student stays on the same year/semester.
- Student shows **Held back** standing (reason: Individual holdback) on the Students list.

### TC-3.3a Hold back a whole cohort (program + year + semester)

**Scenario:** e.g. BCFCI Year 2 Sem 1 stays for internship while other classes promote.

**Steps**

1. Calendar → **Promote**.
2. Under **Hold back cohort**, pick program, year, semester, and a reason (e.g. “Clinical internship”).
3. Click **Add cohort holdback**.
4. Leave promote Program/Year/Semester as **All** (or a broader scope that includes other cohorts).
5. Preview → Promote.

**Pass if**

- Preview lists the cohort students under holdbacks with the reason.
- Those students keep the same year/semester and stay **Active**.
- Students list shows a **Held back** badge; hover/title shows the reason.
- Filter Status → **Held back** finds them.
- A later promote still skips them until you **Edit student → Clear holdback**.
- Other programs / years / semesters still promote normally.

### TC-3.4 Register — Auto

**Steps**

1. Ensure Auto courses have Active-term class offerings matching the student’s program/year/semester.
2. On Calendar → **Register students**, policy **Auto**.
3. Preview → Register.

**Pass if**

- Student gains Active enrollments in those Auto classes.
- Self courses are **not** batch-enrolled.

### TC-3.5 Register — Hybrid / Self window

**Steps**

1. Mark one elective course as **Self** (Courses admin) and publish an offering for it.
2. Run Register with policy **Hybrid** (or **Self**).
3. On Academic Terms, confirm Registration is **Open**.
4. Log in as that **Student** → **Course registration**.
5. Enroll in the Self offering; optionally Drop.

**Pass if**

- Student can enroll/drop only while registration is Open.
- After Admin **Close reg**, Enroll/Drop is blocked.
- My Classes shows Auto seats plus any Self enrollments.

### TC-3.6 End-of-program Completed

**Steps**

1. Promote a student who is already at the last year Sem 2 of a short program.

**Pass if**

- Status becomes **Completed** (sample in promote preview).

### TC-3.7 Prior term enrollments stay historical

**Steps**

1. After close + promote + register, check old enrollments / attendance.

**Pass if**

- Old records remain; new seats are on new Active offerings.

---

## Test area 4 — Timetable and Active term

### TC-4.1–TC-4.6

Same intent as before:

- Builder requires Active term and stamps new/imported classes to it.
- Lists default to Active (+ legacy unscoped).
- Inactive / Closed-term classes are not editable for schedule.
- QA timetable cannot edit inactive classes.

---

## Test area 5 — Rollover wizard and audit log

### TC-5.1 Wizard step order

**Steps**

1. Open **Semester rollover wizard** on Calendar.
2. Walk steps: Close → Next term → Publish offerings → Promote → Register → Review.

**Pass if**

- Steps match that order.
- Register policy can be Auto / Hybrid / Self / None.

### TC-5.2 Preview then execute

**Steps**

1. Complete wizard options → **Preview & review**.
2. Confirm counts for close, offerings, promote, register.
3. **Execute rollover**.

**Pass if**

- Next term is Active; previous closed.
- Offerings created (unless skipped).
- Students promoted (unless skipped).
- Register ran per policy (unless skipped).
- Success panel offers Timetable Builder.

### TC-5.3 Audit log

**Steps**

1. Open Audit log after execute.

**Pass if**

- Entry exists for entity **AcademicTermRollover** (UPDATE) with a summary of steps.

### TC-5.4 Skip flags

**Steps**

1. Run wizard with skip publish or skip register checked.

**Pass if**

- Skipped steps do not create offerings / do not seat or open registration.

---

## Recommended full journey (one sitting)

1. Create/activate terms as needed; note Active term.
2. Ensure Auto + Self courses and at least one live class.
3. Run **wizard**: close → next term → publish → promote → register **Hybrid**.
4. As Student: self-enroll into Self course; confirm My Classes.
5. As Admin: **Close reg**; confirm student cannot enroll.
6. Open Timetable Builder for the new Active term.
7. Check Audit log.

---

## Quick pass / fail checklist

| # | Check | Pass? |
|---|--------|-------|
| 1 | Only one Active term | |
| 2 | Close freezes classes; history kept | |
| 3 | Registration Open/Close works on Active term | |
| 4 | Publish offerings does not silently seat everyone | |
| 5 | Promote changes year/semester only | |
| 6 | Register Auto seats Auto courses | |
| 7 | Hybrid/Self opens student Course registration | |
| 8 | Close reg blocks self-enroll | |
| 9 | Wizard order + audit entry | |
| 10 | Timetable scoped to Active term | |

---

## How to report a bug

Include: account role, term names, student numbers, policy used (Auto/Hybrid/Self), screenshots, and whether wizard or manual panels were used.

## Not in scope for this feature

- Retake / deferred rules engine
- Wiping attendance history
- Credit-hour / timetable clash engine for self-enroll
- Per-class policy override (course-level Auto/Self/StaffOnly only)
