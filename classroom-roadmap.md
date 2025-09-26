# Integración Google Classroom — Roadmap

## Objetivo
Construir un dashboard que muestre cursos, tareas y participación de estudiantes/docentes sincronizados desde Google Classroom, integrándolo con el programa Scholaris.

## Próximos bloques de trabajo

1. **Sincronización de membresías** ✅
   - Modelo/repositorio `course_memberships` creado y poblado en el sync según los roles de Classroom.
   - Cursos actualizan `teacher_id` automáticamente y se enlaza al usuario actual cuando corresponde.

2. **Sincronización de tareas y entregas** ✅
   - Se consumen `courses.courseWork` (con `assigneeMode`, `individualStudentsOptions`) y `studentSubmissions` (estado, adjuntos, notas).
   - Tablas `course_assignments` y `course_submissions` guardan metadatos, destinatarios y evidencias; endpoints REST los exponen para el dashboard.

3. **Sincronización de participantes completos** ✅
   - Se consumen `courses/{courseId}/teachers` y `courses/{courseId}/students`.
   - Tabla `course_participants` guarda roster con email/foto y `matched_user_id` para cruzar con Scholaris.
   - Endpoint `GET /api/v1/classroom/{course_id}/participants` expone los datos para el dashboard.

4. **Automatización del flujo** ✅
   - Scheduler asincrónico (APS) ejecuta delta-sync cada 5 min y full-sync cada 6 h con control de ETags.
   - El job recorre coordinadores/admins verificados (más `CLASSROOM_SCHEDULER_USER_ID`) y refresca tokens automáticamente.
   - Nuevos endpoints manuales: `/classroom/sync/delta`, `/classroom/sync/full`, `/notifications/test`.

5. **API y Dashboard** (en progreso)
   - Endpoints disponibles: `/classroom/{course_id}/participants`, `/assignments`, `/submissions`.
   - Delta-sync dispara notificaciones (WhatsApp/console) ante cambios `late` o `RETURNED`.
   - Próximo sprint: métricas agregadas, visualización en `apps/web` (progreso, alerts, cruces con Scholaris) y wiring con el proveedor WA real.

6. **Data quality & Scholaris match** (próximo)
   - Validar matching email/nombre vs. `user_contacts` y exponer alertas cuando no haya `phone_e164`.
   - Definir reconciliación para tareas sin submissions (cursos donde somos alumnos) para no bloquear dashboards.

## Milestone actual
- Pulir bloque 5: integrar métricas y UI del dashboard con los nuevos endpoints.
