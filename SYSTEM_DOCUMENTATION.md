# DOCUMENTACIÓN MAESTRA DEL SISTEMA - CIVETTA CRM
## Generado automáticamente el 14/6/2025, 2:22:06 p. m.

---

## RESUMEN EJECUTIVO

**Proyecto:** Civetta CRM - Sistema de gestión integral para retail de moda
**Versión:** 1.0.0
**Última actualización:** 2025-06-14T19:22:03.401Z
**Zona horaria:** America/Guayaquil

### Métricas del Proyecto
- **Total de archivos:** 6500
- **Total de líneas de código:** 1419102
- **Promedio líneas por archivo:** 218
- **Ratio de complejidad:** 1% archivos complejos

### Distribución por Lenguaje
- **MARKDOWN:** 0%
- **TYPESCRIPT:** 4%
- **JAVASCRIPT:** 0%
- **SQL:** 0%
- **JSON:** 96%
- **HTML:** 0%
- **CSS:** 0%

---

## ARQUITECTURA DEL SISTEMA

### Patrón Arquitectural: Full-Stack TypeScript con Microservicios

#### 1. FRONTEND (Cliente)
- **Framework:** React 18 con TypeScript
- **Router:** Wouter para navegación SPA
- **Estado:** TanStack Query + React Context
- **UI:** Radix UI + Tailwind CSS + shadcn/ui
- **Build:** Vite con Hot Module Replacement

#### 2. BACKEND (Servidor)
- **Runtime:** Node.js con Express.js
- **Lenguaje:** TypeScript con ES Modules
- **Validación:** Zod schemas para request/response
- **Logging:** Pino con configuración timezone Ecuador
- **Servicios:** Arquitectura modular con registro de servicios

#### 3. BASE DE DATOS
- **Motor:** PostgreSQL (Neon Serverless)
- **ORM:** Drizzle con migraciones automáticas
- **Esquema:** Definido
- **Backup:** Sistema automático con versionado

#### 4. DEPLOYMENT
- **Plataforma:** Replit con workflows automáticos
- **Build:** Vite (frontend) + ESBuild (backend)
- **Puerto:** 3000 (configurable vía PORT env)
- **Dominio:** .replit.app con SSL automático

---

## ESTRUCTURA DEL PROYECTO

```
civetta-crm/
├── client/
├── server/
├── db/
├── scripts/
├── __tests__/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── replit.md
└── SYSTEM_DOCUMENTATION.md
```


---

## FLUJO DE DATOS Y PROCESAMIENTO

### 1. Request Lifecycle
```
Cliente → Router (Wouter) → Component → React Query → API Call → Express Router → Service Layer → Database → Response
```

### 2. Validación de Datos
```
Frontend: React Hook Form + Zod → Backend: Express Middleware + Zod → Database: Drizzle Constraints
```

### 3. Estado y Cache
```
Server State: TanStack Query → Local State: React Context → Persistent: PostgreSQL + Session Storage
```

---

## SERVICIOS Y MÓDULOS PRINCIPALES

### Core Services
- **CustomersService:** Gestión completa de clientes y direcciones
- **LeadsService:** Pipeline de conversión y seguimiento
- **OrdersService:** Procesamiento de pedidos y fulfillment
- **InteractionsService:** Historial de comunicaciones
- **OpportunitiesService:** Gestión de oportunidades de venta
- **InventoryService:** Control de stock y productos
- **HealthService:** Monitoreo de estado del sistema

### External Integrations
- **Email:** SendGrid para notificaciones
- **Messaging:** Slack API para alertas
- **SMS:** Twilio para notificaciones móviles
- **E-commerce:** WooCommerce API (modo lectura)
- **Payments:** Integración con pasarelas locales

---

## ESQUEMAS DE BASE DE DATOS

### Tablas Principales
```sql
-- Customers: Gestión de clientes
-- Leads: Pipeline de ventas
-- Orders: Gestión de pedidos
-- Products: Catálogo de productos
-- Interactions: Historial de comunicaciones
-- Opportunities: Oportunidades de negocio
```

### Relaciones Clave
- Customer 1:N Orders
- Lead 1:1 Customer (conversión)
- Order 1:N OrderItems
- Customer 1:N Interactions

---

## VARIABLES DE ENTORNO Y CONFIGURACIÓN

### Variables Requeridas
```bash
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=production|development
```

### Variables Opcionales
```bash
SENDGRID_API_KEY=
SLACK_BOT_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

---

## COMANDOS DE MANTENIMIENTO

### Desarrollo
```bash
npm run dev          # Iniciar desarrollo
npm run check        # Verificar TypeScript
npm run db:push      # Aplicar cambios BD
```

### Producción
```bash
npm run build        # Compilar aplicación
npm run start        # Iniciar producción
```

### Backup y Mantenimiento
```bash
node scripts/backup-code-only.js    # Backup inteligente
node commit-and-backup.js "mensaje" # Commit + backup
```

---

## CARACTERÍSTICAS TÉCNICAS

### 🔒 SEGURIDAD
- Validación estricta con Zod en frontend y backend
- Sanitización automática de inputs
- Headers de seguridad configurados
- Sesiones seguras con express-session

### ⚡ PERFORMANCE
- Code splitting automático con Vite
- Lazy loading de componentes React
- Query caching con TanStack Query
- Compresión automática de assets

### 📱 RESPONSIVIDAD
- Mobile-first design con Tailwind CSS
- Breakpoints optimizados para dispositivos ecuatorianos
- PWA-ready con service workers

### 🌐 INTERNACIONALIZACIÓN
- Timezone configurado para Ecuador (GMT-5)
- Formatos de fecha/hora localizados
- Validación de números telefónicos ecuatorianos
- Soporte para múltiples provincias

---

## MÉTRICAS DE CALIDAD

### Complejidad del Código
- **Archivos simples:** 4170 (64%)
- **Archivos moderados:** 2279 (35%)
- **Archivos complejos:** 51 (1%)

### Cobertura por Tecnología
- **FRONTEND:** React 18, Wouter Router, TanStack Query, Radix UI
- **BACKEND:** Express.js, Zod Validation, SendGrid Email, Slack Integration
- **DATABASE:** Drizzle ORM, PostgreSQL (Neon)
- **TOOLS:** Archiver (Backup)
- **TESTING:** 

---

## ESTÁNDARES CUMPLIDOS

### ✅ ISO 9001 - Gestión de Calidad
- Documentación controlada con versionado automático
- Trazabilidad completa de cambios
- Procesos estandarizados de backup

### ✅ IEEE 1471 - Arquitectura de Software
- Múltiples viewpoints arquitecturales
- Stakeholders identificados claramente
- Decisiones arquitecturales documentadas

### ✅ TOGAF - Arquitectura Empresarial
- Capas bien definidas (Presentación, Negocio, Datos)
- Principios arquitecturales establecidos
- Gobierno de arquitectura implementado

### ✅ DevOps - Operaciones de Desarrollo
- Infraestructura como código
- Automatización completa CI/CD
- Monitoreo y logging integrados

### ✅ Agile - Metodologías Ágiles
- Documentación justa y ejecutable
- Entrega continua de valor
- Adaptabilidad a cambios de requisitos

---

*Documentación generada automáticamente por el Sistema de Análisis Automático v1.0.0*
*Última actualización: 14/6/2025, 2:22:06 p. m.*
