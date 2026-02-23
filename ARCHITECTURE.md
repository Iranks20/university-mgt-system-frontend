# KCU Management System - Architecture Documentation

## Overview
This is a scalable university management system starting with Quality Assurance (QA) functionality, designed to grow into a comprehensive university management platform.

## Project Structure

```
src/
├── components/          # Shared UI components
│   ├── ui/             # Base UI components (shadcn/ui)
│   ├── AppShell.tsx    # Main application shell/layout
│   ├── ProtectedRoute.tsx  # Route protection wrapper
│   └── RoleProvider.tsx    # Role-based access control
│
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
│
├── features/           # Feature-based modules (Domain-Driven Design)
│   └── qa/            # Quality Assurance feature module
│       ├── components/    # QA-specific components
│       │   ├── QAAttendanceForm.tsx
│       │   └── QAAttendanceTable.tsx
│       └── index.ts       # Feature exports
│
├── screens/            # Page-level components (organized by domain)
│   ├── qa/            # QA screens (to be organized)
│   ├── admin/         # Admin screens
│   ├── student/       # Student screens
│   ├── lecturer/      # Lecturer screens
│   └── management/    # Management screens
│
├── services/          # Business logic & data access layer
│   ├── qa.service.ts      # QA domain service
│   ├── student.service.ts # Student domain service
│   ├── staff.service.ts   # Staff domain service
│   ├── academic.service.ts # Academic domain service
│   └── report.service.ts  # Report generation service
│
├── types/             # TypeScript type definitions
│   ├── index.ts       # Core types
│   └── qa.ts         # QA-specific types
│
├── utils/            # Utility functions
│   ├── excel.ts       # Excel import/export utilities
│   └── fonts.ts      # Font utilities
│
├── hooks/             # Custom React hooks
│
├── lib/               # Library utilities
│
└── App.tsx            # Main application component with routing
```

## Domain Organization

### Quality Assurance (QA) Domain
- **Purpose**: Track lecturer attendance and teaching quality
- **Key Features**:
  - Record lecturer attendance
  - Generate QA reports matching Excel template format
  - Export reports to Excel maintaining template structure
  - Track attendance statistics by lecturer, department, school

### Future Domains (Planned)
- **Student Management**: Student records, enrollment, attendance
- **Academic Management**: Courses, classes, timetables
- **Staff Management**: Staff records, performance tracking
- **Administrative**: System settings, user management

## Key Architectural Principles

### 1. Domain-Driven Design (DDD)
- Code organized by business domain (QA, Students, Staff, etc.)
- Each domain has its own types, services, and components
- Clear separation of concerns

### 2. Service Layer Pattern
- All data operations go through service layer
- Services are domain-specific (qa.service.ts, student.service.ts)
- Easy to replace mock data with API calls later

### 3. Feature-Based Components
- Components organized by feature/domain
- Reusable components in `components/ui/`
- Domain-specific components in `features/{domain}/components/`

### 4. Type Safety
- Comprehensive TypeScript types
- Domain-specific types in `types/{domain}.ts`
- Shared types in `types/index.ts`

## Data Flow

```
User Action → Component → Service → (Mock Data / API) → Service → Component → UI Update
```

## Excel Integration

### QA Attendance Records
- **Import**: Supports importing QA records from Excel
- **Export**: Exports reports matching the QA Attendance Record template
- **Format**: Maintains exact template structure for consistency

### Export Features
- Monthly QA reports with summary and detailed records
- Column formatting matching Excel template
- Automatic filename generation

## Authentication & Authorization

### Roles
- **QA**: Quality Assurance staff
- **Lecturer**: Teaching staff
- **Student**: Students
- **Staff**: Administrative staff
- **Management**: Management/executive staff
- **Admin**: System administrators

### Route Protection
- Protected routes require authentication
- Role-based access control (RBAC)
- Automatic redirects based on role

## Adding New Features

### Step 1: Define Types
Create `src/types/{domain}.ts` with domain-specific types

### Step 2: Create Service
Create `src/services/{domain}.service.ts` with business logic

### Step 3: Create Components
Create `src/features/{domain}/components/` for domain-specific components

### Step 4: Create Screens
Create `src/screens/{domain}/` for page-level components

### Step 5: Add Routes
Update `src/App.tsx` with new routes

## Development Guidelines

1. **Always use TypeScript types** - No `any` types
2. **Follow domain organization** - Keep related code together
3. **Use service layer** - Don't access data directly in components
4. **Maintain Excel compatibility** - When exporting, match existing templates
5. **Write reusable components** - Use `components/ui/` for base components
6. **Document complex logic** - Add comments for business rules

## Future Enhancements

- [ ] API integration layer
- [ ] Database schema design
- [ ] Real-time updates
- [ ] Advanced reporting
- [ ] Mobile responsive improvements
- [ ] Student management Excel integration
- [ ] Multi-tenant support
- [ ] Audit logging

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Charts**: Recharts
- **Excel**: xlsx library
- **Build Tool**: Vite
- **Package Manager**: npm
