# ThinkTech Attendance Admin Dashboard

A comprehensive admin dashboard for managing staff, attendance, and salary in the ThinkTech Attendance System.

## Features

- **Dashboard**: Overview with statistics and charts
- **Staff Management**: Add, edit, and delete staff members
- **Attendance Management**: View and export attendance records
- **Salary Management**: Manage salary templates and calculations
- **Reports**: Generate and export various reports

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the admin directory:
```bash
cd admin
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The app will open in your default browser at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## Configuration

The admin dashboard is configured to proxy API requests to the backend server at `http://localhost:5000`. Make sure your backend server is running on this port.

## Usage

1. **Login**: Use your admin credentials to log in
2. **Dashboard**: View overview statistics and charts
3. **Staff Management**: Manage staff members and their profiles
4. **Attendance**: View daily attendance records and export data
5. **Salary**: Manage salary templates and components
6. **Reports**: Generate attendance and salary reports

## Technologies Used

- **React 18**: Modern React with hooks
- **Ant Design**: UI component library
- **React Router**: Client-side routing
- **Axios**: HTTP client for API requests
- **Recharts**: Chart library for data visualization
- **Day.js**: Date manipulation library

## Project Structure

```
admin/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.js
│   │   ├── Dashboard.js
│   │   ├── StaffManagement.js
│   │   ├── AttendanceManagement.js
│   │   ├── SalaryManagement.js
│   │   ├── Reports.js
│   │   └── PrivateRoute.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## API Endpoints

The admin dashboard connects to the following backend API endpoints:

- `POST /api/auth/login` - Admin authentication
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/staff` - Staff management
- `GET /api/admin/attendance` - Attendance records
- `GET /api/admin/salary-templates` - Salary templates
- `GET /api/admin/reports` - Report generation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the ThinkTech Attendance System.
