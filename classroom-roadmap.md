# Integración Google Classroom — Roadmap

## Objetivo
Construir un dashboard que muestre cursos, tareas y participación de estudiantes/docentes sincronizados desde Google Classroom, integrándolo con el programa Scholaris.

## Próximos bloques de trabajo

1. **Sincronización de membresías** ✅
   - Modelo/repositorio `course_memberships` creado y poblado en el sync según los roles de Classroom.
   - Cursos actualizan `teacher_id` automáticamente y se enlaza al usuario actual cuando corresponde.

2. **Sincronización de tareas y entregas**
   - Consumir `courses.courseWork` y `courses.courseWork.studentSubmissions`.
   - Modelar entidades `assignments` y `submissions`, con estados y fechas de entrega.

3. **Sincronización de participantes completos** ✅
   - Se consumen `courses/{courseId}/teachers` y `courses/{courseId}/students`.
   - Tabla `course_participants` guarda roster con email/foto y `matched_user_id` para cruzar con Scholaris.
   - Endpoint `GET /api/v1/classroom/{course_id}/participants` expone los datos para el dashboard.

4. **Automatización del flujo**
   - Disparar sync inicial luego del login (background task).
   - Programar resync periódico.

5. **API y Dashboard** (en progreso)
   - Falta modelar/servir tareas y submissions; `GET /classroom/{course_id}/participants` ya disponible.
   - Próximo sprint: endpoints agregados para assignments, métricas y vista en `apps/web`.

## Milestone actual
- Implementar el bloque 2: sincronización de tareas y entregas para nutrir el dashboard.
