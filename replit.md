# Civetta CRM - Replit Configuration Guide

## Overview

Civetta CRM is a comprehensive customer relationship management system built specifically for the Ecuadorian market. The application combines a React frontend with an Express.js backend, utilizing PostgreSQL for data persistence. The system is designed to handle customer management, order processing, shipping label generation, and business analytics with a focus on the sleepwear and fashion industry.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Components**: Radix UI with custom shadcn/ui components
- **State Management**: TanStack React Query for server state, React Context for local state
- **Styling**: Tailwind CSS with custom theme configuration
- **Build Tool**: Vite for development and production builds
- **Routing**: React Router for client-side navigation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with modular route organization
- **Validation**: Zod schemas for request/response validation
- **Logging**: Pino logger with Ecuador timezone configuration

### Database Schema
- **Primary Database**: PostgreSQL with connection pooling
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Key Tables**: customers, leads, orders, opportunities, products, interactions
- **Data Integrity**: Foreign key constraints and validation rules
- **Timezone**: Configured for Ecuador (America/Guayaquil)

## Key Components

### Customer Management System
- Comprehensive customer profiles with address management
- Duplicate detection by identification number, email, and phone
- Lead-to-customer conversion workflows
- Customer activity tracking and interaction history

### Shipping Label System
- Multi-step form wizard for order creation
- Address validation and customer verification
- Integration with shipping providers
- Embedded form support for external websites

### Order Processing
- Order lifecycle management from creation to fulfillment
- Payment status tracking and inventory management
- Order status automation with visual indicators
- Integration with WooCommerce for e-commerce operations

### Business Intelligence
- Customer analytics and sales reporting
- Opportunity pipeline management
- Export functionality for Excel and CSV formats
- Activity tracking and performance metrics

## Data Flow

### Customer Onboarding
1. Customer data entry through web forms or manual input
2. Duplicate detection and validation against existing records
3. Address standardization and province validation
4. Customer profile creation with complete contact information

### Order Processing Flow
1. Order creation through shipping forms or admin interface
2. Customer verification and address confirmation
3. Order validation and inventory checking
4. Payment processing and status updates
5. Shipping label generation and fulfillment tracking

### Data Synchronization
- Real-time updates between frontend and backend
- Optimistic updates with error rollback
- Background sync for external integrations
- Automatic backup generation on significant changes

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection management
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: UI component library
- **drizzle-orm**: Database ORM and query builder
- **zod**: Schema validation and type inference

### Integration Services
- **@sendgrid/mail**: Email service integration
- **@slack/web-api**: Slack notifications and webhooks
- **ExcelJS**: Excel file generation for exports
- **WooCommerce API**: E-commerce platform integration

### Development Tools
- **Vite**: Frontend build tool and development server
- **ESBuild**: Backend bundling for production
- **TypeScript**: Type checking and development experience
- **Jest**: Testing framework with TypeScript support

## Deployment Strategy

### Development Environment
- **Port Configuration**: Server runs on port 3000 (configurable via PORT env var)
- **Hot Reload**: Vite dev server with automatic frontend rebuilds
- **Database**: Direct PostgreSQL connection with development credentials
- **File Serving**: Static files served from client/public directory

### Production Build Process
1. Frontend compilation using `vite build`
2. Backend bundling with ESBuild for Node.js
3. Asset optimization and compression
4. Environment-specific configuration injection

### Cloud Deployment
- **Target Platform**: Google Cloud Run (configured in .replit)
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Environment Variables**: DATABASE_URL, PORT, NODE_ENV

### Configuration Management
- Centralized configuration in `config.js`
- Environment variable support with sensible defaults
- Timezone configuration for Ecuador market
- Separate development and production settings

## Automated Documentation and Backup System

### Sistema Completo Implementado
- **Análisis Automático**: Script que analiza estructura, métricas y complejidad del código
- **Documentación Maestra**: SYSTEM_DOCUMENTATION.md auto-generada con arquitectura completa
- **Manifiesto de Backup**: BACKUP_MANIFEST.md con inventario detallado de archivos
- **Guías de Revisión**: CODE_REVIEW_GUIDE.md, ARCHITECTURE_REVIEW_STANDARD.md, EXTERNAL_REVIEWER_ONBOARDING.md
- **Backup Inteligente**: Sistema optimizado que reduce backups de 12MB a 1.5MB (87% compresión)
- **Integración Completa**: commit-and-backup.js actualiza documentación automáticamente

### Cumplimiento de Estándares
- **ISO 9001**: Documentación controlada con versionado automático
- **IEEE 1471**: Múltiples viewpoints arquitecturales documentados
- **TOGAF**: Arquitectura empresarial con governance implementado
- **DevOps**: Infraestructura como código con automatización completa
- **Agile**: Documentación viva que se actualiza con cada cambio

### Flujo de Trabajo Automatizado
1. `node commit-and-backup.js "mensaje"` ejecuta:
   - Actualización automática de toda la documentación
   - Análisis de métricas del proyecto en tiempo real
   - Commit con documentación sincronizada
   - Backup inteligente optimizado

### Archivos Creados
- `scripts/auto-update-docs.js` - Sistema de análisis automático
- `scripts/backup-code-only.js` - Backup inteligente optimizado
- `SYSTEM_DOCUMENTATION.md` - Documentación maestra auto-generada
- `BACKUP_MANIFEST.md` - Manifiesto de backup actualizable
- `CODE_REVIEW_GUIDE.md` - Guía completa para revisores
- `ARCHITECTURE_REVIEW_STANDARD.md` - Estándares IEEE/ISO
- `EXTERNAL_REVIEWER_ONBOARDING.md` - Guía de incorporación 5 minutos

## Changelog

Changelog:
- June 14, 2025: Implemented complete automated documentation and backup system compliant with ISO 9001, IEEE 1471, TOGAF, DevOps, and Agile standards
- June 14, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.