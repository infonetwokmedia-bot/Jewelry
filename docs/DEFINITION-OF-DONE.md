# Definition of Done (DoD) - Jewelry Project

Criterios que TODA tarea debe cumplir antes de considerarse terminada
y lista para merge.

## DoD para User Stories / Features

- [ ] Todos los criterios de aceptacion del Issue verificados
- [ ] Ciclo TDD completado por cada criterio (RED -> GREEN -> REFACTOR)
- [ ] Tests unitarios escritos y pasando
- [ ] Tests E2E escritos y pasando (si hay UI involucrada)
- [ ] Codigo sigue WordPress Coding Standards
- [ ] Funciones custom con prefijo `jewelry_`
- [ ] Input sanitizado, output escapado
- [ ] Contenido bilingue creado (ES + EN) y vinculado con Bogo (si aplica)
- [ ] CI pipeline verde (todos los jobs)
- [ ] PR creado con evidencia TDD documentada
- [ ] Code review aprobado (al menos 1 approval)
- [ ] Sin regresiones en funcionalidad existente
- [ ] Documentacion actualizada (si aplica)

## DoD para Bug Fixes

- [ ] Bug reproducido y documentado
- [ ] Test de regresion escrito (prueba que el bug existia)
- [ ] Fix implementado (test pasa)
- [ ] No se introducen nuevos bugs
- [ ] Funciona en ambos idiomas (si aplica)
- [ ] CI pipeline verde
- [ ] PR revisado y aprobado

## DoD para Technical Tasks

- [ ] Todas las subtareas del Issue completadas
- [ ] Tests existentes siguen pasando
- [ ] Nuevos tests escritos si se agrego logica
- [ ] CI pipeline verde
- [ ] PR revisado y aprobado
- [ ] Documentacion tecnica actualizada

## DoD para Releases (develop -> main)

- [ ] Todos los Issues del milestone cerrados
- [ ] Suite completa de tests pasando
- [ ] Smoke test manual en ambos idiomas
- [ ] Checkout flow funcional
- [ ] PROYECTO-ESTADO.md actualizado
- [ ] Tag de version creado
- [ ] Backup de base de datos realizado pre-deploy

## Cuando NO se cumple el DoD

Si un item del DoD no puede cumplirse:

1. Documentar en el PR por que no se cumple
2. Crear un Issue nuevo para la deuda tecnica
3. Obtener aprobacion explicita del reviewer para hacer excepcion
4. La excepcion debe ser temporal, no permanente

---

Referencia: [WORKFLOW-TDD.md](./WORKFLOW-TDD.md)
