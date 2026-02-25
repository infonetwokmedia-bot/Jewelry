---
description: "Crear backup de la base de datos (local o producción)"
mode: "agent"
tools: ["terminal", "readFiles"]
---

Gestionar backups del proyecto Tu Joyita Miami.

Preguntar al usuario qué tipo de backup necesita:

## Backup Local

```bash
cd /srv/stacks/jewelry && bash scripts/backup-database.sh
```

O con Make:

```bash
cd /srv/stacks/jewelry && make backup
```

## Backup de Producción

```bash
cd /srv/stacks/jewelry && make prod-backup
```

## Backup de Producción + Descarga Local

```bash
cd /srv/stacks/jewelry && make prod-pull-backup
```

## Backup Completo (DB + wp-content)

```bash
cd /srv/stacks/jewelry && make backup-full
```

Después del backup, confirmar que se creó y mostrar el tamaño del archivo.
