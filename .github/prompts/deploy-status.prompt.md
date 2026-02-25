---
description: "Ver el estado actual de producción (tujoyita.com) — contenedores, disco, salud del sitio"
mode: "agent"
tools: ["terminal", "readFiles"]
---

Consulta el estado de producción del proyecto Tu Joyita Miami.

1. Ejecuta: `cd /srv/stacks/jewelry && bash scripts/deploy-agent.sh --status`
2. Además, verifica manualmente:
   - `curl -s -o /dev/null -w "%{http_code}" https://tujoyita.com` → debe ser 200
   - `curl -s -o /dev/null -w "%{http_code}" https://tujoyita.com/dashboard/` → debe ser 200
   - `curl -s -o /dev/null -w "%{http_code}" https://tujoyita.com/en/` → debe ser 200
3. Reporta el estado de forma clara:
   - ¿El sitio está arriba?
   - ¿SSL válido? ¿Cuántos días le quedan?
   - ¿Contenedores corriendo?
   - ¿Espacio en disco suficiente?
