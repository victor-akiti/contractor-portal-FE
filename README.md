# Amni Contractor Portal

A comprehensive web-based platform for managing contractor registration, verification, and approval workflows.

## Overview

The Amni Contractor Portal is a Next.js application that provides:

- **Contractor Portal**: Self-service registration and document management for vendors
- **Staff Portal**: Multi-stage approval workflow for internal teams
- **Admin Console**: User management, form builder, and system configuration

## Technology Stack

- **Framework**: Next.js 14 (React 18, TypeScript)
- **State Management**: Redux Toolkit with RTK Query
- **Authentication**: Firebase
- **Styling**: CSS Module
- **Rich Text**: React Quill
- **PDF Generation**: React PDF Renderer, Puppeteer

## Documentation

### For AMNI C&P Staff

- **[C&P Staff User Manual](CP_STAFF_MANUAL.md)** - Complete guide for internal staff using the approval system

This manual covers:
- Inviting contractors to register
- Reviewing and approving applications
- Understanding the 7-stage approval workflow (A→B→C→D→E→F→L3)
- Role-based permissions and responsibilities
- Daily tasks and best practices

### For Developers

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Firebase account and configuration
- Backend API endpoint (configure in `.env.local`)

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd contractor-portal-FE
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env.local` file with:
```env
NEXT_PUBLIC_BACKEND_URL=your_backend_api_url
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
# ... other Firebase config
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Project Structure

```
/src
├── /app                    # Next.js app router pages
│   ├── /contractor        # Contractor portal pages
│   ├── /staff             # Staff portal pages
│   ├── /login             # Authentication pages
│   └── ...
├── /components            # Reusable React components
├── /redux                 # Redux store, slices, and API
├── /types                 # TypeScript type definitions
├── /utilities             # Helper functions
└── /lib                   # External library configurations
```

## Key Features

### Contractor Portal
- Multi-page registration forms with conditional fields
- Document and certificate upload with expiry tracking
- Application status tracking
- Certificate renewal notifications
- In-portal messaging with staff

### Staff Portal
- 6-stage approval workflow (Stages A-F)
- Role-based access control
- Document review and verification
- Application return with feedback
- End-user assignment for specialized review
- Export to Excel
- Audit trail and activity log

### Administrator Features
- User and role management
- Dynamic form builder with drag-and-drop
- Invitation system with tracking
- Job category management
- System-wide reporting
- Events and audit logging

## User Roles

| Role | Access Level | Primary Function |
|------|--------------|------------------|
| Contractor/Vendor | Contractor Portal | Submit and manage registrations |
| Portal Admin | Contractor Portal | Manage company profile |
| Staff (User) | Staff Portal | View applications |
| VRM, CO, HOD, GM, Executive | Staff Portal | Stage-specific approvals |
| Admin | Full System | User management, forms, configuration |

## Support

For questions or issues:

- Review the [User Manual](USER_MANUAL.md) for comprehensive guidance
- Check the role-specific quick start guides
- Contact your system administrator
- For technical support: [Add support contact]

## Development

### Tech Stack Details

- **Next.js 14**: App router, server components, API routes
- **TypeScript**: Full type safety
- **Redux Toolkit**: State management with RTK Query for API calls
- **Tailwind CSS**: Utility-first styling
- **Firebase**: Authentication and custom tokens
- **FontAwesome**: Icon library
- **React Toastify**: Toast notifications

### Key Dependencies

- `@reduxjs/toolkit` - State management
- `firebase` - Authentication
- `next` - React framework
- `react-quill` - Rich text editor
- `@react-pdf/renderer` - PDF generation
- `moment` - Date handling
- `json-as-xlsx` - Excel export

## Contributing

When contributing:

1. Follow the existing code style (ESLint configured)
2. Use TypeScript for new files
3. Test on multiple browsers
4. Update documentation for user-facing changes
5. Follow git commit message conventions

## License

[Add license information]

## Acknowledgments

Built with Next.js and React. See `package.json` for full list of dependencies.
