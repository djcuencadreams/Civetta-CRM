# MANIFIESTO DE BACKUP - CIVETTA CRM
## Inventario Completo de Archivos y Procedimientos de Restauración
*Actualizado automáticamente: 14/6/2025, 2:22:06 p. m.*

---

## INFORMACIÓN DEL BACKUP

**Proyecto:** Civetta CRM v1.0.0
**Última actualización:** 2025-06-14T19:22:03.401Z
**Total archivos analizados:** 6500
**Total líneas de código:** 1419102

---

## CATEGORIZACIÓN AUTOMÁTICA DE ARCHIVOS

### 🔧 CORE - Archivos Fundamentales (2330 archivos críticos)
- __tests__/lead-customer-order-flow.test.ts (538 líneas, typescript)
- client/public/assets/index-BA0z3RHW.js (882 líneas, javascript)
- client/src/components/configuration/SimpleSpreadsheetImporter.tsx (376 líneas, typescript)
- client/src/components/configuration/SpreadsheetImportComponent.tsx (1125 líneas, typescript)
- client/src/components/crm/ActivityForm.tsx (665 líneas, typescript)
- client/src/components/crm/CustomerForm.tsx (1136 líneas, typescript)
- client/src/components/crm/LeadForm.tsx (589 líneas, typescript)
- client/src/components/crm/LeadsList.tsx (312 líneas, typescript)
- client/src/components/crm/OrderDetailsView.tsx (634 líneas, typescript)
- client/src/components/crm/OrderForm.tsx (850 líneas, typescript)
- ... y 2320 archivos más

### 🖥️ FRONTEND - Interfaz de Usuario (171 archivos)
- client/index.html (12 líneas, html)
- client/manifest.json (23 líneas, json)
- client/public/assets/index-BdRveRFI.css (2 líneas, css)
- client/public/clientes-importacion-manual.md (57 líneas, markdown)
- client/public/icons/icon-192.svg (0 líneas, other)
- client/public/icons/icon-512.svg (0 líneas, other)
- client/public/index.html (58 líneas, html)
- client/public/media/logoCivetta01.png (0 líneas, other)
- client/public/offline.html (69 líneas, html)
- client/public/plantilla_clientes.csv (0 líneas, other)
- ... y 161 archivos más

### ⚙️ BACKEND - Servidor Express.js (42 archivos)
- server/README-SHIPPING.md (130 líneas, markdown)
- server/lib/date-formatter.ts (73 líneas, typescript)
- server/lib/event-emitter.ts (67 líneas, typescript)
- server/lib/slack.ts (29 líneas, typescript)
- server/lib/whatsapp.ts (1 líneas, typescript)
- server/middlewares/validate.ts (78 líneas, typescript)
- server/routes.ts.bak (0 líneas, other)
- server/services/event-listener.service.ts (135 líneas, typescript)
- server/services/index.ts (45 líneas, typescript)
- server/services/service-registry.ts (101 líneas, typescript)
- ... y 32 archivos más

### 🗃️ DATABASE - Esquemas y Configuración (11 archivos)
- db/index.ts (22 líneas, typescript)
- db/migrations/001_create_leads.sql (24 líneas, sql)
- db/migrations/002_update_leads.sql (9 líneas, sql)
- db/migrations/003_add_lead_fields.sql (11 líneas, sql)
- db/migrations/004_add_brand_field.sql (33 líneas, sql)
- db/migrations/004_seed_test_data.sql (21 líneas, sql)
- db/schema-original.ts (175 líneas, typescript)
- db/schema.ts.bak (0 líneas, other)
- db/schema-new.ts (345 líneas, typescript)
- db/backup.ts (268 líneas, typescript)
- ... y 1 archivos más

### 🧪 TESTS - Suite de Pruebas (4 archivos)
- __tests__/basic.test.ts (18 líneas, typescript)
- __tests__/customer-name-handling.test.ts (169 líneas, typescript)
- __tests__/name-util.test.ts (71 líneas, typescript)
- __tests__/lead-customer-order-flow.test.ts (538 líneas, typescript)

### 📜 SCRIPTS - Automatización (19 archivos)
- scripts/add-web-form-column.ts (37 líneas, typescript)
- scripts/backup.ts (30 líneas, typescript)
- scripts/generate-template.cjs (0 líneas, other)
- scripts/generate-test-data.js (175 líneas, javascript)
- scripts/generate-test-data.mjs (0 líneas, other)
- scripts/restore.ts (52 líneas, typescript)
- scripts/alter-tables.ts (207 líneas, typescript)
- scripts/check-schema.ts (99 líneas, typescript)
- scripts/create-db-schema.ts (251 líneas, typescript)
- scripts/create-orders-table.ts (187 líneas, typescript)
- ... y 9 archivos más

---

## ARCHIVOS INCLUIDOS EN BACKUP

### Criterios de Inclusión Automática
- ✅ Archivos de código fuente (.ts, .tsx, .js, .jsx)
- ✅ Configuraciones del proyecto (.json, .yaml, .config.*)
- ✅ Documentación (.md, .txt)
- ✅ Esquemas de base de datos
- ✅ Tests y scripts de automatización

### Archivos Críticos Garantizados
- package.json
- vite.config.ts
- drizzle.config.ts

---

## ARCHIVOS EXCLUIDOS DEL BACKUP

### 📁 Directorios Excluidos (Automático)
- `node_modules/` - Se reinstala con npm install
- `.git/` - Control de versiones (no esencial para funcionalidad)
- `dist/` - Archivos compilados (se regeneran)
- `BackupforChatGPT/` - Backups anteriores
- `attached_assets/` - Assets temporales

### 🚫 Tipos de Archivo Excluidos
- Multimedia: *.png, *.jpg, *.pdf (650 archivos)
- Temporales: Screenshot*, Pasted-* (archivos temporales)
- Logs y cache: *.log, *.tmp, .cache/*

---

## INSTRUCCIONES DE RESTAURACIÓN

### 🚀 Procedimiento Standard (5-10 minutos)

#### Paso 1: Preparar Entorno
```bash
# Extraer backup en directorio limpio
unzip backup_*.zip
cd civetta-crm/
```

#### Paso 2: Instalar Dependencias
```bash
npm install
# Esto recreará node_modules automáticamente
```

#### Paso 3: Configurar Variables de Entorno
```bash
# Crear .env con configuración necesaria
echo "DATABASE_URL=postgresql://..." > .env
echo "PORT=3000" >> .env
echo "NODE_ENV=development" >> .env
```

#### Paso 4: Verificar y Ejecutar
```bash
npm run check     # Verificar TypeScript
npm run db:push   # Aplicar esquema BD
npm run dev       # Iniciar aplicación
```

---

## REQUISITOS TÉCNICOS

### Entorno Mínimo
- **Node.js:** v18+ (recomendado v20)
- **PostgreSQL:** v13+ o Neon Serverless
- **Memoria:** 512MB mínimo, 1GB recomendado

### Dependencias Principales Detectadas
- **FRONTEND:** React 18, Wouter Router, TanStack Query, Radix UI
- **BACKEND:** Express.js, Zod Validation, SendGrid Email, Slack Integration
- **DATABASE:** Drizzle ORM, PostgreSQL (Neon)
- **TOOLS:** Archiver (Backup)
- **TESTING:** 

---

*Manifiesto generado automáticamente por Sistema de Análisis v1.0.0*
*Cumplimiento: ISO 9001, IEEE 1471, TOGAF, DevOps, Agile*
