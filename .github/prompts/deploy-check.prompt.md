---
description: "Verificar que todo está listo para deploy a producción (sin desplegar nada)"
mode: "agent"
tools: ["terminal", "readFiles"]
---

Ejecuta el script de verificación pre-deploy del proyecto Tu Joyita Miami.

1. Ejecuta: `cd /srv/stacks/jewelry && bash scripts/deploy-agent.sh --check`
2. Analiza los resultados
3. Reporta:
   - Cuántas verificaciones pasaron, cuántas fallaron
   - Si el aislamiento de bases de datos es correcto (`jewelry_db` local ≠ `tujoyita_db` producción)
   - Estado de la conexión SSH a producción
   - Salud del sitio actual (HTTPS, SSL, redirect)
   - Si hay cambios sin commitear que podrían afectar
4. Recomienda si es seguro desplegar o no
