# Retakes & Combined Classes: QA Test Guide

This guide explains how to test **retakes** and **combined classes** in the KCU ERP. You do not need any technical knowledge. Everything is done in the web browser.

Retakers used to go missing from marking lists and reports, and students from combined classes were wrongly called "retakers". The system now gives every student in a class a clear label. Please check each screen below shows the right label, and that retakers can be marked and tracked.

---

## 1. Labels you will see

| Label | Meaning | Colour |
|---|---|---|
| *(no label)* | The student's own class | — |
| **Combined** | A student from another cohort who shares the same lecture. **Not** a retaker. | Blue |
| **Retake · attempt 2** | A student repeating a course unit | Amber |
| **Extra** | A course unit outside the student's programme (e.g. an elective) | Grey |
| **Waiting for approval** | A retake not yet approved. It is **not** on class lists until approved. | Amber |

Rules: at most **5 retake course units per term**, and **3 attempts** per course unit. A registrar can go over the limits only by giving a reason.

---

## 2. Before you start

- Use a **test system**, not the live one.
- **Log in as Admin** for all scenarios.
- For the approval check in Scenario D, ask the administrator for a login that **can enrol students but cannot approve retakes**.
- Scenarios C and D change records. Ask which **test student** to use, and remove what you add afterwards.

Good examples (look only):

| What | Where |
|---|---|
| Combined classes, no retakers | **BNS-D**, cohort **1.1 · Day**, **19 Nov 2026** |
| Combined classes and retakers | **HEC-H**, cohort **1.1 · Day**, **18 Nov 2026** |
| A retaker never marked | Student **NIZIYIMANA VICENT** |

---

## 3. Test scenarios

### Scenario A: Retakers report

1. Go to **Reports → Retakers** (last tab).
   - [ ] Five boxes show numbers: Students, Retake course units, Below 75% attendance, Waiting for approval, Fees unpaid.
2. Search **NIZIYIMANA**.
   - [ ] Only that student's rows remain, each showing the course unit, the class, the lecturer, "Attempt 2" and attendance (e.g. 0 / 8).
3. Clear the search and tick **Below 75% only**.
   - [ ] Every row shows a red percentage.
4. Pick a programme in **All programs**.
   - [ ] Only that programme's students show.
5. Click **Export Excel**.
   - [ ] The file has the same rows as the screen.
6. Click **Retake rules**.
   - [ ] You see max retakes per term (5), max attempts (3), fee per retake course unit, and **Retakes need approval**. Don't change them unless asked.

---

### Scenario B: Daily bulk marking

1. Go to **Students → Student Records → Daily bulk marking**. Choose **BNS-D**, cohort **1.1 · Day**, date **19 Nov 2026**, and click **Load grid**.
   - [ ] The line above the table reads like "77 students + 23 from combined classes (BNS-C Y1S1)" and does **not** mention retakers.
   - [ ] Below the last BNS-D student, a **blue** heading "Combined classes…" and blue **Combined · BNS-C Y1S1** labels.
2. Switch off **Show combined-class students**.
   - [ ] The BNS-C students disappear and a note says they are hidden. Switch it back on.
3. Load **HEC-H**, cohort **1.1 · Day**, date **18 Nov 2026**.
   - [ ] At the bottom, an **amber** heading "Retakers and extra students…" with **Retake · HEC-H Y1S2** labels.
   - [ ] A retaker can be marked only in their own course unit; other cells show a dash (—).
4. Type an impossible date (e.g. a 6-digit year) and click **Load grid**.
   - [ ] Message: "Enter a valid date".

---

### Scenario C: Register a retake

**Use the agreed test student.**

1. Go to **Students → Students**, find the student, click **⋯ → Edit**, scroll to **Other enrollments**, and click **Add class**.
   - [ ] You see **Register as** (Automatic / Retake / Extra), **Reason**, and **Override retake limits**.
2. Search a course unit from an **earlier semester** of the student's programme, click **Add**, type a reason, and click **Save Changes & Enroll**.
   - [ ] Reopening **Edit** shows the class under Other enrollments with a **Retake** label.
   - [ ] **Reports → Retakers** shows the student, your reason and your name.
3. *(Only if agreed)* In **Retake rules**, set max retakes per term to **1** and try to add a second retake.
   - [ ] A message says the limit is reached.
   - [ ] Ticking **Override retake limits** with a reason lets it save.
   - [ ] Set the limit back to **5**.
4. Clean up: untick the test classes under Other enrollments and save.

---

### Scenario D: Approvals and fees

**Approval**

1. **Log in with the login that cannot approve** and add a retake as in Scenario C.
   - [ ] After saving, a message says it was **sent for approval**.
   - [ ] The student is **not** yet on that class's marking grid.
2. **Log in as Admin.** In **Reports → Retakers**, choose **Waiting for approval**.
   - [ ] The retake is listed and counted in the "Waiting for approval" box.
3. Type a note and click **Approve**.
   - [ ] The row says "Approved by…" and the student now appears on the marking grid.
4. On another pending retake, click **Reject** without a note.
   - [ ] It asks for a reason. With a reason, the row says **Rejected**.

**Fees** *(only if agreed)*

5. In **Retake rules**, set **Fee per retake course unit** to **50000** and click **Save rules**. Add a new retake.
   - [ ] It shows "Fee UGX 50,000: **Unpaid**" and is counted in "Fees unpaid".
6. Click **Mark paid** with no receipt number.
   - [ ] It asks for one. With a receipt number (e.g. RCPT-001), it shows **Paid**.
7. Click **Waive** on another unpaid retake.
   - [ ] It shows **Waived**.
8. Set the fee back to **0** and save.

---

### Scenario E: Retakers on other lists

Use **HEC-H 1.1** and a retaker from Scenario B (e.g. **AKAMAGEZI PRUDENCE**).

| Screen | How to open it | Expected result |
|---|---|---|
| Student Attendance report | **Reports → Student Attendance**, choose the cohort and a **course unit or class** the retaker attends | [ ] Retaker listed with an amber **Retake** label |
| Weekly Matrix | **Reports → Weekly Matrix**, HEC-H 1.1, week **16–22 Nov 2026** | [ ] Retakers at the bottom with a **Retake** label; dashes (—) for classes they don't attend |
| Marking coverage | **Student Records → Marking coverage**, **18 Nov 2026** | [ ] Expected students include the retakers (e.g. 13 + 15 = 28) |
| Class enrolments | **Academic → Classes → Enrollments** on one of those classes | [ ] **Retake · attempt 2** (amber) and **Combined class** (blue) labels |
| Edit Student | **Students → Students → Edit** the retaker | [ ] Retake classes under **Other enrollments** with the Retake label |

---

## 4. Known limits (please don't report these as bugs)

| What | Why |
|---|---|
| Only **Admin** can approve retakes and record fees for now | Other staff need the "Approve retakes" / "Retake fees" permissions added by the administrator. |
| Retake fees are only **recorded** here | Payment itself is not taken in the ERP. |
| Some retakers show **0%** attendance | They were missing from marking lists before, so they were never marked. |
| A student may appear twice for the same course unit | Some course units have two classes with the same name. This is a data issue to fix in Classes. |

---

## 5. How to report a problem

For each problem, send:

1. **Scenario and step** (e.g. "Scenario B, step 3").
2. **Student, cohort, class and date** you used.
3. **What you expected** and **what happened instead**, including any message on screen.
4. A **screenshot** of the whole screen, and the **date and time**.
