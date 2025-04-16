# Culinary Canvas

![Project Status](https://img.shields.io/badge/Status-80%25%20Complete-green)
![Version](https://img.shields.io/badge/Version-0.9.0-blue)

A social platform for chefs and cooking enthusiasts to share recipes, follow favorite chefs, and discover new culinary inspirations.

## 🚀 Project Progress (80% Complete)

### Implemented Features ✅

- **User Authentication**
  - Sign up, login, and profile management
  - Session persistence and error handling
  - Auth Guard for protected routes

- **Recipe Management**
  - Create, edit, and delete recipes
  - Upload recipe images
  - Rate and like recipes
  - Recipe tags and categories

- **Chef Discovery**
  - Browse and search for chefs
  - View chef profiles and recipes
  - Follow favorite chefs

- **Explore Functionality**
  - Filter recipes by cuisine, difficulty, and cook time
  - Search recipes by ingredients
  - Sort recipes by rating, date, or cook time

- **Profile System**
  - User profiles with avatars and bio
  - Recipe collections and favorites
  - Following and follower relationships

### Features in Progress 🔄

- **Advanced Search** (90% complete)
  - Fuzzy search for recipes and ingredients
  - Semantic search improvements

- **Recommendation Engine** (65% complete)
  - Personalized recipe recommendations
  - Similar recipe suggestions

- **Notifications System** (50% complete)
  - Activity notifications
  - New follower and like alerts

- **Mobile Responsiveness** (85% complete)
  - Fully responsive UI for all devices
  - Touch-friendly interface optimizations

## 📋 Technology Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Supabase (Authentication, Database, Storage)
- **Infrastructure**: Docker, AWS
- **CI/CD**: GitHub Actions
- **Monitoring**: Grafana, Prometheus
- **Security**: SonarQube, OWASP ZAP

## 🔧 Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/culinarycanvas.git
   cd culinarycanvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## 🚢 Deployment

The application is deployed using our CI/CD pipeline:

1. Commit to main branch triggers GitHub Actions workflow
2. Automated tests are run
3. Infrastructure is provisioned via Terraform
4. Docker image is built and pushed to container registry
5. Application is deployed to AWS
6. Monitoring and logging are automatically configured

Live demo: [https://culinarycanvas.example.com](https://culinarycanvas.example.com)

## 📊 Monitoring and Logging

- **Application Performance**: Grafana dashboards with Prometheus metrics
- **Error Tracking**: ELK stack for centralized logging
- **User Analytics**: Event tracking and funnels

## 🛡️ Security Measures

- SonarCloud for code quality and security scanning
- HTTPS enforcement with proper certificate management
- Auth0 for secure authentication handling

## 🔍 Code Quality

This project uses SonarCloud for continuous code quality inspection. SonarCloud helps to detect bugs, vulnerabilities, and code smells in your code.

> **Important:** Before SonarCloud badges will appear here, you need to properly set up your SonarCloud project. See [setup-sonarcloud.md](setup-sonarcloud.md) for detailed instructions.

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=culinarycanvas&metric=alert_status)](https://sonarcloud.io/dashboard?id=culinarycanvas)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=culinarycanvas&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=culinarycanvas)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=culinarycanvas&metric=security_rating)](https://sonarcloud.io/dashboard?id=culinarycanvas)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=culinarycanvas&metric=sqale_index)](https://sonarcloud.io/dashboard?id=culinarycanvas)

For more information on SonarCloud setup, see [SONARCLOUD.md](SONARCLOUD.md).

## 📝 Recent Updates

- Fixed chef listing visibility issues
- Improved error handling in authentication flow
- Enhanced SQL database functions for better performance
- Added debugging interface for user visibility issues
- Implemented comprehensive logging

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Architecture Diagram](./docs/ARCHITECTURE.md)
- [Database Schema](./docs/SCHEMA.md)
- [Deployment Guide](./README-DevOps.md)
- [Test Cases](./docs/TESTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔑 Authentication System Overview

The application uses Supabase for authentication and data storage. The authentication flow has been completely rebuilt to be more robust and reliable:

### Authentication Architecture

1. **Auth Provider** (`src/hooks/useAuth.tsx`):
   - Uses React Context API to provide auth state to the entire app
   - Handles user sessions, profiles, login, register, and logout
   - Includes timeout protection to prevent infinite loading states
   - Maintains session persistence across page reloads

2. **Protected Routes**:
   - Implemented with `AuthGuard` component
   - Routes like `/profile` and `/recipes/new` require authentication
   - Handles redirect to login with return path 

3. **Session Management**:
   - Auth state stored in both Context and localStorage
   - Session tokens managed securely
   - Automatic token refresh handling

### Handling Auth Edge Cases

The system includes robust error handling for:
- Missing user profiles (creates one automatically)
- Token refresh failures
- Network interruptions
- Redirect loops
- Timeout protection for all auth operations

## 🏗️ Project Structure

```
src/
├── App.tsx                # Main app component with route definitions
├── components/
│   ├── AuthGuard.tsx      # Route protection component
│   └── ui/                # UI components (buttons, inputs, etc.)
├── hooks/
│   └── useAuth.tsx        # Authentication provider and hook
├── integrations/ 
│   └── supabase/          # Supabase client and utilities
├── pages/
│   ├── Auth.tsx           # Login/register page
│   ├── Profile.tsx        # User profile page
│   └── ...                # Other page components
└── types/                 # TypeScript type definitions
```

## 🌐 Environment Setup

### Prerequisites

- Node.js v18+
- npm or yarn

### Environment Variables

Create a `.env.local` file with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 🐳 Docker Setup

The project includes Docker configuration for easy deployment.

### Build and Run with Docker

```bash
# Build the Docker image
docker build -t culinary-canvas .

# Run the container
docker run -p 8080:80 culinary-canvas
```

### Using Docker Compose

```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose down
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The project is configured with GitHub Actions for continuous integration and deployment.

**.github/workflows/main.yml**
- Runs linting and type checking
- Builds the application
- Runs tests (when available)
- Deploys to hosting environment on successful build

### Deployment

The application can be deployed to:
- Vercel
- Netlify
- Any static hosting service

## 🧪 Development and Testing

### Code Style

The project uses ESLint and Prettier for code formatting:

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## 💡 Troubleshooting

### Common Auth Issues

1. **"Please wait..." stuck on login**:
   - Clear browser localStorage and cookies
   - Try refreshing the page
   - Check console for specific error messages

2. **Login Loop / Redirect Issues**:
   - Check browser console for auth state changes
   - Verify that Supabase is accessible from your network
   - Check for CORS issues if using custom domains

3. **Profile Data Missing**:
   - The system should auto-create missing profiles
   - Check 'profiles' table permissions in Supabase

## 📊 Database Schema

### Main Tables

1. **auth.users** - Managed by Supabase Auth
2. **profiles** - User profile data linked to auth.users
   - `id`: UUID (matches auth.users.id)
   - `username`: String (unique)
   - `email`: String
   - `first_name`: String (optional)
   - `last_name`: String (optional)
   - `created_at`: Timestamp

## 🔮 Future Improvements

- Add comprehensive test suite
- Implement refresh token rotation
- Add social auth providers (Google, GitHub, etc.)
- Implement advanced session analytics
- Add account recovery mechanism
