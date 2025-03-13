# CRM Application Architecture

## Overview

This application is a Customer Relationship Management (CRM) system designed to manage customer data, track sales, process leads, and generate reports. The system follows a modern web application architecture with a clear separation between frontend and backend components.

The CRM is built as a full-stack JavaScript/TypeScript application using React for the frontend and Node.js for the backend. It employs a RESTful API architecture for communication between client and server.

## System Architecture

The application follows a client-server architecture with these key components:

1. **Frontend**: A React single-page application (SPA) built with modern web technologies
2. **Backend**: A Node.js/Express server providing RESTful API endpoints 
3. **Database**: PostgreSQL database with Drizzle ORM for data management
4. **Integration Layer**: Services for connecting with external systems like email providers, Slack, and potentially WooCommerce

```
┌────────────────┐         ┌────────────────┐         ┌────────────────┐
│                │         │                │         │                │
│    Frontend    │ ◄─────► │    Backend     │ ◄─────► │    Database    │
│    (React)     │         │  (Node.js/     │         │  (PostgreSQL)  │
│                │         │   Express)     │         │                │
└────────────────┘         └───────┬────────┘         └────────────────┘
                                   │
                                   ▼
                           ┌────────────────┐
                           │   External     │
                           │  Integrations  │
                           │ (Email, Slack) │
                           │                │
                           └────────────────┘
```

## Key Components

### Frontend Architecture

The frontend is built with:

- **React**: Core UI library
- **React Query**: Data fetching and state management
- **React Router**: Client-side routing
- **Shadcn UI**: Component library based on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling

The frontend is organized into:

1. **Components**: Reusable UI elements
   - Layout components
   - CRM-specific components
   - UI components from Shadcn/Radix
   
2. **Pages**: Route-specific views
   
3. **Hooks**: Custom React hooks
   
4. **Lib**: Utility functions and service abstractions

The application also implements a Progressive Web App (PWA) pattern with service workers for offline capability, evident from the service-worker.ts file and manifest.json.

### Backend Architecture

The backend is built with:

- **Node.js**: JavaScript runtime
- **Express**: Web server framework
- **Drizzle ORM**: Type-safe database toolkit
- **TypeScript**: Static typing

The backend is structured around:

1. **API Routes**: RESTful endpoints for CRUD operations
   
2. **Services**: Business logic encapsulations
   
3. **Database Access Layer**: Drizzle ORM for database interactions

### Database Schema

The database uses PostgreSQL with Drizzle ORM for schema definition and queries. Key tables include:

1. **customers**: Stores customer information including contact details and delivery instructions
   
2. **leads**: Manages potential customers with status tracking
   
3. **lead_activities**: Records interactions with leads
   
4. **sales**: (implied) Tracks sales transactions

The schema appears to be designed for a business that handles customer orders, possibly in retail or e-commerce.

### Error Handling System

The application implements a comprehensive error handling system as documented in ERROR_HANDLING.md, with:

1. Global error handlers for unhandled exceptions
2. AbortController handling for canceled requests
3. Consistent error logging and reporting
4. Focused solution for Vite runtime error plugin issues

#### Vite Plugin Error Handling

The application uses a custom solution to properly handle AbortController errors in the Vite development environment. This solution:

1. Uses a focused error filter in `client/src/lib/abort-error-filter.ts` that intercepts AbortErrors before they reach the Vite runtime error plugin
2. Prevents "signal is aborted without reason" errors from displaying as error overlays
3. Properly handles network request cancellations that occur during normal React application flow (navigation, component unmounting)
4. Provides comprehensive detection of various types of abort errors

The implementation avoids complex workarounds and directly addresses the root cause of the issue, making the development experience smoother. The implementation is documented in detail in `client/src/lib/ABORT_ERROR_FIX.md`.

### Data Safety

The application includes data safety features as documented in DATA_SAFETY.md:

1. Automated database backups (daily)
2. Manual backup capability
3. Restore functionality
4. Validation rules for data integrity

## Data Flow

### Primary Data Flows

1. **Customer Management**:
   - Customer data is collected via forms in the frontend
   - Transmitted to backend via API calls
   - Stored in the PostgreSQL database
   - Retrieved and displayed in various views

2. **Lead Processing**:
   - Leads are captured, tracked, and can be converted to customers
   - Activities with leads are recorded for follow-up

3. **Export/Import**:
   - Data can be exported to formats like CSV and Excel (evident from export endpoints)
   - Bulk import functionality available

### Authentication Flow

While the authentication system isn't fully visible in the available files, the presence of form validators and security-related code suggests a standard authentication flow:

1. User provides credentials
2. Backend validates credentials
3. Session or token is issued
4. Subsequent requests include authentication information

## External Dependencies

The application integrates with several external services:

1. **SendGrid**: For email communications (`@sendgrid/mail` dependency)
2. **Slack**: For notifications or alerts (`@slack/web-api` dependency)
3. **WooCommerce**: Potential integration for e-commerce functionality (based on woocommerce-updates.ts)

Other notable dependencies:

- **React Query**: For data fetching and caching
- **React Table**: For data grid functionality
- **React Hook Form**: For form management
- **Radix UI**: For accessible UI components

## Deployment Strategy

The application is configured for:

1. **Development**: Local development using Vite dev server
2. **Production**: Built as static assets with Node.js server
3. **Cloud Deployment**: Configured for deployment to Cloud Run (based on Replit configuration)

The deployment process includes:

1. Building the frontend assets with Vite
2. Compiling the backend with esbuild
3. Running the Node.js server which serves both the API and static assets

Database connections are handled through environment variables, allowing for flexibility in connecting to different database instances for development and production.

## Testing Strategy

The application includes testing configuration for:

1. **Jest**: For unit and integration testing
2. **Puppeteer**: For end-to-end testing and screenshot capture
3. **AbortController Testing**: Custom test utilities to verify abort error handling (test-abort.js)

## Future Considerations

1. **Mobile Optimization**: The presence of mobile-viewer.html suggests ongoing work for mobile responsive design
2. **WooCommerce Integration**: Partial implementation of WooCommerce integration suggests plans for e-commerce synchronization
3. **Enhanced Reporting**: Files related to data export and CSV processing indicate plans for advanced reporting capabilities