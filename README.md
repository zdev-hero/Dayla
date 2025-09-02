# Dayla - Leave Management System for Small Businesses

Dayla is a modern, Angular-based leave management system designed specifically for small businesses to simplify employee leave tracking and management.

## Features

- **Employee Dashboard**: Complete employee profile and leave balance overview
- **Leave Requests Management**: Easy submission and tracking of leave requests
- **Leave Analytics**: Comprehensive analytics and reporting for leave patterns
- **Team Overview**: Manager view of team leave schedules
- **Leave Calendar**: Visual calendar for planning and scheduling
- **Quick Actions Panel**: Fast access to common leave management tasks

## Project Structure

### Components

#### Core Dashboard Components

- `main-dashboard`: Main dashboard container
- `header-navigation`: Top navigation bar
- `navigation-menu`: Side navigation menu
- `quick-actions-panel`: Right panel for quick actions

#### Leave Management Components

- `leave-requests`: Table view of all leave requests
- `leave-request-form`: Form for submitting new leave requests
- `leave-analytics`: Analytics and reporting dashboard
- `leave-balance-overview`: Visual overview of leave balances
- `leave-calendar`: Calendar view of leave schedules

#### Employee Management Components

- `employee-dashboard`: Employee profile and personal dashboard
- `team-overview`: Manager view of team members and their leave status

### Services

- `leave-management.service`: Core service for leave operations
- `employee.service`: Employee data management

### Models

- `employee.model`: Employee and leave balance interfaces
- `leave-request.model`: Leave request, types, and status definitions

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Angular CLI (v19)

### Installation

1. Clone the repository

```bash
git clone https://github.com/zdev-hero/Dayla.git
cd Dayla
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm start
```

4. Open your browser and navigate to `http://localhost:4200`

### Building for Production

```bash
npm run build
```

## Development

### Running Tests

```bash
npm test
```

### Code Structure

The project follows Angular best practices with:

- Feature-based component organization
- Reactive programming with RxJS
- TypeScript interfaces for type safety
- SCSS for styling with component-scoped styles

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.
