# Quick Start Guide

## ✅ System Status

The system is now properly structured and ready to run. All routing, authentication, and domain organization is in place.

## 🚀 Running the System

```bash
# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

## 🔐 Login Flow

1. Navigate to `http://localhost:5173` - automatically redirects to `/login`
2. Choose login type:
   - **Staff & Admin** tab: For QA, Staff, Management, Admin roles
   - **Student** tab: For Student role
3. Enter credentials (any email/password works in demo mode)
4. After login, you'll be redirected to `/dashboard` based on your role

## 📋 Available Roles

- **QA**: Quality Assurance staff - Access to QA attendance tracking
- **Lecturer**: Teaching staff - Access to timetable and course attendance
- **Student**: Students - Access to classes and attendance
- **Staff**: Administrative staff - General access
- **Management**: Management staff - Overview and reports
- **Admin**: System administrators - Full system access

## 🗂️ Key Routes

### Public Routes
- `/login` - Login page

### Protected Routes (require authentication)
- `/dashboard` - Role-based dashboard
- `/presence` - Mark presence (all roles)
- `/student-history` - Attendance history (Student, Staff)
- `/student-records` - Student records (QA)
- `/lecture-records` - Lecture records (QA)
- `/reports` - Reports (QA, Management, Admin)

### Role-Specific Routes
- **Student**: `/student-classes`
- **Lecturer**: `/timetable`, `/lecturer-performance`, `/lecturer-course-attendance`
- **Management**: `/management-overview`, `/management-departments`, `/management-staff-performance`
- **Admin**: `/admin-*` (all admin routes)

## 📁 New Project Structure

The codebase has been reorganized for scalability:

```
src/
├── features/qa/          # QA feature module
│   └── components/      # QA-specific components
├── services/            # Business logic layer
│   ├── qa.service.ts   # QA domain service
│   └── ...
├── types/              # TypeScript definitions
│   ├── index.ts        # Core types
│   └── qa.ts          # QA-specific types
└── utils/excel.ts      # Excel export utilities
```

## 📊 Excel Export Features

The system includes Excel export functionality matching your QA template:

- **Export QA Reports**: Generate Excel reports matching template format
- **Import Records**: Import QA records from Excel
- **Template Preservation**: Maintains exact column structure

### Using Excel Export

```typescript
import { exportQAAttendanceReport } from '@/utils/excel';
import { qaService } from '@/services';

// Generate and export report
const report = await qaService.getMonthlyReport('October 2024', 'Computing');
exportQAAttendanceReport(report);
```

## 🛠️ Development

### Adding New Features

1. **Define Types**: Create `src/types/{domain}.ts`
2. **Create Service**: Create `src/services/{domain}.service.ts`
3. **Create Components**: Create `src/features/{domain}/components/`
4. **Add Routes**: Update `src/App.tsx`

### Example: Adding Student Management

```typescript
// 1. Create types/src/student.ts
export interface StudentRecord { ... }

// 2. Create services/student.service.ts
export const studentService = { ... }

// 3. Create features/student/components/
// 4. Add routes in App.tsx
```

## 🔧 Troubleshooting

### Dashboard appears blank
- Check browser console for errors
- Verify role is set correctly in localStorage
- Check that RoleProvider is wrapping the route

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors: `npm run build`

### Excel export not working
- Ensure `xlsx` and `file-saver` packages are installed
- Check browser console for errors

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture guide
- [README.md](./README.md) - Project overview

## 🎯 Next Steps

1. **Review QA Excel Template**: Ensure export format matches exactly
2. **Test QA Features**: Record attendance, generate reports
3. **Prepare Student Excel**: Ready for student management integration
4. **API Integration**: Replace mock services with real API calls

## 💡 Tips

- Use the role switcher in the header (for demo purposes)
- All routes are protected - you'll be redirected to login if not authenticated
- Excel exports maintain template format for consistency
- Services use mock data - ready to replace with API calls
