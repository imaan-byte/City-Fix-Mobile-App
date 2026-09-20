

CityFix is a mobile application designed to make reporting and managing local infrastructure issues simpler. Citizens can submit problems in their area, while dispatchers, engineers and quality-assurance staff can manage each report through the appropriate stages of resolution.

## Key Features

- Role-based access for citizens, dispatchers, engineers and QA staff
- Citizen reporting workflow for local issues
- Report assignment and management for dispatchers
- Engineer workflow for reviewing and updating assigned work
- Quality-assurance workflow for checking completed work
- Firebase integration for application data and authentication
- Mobile-first interface built with React Native and Expo

## User Roles

### Citizen

Citizens can access the reporting side of the application and submit local issues for review.

### Dispatcher

Dispatchers can review incoming reports and coordinate work by assigning issues to the appropriate engineer.

### Engineer

Engineers can access assigned issues and update their progress as work is carried out.

### Quality Assurance

QA staff can review completed work and support the final verification stage of the reporting process.

## Technology Stack

- React Native
- Expo
- Expo Router
- JavaScript and TypeScript configuration
- Firebase
- ESLint
- npm

## Project Structure

```text
CityFix/
├── app/
│   ├── auth/          # Authentication screens and routes
│   ├── citizen/       # Citizen-facing screens
│   ├── dispatcher/    # Dispatcher-facing screens
│   ├── engineer/      # Engineer-facing screens
│   ├── qa/            # Quality-assurance screens
│   ├── _layout.js     # Application layout and navigation
│   └── index.js       # Application entry route
├── assets/            # Images, icons and other static assets
├── components/        # Reusable interface components
├── firebase/          # Firebase configuration and services
├── app.json           # Expo application configuration
├── package.json       # Project scripts and dependencies
└── tsconfig.json      # TypeScript configuration
```

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- Expo Go on a mobile device, or an Android/iOS simulator

### Installation

1. Clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
```

2. Enter the project folder:

```bash
cd YOUR-REPOSITORY
```

3. Install the dependencies:

```bash
npm install
```

4. Start the Expo development server:

```bash
npx expo start
```

5. Scan the QR code using Expo Go, or choose an available simulator from the Expo terminal.

## Firebase Setup

The application uses Firebase services. Before running your own copy, connect it to a Firebase project and provide the configuration expected by the files in the `firebase` directory.

Do not commit private service-account credentials, passwords or `.env` files to GitHub.

## Future Development

- Improve report tracking and status notifications
- Expand map and location-based functionality
- Add richer dashboards and reporting analytics
- Strengthen testing across every role-based workflow
- Improve accessibility and interface responsiveness

## Author

**Imaan Soliman**  
Electronics and Computer Engineering graduate and MSc Robotics student.

## Academic Project Notice

CityFix was developed as a software engineering project and is presented here as part of a technical portfolio.
