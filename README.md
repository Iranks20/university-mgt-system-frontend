# KCU Management System

A scalable university management system starting with Quality Assurance (QA) functionality, designed to grow into a comprehensive university management platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ 
- npm or bun

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

This project follows a **Domain-Driven Design (DDD)** architecture for scalability:

```
src/
├── components/          # Shared UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── AppShell.tsx    # Main application layout
│   └── ProtectedRoute.tsx  # Route protection
│
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication
│
├── features/           # Feature modules (Domain-Driven)
│   └── qa/            # Quality Assurance feature
│       └── components/ # QA-specific components
│
├── screens/            # Page-level components
│   ├── qa/            # QA screens
│   ├── admin/         # Admin screens
│   ├── student/       # Student screens
│   └── lecturer/      # Lecturer screens
│
├── services/          # Business logic layer
│   ├── qa.service.ts      # QA domain service
│   ├── student.service.ts # Student domain service
│   └── ...
│
├── types/             # TypeScript definitions
│   ├── index.ts       # Core types
│   └── qa.ts         # QA-specific types
│
├── utils/            # Utilities
│   └── excel.ts      # Excel import/export
│
└── App.tsx           # Main app with routing
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Integration Flow and Target ERP Structure

This section documents:

- The **current** integration flow: how KCU pulls courses, students, and lecturers from vClass/Moodle for QA rosters.
- The **target** structure: how KCU evolves into a full University ERP where KCU is the system of record and Moodle is provisioned from KCU with SSO.

### Current flow (today): vClass/Moodle → KCU

- **Courses**: KCU fetches Moodle courses and upserts local `Course` records with `moodleCourseId`, creating a `Class` per course for rosters.
- **Users**: KCU fetches enrolled users per course and upserts `User` + `Student`/`Staff` with `moodleUserId` (teacher roles become Lecturers/Staff).
- **Enrollments**: KCU creates `Enrollment` records linking Students to Classes for QA attendance workflows.

```mermaid
flowchart TD
  A[Admin triggers sync in KCU] --> B[POST /api/v1/moodle/sync/all]
  B --> C[Fetch courses<br/>core_course_get_courses]
  C --> D[Upsert Course (moodleCourseId)]
  D --> E[Ensure Class exists per Course]

  B --> F[For each course: fetch enrolled users<br/>core_enrol_get_enrolled_users]
  F --> G{Teacher role?}
  G -- Yes --> H[Upsert User(role=Lecturer) + Staff (moodleUserId)]
  G -- No --> I[Upsert User(role=Student) + Student (moodleUserId)]

  F --> J[Build rosters]
  J --> K[Upsert Enrollment<br/>Student ↔ Class]
  K --> L[QA uses rosters for attendance & reports]
```

### Target flow (future): KCU ERP → Moodle provisioning + SSO

In a standard university setup, the ERP becomes the source of truth and Moodle is provisioned from it.

```mermaid
flowchart TD
  A[Admissions / Registration in KCU ERP] --> B[Student record created/updated]
  B --> C[Identity provisioned in IAM<br/>(Keycloak/AzureAD/Google)]
  C --> D[SSO enabled for KCU + Moodle]

  E[Semester setup] --> F[Course catalog + offerings + sections]
  F --> G[Lecturer assignment + timetables]

  H[Student registers for semester] --> I{Finance status OK?}
  I -- No --> J[Apply holds / limit access]
  I -- Yes --> K[Confirm enrollment]

  K --> L[Provision to Moodle]
  L --> M[Create/Update Moodle users]
  L --> N[Create/Update Moodle course shells]
  L --> O[Enroll users + roles + groups]

  D --> P[Student opens Moodle]
  P --> Q[SSO login]
  Q --> R[Moodle session without separate password]
```

### Target ERP modules (development blueprint)

- **Identity & Access (IAM)**: central authentication (OIDC/SAML), roles/permissions, audit logs.
- **Admissions & Registration**: applicant → student lifecycle, semester registration.
- **Academic Management**: programme/curriculum, course catalog, offerings, sections/classes, timetables.
- **Teaching & Learning Operations**: lecturer allocation, assessment workflows, grades (optional sync back).
- **Finance**: billing, payments, holds that gate registration/LMS access.
- **HR & Staff**: staff onboarding, departments, teaching load.
- **Quality Assurance**: attendance, lecture records, reporting and compliance.
- **Integrations**: Moodle provisioning, email/SMS, payments, reporting exports.

## 🎯 Features

### Quality Assurance Module
- ✅ Record lecturer attendance
- ✅ Track attendance by lecturer, department, school
- ✅ Generate QA reports
- ✅ Export to Excel (matching template format)
- ✅ Import from Excel

### Authentication & Authorization
- ✅ Role-based access control (QA, Lecturer, Student, Staff, Management, Admin)
- ✅ Protected routes
- ✅ Session persistence

### Future Modules (Planned)
- Student Management
- Academic Management
- Staff Management
- Advanced Reporting

## 🛠️ Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router v7** - Routing
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Recharts** - Data visualization
- **xlsx** - Excel file handling
- **date-fns** - Date utilities

## 📝 Development Guidelines

1. **Follow Domain Organization**: Keep related code together by domain
2. **Use Service Layer**: All data operations go through services
3. **Type Safety**: Use TypeScript types, avoid `any`
4. **Component Reusability**: Use `components/ui/` for base components
5. **Excel Compatibility**: Maintain template format when exporting

## 🔐 User Roles

- **QA**: Quality Assurance staff - Track lecturer attendance
- **Lecturer**: Teaching staff - View timetable, mark presence
- **Student**: Students - View classes, mark attendance
- **Staff**: Administrative staff - General access
- **Management**: Management staff - Overview and reports
- **Admin**: System administrators - Full access

## 📊 Excel Integration

The system maintains compatibility with existing Excel templates:

- **QA Attendance Records**: Import/export matching template format
- **Report Generation**: Maintains exact column structure
- **Template Preservation**: Exports match existing QA templates

## 🚧 Roadmap

- [ ] Student Management Excel integration
- [ ] API backend integration
- [ ] Real-time updates
- [ ] Advanced analytics
- [ ] Mobile app support
- [ ] Multi-tenant support

## 📚 Documentation

- [Architecture Documentation](./ARCHITECTURE.md) - Detailed architecture guide
- [Component Documentation](./src/components/README.md) - Component usage
- [Service Documentation](./src/services/README.md) - Service layer guide

## 🤝 Contributing

When adding new features:

1. Create types in `src/types/{domain}.ts`
2. Create service in `src/services/{domain}.service.ts`
3. Create components in `src/features/{domain}/components/`
4. Create screens in `src/screens/{domain}/`
5. Add routes in `src/App.tsx`

## 📄 License

Private - King Ceasor University
