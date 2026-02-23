ZZ# KCU Management System

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
