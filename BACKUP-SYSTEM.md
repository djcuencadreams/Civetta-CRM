# Sistema Automático de Backups - Civetta CRM

Este sistema genera un archivo ZIP con todo el código fuente del proyecto cuando se realiza un commit en Git.

## Características

- ✅ Genera un backup al usar el script `commit-and-backup.js`
- ✅ Elimina los backups anteriores (solo conserva el más reciente)
- ✅ Incluye información detallada del commit en cada backup
- ✅ Excluye directorios innecesarios (.git, node_modules, etc.)
- ✅ Excluye archivos grandes e imágenes

## Formato del nombre del archivo de backup

```
backup_YYYY-MM-DD_HH-MM-SS_COMMITHASH.zip
```

Ejemplo: `backup_2025-04-02_15-24-10_d34db33f.zip`

## Contenido del backup

El archivo ZIP contiene:
- Todo el código fuente del proyecto
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

## Funcionamiento técnico

El sistema consta de dos componentes principales:

1. **zip-project.js**: Script en Node.js que implementa la lógica de generación del backup
2. **commit-and-backup.js**: Script que combina el proceso de commit con la generación automática del backup

### Script zip-project.js

Este script:
- Verifica si existe la carpeta `BackupforChatGPT/` y la crea si es necesario
- Elimina cualquier backup previo
- Obtiene información del último commit (hash, mensaje, autor, fecha)
- Crea un archivo ZIP con todos los archivos del proyecto
- Añade un archivo `commit-info.txt` al ZIP con los detalles del commit

### Script commit-and-backup.js (NUEVO)

Este script facilita el proceso completo:
- Ejecuta `git add .` para añadir todos los archivos modificados
- Realiza el commit con el mensaje proporcionado
- Ejecuta automáticamente `zip-project.js` para generar el backup

El script puede utilizarse de dos formas:

1. **Modo interactivo** - solicita el mensaje de commit:

```bash
node commit-and-backup.js
```

2. **Modo directo** - proporciona el mensaje de commit como argumento:

```bash
node commit-and-backup.js "Mensaje del commit"
```

## Otras formas de generar backups

Si necesitas generar un backup manualmente (sin hacer un commit), puedes ejecutar:

```bash
node --experimental-modules zip-project.js
```

Esto generará un nuevo backup en la carpeta `BackupforChatGPT/` con la información del último commit realizado.

## Dependencias

- Node.js
- Paquete NPM: `archiver`