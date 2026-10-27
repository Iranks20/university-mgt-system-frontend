# Timetable Coverage, Lecturer Workload & Timetable Columns in QA Reports

For VC, QA, Deans and HoDs who need to answer: what was scheduled, what should have been taught, what was taught, and what was lost.

## Where

Reports & Analytics (`/reports`):

- **Timetable Coverage** — every class scheduled in the selected term.
- **Lecturer Workload** — planned hours per lecturer (week + term) vs taught.
- School / Department / Lecturer / Course Unit summaries now carry timetable columns next to the existing QA-record columns.
- **Course Unit Summary** leads with **TT EXPECTED** / **TT HOURS**, then **Sessions/week** and **Hrs/week**, then recorded expected. Column headers have brief info icons.

Use the Academic Term filter at the top of Reports first. Term is the master scope.

## Definitions (same everywhere, screen and exports)

- **Recorded Expected** (existing, unchanged): QA records marked Taught + Untaught.
- **Timetable Expected** (TT EXPECTED / TT HOURS): dated sessions expanded from each class's weekly timetable pattern across the term dates. A 2-hour Monday class over 14 Mondays = 14 sessions / 28 hours. This is the total expected that comes directly from the timetable.
- **Sessions/week · Hrs/week** (Course Unit Summary): weekly load from the class timetable pattern (one slot per scheduled class day/time). Summed when a course-unit row rolls up more than one class.
- **No Record**: elapsed timetable sessions with no QA action (includes pending seeds). This is an investigation list, not proof the lecturer was absent.
- **Taught Hours**: actual QA duration for Taught / Substituted / Compensation sessions. If a record has no actual duration, scheduled length is used and counted as estimated.
- **Lost Hours**: elapsed timetable hours − taught hours (recorded untaught + no-record).
- **Coverage %**: taught hours ÷ elapsed timetable hours. Future sessions are never counted as lost.
- Approved cancellations are excluded from expected. Classes with no lecturer are listed as Unassigned and excluded from lecturer workload.

## QA test guide

### Before you start

- Log in with a QA, Admin or VC account that can open Reports & Analytics (`/reports`).
- You need one term with real timetable data. Use the Active term unless you are specifically testing an old term.
- Keep a calculator handy. Most checks are arithmetic you verify by hand on one or two classes.

### Step 1 — Set the scope (do this first, every time)

1. Open Reports & Analytics.
2. Set the Academic Term filter at the top to the term you are testing. Every tab and number below follows this term.
3. Leave the date range as the full term unless a step says otherwise.

**Pass:** switching the term changes the totals. **Fail:** numbers stay identical after switching terms.

### Step 2 — Timetable Coverage tab

1. Open **Timetable Coverage**. Note the summary cards: classes, timetable sessions, timetable hours.
2. Search for one class you know (e.g. a Monday 08:00–10:00 class). Confirm it appears with the right lecturer, day and time.
3. Hand-check the hours: weekly hours × number of teaching weeks in the term = the class's **TT Hours**. Example: 2 hrs/week × 13 weeks = 26 TT hours, 13 sessions.
4. Click **View** on the class. You should see dated sessions, each with an outcome: Taught, Untaught, No record, Pending, Cancelled or Scheduled (future).
5. Filter the session list by **No record**. These are elapsed sessions nobody acted on — this is the VC's investigation list.

**Pass:** session count and TT hours match your hand calculation; future sessions show as Scheduled, never as lost. **Fail:** TT hours count only a few weeks (under-counting), or future sessions appear as No record.

### Step 3 — Lecturer Workload tab

1. Open **Lecturer Workload**. Pick a lecturer who teaches several classes.
2. Add up the weekly lengths of their classes from the timetable. The total must equal their **Hrs/week**.
3. Their **Term hrs** must equal the sum of TT Hours for their classes in Coverage (Step 2).
4. Type a number in **Min hrs/week** (e.g. 10). Only lecturers at or above it remain. This is the overload-candidate view — there is no fixed university threshold in the system.
5. Check the taught column against that lecturer's QA records for the same period.

**Pass:** hrs/week and term hours match your sums; the filter only hides people, never changes anyone's numbers. **Fail:** a co-taught class counts planned hours for two lecturers (planned load counts the primary lecturer only), or a lecturer with classes is missing entirely.

### Step 4 — No Record is not "Missed by Lecturer"

1. From Step 2, take one elapsed **No record** session (class, date, lecturer).
2. Open the Lecturer Summary and find that lecturer. The session must count under **No Record**, not under Missed by Lecturer.
3. Record a QA action for that session (mark it Taught or Untaught) and reload. It must move out of No Record into the matching recorded column.

**Pass:** No Record drops and recorded counts rise by the same session. **Fail:** an untouched session is reported as Missed by Lecturer, or acting on it changes nothing.

### Step 5 — Summary reports (School, Department, Lecturer, Course Unit)

For each of the four summary tabs:

1. **REC. EXPECTED** must still equal Taught + Untaught, exactly as before this feature. This number did not change.
2. **TT EXPECTED / TT HOURS** come from the timetable. They are usually higher than Recorded Expected. The gap = No Record sessions + sessions still in the future.
3. **LOST HRS** = elapsed timetable hours − taught hours. It must never include future sessions.
4. A lecturer who has timetable classes but zero QA actions must still appear in the Lecturer Summary (timetable-only row), so their lost hours are visible.

**Fail examples:** Recorded Expected changed from what QA saw before; Lost Hours grows when you extend the date range into the future; a lecturer with classes but no QA records is missing.

### Step 6 — Edge cases (spot-check what you can)

- **Approved cancellation:** cancel a session through the proper approval flow. It must disappear from expected/ lost numbers entirely.
- **Unassigned class:** a class with no lecturer appears in Coverage flagged Unassigned, and in no lecturer's workload.
- **Substituted session:** a session taught by a substitute credits the scheduled lecturer as before; workload taught hours still reflect it.
- **Old term:** switch the term filter to a closed term. Numbers must reflect that term's timetable, not the current one.

### Step 7 — Exports

1. Export each summary to Excel and Coverage/Workload to CSV.
2. The files must contain the same timetable columns as the screen (TT Expected, TT Hours, No Record, Taught Hrs, Lost Hrs, Coverage) with the same values for the same filters.

**Fail:** exported numbers differ from the screen for identical filters, or columns are missing.

### Reporting a bug

Include: term selected, tab, class/lecturer name, the session date, what you calculated by hand, what the screen showed, and a screenshot. "Hours are wrong" without the class and term cannot be reproduced.

## Notes

- Changing a class's day/time/lecturer on the timetable changes future expected sessions; past dated slots already generated keep their history.
- Co-taught classes count planned load for the primary lecturer only. Substituted sessions credit the scheduled lecturer in summaries, as before.
