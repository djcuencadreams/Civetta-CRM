# Sistema Automático de Backups - Civetta CRM

## ⚠️ IMPORTANTE: Cómo hacer commits con backup automático

Para garantizar que **SIEMPRE** se genere un backup después de cada commit, **UTILIZA ESTE COMANDO** en lugar del comando git commit tradicional:

```bash
node commit-and-backup.js "Tu mensaje de commit aquí"
```

O en modo interactivo:

```bash
node commit-and-backup.js
```

Este método es 100% confiable y asegura que se genere un backup después de cada commit, sin depender de git hooks que pueden fallar en Replit.

## Características

- ✅ Genera automáticamente un backup con cada commit (usando el comando recomendado)
- ✅ Elimina los backups anteriores (solo conserva el más reciente)
- ✅ Incluye información detallada del commit en cada backup
- ✅ Excluye directorios innecesarios (.git, node_modules, etc.)
- ✅ Excluye archivos grandes e imágenes

## Ubicación y formato del backup

Los archivos de backup se guardan en:

```
BackupforChatGPT/backup_YYYY-MM-DD_HH-MM-SS_COMMITHASH.zip
```

Ejemplo: `backup_2025-04-02_15-24-10_d34db33f.zip`

## Contenido del backup

El archivo ZIP contiene:
- Todo el código fuente esencial del proyecto
- Un archivo `commit-info.txt` con:
  - Hash del commit
  - Fecha y hora del commit
  - Autor del commit
  - Mensaje del commit

## Elementos excluidos del backup

- Directorios:
  - `.git/`
  - `node_modules/`
  - `BackupforChatGPT/`
  - `attached_assets/`
  - Carpetas ocultas (las que comienzan con `.`)

- Archivos:
  - Con extensiones: `.png`, `.jpg`, `.jpeg`, `.csv`, `.xlsx`, `.pdf`
  - Que comienzan con: `screenshot.`, `test_`, `Pasted-`, `Screenshot`

## Componentes del sistema

El sistema consta de dos componentes principales:

1. **zip-project.js**: Script base que implementa la lógica de generación del backup
2. **commit-and-backup.js**: Script que combina el proceso de commit con la generación automática del backup

### Script commit-and-backup.js

Este script es la solución completa para asegurar backups con cada commit:
- Ejecuta `git add .` para añadir todos los archivos modificados
- Realiza el commit con el mensaje proporcionado
- Ejecuta automáticamente la generación del backup
- Funciona de manera confiable en el entorno Replit

### ⚠️ Nota importante sobre git hooks

Aunque existe un hook de git post-commit configurado (.git/hooks/post-commit), este puede no ejecutarse de manera confiable en Replit. Por eso, se recomienda encarecidamente utilizar el script `commit-and-backup.js` para realizar todos los commits.

## Dependencias

- Node.js
- Paquete NPM: `archiver` (ya instalado en el proyecto)