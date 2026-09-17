# KCU University Management System (ERP)

Progress and capability map of the **KCU ERP** against a **full university management / ERP platform** (academic operations, teaching quality, students, clinical, HR, graduation, and learning).

Use this document for stakeholder presentations and roadmap planning.

---

## How to read this comparison

| Status | Meaning |
|--------|---------|
| **Done** | Implemented and usable in the current system |
| **Partial** | Started or limited scope; not a full module yet |
| **Missing** | Expected in a complete university ERP / LMS stack; not built yet |

Columns:

| Current KCU ERP | Full university ERP / LMS (target) |
|-----------------|--------------------------------------|
| What we have today | What a complete platform typically covers |

---

## 1. Access, identity & security

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Email/password login (JWT) | Same + SSO (Microsoft/Google/SAML/LDAP) | Partial |
| System roles (Admin, Management, QA, Lecturer, Student, HR, Clinical, Graduation, etc.) | Same + finer institutional roles | Done |
| Fine-grained permission matrix + custom roles | Enterprise RBAC / ABAC with org scopes | Done |
| User account admin (create, reset password) | Full IAM, MFA, password policies, session admin | Partial |
| — | Multi-factor authentication (MFA) | Missing |
| — | Single sign-on / directory sync | Missing |
| Org scope fields in schema | Campus / school / department data scoping enforced everywhere | Partial |

---

## 2. Academic structure & curriculum

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Schools, levels, departments | Same | Done |
| Programmes, intakes, specialisation streams | Same | Done |
| Courses / course units, curriculum tree | Same + curriculum versioning & approval workflow | Partial |
| Classes / offerings, venues, lecturer pool | Same | Done |
| Academic terms (activate, registration windows, close) | Same | Done |
| Term rollover & cohort promotion | Same + automated fee/registration gates | Done |
| Academic calendar events | Full academic calendar with exam & holiday rules | Partial |
| Mock curriculum management UI | Formal curriculum change requests, senate approval, version history | Missing |

---

## 3. Timetable & scheduling

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Timetable import (CSV/Excel) & export | Same + SIS/ERP connectors | Done |
| Timetable builder by intake / term | Same | Done |
| Personal timetable (lecturer & student) | Same + mobile calendar sync | Done |
| Conflict checks (lecturer / venue) | Advanced optimisation, room utilisation analytics | Partial |
| — | Exam timetable generation | Missing |
| — | Automated resource optimisation / AI scheduling | Missing |

---

## 4. Attendance & campus presence

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Lecturer check-in/out (geofence) | Same + biometric / device options | Done |
| Student session attendance (Present / Late / Absent / Excused) | Same | Done |
| Daily marking grid & coverage | Same | Done |
| Shared attendance metrics & at-risk students | Same + early-warning workflows to advisors | Done |
| Staff timeclock | Full workforce time & attendance with shifts | Partial |
| Class / course-wise / weekly matrix reports | Same + regulatory attendance compliance packs | Done |
| — | Offline / mobile-first attendance apps at scale | Missing |

---

## 5. Teaching quality assurance (QA)

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Lecture records (taught / untaught / substituted / compensation / SDL / assignment) | Same | Done |
| Co-teaching lecturers on one session | Same | Done |
| Substitute lecturer capture (search all staff) | Same | Done |
| Teaching reconciliation (scheduled vs delivered) | Same | Done |
| School / lecturer / course unit summaries + Excel | Same + accreditation packs | Done |
| Cancellations & substitutions with approval | Same | Done |
| Compensation tracking | Same | Done |
| — | Peer observation / teaching evaluation surveys | Missing |
| — | External examiner / moderation workflows | Missing |

---

## 6. Students, enrolment & lifecycle

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Student master records (CRUD, import/export) | Same | Done |
| Lifecycle: Active / On Leave / Withdrawn / Suspended / Completed | Same | Done |
| Admin enrolment + cohort sync | Same | Done |
| Student self registration / drop (term windows) | Same | Done |
| Public student info correction + admin review | Same | Done |
| Holdback / promotion eligibility support | Same | Done |
| — | Full admissions CRM (applications, offers, clearing) | Missing |
| — | Online application portal & applicant tracking | Missing |
| — | Document verification / KYC for admissions | Missing |

---

## 7. Learning & academic delivery (LMS)

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Operational teaching & attendance data | Learning content, activities, and grades | Partial (ops only) |
| — | Course sites / virtual classrooms | Missing |
| — | Learning materials (files, videos, SCORM/xAPI) | Missing |
| — | Assignments, quizzes, forums, announcements | Missing |
| — | Gradebook & continuous assessment | Missing |
| — | Plagiarism checks | Missing |
| — | Moodle / Canvas / Blackboard sync (or built-in LMS) | Missing |
| — | Student learning analytics (engagement, progress) | Missing |

> KCU ERP today is strong on **operations and QA**. A full university stack also needs a **Learning Management System (LMS)** layer (built-in or integrated).

---

## 8. Assessment, exams & transcripts

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| — | Exam registration & seating | Missing |
| — | Mark entry, moderation, results publishing | Missing |
| — | GPA / CGPA as official academic record | Missing |
| — | Transcripts & certificates generation | Missing |
| — | Retakes, appeals, academic misconduct cases | Missing |
| Attendance-linked “performance” views | True academic performance from marks | Partial |

---

## 9. Fees, finance & student billing

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| — | Fee structures by programme / intake | Missing |
| — | Invoices, receipts, payment plans | Missing |
| — | Online payments (mobile money / cards / bank) | Missing |
| — | Sponsorships, scholarships, bursaries | Missing |
| — | Registration blocked until fees cleared | Missing |
| — | Finance reports & reconciliation | Missing |

---

## 10. Clinical teaching

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Clinical sites, instructors, cohorts, rotations | Same | Done |
| Clinical sessions, attendance, verification | Same | Done |
| Eligibility policies & clinical reports | Same | Done |
| Dedicated Clinical Coordinator / QA Clinicals roles | Same | Done |
| — | Clinical logbooks / competency portfolios | Missing |
| — | Hospital system integrations | Missing |

---

## 11. Human resources

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Staff / employee directory | Same | Done |
| HR dashboard & staff attendance overview | Same | Done |
| Performance appraisals (templates, cycles, review) | Same | Done |
| Onboarding visibility (new / probation) | Full onboarding checklists & workflows | Partial |
| Appraisal archives as documents | Full HR document management | Partial |
| Report stubs for leave / contracts | Leave, contracts, payroll, recruitment | Missing |
| — | Recruitment / ATS | Missing |
| — | Payroll & statutory deductions | Missing |

---

## 12. Graduation & alumni

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Public graduand registration | Same | Done |
| Graduation event, committees, expenses, checklists | Same | Done |
| Registration admin & Excel export | Same | Done |
| — | Certificate / parchment printing workflow | Missing |
| — | Alumni portal & lifelong engagement | Missing |

---

## 13. Reports, analytics & management

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Role dashboards (Admin, QA, Management, Lecturer, Student, HR, Clinical, Graduation) | Same | Done |
| Teaching QA, attendance, reconciliation, at-risk students | Same | Done |
| Management overview, risk, enrolment health | Same | Done |
| Excel / print exports | Same + scheduled report packs | Done |
| — | Institutional research data warehouse / BI | Missing |
| — | Regulatory / accreditation report packs (NCHE, etc.) | Missing |

---

## 14. Communication, portal & self-service

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| In-app notifications | Same + email / SMS / WhatsApp | Partial |
| Public graduation & student-info forms | Wider public portal (applications, fees, results) | Partial |
| Student self registration & attendance | Full student portal (fees, results, documents) | Partial |
| Lecturer portal (timetable, presence, QA, appraisals) | Full staff portal | Partial |
| — | Parent / guardian portal | Missing |
| — | Mass communication centre | Missing |

---

## 15. Campus services (often in full ERPs)

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| — | Library / LMS library integration | Missing |
| — | Hostel / accommodation | Missing |
| — | Transport | Missing |
| — | Clinic / medical records | Missing |
| — | Inventory / procurement (non-graduation) | Missing |
| — | Asset & facilities management | Missing |

---

## 16. Integrations & platform

| Current KCU ERP | Full university ERP / LMS (target) | Status |
|-----------------|--------------------------------------|--------|
| Excel / CSV import & export | Same | Done |
| Staging / production CI deploy pipelines | Same | Done |
| — | Moodle / LMS API sync | Missing |
| — | Payment gateways | Missing |
| — | SMS / email gateway as product feature | Missing |
| — | National ID / UNEB / NCHE data exchange | Missing |
| — | Open APIs for partners | Missing |

---

## Summary scorecard

| Domain | Current coverage |
|--------|------------------|
| Academic structure & terms | **Strong** |
| Timetable & attendance | **Strong** |
| Teaching QA & cancellations/substitutions | **Strong** |
| Clinical teaching | **Strong** |
| Student lifecycle & enrolment | **Strong** |
| Graduation operations | **Strong** |
| HR (core + appraisals) | **Good** (leave/payroll still open) |
| Management reporting | **Good** |
| Learning (LMS) | **Not started** (ops only) |
| Exams / marks / transcripts | **Not started** |
| Fees / finance | **Not started** |
| Admissions CRM | **Not started** |
| Campus services (library, hostel, etc.) | **Not started** |
| Deep integrations (SSO, Moodle, payments) | **Not started** |

---

## Recommended roadmap (to become a full university ERP)

### Phase A — Close operational gaps (near term)
1. Email / SMS notifications  
2. MFA + SSO  
3. Stronger org-scoped permissions  
4. Finish HR leave & contracts  

### Phase B — Academic completion (medium term)
1. Admissions / applications portal  
2. Fees & payments (with registration gates)  
3. Exams, mark entry, GPA, transcripts  
4. LMS integration (Moodle) or lightweight built-in learning module  

### Phase C — Institution-wide ERP (longer term)
1. Alumni  
2. Library / hostel / other campus services as needed  
3. Accreditation & BI reporting packs  
4. Partner / national system integrations  

---

## Bottom line

**KCU ERP is already a serious university operations platform** for:

- academic structure and terms  
- timetable and attendance  
- teaching quality assurance  
- clinical teaching  
- student lifecycle and enrolment  
- graduation management  
- management analytics and HR appraisals  

To match a **full university management / ERP + learning stack**, the largest remaining gaps are **Learning (LMS)**, **Exams & transcripts**, **Fees & finance**, and **Admissions** — then campus services and deep integrations.

---

*Generated for stakeholder presentation. Reflects capabilities implemented in the KCU monorepo (`kcu-mgt-frontend` + `kcu-mgt-backend`) at the time of writing.*
