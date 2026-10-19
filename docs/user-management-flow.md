# User management — QA test guide (KCU)

Use this guide to understand how people get into the system, how the organisation chart gives them menus, and how to test end-to-end. It is written for testers, not developers.

---

## Big picture (read this first)

KCU does **not** create most people as “system accounts” with old labels like QA, HR, or Management.

Instead:

1. **HR creates the person** (employee + login) under **HR → Employees**.
2. **HR places them** in a department or office on that same form.
3. For leadership and office jobs (Dean, QA officer, HR manager, Head of department, …), **HR appoints them on the organisation chart** under **HR → Organisation Structure**.
4. **Menus come from the post** they hold on the chart (plus a small baseline from account type for lecturers / staff / timekeeper).

**Exceptions (not on the org chart):**

| Who | How they get access |
|-----|---------------------|
| **Student** | Created via student create / import. Menus come from the **Student** portal role. |
| **Admin (ICT)** | Special ICT login. Menus come from the **Admin** portal role. |

Everyone else (lecturers, Deans, QA, HR officers, gate / timekeeper, office staff) starts as an **employee in HR**.

### Account types you may pick in HR

When adding or editing an employee under **System access → Account type**, HR can only choose:

| Account type | Use for |
|--------------|---------|
| **Automatic / Staff** | Most office and support people |
| **Lecturer** | Teaching staff (or Automatic when category is Academic) |
| **Timekeeper** | Gate / attendance desk (check staff in and out) |

Do **not** look for QA, HR, Dean, or Management as account types. Those jobs are given by **appointing** the person on the organisation chart.

---

## Screens you will use

| Menu / URL | What you do there |
|------------|-------------------|
| **HR → Employees** (`/hr/employees`) | Create and edit employees; set account type; reset password |
| **HR → Organisation Structure** (`/hr/organisation`) | Build / rearrange the chart; appoint heads and members |
| **Admin → Lecturers** (`/admin-lecturers`) | Assign classes to lecturers; lecturer login helpers |
| **Admin → Administration** (`/admin-administration`) | Non-teaching people list; unlock; reset password; view access; rare extra roles |
| **Admin → Roles & Permissions** (`/admin-roles`) | See / edit what each **Position**, **Portal** (Admin + Student only), or **Custom** role can do; link offices to position roles; permission catalog |

Sign in as **Admin** for full setup. An HR officer needs an HR appointment (see “Create an HR officer” below) before they can run HR day-to-day.

---

## How access works (simple)

```text
Employee created in HR
        ↓
Placed in a department or office
        ↓
(If needed) Appointed as Head or Member on Organisation Structure
        ↓
They sign in → change temporary password → see menus for that post
```

| Person | Create in | Extra step | They should see |
|--------|-----------|------------|-----------------|
| Lecturer | HR → Employees (Academic) | Assign classes (optional) | Lecturer menus |
| Dean of a school | HR → Employees, then appoint **Head** on that **School** | — | School oversight for their school |
| Head of department | HR → Employees, then appoint **Head** on that **Department** | — | Department oversight |
| HR manager / officer | HR → Employees (office = HR), appoint on **Human Resource** | Head = manager, Member = officer | HR module |
| QA officer | HR → Employees, appoint under **Quality Assurance** | — | QA menus |
| Clinical QA / coordinator | HR → Employees, appoint under **QA Clinical** | — | Clinical QA menus |
| Timekeeper (gate) | HR → Employees, account type **Timekeeper** | Prefer home office Estates & Security | Attendance desk |
| Student | Student create / import | — | Student portal |
| Admin | ICT / seeded | — | Full admin |

After changing someone’s appointments or permissions, ask them to **refresh** or **sign out and sign in** (changes usually show within about a minute).

---

## Part A — Organisation structure

### What the chart is for

The organisation structure is the university tree: VC, DVC, schools, departments, HR, QA, Estates, Registry, and so on.

- Every office / school / department can have a **Head** and other **appointments** (members).
- The **head** of a school is the **Dean**.
- The **head** of a department is the **Head of Department**.
- Office heads and members get the menus wired for that office (e.g. HR head → HR Manager menus).

You can rearrange units (rename, move, add empty offices) on this screen. Only remove a unit when it has **no** sub-units, staff homes, or active appointments.

### Test: open and explore the chart

1. Sign in as Admin.
2. Go to **HR → Organisation Structure**.
3. Confirm you can expand the tree and select units (e.g. a School, Human Resource, Estates & Security, Quality Assurance).
4. For a selected unit, check you see:
   - Head section (may be vacant)
   - Other appointments
   - Actions to appoint / end appointment

**Pass:** Chart loads; selecting a unit shows head and members.

### Test: appoint a Head (example — Dean)

1. Pick an employee who already exists (or create one first — Part B).
2. Open the **School** unit on the chart.
3. Appoint that person as **Head** (title should reflect Dean).
4. Sign in as that person (or View access as Admin).
5. Confirm they get school-level menus and only (or mainly) their school’s data.

**Pass:** Appointment saves; person sees Dean-style access for that school.

### Test: appoint a Member (example — HR officer)

1. Open **Human Resource** on the chart.
2. Add appointment as **member** (not head), using an existing Staff employee placed in HR.
3. Sign in as that person.
4. Confirm they can use HR screens (employees, etc.) but may not have final leave-approval powers if they are an officer rather than manager.

**Pass:** Member appointment grants HR menus without needing account type “HR”.

### Test: rearrange structure (light)

1. Rename an office or change its parent (if allowed).
2. Confirm the tree updates after save.
3. Confirm employees still appear under the correct placement on **HR → Employees**.

**Pass:** Structure changes stick; no employees “lost”.

---

## Part B — Create employees (HR)

Always create people here — **not** from Administration.

### Test: search and filters on Employees

1. Go to **HR → Employees**.
2. Confirm the **search box is full width** above the filters.
3. Search by name, staff number, or email across the directory (not only the current page).
4. Filter by category, office, school, department, status.

**Pass:** Search returns matching people; layout is usable; filters reload the list.

### Test: create a lecturer

1. **Add Employee**.
2. Fill names, email, phone as needed.
3. Category: **Academic**; placement: **Academic department**; choose school + department.
4. Job title e.g. Lecturer / Senior Lecturer.
5. Account type: **Lecturer** (or Automatic).
6. Leave temporary password blank (system generates one) or set one that meets the password rules.
7. Save. Note any temporary password shown once.
8. Sign in as that lecturer → forced password change → lecturer home / menus.
9. (Optional) **Admin → Lecturers** → assign classes.

**Pass:** Employee + login created; lecturer can sign in; classes can be assigned.

### Test: create ordinary office staff

1. Add Employee.
2. Category: Administrative or Support.
3. Placement: **Office or unit** (e.g. Finance, ICT).
4. Account type: **Staff** (or Automatic).
5. Save, then appoint on the chart if they need office menus (head or member).

**Pass:** Login works; menus appear after appointment (if the office has a position role).

### Test: edit employee — account type visible

1. Open an existing Staff or Lecturer employee → Edit.
2. Under **System access**, confirm **Account type** is shown and editable for Staff / Lecturer / Timekeeper.
3. Change Staff ↔ Lecturer (where appropriate), save, sign in again as that user.

**Pass:** Account type is present on edit and saves correctly.  
**Note:** Protected logins (e.g. Admin) should show account type as read-only if linked.

---

## Part C — Recipes for common people

Use these as full scenarios. Create the person in HR first, then appoint when the recipe says so.

### 1) Gate keeper / Timekeeper (attendance desk)

**Goal:** Someone who checks staff in and out at the gate/desk.

1. HR → Employees → Add Employee.
2. Place them preferably under **Estates & Security** (office placement).
3. Account type: **Timekeeper** (required for the desk).
4. Save and capture temporary password.
5. (Optional but recommended) Organisation Structure → Estates → appoint as **member** (Timekeeper post).
6. Sign in as that user.

**Pass:** Home / main work area is the **Attendance Desk**; they can check employees in and out.  
**Fail:** They only see Staff menus and no desk — account type was not Timekeeper, or permissions missing.

### 2) Lecturer

See **Part B — create a lecturer**. No org-chart appointment is required for basic lecturer access. Appointing them as Head of Department or Dean is a **separate** leadership step.

### 3) Dean of a school

1. Create an academic employee in a department under that school (often still category Academic / Lecturer).
2. HR → Organisation Structure → select the **School**.
3. Appoint them as **Head**.
4. Sign in as that person.

**Pass:** They see school oversight (students / staff / academic views scoped to their school). Their “home” department on the employee record can stay as their teaching department.

### 4) Head of Department

1. Create academic employee in that department.
2. Organisation Structure → that **Department** → appoint as **Head**.
3. Sign in.

**Pass:** Department-scoped oversight menus.

### 5) HR manager (first HR user on a fresh system)

1. Sign in as Admin.
2. HR → Employees → Add Employee under **Human Resource** office, account type **Staff**.
3. Organisation Structure → Human Resource → appoint as **Head** (HR Manager).
4. Sign in as that HR user → change password → use HR menus.

**Pass:** HR module available.  
**Do not** look for an account type named “HR”.

### 6) QA officer

1. Create Staff employee (office placement under Quality Assurance if possible).
2. Organisation Structure → Quality Assurance → appoint as **member** (or Head for Director).
3. Sign in.

**Pass:** QA menus (lecture records / QA work), not full Admin.

### 7) Clinical QA / Clinical Coordinator

1. Create Staff employee.
2. Appoint under **QA Clinical** — member for Clinical QA, head (or appropriate title) for Clinical Coordinator.
3. Sign in.

**Pass:** Clinical menus; university-wide QA reports are not required for Clinical QA.

### 8) Student

1. Create or import a student (student flows — not HR Employees).
2. Sign in as student.

**Pass:** Student portal only.  
Menus for all students are controlled under **Admin → Roles & Permissions → Roles → Portal → Student → Permissions**.

---

## Part D — Roles, permissions & groups (how the console works)

This is the part that explains **Admin → Roles & Permissions** (`/admin-roles`). Read this before changing ticks on a role.

### Plain words: role vs permission vs group

| Term | Think of it as | Example |
|------|----------------|---------|
| **Permission** | One capability / menu key | “Can open Attendance Desk”, “Can read students” |
| **Permission group** | A folder that bundles related permissions so the list is easier to scan | “HR”, “Academic”, “Attendance Desk” |
| **Role** | A named pack of permissions you assign somehow | “Dean of School”, “HR Manager”, “Student”, “Admin” |

**Groups do not grant access by themselves.** They only organise the catalog. Access comes from **roles** that have those permissions ticked.

**People do not pick a “group” when they sign in.** They get the **sum** of:

1. Baseline from **account type** (Staff / Lecturer / Timekeeper — set in HR), plus  
2. Every **position role** from active org-chart appointments (Dean, QA officer, …), plus  
3. Any rare **additional custom roles** attached in Administration, plus  
4. For Admin / Student only — the **Portal** role.

There is **no day-to-day “switch my role” screen** for end users. If someone is both a Lecturer and a Dean, they keep **both** sets of permissions at once (combined menus). “Switching” in this guide means switching **tabs and filters** on the Roles console while you test.

### The three tabs (switch between these)

Open **Admin → Roles & Permissions**. You will see three tabs:

```text
[ Roles ]   [ Organisation ]   [ Permissions ]
```

| Tab | Purpose | When QA uses it |
|-----|---------|-----------------|
| **Roles** | List of role packs. Open one → **Permissions** to tick/untick what that role can do. | Change what Deans / HR Managers / Students can see |
| **Organisation** | For each office/school/unit: which **Position role** the **Head** gets and which the **Members** get | Wire “Human Resource head → HR Manager role” |
| **Permissions** | Master list of permission codes + **Groups** that organise them | Add/rename a group; create a permission; see which menus a code unlocks |

**How they connect:**

```text
Permissions tab          Roles tab                 Organisation tab
(catalog + groups)  →  (role has ticks)  →  (unit head/member uses that role)
                                                    ↓
                                         HR appoints person on chart
                                                    ↓
                                              Person sees menus
```

Changing ticks on a **Position** role affects everyone currently appointed to posts that use that role (after refresh / re-login).  
Changing the **Organisation** tab changes which role a unit’s head/members get from then on.

### Role types (filter on the Roles tab)

On **Roles**, use the type filter:

| Filter | What you should see | Who gets it |
|--------|---------------------|-------------|
| **Position** | Dean, HR Manager, QA Officer, Timekeeper (position), Head of Department, … | Via **org chart appointment** (and Organisation tab wiring) |
| **Portal** | **Admin** and **Student** only | Admin login / student login — **not** on the org chart |
| **Custom** | Rare one-off packs | Attached to one person under Administration → additional roles |
| **All types** | Everything above | — |

**Pass check:** Portal filter must **not** list Staff, Lecturer, QA, HR, Management as portal roles. Lecturers are HR employees; office jobs are Position roles + appointments.

Each role also has a **scope**:

- **University** — data/menus across the institution (e.g. HR Manager, Academic Registrar).  
- **Unit** — limited to that person’s unit and units under it (e.g. Dean sees their school; HoD sees their department).

### Permission groups (Permissions tab + inside role editor)

1. Go to **Permissions** tab.  
2. Top section **Groups** — folders such as Academic, HR, etc. You can Add / Edit / Delete a group.  
3. Below that, the **permission catalog** — each row has a code, label, optional group, and which **menus** it unlocks.

When you open a role’s **Permissions** button (from the Roles tab):

1. Permissions appear **grouped** in sections.  
2. Use the **group filter** (e.g. “All groups” vs one group) to focus.  
3. Use **Select all / Clear group** on a section to tick or untick a whole folder at once.  
4. Search by name/code if needed.  
5. **Save**.

**Pass:** Groups only change how the list is organised; turning off a group does not remove a role’s ticks unless you clear them and save on that role.

### Test: switch tabs and understand the link

1. **Roles** → filter **Position** → open **Dean of School** → Permissions → note a few ticks (e.g. students / academic).  
2. Switch to **Organisation** → find a School unit → confirm Head is linked to the Dean position role (or equivalent).  
3. Switch to **Permissions** → find one of those permission codes → confirm it shows menu labels.  
4. Switch back to **Roles** → filter **Portal** → open **Student** → Permissions → change nothing yet; just confirm only student-relevant packs.  

**Pass:** You can explain: “This permission lives in a group → is ticked on this role → this unit’s head uses that role → appointed people get it.”

### Test: change a role’s permissions (safe practice)

1. Pick a **test** Position or Custom role (prefer not live VC on production).  
2. Roles → **Permissions** → turn **one** known menu permission off → Save.  
3. Sign in as a user who has that role via appointment → refresh / re-login.  
4. Confirm the menu disappeared.  
5. Turn the permission back on → Save → re-login → menu returns.

**Pass:** Menu follows the role ticks.  
**Fail:** Menu never changes — wrong role, user not appointed to that post, or session not refreshed.

### Test: Organisation wiring

1. Organisation tab → pick **Estates** (or equivalent).  
2. Confirm member (or head) role includes the Timekeeper **position** role if that is how gate access is designed.  
3. Appoint a Staff person as member; if they still need the desk, also ensure HR account type is **Timekeeper** (desk baseline).  

**Pass:** Chart wiring matches the access you expect in View access.

### Administration (`/admin-administration`)

Use for:

- Finding non-teaching people  
- Unlock locked accounts  
- Reset password / force change at next sign-in  
- **View access** — shows every **source** of access (account type, each position appointment, additional roles) and data scope  
- Rare **additional custom roles** (prefer chart appointments for normal jobs)

**Do not** use Administration to create new employees.

### Test: Portal roles only Admin + Student

1. Open Roles → filter Portal.  
2. Confirm you see **Admin** and **Student** only.

**Pass:** Portal list is Admin + Student only.

### Test: missing menu troubleshooting

1. Administration → person → **View access** — which grants appear?  
2. Appointed on the right office? Account type Timekeeper if they need the desk?  
3. Roles → that Position / Portal role → Permissions — is the capability ticked?  
4. Organisation tab — does that unit’s head/member point at the expected role?  
5. Refresh / re-login.

---

## Part E — Password & lockouts

1. Create an employee with a known temporary password (or use the generated one).
2. First sign-in must force a password change.
3. Lock an account with failed attempts (or use Admin tools) → unlock from Administration.
4. Reset password from Administration or HR edit → user must change it again at next sign-in.

**Pass:** Unlock and reset work; temporary passwords are not reused after change.

---

## Suggested end-to-end test day (order)

Work through in this order so dependencies exist:

1. **Explore organisation chart** (Part A) — know where Schools, HR, QA, Estates are.
2. **Create HR manager** (recipe 5) — then use that login for later HR work if required.
3. **Create lecturer** + assign a class.
4. **Appoint a Dean** and a **Head of Department**; compare what each sees.
5. **Create Timekeeper**; check someone in/out on the Attendance Desk.
6. **Create QA officer** via appointment; open a QA screen.
7. **Create a student**; confirm student portal.
8. **Edit employee** — confirm Account type on edit; search on Employees works.
9. **Roles / Organisation / Permissions tabs** — switch tabs; Portal = Admin + Student; open a role’s Permissions; use group filter / select-all group; confirm Organisation wires units to position roles.
10. **View access** for one appointed person — sources (account type + appointments) make sense.
11. Optional: turn one permission off on a test role → confirm menu disappears after re-login → restore it.

---

## Common mistakes (watch for these in bugs)

| Mistake | What should happen instead |
|---------|----------------------------|
| Looking for account type “Dean”, “QA”, or “HR” | Create Staff/Lecturer, then **appoint** on the chart |
| Creating people only in Administration | Always create in **HR → Employees** |
| Expecting Timekeeper menus without account type Timekeeper | Set account type **Timekeeper** in HR |
| Expecting Dean menus without Head appointment on the School | Appoint as Head on that School |
| Searching employees and finding nothing on other pages | Search is server-wide — if still empty, check spelling / filters |
| Changing permissions and not re-logging | Refresh or sign out/in after ~1 minute |
| Portal Roles list full of old office types | Should be **Admin** and **Student** only |

---

## Quick pass / fail checklist

- [ ] Employees are created from HR, not Administration  
- [ ] Account type on create **and** edit shows Staff / Lecturer / Timekeeper (and Automatic on create)  
- [ ] Employee search is full width and finds people across pages  
- [ ] Organisation chart can appoint Head and Member; ending an appointment removes that access after re-login  
- [ ] Lecturer works from HR academic create  
- [ ] Dean works via School **Head** appointment  
- [ ] Timekeeper reaches Attendance Desk  
- [ ] HR / QA access comes from chart appointments  
- [ ] Portal roles = Admin + Student only  
- [ ] Tester can explain role vs permission vs group  
- [ ] Switching Roles ↔ Organisation ↔ Permissions tabs makes sense (catalog → role ticks → unit wiring → appointment)  
- [ ] Role Permissions UI: group filter and select/clear group work; Save updates access after re-login  
- [ ] Administration can unlock / reset / View access  
- [ ] No Sync button that resets all permission grants on Roles  

---

## Out of scope for this guide

Self-service password reset, 2FA, SSO, and advanced “who has this permission” analytics are not part of the current test flow.
