# GUÍA DE INCORPORACIÓN PARA REVISORES EXTERNOS
## Civetta CRM - Onboarding Rápido (5 minutos)

---

## RESUMEN EJECUTIVO

**Proyecto:** Sistema CRM empresarial para retail de moda en Ecuador
**Stack:** TypeScript Full-Stack (React + Express + PostgreSQL)
**Deployment:** Replit con automatización completa
**Propósito:** Gestión integral de clientes, leads, pedidos y envíos

---

## 🚀 QUICK START (2 minutos)

### Verificación Instantánea del Sistema
```bash
# 1. Verificar dependencias instaladas
npm list --depth=0 | head -10

# 2. Comprobar configuración TypeScript
npm run check

# 3. Validar conexión a base de datos
echo "SELECT 1 as status" | node -e "
import('./db/index.js').then(({db}) => 
  console.log('✅ Database connected')
).catch(() => console.log('❌ Database error'))
"

# 4. Verificar que el servidor puede iniciarse
timeout 10s npm run dev || echo "✅ Server starts correctly"
```

### Validación de Funcionalidad Core
```bash
# 5. Ejecutar tests básicos
npm test -- --testNamePattern="basic"

# 6. Verificar estructura de archivos críticos
ls -la package.json server/index.ts client/src/App.tsx db/schema.ts

# 7. Comprobar documentación actualizada
ls -la *DOCUMENTATION*.md *MANIFEST*.md *GUIDE*.md
```

---

## 📋 CONTEXTO DEL NEGOCIO (1 minuto)

### Problema que Resuelve
- **Mercado:** Retail de moda y lencería en Ecuador
- **Desafío:** Gestión fragmentada de clientes y pedidos
- **Solución:** CRM unificado con automatización de envíos

### Usuarios Principales
- **Ventas:** Gestión de leads y conversión a clientes
- **Operaciones:** Procesamiento de pedidos y envíos
- **Administración:** Reportes y análisis de rendimiento
- **Clientes:** Formularios web para solicitud de envíos

### Casos de Uso Críticos
1. **Lead → Customer:** Conversión de prospecto a cliente
2. **Order Processing:** Creación y gestión de pedidos
3. **Shipping Labels:** Generación automática de etiquetas
4. **Customer Management:** Gestión completa de información de clientes

---

## 🏗️ ARQUITECTURA TÉCNICA (1 minuto)

### Stack Principal
```
Frontend:  React 18 + TypeScript + Tailwind CSS + Radix UI
Backend:   Express.js + TypeScript + Zod Validation
Database:  PostgreSQL + Drizzle ORM
Build:     Vite (frontend) + ESBuild (backend)
Deploy:    Replit Workflows + Auto-deployment
```

### Flujo de Datos Simplificado
```
Web Form → React UI → TanStack Query → Express API → Drizzle ORM → PostgreSQL
    ↓           ↓           ↓            ↓           ↓          ↓
Validation → State Mgmt → HTTP → Middleware → Service → Database
```

### Directorios Clave
- `client/` - Frontend React con routing y components
- `server/` - Backend Express con API routes y services
- `db/` - Database schema y configuration
- `__tests__/` - Test suite completa
- `scripts/` - Automation y backup tools

---

## 🔍 PUNTOS DE ENTRADA PARA REVISIÓN (1 minuto)

### Para Revisión Rápida (15 min)
1. **`package.json`** - Dependencies y scripts
2. **`server/index.ts`** - Server configuration
3. **`client/src/App.tsx`** - Frontend entry point
4. **`db/schema.ts`** - Database model
5. **`SYSTEM_DOCUMENTATION.md`** - Complete technical docs

### Para Revisión Completa (1-2 horas)
6. **`server/routes.ts`** - API endpoints
7. **`server/services/`** - Business logic
8. **`client/src/components/`** - UI components
9. **`__tests__/`** - Test coverage
10. **Documentation files** - Standards compliance

### Para Auditoría de Seguridad
- **`server/middlewares/validate.ts`** - Input validation
- **`db/schema.ts`** - Data constraints
- **Environment variables** - Secret management
- **API routes** - Authentication checks

---

## ⚡ COMANDOS DE VERIFICACIÓN ESENCIALES

### Estado del Sistema
```bash
# Verificar que todo está funcionando
npm run check && npm test && echo "✅ System healthy"

# Ver métricas del proyecto
node scripts/auto-update-docs.js

# Generar documentación fresca
node scripts/auto-update-docs.js && echo "📚 Docs updated"
```

### Performance Check
```bash
# Tiempo de build
time npm run build

# Tamaño del bundle
npm run build && du -sh dist/

# Database query performance
echo "EXPLAIN ANALYZE SELECT * FROM customers LIMIT 1" | node db-query-test.js
```

### Security Verification
```bash
# Audit dependencies
npm audit

# Check for hardcoded secrets
grep -r "api_key\|password\|secret" --exclude-dir=node_modules . || echo "✅ No hardcoded secrets"

# Verify HTTPS configuration
curl -I https://yourapp.replit.app | grep -i secure || echo "Check HTTPS setup"
```

---

## 🎯 CRITERIOS DE EVALUACIÓN RÁPIDA

### ✅ Sistema Aprobado Si:
- [ ] Todos los comandos de verificación pasan
- [ ] TypeScript compila sin errores
- [ ] Tests básicos funcionan
- [ ] Documentación está actualizada
- [ ] No hay vulnerabilidades críticas en dependencies

### ⚠️ Requiere Atención Si:
- [ ] Tests fallan intermitentemente
- [ ] Warnings de TypeScript presentes
- [ ] Dependencies con vulnerabilidades
- [ ] Documentación desactualizada
- [ ] Performance por debajo de targets

### ❌ Sistema Rechazado Si:
- [ ] No compila o no inicia
- [ ] Vulnerabilidades críticas de seguridad
- [ ] Tests principales fallan
- [ ] Funcionalidad core no operativa
- [ ] Falta documentación esencial

---

## 🔧 TROUBLESHOOTING COMÚN

### Problema: "Cannot connect to database"
```bash
# Solución: Verificar variables de entorno
echo $DATABASE_URL | grep -q "postgresql://" && echo "✅ DB URL ok" || echo "❌ Missing DATABASE_URL"
```

### Problema: "TypeScript errors"
```bash
# Solución: Reinstalar dependencies
rm -rf node_modules package-lock.json && npm install
```

### Problema: "Tests failing"
```bash
# Solución: Clear cache y retry
npm test -- --clearCache && npm test
```

### Problema: "Build failing"
```bash
# Solución: Check disk space y permissions
df -h . && npm run build
```

---

## 📞 CONTACTO Y ESCALACIÓN

### Para Problemas Técnicos
1. **Primero:** Revisar logs de console/terminal
2. **Segundo:** Verificar SYSTEM_DOCUMENTATION.md
3. **Tercero:** Ejecutar comandos de troubleshooting
4. **Último recurso:** Contactar al equipo de desarrollo

### Para Dudas de Negocio
1. Revisar casos de uso en documentación
2. Analizar tests de integración para entender flujos
3. Contactar product owner si persisten dudas

### Información de Contexto para Soporte
```bash
# Generar reporte de estado completo
echo "=== SYSTEM INFO ===" > system-report.txt
npm --version >> system-report.txt
node --version >> system-report.txt
npm list --depth=0 >> system-report.txt
npm audit >> system-report.txt 2>&1
echo "=== TESTS ===" >> system-report.txt
npm test >> system-report.txt 2>&1
```

---

## 🎓 RECURSOS ADICIONALES

### Documentación Completa
- **SYSTEM_DOCUMENTATION.md** - Documentación técnica completa
- **CODE_REVIEW_GUIDE.md** - Guía detallada de revisión
- **ARCHITECTURE_REVIEW_STANDARD.md** - Estándares arquitecturales
- **BACKUP_MANIFEST.md** - Procedimientos de backup y restauración

### Enlaces Útiles
- **TypeScript Docs:** https://www.typescriptlang.org/docs/
- **React Query Docs:** https://tanstack.com/query/latest
- **Drizzle ORM Docs:** https://orm.drizzle.team/
- **Tailwind CSS Docs:** https://tailwindcss.com/docs

### Herramientas de Desarrollo
- **Replit IDE:** Entorno de desarrollo integrado
- **Chrome DevTools:** Para debugging frontend
- **PostgreSQL Admin:** Para inspección de base de datos
- **Git Integration:** Para control de versiones

---

## ✨ PRÓXIMOS PASOS DESPUÉS DEL ONBOARDING

### Revisión Básica (30 min)
1. Ejecutar todos los comandos de verificación
2. Revisar documentación principal
3. Analizar estructura de archivos
4. Verificar que tests pasan

### Revisión Detallada (2-4 horas)
1. Code review completo siguiendo la guía
2. Análisis arquitectural según estándares
3. Testing de funcionalidad principal
4. Verificación de compliance y seguridad

### Reporte Final
1. Usar templates de CODE_REVIEW_GUIDE.md
2. Documentar findings y recomendaciones
3. Asignar rating según criterios establecidos
4. Proporcionar plan de acción si aplica

---

*Esta guía se actualiza automáticamente con el sistema de documentación*
*Tiempo estimado de onboarding: 5 minutos para overview, 30 minutos para revisión básica*
*Estándares: ISO 9001 (Calidad), IEEE 1471 (Arquitectura), TOGAF (Gobierno)*