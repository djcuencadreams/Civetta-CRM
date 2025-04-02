# Sistema Automático de Backups - Civetta CRM

Este sistema genera automáticamente un archivo ZIP con todo el código fuente del proyecto cada vez que se realiza un commit en Git.

## Características

- ✅ Genera un backup al ejecutar `git commit`
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
2. **Git Hook**: Configurado en `.git/hooks/post-commit` para ejecutarse automáticamente después de cada commit

### Script zip-project.js

Este script:
- Verifica si existe la carpeta `BackupforChatGPT/` y la crea si es necesario
- Elimina cualquier backup previo
- Obtiene información del último commit (hash, mensaje, autor, fecha)
- Crea un archivo ZIP con todos los archivos del proyecto
- Añade un archivo `commit-info.txt` al ZIP con los detalles del commit

### Git Hook (post-commit)

El hook post-commit ejecuta `zip-project.js` automáticamente después de cada commit.

## Cómo ejecutar manualmente el backup

Si necesitas generar un backup manualmente (sin hacer un commit), puedes ejecutar:

```bash
node --experimental-modules zip-project.js
```

Esto generará un nuevo backup en la carpeta `BackupforChatGPT/` con la información del último commit realizado.

## Dependencias

- Node.js
- Paquete NPM: `archiver`