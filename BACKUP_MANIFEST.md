# MANIFIESTO DE BACKUP - CIVETTA CRM
## Inventario Completo de Archivos y Procedimientos de Restauración

---

## INFORMACIÓN DEL BACKUP

**Proyecto:** Civetta CRM
**Sistema:** Documentación Automática y Backup de Código
**Generado:** Se actualiza automáticamente con cada backup
**Cumplimiento:** ISO 9001, IEEE 1471, TOGAF, DevOps, Agile

---

## CATEGORIZACIÓN DE ARCHIVOS

### 🔧 CORE - Archivos Fundamentales del Sistema
```
├── package.json              # Configuración de dependencias y scripts
├── vite.config.ts            # Configuración del bundler frontend
├── tailwind.config.ts        # Configuración de estilos
├── drizzle.config.ts         # Configuración ORM base de datos
├── jest.config.js            # Configuración testing
├── postcss.config.js         # Configuración CSS
├── tsconfig.json             # Configuración TypeScript
└── replit.md                 # Documentación de configuración del proyecto
```

### 🖥️ FRONTEND - Interfaz de Usuario React
```
client/
├── src/
│   ├── App.tsx               # Componente principal y routing
│   ├── main.tsx              # Punto de entrada React
│   ├── components/           # Componentes reutilizables UI
│   │   ├── ui/               # Componentes base shadcn/ui
│   │   ├── shipping/         # Formularios de envío
│   │   └── layout/           # Componentes de layout
│   ├── pages/                # Páginas principales de la aplicación
│   ├── lib/                  # Utilidades y configuraciones
│   └── hooks/                # Custom hooks React
├── public/                   # Assets estáticos
└── index.html                # Template HTML base
```

### ⚙️ BACKEND - Servidor Express.js
```
server/
├── index.ts                  # Punto de entrada del servidor
├── routes.ts                 # Definición de rutas API
├── services/                 # Lógica de negocio
│   ├── customers.service.ts  # Gestión de clientes
│   ├── leads.service.ts      # Gestión de leads
│   ├── orders.service.ts     # Gestión de pedidos
│   └── *.service.ts          # Otros servicios de negocio
├── lib/                      # Utilidades del servidor
├── middlewares/              # Middleware Express
├── utils/                    # Funciones utilitarias
└── webhooks/                 # Endpoints para webhooks externos
```

### 🗃️ DATABASE - Esquemas y Configuración BD
```
db/
├── schema.ts                 # Definición completa del esquema
├── index.ts                  # Configuración de conexión
└── backup.ts                 # Sistema de backup de datos
```

### 🧪 TESTS - Suite de Pruebas
```
__tests__/
├── basic.test.ts             # Pruebas básicas de configuración
├── customer-name-handling.test.ts # Pruebas de gestión de nombres
├── lead-customer-order-flow.test.ts # Pruebas de flujo completo
└── name-util.test.ts         # Pruebas de utilidades de nombres
```

### 📜 SCRIPTS - Automatización y Mantenimiento
```
scripts/
├── auto-update-docs.js       # Sistema de documentación automática
└── backup-code-only.js       # Sistema de backup inteligente
```

### 📋 DOCS - Documentación del Proyecto
```
├── SYSTEM_DOCUMENTATION.md   # Documentación maestra del sistema
├── BACKUP_MANIFEST.md        # Este archivo - manifiesto de backup
├── CODE_REVIEW_GUIDE.md      # Guía para revisores de código
├── ARCHITECTURE_REVIEW_STANDARD.md # Estándares arquitecturales
├── EXTERNAL_REVIEWER_ONBOARDING.md # Guía de incorporación
├── replit.md                 # Configuración y preferencias del proyecto
└── *.md                      # Documentación específica de módulos
```

### ⚙️ CONFIG - Archivos de Configuración
```
├── commit-and-backup.js      # Script de commit automatizado
├── zip-project.js            # Script de generación de backups
├── config.js                 # Configuración global de la aplicación
└── auto-build-frontend.js    # Script de build automático
```

---

## ARCHIVOS EXCLUIDOS DEL BACKUP

### 📁 Directorios Excluidos
- `node_modules/` - Dependencias (se reinstalan con npm install)
- `.git/` - Historial de Git (no necesario para funcionalidad)
- `dist/` - Archivos compilados (se regeneran con build)
- `build/` - Archivos de build temporales
- `.cache/` - Cache de herramientas de desarrollo
- `.local/` - Datos locales del entorno
- `BackupforChatGPT/` - Backups anteriores
- `attached_assets/` - Assets adjuntos temporales

### 🚫 Archivos Excluidos
- `*.png, *.jpg, *.jpeg, *.gif` - Imágenes (no esenciales para funcionalidad)
- `*.pdf, *.zip` - Documentos binarios
- `Screenshot*` - Capturas de pantalla temporales
- `Pasted-*` - Archivos de texto temporales
- `.env, .env.local` - Variables de entorno (contienen secretos)
- `package-lock.json` - Lock file (se regenera automáticamente)

### ⚠️ Razones de Exclusión
1. **Seguridad:** Archivos .env contienen claves API sensibles
2. **Tamaño:** Multimedia y dependencies ocupan 95% del espacio
3. **Regenerabilidad:** Build artifacts se recrean automáticamente
4. **Temporalidad:** Screenshots y archivos pegados son temporales
5. **Redundancia:** Lock files se regeneran con npm install

---

## INSTRUCCIONES DE RESTAURACIÓN PASO A PASO

### 🚀 Restauración Completa - Procedimiento Standard

#### Paso 1: Preparar Entorno
```bash
# 1. Crear nuevo proyecto en Replit
# 2. Extraer backup en directorio raíz
# 3. Verificar estructura de archivos
```

#### Paso 2: Instalar Dependencias
```bash
npm install
# Esto recreará node_modules/ y package-lock.json automáticamente
```

#### Paso 3: Configurar Variables de Entorno
```bash
# Crear archivo .env con las siguientes variables:
DATABASE_URL=postgresql://[configurar_bd]
PORT=3000
NODE_ENV=development

# Variables opcionales para servicios externos:
SENDGRID_API_KEY=[clave_sendgrid]
SLACK_BOT_TOKEN=[token_slack]
TWILIO_ACCOUNT_SID=[sid_twilio]
TWILIO_AUTH_TOKEN=[token_twilio]
```

#### Paso 4: Preparar Base de Datos
```bash
# Aplicar esquema a la base de datos
npm run db:push

# Verificar conexión
node -e "import('./db/index.js').then(db => console.log('BD conectada'))"
```

#### Paso 5: Verificar Funcionalidad
```bash
# Verificar TypeScript
npm run check

# Ejecutar tests
npm test

# Iniciar en modo desarrollo
npm run dev
```

#### Paso 6: Validación Final
```bash
# Verificar que la aplicación responde en puerto 3000
curl http://localhost:3000/api/health

# Verificar frontend
curl http://localhost:3000/
```

### 🔧 Restauración de Emergencia - Procedimiento Mínimo

En caso de problemas con la restauración completa:

#### Opción A: Solo Backend
```bash
npm install express @neondatabase/serverless drizzle-orm
node server/index.ts
```

#### Opción B: Solo Frontend
```bash
npm install react react-dom vite @vitejs/plugin-react
npm run dev
```

#### Opción C: Verificación de Integridad
```bash
# Verificar archivos críticos
ls package.json server/index.ts client/src/App.tsx db/schema.ts

# Verificar estructura mínima
tree -I 'node_modules|.git|dist'
```

---

## REQUISITOS TÉCNICOS

### 💻 Entorno Mínimo
- **Node.js:** v18+ (recomendado v20)
- **NPM:** v8+ (incluido con Node.js)
- **PostgreSQL:** v13+ (o Neon Serverless)
- **Memoria:** 512MB mínimo, 1GB recomendado
- **Almacenamiento:** 100MB para código, 500MB con node_modules

### 🌐 Entorno de Desarrollo
- **SO:** Linux, macOS, Windows (WSL recomendado)
- **Editor:** VS Code con extensiones TypeScript y Tailwind
- **Browser:** Chrome/Firefox para desarrollo
- **Terminal:** Bash/Zsh para scripts de automatización

### ☁️ Entorno de Producción
- **Plataforma:** Replit, Google Cloud Run, Vercel, Railway
- **Build:** Automático con npm run build
- **Puerto:** Configurable vía variable PORT (default: 3000)
- **HTTPS:** Automático en plataformas cloud

---

## NOTAS IMPORTANTES

### ✅ Funcionalidad Completa vs. Backup de Código

**Este backup contiene:**
- ✅ Código fuente completo y funcional
- ✅ Configuraciones de desarrollo y producción
- ✅ Esquemas de base de datos
- ✅ Tests y documentación
- ✅ Scripts de automatización

**Este backup NO contiene:**
- ❌ Datos de producción de la base de datos
- ❌ Variables de entorno con claves API
- ❌ Assets multimedia grandes
- ❌ Historial de Git (commits)
- ❌ Cache de desarrollo

### 🔄 Proceso de Sincronización

El sistema garantiza que:
1. **Documentación siempre actualizada** antes de cada backup
2. **Análisis automático** de cambios en el código
3. **Versionado coherente** con package.json
4. **Timestamps precisos** en zona horaria Ecuador
5. **Verificación de integridad** post-backup

### 🚨 Contingencias

En caso de errores durante la restauración:
1. Verificar que todas las dependencias están instaladas
2. Comprobar variables de entorno necesarias
3. Revisar logs de error en consola
4. Contactar al equipo de desarrollo con detalles del error
5. Usar procedimiento de restauración de emergencia si es necesario

---

**Última actualización del manifiesto:** Se actualiza automáticamente con cada backup
**Mantenido por:** Sistema de Documentación Automática v1.0.0
**Cumplimiento:** ISO 9001 (Documentación Controlada), IEEE 1471 (Arquitectura), TOGAF (Gobierno)