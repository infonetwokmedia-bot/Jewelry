---
description: "Rollback de producción al último backup pre-deploy"
mode: "agent"
tools: ["terminal", "readFiles"]
---

Ejecuta un rollback en producción de Tu Joyita Miami.

## PRECAUCIÓN: Esta acción restaura la base de datos al estado pre-deploy

1. Primero, listar los backups disponibles:
   ```bash
   ssh tujoyita-prod "ls -lht /srv/stacks/tujoyita/backups/pre-deploy_*.sql.gz | head -5"
   ```
2. Mostrar al usuario los backups disponibles
3. Preguntar: "¿Confirmas que quieres restaurar la DB de producción al backup más reciente?"
4. Si confirma, ejecutar: `cd /srv/stacks/jewelry && bash scripts/deploy-agent.sh --rollback`
5. Verificar salud post-rollback: `curl -s -o /dev/null -w "%{http_code}" https://tujoyita.com`

## Para rollback de código

Si el problema es en el código (no en la DB), sugerir:

```bash
git revert HEAD
git push origin main
./scripts/deploy-agent.sh --force
```
