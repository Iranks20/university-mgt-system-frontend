# Performance Appraisal: QA Test Guide

This guide explains how to test the **Performance Appraisal** feature in the KCU ERP. It is written for testers. You do not need any technical knowledge. Everything is done in the web browser.

KCU used to run appraisals in a separate appraisal system. That work has now moved into the ERP. The screens, form questions and scoring are meant to work **the same way the old system did**, so staff will find them familiar. If something works differently from the old system and this guide does not mention it, please report it.

---

## 1. How an appraisal moves from person to person

Every appraisal passes through five people (or offices), in this order:

| Step | Who | What they do | Where in the ERP |
|---|---|---|---|
| 0 | **HR** | Opens an appraisal period (who is appraised, which dates) | Performance Appraisal → **New appraisal period** |
| 1 | **Staff member** (the person being appraised) | Checks their details, rates themselves, signs | **My Appraisal** |
| 2 | **Supervisor** | Rates the staff member, writes comments, signs | **My Appraisal → Appraisees** tab |
| 3 | **HR** | Checks the appraisal, can correct ratings, signs | Performance Appraisal → **Received Appraisals** |
| 4 | **Vice Chancellor (VC)** | Gives the final comment and signs. The appraisal is then complete. | **Appraisal Final Review** |

Important things to know:

- After the supervisor submits, the appraisal goes **straight to HR**. The staff member is told, but has nothing more to do. This is how the old system worked.
- Nobody can skip a step. For example, the VC cannot sign until HR has signed.
- Each person gets a **notification** (the bell icon at the top right) when it is their turn. The ERP does **not** send emails for appraisals yet.

---

## 2. Before you start

### 2.1 Test accounts you need

Ask your system administrator or HR for **four test logins**:

| Account | What it must have |
|---|---|
| **HR account** | HR access (can open *Performance Appraisal* in the HR menu) |
| **Staff account** | A lecturer, with a **supervisor** set in the organisation chart |
| **Supervisor account** | The person set as the staff account's supervisor |
| **VC account** | Appointed to the **Vice Chancellor** post on the organisation chart (an Admin account also works) |

Tips:

- Use a **different browser, or a private/incognito window, for each account**. You can then stay logged in as several people at once.
- Use a **test system**, not the live one. Some tests open appraisals for real staff lists.
- If your browser fills in a saved login automatically, clear the fields before typing the test login.

### 2.2 Things you will need during testing

- A mouse or touchpad for drawing **signatures** (click and drag in the white signature box).
- A phone number to type in (any format, for example `+256 700 000000`).

---

## 3. Test scenarios

Work through the scenarios in order. Each scenario lists **steps** and the **expected result**. Tick each box as you go, and note anything different.

---

### Scenario A: HR opens an appraisal for one person

**Log in as: HR**

1. Go to **Performance Appraisal** (in the HR menu).
2. Click **New appraisal period** (top right).
3. **Step 1, Appraisal details:** set *Appraisal Type* to **End of contract period review**.
   - [ ] The *Name* changes to "End of contract period review" by itself.
   - [ ] The type list shows all five types: Annual Appraisal, Mid-term review, Probation period review, End of contract period review, Special period review.
4. Click **Next**. **Step 2, Who is appraised:** type part of the staff member's name in the search box.
   - [ ] Matching staff appear as you type.
   - [ ] Typing the **full name** (first and last) also finds them.
   - [ ] Clicking a name adds them as a tag. The small **x** removes them again.
5. Click **Next**. **Step 3, Forms:** check the list of job categories and forms.
   - [ ] Each job category shows a form (see the table in [Section 4](#4-which-form-each-person-should-get)).
   - [ ] The **eye** icon opens a preview of the form.
   - [ ] The window does **not** scroll sideways.
6. Click **Next**. **Step 4, Deadlines:** leave the dates as they are.
7. Click **Next**. **Step 5, Launch:** check the summary.
   - [ ] *Staff to appraise* shows **1**.
8. Click **Open appraisal period**.
   - [ ] A success message appears.
9. Open the **Staff Progress** tab.
   - [ ] The staff member is listed with their form, their supervisor's name, and every step showing **Pending**.
   - [ ] Status: **Self Assessment Pending**.

> **Optional: Annual appraisal for everyone.** Repeat with type **Annual Appraisal**. In step 2, tick the staff categories instead of picking people. **Only do this on a test system**, because it creates an appraisal for every active staff member in those categories. If some staff have no supervisor, step 5 shows a yellow warning, but you can still open the period.

---

### Scenario B: Staff fills in their Appraisal Information

**Log in as: Staff**

1. Click **My Appraisal** in the menu.
   - [ ] The page opens on the **Appraisal Information** tab.
   - [ ] The heading shows the form name (for example "Performance Appraisal Form for Lecturer") and the due date.
2. Check the pre-filled details.
   - [ ] *Full Name*, *Designation*, *Employment Type*, *Appointment Date*, *Department*, *Assigned Supervisor* and *Supervisor Rank* are already filled from the staff record.
   - [ ] *Appraisal Type*, *Full Name*, *Assigned Supervisor* and *Supervisor Rank* **cannot** be changed.
3. Leave **School / Unit** empty and click **Save and start self rating**.
   - [ ] A red message asks you to fill in *school / unit*. Nothing is saved.
4. Choose a school. Also try **Others**.
   - [ ] Choosing *Others* shows a box to type a school or unit name.
5. Try a period where **To** is earlier than **From**.
   - [ ] A message says the period must end after it starts.
6. Fix the dates and click **Save and start self rating**.
   - [ ] A success message appears and the page moves to the **Self Assessment** tab.

---

### Scenario C: Staff does the self-assessment

**Still logged in as: Staff**

1. On **Self Assessment**, look at the tables.
   - [ ] Each section is headed "SECTION 1: …", "SECTION 2: …" with its weight.
   - [ ] Columns: **S/N, Key Outputs, Performance Targets, Means of Verification, Weight, Self-Rating**.
   - [ ] Item numbers (S/N) continue across sections (1, 2, 3 … not restarting at 1).
   - [ ] Each rating list offers: **3 - Outstanding, 2 - Competent, 1 - Developing, 0 - Below Exp., N/A**.
2. Rate a few items.
   - [ ] The section's **Self %** (top right of the section) updates.
   - [ ] **Overall Score** near the bottom updates.
   - [ ] In the **OSEI** table, a tick moves to the matching band (see [Section 5](#5-checking-the-scores)).
3. Rate one item **N/A**.
   - [ ] N/A does **not** lower the score (see [Section 5](#5-checking-the-scores)).
4. Type something in **Training Needs**, then click **Save draft**.
   - [ ] "Draft saved" appears.
5. **Refresh the page** (press F5).
   - [ ] Your ratings and training needs are still there.
6. Leave at least one item unrated and click **Submit to supervisor**.
   - [ ] A message says how many items are still unrated. Nothing is submitted.
7. Rate every item. Do **not** sign yet. Click **Submit to supervisor**.
   - [ ] A message asks you to sign in the signature box.
8. Check the **Attestation of Self-Appraisal** box.
   - [ ] It reads "I *[your name]* hereby declare that the self-rating given above is true and correct…".
   - [ ] The **Date** defaults to **today** (check it is today's date, not yesterday's).
   - [ ] The **Phone** number is pre-filled from the staff record.
9. Draw a signature. Try **Clear signature**, then sign again.
10. Click **Submit to supervisor**.
    - [ ] A success message appears and the page moves to **Results**.
    - [ ] The **Appraisal Progress Tracker** shows *Self Assessment: Completed* (25%).
    - [ ] Status: **Supervisor Review**.
    - [ ] Your signature appears in the *Attestation of Self-Appraisal* section.
11. Open the **Self Assessment** tab again.
    - [ ] It says **Self Assessment Already Done**, and you cannot change ratings.
12. Open the **Appraisal Information** tab.
    - [ ] The fields can no longer be edited.
13. Check the bell icon.
    - [ ] Notification: "Self-Assessment Submitted".

---

### Scenario D: Supervisor rates the staff member

**Log in as: Supervisor**

1. Check the bell icon.
   - [ ] Notification: "New Self-Assessment Submitted".
2. Click **My Appraisal**. Open the **Appraisees** tab if it isn't already open.
   - [ ] The **Appraisees Registry** lists the staff member, with *Self Assessment: Done* and *Supervisor Rating: Pending*.
3. Click **View**.
   - [ ] A window shows the staff member's details.
4. Click **Start Rating**.
   - [ ] The **Supervisor Rating** page opens, with the staff member's details at the top.
   - [ ] Each table shows **Staff Rating** (the staff member's own rating, read-only) and **Supervisor Rating** (a list for you to choose from).
5. Rate every item.
   - [ ] **Overall Score** and the **OSEI** tick update as you rate.
6. Fill in the three comment boxes (areas of improvement, strengths, overall impression and recommendations).
   - [ ] The staff member's **training needs** are shown for reference.
7. Check **Supervisor's Assessment**.
   - [ ] It reads "This is to certify that Mr/Ms *[staff name]* has been under my supervision…".
   - [ ] *Supervisor's Name* is pre-filled. *Position* is pre-filled from the supervisor's post.
8. Try **Save draft**, refresh the page and reopen. Your ratings should still be there.
9. Try submitting with an unrated item, then without a signature.
   - [ ] Each attempt is blocked with a clear message.
10. Rate everything, sign, and click **Submit rating**.
    - [ ] A success message appears.
    - [ ] The page now shows the full results, with both signatures.
11. Go back to the **Appraisees Registry**.
    - [ ] The button now says **View Results**.

---

### Scenario E: Staff after the supervisor has rated

**Log in as: Staff**

1. Check the bell icon.
   - [ ] Notification: "Your Supervisor Has Rated Your Appraisal… it has gone to HR".
2. Open **My Appraisal → Results**.
   - [ ] The tracker shows *Self Assessment* and *Supervisor Rating* completed (50%).
   - [ ] Status: **HR Review**.
   - [ ] The supervisor's ratings, comments and signature are visible.
   - [ ] There is **nothing to fill in or sign**. You only view the results (same as the old system).
   - [ ] The staff member's own self-ratings are unchanged by the supervisor.

---

### Scenario F: HR reviews, corrects and signs

**Log in as: HR**

1. Check the bell icon.
   - [ ] Notification: "Appraisal Rated by Supervisor".
2. Open **Performance Appraisal → Received Appraisals**.
   - [ ] The appraisal is listed with its self and supervisor scores and **Awaiting HR Review**.
   - [ ] The search box finds it by staff name.
3. Click **Review & Sign**.
   - [ ] The **Detailed Appraisal Review** page shows everything: details, all ratings, scores, OSEI band, supervisor comments and the signatures so far.
   - [ ] Each item has a **pencil (Edit)** button.
4. Click the pencil on any item and change the supervisor rating. Click **Save changes**.
   - [ ] "Rating updated" appears.
   - [ ] The item shows the new rating, and the section and overall scores change.
5. **Return to supervisor:** click **Return to supervisor** and confirm.
   - [ ] "Appraisal returned" appears and the status goes back to **Supervisor Review**.
   - [ ] As the supervisor: the appraisal is open for rating again and needs a **new signature**.
   - [ ] Have the supervisor submit again, then continue below.
6. Back as HR, open the appraisal again. Type a comment in **HR Sign Off**. Check that *HR Name* is pre-filled, sign, and click **Sign & Submit to VC**.
   - [ ] "Signed and forwarded to the Vice Chancellor" appears.
   - [ ] An **HR Comments** section appears with your comment, name, date and signature.
   - [ ] In Received Appraisals, the status now reads **Signed & Verified by HR**.

> **Return to staff** works the same way. The staff member must rate and sign again, then the supervisor rates again. Test it on a second appraisal if you have time.

---

### Scenario G: Vice Chancellor gives the final review

**Log in as: VC**

1. Check the bell icon.
   - [ ] Notification: "Appraisal Verified by HR".
2. Find **Appraisal Final Review** in the left menu.
   - [ ] The menu item is visible without opening any sub-menu.
3. Open it.
   - [ ] **Ratings Overview** lists the appraisal as **Awaiting VC Review**.
4. Click **Review & Comment**.
   - [ ] The whole appraisal is shown, including HR's comments and signature.
5. Try **Submit final comment** with the comment box empty.
   - [ ] A message asks for a comment.
6. Type a comment, sign, and click **Submit final comment**.
   - [ ] "VC comment submitted. The appraisal process is now complete." appears.
   - [ ] A **VC Comments** section appears.
   - [ ] In Ratings Overview, the status reads **Signed & Verified by VC**.

---

### Scenario H: Final checks after completion

1. **As Staff:** open **My Appraisal → Results**.
   - [ ] Status **Completed**. The tracker shows 100%, with all four steps completed.
   - [ ] Notification: "Appraisal Process Completed".
2. **As HR:** open **HR Documents**.
   - [ ] The completed appraisal is listed. *Filed* shows **today's** date and *Final score* shows the supervisor's overall score.
   - [ ] **View / Print** opens the full appraisal in a window that fits the screen (no sideways scrolling, the Print button fully visible).
3. **Print / Save as PDF** (try it from Results, the HR review page and the VC page):
   - [ ] The browser's print window opens.
   - [ ] The preview shows only the appraisal (not the menu or other screens), headed **KING CEASOR UNIVERSITY** and the form name.
   - [ ] Order: details → rating tables → scores → OSEI → supervisor → attestation → HR → VC.
   - [ ] All signatures appear.
   - [ ] A "computer-generated document" line appears at the bottom of the printout (but **not** on the screen).
   - [ ] Choosing **Save as PDF** as the printer saves a PDF file.

---

### Scenario I: HR tools for problem cases

**Log in as: HR.** You need an appraisal that has **not** been submitted by the staff member yet. Create one with Scenario A if needed.

1. **Staff progress overview:** open **Staff Progress**.
   - [ ] Every appraisal is listed, with Information / Self Rating / Supervisor Rating / HR / VC shown as Done/Signed or Pending.
   - [ ] The *All appraisal periods* filter and the search box work.
2. **Change supervisor:** open an appraisal (eye icon) → **Change supervisor**. Search by full name and pick someone.
   - [ ] "Supervisor updated". The new supervisor's name and rank appear on the appraisal.
   - [ ] The appraisal now shows in the **new** supervisor's Appraisees list, not the old one's.
3. **Change form:** on the same appraisal, click **Change form**, choose a different form and confirm.
   - [ ] "Form changed". The sections and items change to the new form.
   - [ ] After the staff member has submitted, the **Change form** button is no longer offered.
4. **Staff with no supervisor:** if a staff member has no supervisor on the organisation chart:
   - [ ] HR still sees a yellow warning when opening the period, but it opens anyway.
   - [ ] *Staff Progress* shows **Not assigned** in red for that person.
   - [ ] HR receives a notification about appraisals without a supervisor.
   - [ ] **Assign supervisor** fixes it.

---

### Scenario J: Who can see what

| Check | Expected result |
|---|---|
| Staff opens Performance Appraisal from the HR menu (or types `/hr/appraisals` in the address bar) | [ ] Not allowed; the menu item is not shown |
| Staff opens **Appraisal Final Review** (`/appraisals/vc`) | [ ] Not allowed |
| HR (not VC) sees **Appraisal Final Review** in the menu | [ ] Not shown |
| Supervisor sees appraisals of people who are **not** their appraisees | [ ] Not shown |
| Staff tries to change ratings after submitting | [ ] Not possible |
| Supervisor tries to rate before the staff member has submitted | [ ] Button shows **Awaiting Self-Rating** and is disabled |
| VC tries to sign before HR has signed | [ ] Appraisal does not appear as *Awaiting VC Review* |

---

## 4. Which form each person should get

When HR opens an appraisal period, each person is given a form automatically. Check that the right person gets the right form, and that each form has the same sections and items as the old system.

| Person | Form they should get | Sections | Items |
|---|---|---|---|
| Lecturer | Performance Appraisal Form for Lecturer | 10 | 30 |
| Teaching Assistant | Performance Appraisal Form for **Lecturer** | 10 | 30 |
| Associate Professor | Performance Appraisal Form for **Lecturer** | 10 | 30 |
| Assistant Lecturer | Performance Appraisal Form for Assistant Lecturer | 10 | 30 |
| Senior Lecturer | Performance Appraisal Form for Senior Lecturer | 10 | 38 |
| Professor | Performance Appraisal Form for Professor | 10 | 38 |
| Head of Department | Performance Appraisal Form for Head of Department | 9 | 28 |
| Laboratory Technologist | Performance Appraisal Form for Laboratory Technologist | 7 | 25 |
| ICT Manager | Performance Appraisal Form for ICT Manager | 12 | 21 |
| Librarian | Performance Appraisal Form for Librarian | 8 | 26 |
| Academic Registrar | Performance Appraisal Form for Academic Registrar | 8 | 37 |
| Director Finance | Performance Appraisal Form for Director Finance | 8 | 34 |
| Anyone else (e.g. accountants, officers) | Administrative Staff KPI Form | 4 | 12 |

Notes:
- Teaching Assistants and Associate Professors getting the Lecturer form is **correct**. The old system did the same.
- A staff member who heads a department gets the Head of Department form, even if their rank is Lecturer or Senior Lecturer.
- To compare wording with the old system, open the form under **Performance Appraisal → Form Templates → Preview**.

---

## 5. Checking the scores

The scores are worked out the same way as in the old system. You can check them with a calculator.

**Section score.** Add up the ratings in the section, then divide by the maximum (3 points per item):

> Example: 5 items rated 3, 3, 3, 3, 0 → 12 ÷ 15 = **80%**

**N/A items are skipped.** They are left out of both the points and the maximum:

> Example: 5 items rated 3, 3, N/A, 3, 3 → 12 ÷ 12 = **100%**

**Overall score.** The average of all the section scores, rounded to a whole number. Every section counts equally, however many items it has:

> Example: section 1 = 100%, every other section = 0% (10 sections) → overall = **10%**

Quick checks you can do:

- [ ] Every item rated **3** → overall **100%**
- [ ] Every item rated **2** → overall **67%**
- [ ] Every item rated **0** → overall **0%**

**OSEI band.** The tick in the OSEI table follows the overall score. On the staff self-assessment it follows the self score. After the supervisor has rated, it follows the supervisor's score.

| Overall score | OSEI band |
|---|---|
| 90% – 100% | 3 – Outstanding |
| 75% – 89% | 2 – Competent |
| 65% – 74% | 1 – Developing |
| 64% or less | 0 – Below Expectations |

- [ ] Test the edges: 90% → Outstanding, 89% → Competent, 75% → Competent, 74% → Developing, 65% → Developing, 64% → Below Expectations.

---

## 6. Known differences and limits (please don't report these as bugs)

| What | Why |
|---|---|
| No appraisal **emails** | The ERP doesn't send email yet. Notifications appear in the bell icon instead. |
| **Print / Save as PDF** opens the print window instead of downloading a file straight away | Choose "Save as PDF" in the print window to get a PDF. |
| Staff **can't choose their own supervisor** | The supervisor comes from the organisation chart. HR can change it for one appraisal. |
| Staff **can't choose the appraisal type** | HR sets it when opening the period. |
| The OSEI band **can't be ticked by hand** | It is set from the score automatically. In the old system the staff tick was never saved anyway. |
| No **agree / disagree** step after the supervisor rates | Same as the old system: the staff member's signed attestation is their agreement. |
| HR **can't yet** send an annual appraisal to just one **department or school** | Annual and mid-term go to whole staff categories. Probation, end-of-contract and special reviews go to chosen people. |
| In **Form Templates → Edit**, sections can't be added, renamed or removed | Items inside a section can be added, edited and removed. Also, a section's "(Weight: …)" label doesn't update when items are added or removed. The scores are still correct. |

---

## 7. How to report a problem

For each problem, please send:

1. **Title:** a short description (e.g. "Supervisor overall score doesn't match the section scores").
2. **Account used:** HR / Staff / Supervisor / VC.
3. **Scenario and step:** e.g. "Scenario D, step 5".
4. **What you did:** the exact clicks and what you typed.
5. **What you expected:** what this guide (or the old system) says should happen.
6. **What happened instead:** including any message shown on screen.
7. **Screenshot:** of the whole screen if possible.
8. **Date and time** you saw it.

If the page goes blank or shows an error, also note the address shown in the browser's address bar.
