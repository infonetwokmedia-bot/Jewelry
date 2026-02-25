---
description: "Ejecutar deploy a producción (tujoyita.com) — con backup automático y health check"
mode: "agent"
tools: ["terminal", "readFiles"]
---

Ejecuta el deployment a producción de Tu Joyita Miami. **IMPORTANTE: Este proceso modifica el servidor de producción.**

## Antes de desplegar

Primero verifica ejecutando: `cd /srv/stacks/jewelry && bash scripts/deploy-agent.sh --check`

Si hay errores críticos, **NO desplegar** y reportar al usuario.

## Si todo está bien

Preguntar al usuario: "Las verificaciones pasaron. ¿Confirmas que quieres desplegar a producción (tujoyita.com)?"

Si confirma, ejecutar: `cd /srv/stacks/jewelry && bash scripts/deploy-agent.sh --force`

## Después del deploy

1. Reportar el resultado completo
2. Verificar: `curl -s -o /dev/null -w "%{http_code}" https://tujoyita.com`
3. Si algo falló, ofrecer rollback: `bash scripts/deploy-agent.sh --rollback`

## RECORDATORIO DE SEGURIDAD

- El deploy **NUNCA toca la base de datos de producción**
- Solo sincroniza código custom (mu-plugins, dashboard, scripts)
- Se crea backup automático antes de desplegar
- Rollback disponible en cualquier momento
