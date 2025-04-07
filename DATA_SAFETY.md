# Estandarización de datos de clientes en CRM

## Resumen de cambios

Se ha implementado una estandarización completa de los campos de nombres de clientes para mejorar la consistencia y calidad de los datos en el CRM. Esta documentación detalla las modificaciones realizadas y las consideraciones para desarrolladores y usuarios del sistema.

## Cambios realizados

1. **Esquema de base de datos**:
   - Los campos `firstName` y `lastName` son ahora **obligatorios** (NOT NULL) en las tablas `customers` y `leads`.
   - El campo `name` se mantiene por compatibilidad pero ahora se genera automáticamente a partir de `firstName` y `lastName`.

2. **API y servicios**:
   - Las operaciones de creación y actualización de clientes y leads ahora exigen la presencia de `firstName` y `lastName`.
   - El campo `name` se mantiene en las respuestas API por compatibilidad, pero siempre se genera a partir de `firstName` y `lastName`.
   - Se ha actualizado la lógica de conversión entre clientes y leads para mantener la consistencia de estos campos.

3. **Migración de datos**:
   - Se han actualizado todos los registros existentes para garantizar que tengan valores válidos en `firstName` y `lastName`.
   - Se ha regenerado el campo `name` para todos los registros para asegurar consistencia.

## Impacto en el desarrollo

### Validaciones
- Todas las operaciones de creación y actualización de clientes y leads deben incluir `firstName` y `lastName`.
- La validación fallará si alguno de estos campos está vacío o es nulo.

### Convención de nomenclatura
- En el código (TypeScript): `firstName`, `lastName` (camelCase)
- En la base de datos (PostgreSQL): `first_name`, `last_name` (snake_case)

### Ejemplos de código

**Creación de cliente correcta**:
```typescript
const customer = {
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@example.com"
};
// El campo name se generará automáticamente como "Juan Pérez"
```

**Actualización de cliente correcta**:
```typescript
const customerUpdate = {
  firstName: "Juan Carlos",
  lastName: "Pérez González",
  // Otros campos...
};
// El campo name se actualizará automáticamente a "Juan Carlos Pérez González"
```

## Consideraciones para Front-end

1. **Formularios**:
   - Todos los formularios de creación/edición de clientes o leads deben incluir campos separados para `firstName` y `lastName`.
   - Ambos campos deben marcarse como obligatorios y tener validaciones apropiadas.
   - El campo `name` ya no debe ser editable directamente.

2. **Visualización**:
   - Se puede mostrar el campo `name` para visualizar el nombre completo del cliente.
   - Para edición, siempre usar los campos separados `firstName` y `lastName`.

## Consideraciones para integraciones

1. **Importación de datos**:
   - Las importaciones deben mapear correctamente los campos de nombre a `firstName` y `lastName`.
   - Si solo se dispone de un campo de nombre completo, debe implementarse lógica para dividirlo apropiadamente.

2. **Exportación de datos**:
   - Las exportaciones deben incluir tanto el campo `name` como los campos `firstName` y `lastName` para mayor flexibilidad.

## Plan a futuro

- En una versión futura, el campo `name` se convertirá en un campo calculado y eventualmente podría ser deprecado para simplificar el esquema.
- Se recomienda que todas las nuevas características y componentes utilicen exclusivamente `firstName` y `lastName`.

## Estadísticas de la migración

- Se actualizaron **44 clientes** y **10 leads** para establecer consistencia entre los campos `name`, `firstName` y `lastName`.
- Se estableció la restricción NOT NULL en los campos `firstName` y `lastName` para prevenir inconsistencias futuras.

---

Documento creado el 7 de abril de 2025
