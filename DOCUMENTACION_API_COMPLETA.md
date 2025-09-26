# 📋 Documentación Completa del Proyecto NerdealA25

Documentación completa del proyecto NerdealA25 para planificar la UI. El sistema es una plataforma educativa con integración a Google Classroom y notificaciones por WhatsApp.

## 🏗️ Arquitectura General

### Componentes Principales:
- **API Backend**: FastAPI con Python (Puerto por defecto: 8000)
- **Servicio WhatsApp**: Node.js con whatsapp-web.js (Puerto: 3001)
- **Base de Datos**: SQLite con SQLAlchemy
- **Cola de Trabajos**: Redis para WhatsApp
- **Integración**: Google Classroom API + OAuth2

---

## 🔐 Sistema de Autenticación

### Roles de Usuario:
- **ADMIN**: Control total del sistema
- **COORDINATOR**: Gestión de cursos y usuarios
- **TEACHER**: Gestión de sus cursos y estudiantes
- **STUDENT**: Acceso a su información personal

### Endpoints de Auth:
| Endpoint | Método | Descripción | Requiere Auth |
|----------|--------|-------------|---------------|
| `/api/v1/auth/register` | POST | Registro de usuario | ❌ |
| `/api/v1/auth/login` | POST | Iniciar sesión | ❌ |
| `/api/v1/auth/me` | GET | Perfil del usuario actual | ✅ |
| `/api/v1/auth/google/login` | GET | Iniciar OAuth con Google | ❌ |
| `/api/v1/auth/google/exchange` | POST | Intercambiar código OAuth | ❌ |
| `/api/v1/auth/verify` | POST | Verificar cuenta por email | ❌ |
| `/api/v1/auth/password/recovery` | POST | Solicitar reset de contraseña | ❌ |
| `/api/v1/auth/password/reset` | POST | Resetear contraseña | ❌ |

### Flujo de Autenticación:
1. **Registro Tradicional**: Email + contraseña → Verificación por email
2. **Google OAuth**: Redirect → Callback → Auto-registro si no existe
3. **JWT Tokens**: Expiración 24h, refresh 7 días

---

## 👥 Gestión de Usuarios

### Endpoints:
| Endpoint | Método | Descripción | Roles Permitidos |
|----------|--------|-------------|------------------|
| `/api/v1/users/` | GET | Listar usuarios (paginado) | ADMIN |
| `/api/v1/users/` | POST | Crear usuario | ADMIN |
| `/api/v1/users/{user_id}` | GET | Ver usuario específico | ADMIN |
| `/api/v1/users/{user_id}` | PATCH | Actualizar usuario | ADMIN |
| `/api/v1/users/{user_id}` | DELETE | Eliminar usuario | ADMIN |

### Parámetros de Consulta:
- `role`: Filtrar por rol
- `page`: Número de página (default: 1)
- `size`: Elementos por página (1-100, default: 20)

---

## 🎓 Gestión de Cursos

### Endpoints:
| Endpoint | Método | Descripción | Roles Permitidos |
|----------|--------|-------------|------------------|
| `/api/v1/courses/` | GET | Listar cursos | Todos los verificados |
| `/api/v1/courses/` | POST | Crear curso | ADMIN, COORDINATOR |
| `/api/v1/courses/{course_id}` | GET | Ver curso específico | Todos los verificados |
| `/api/v1/courses/{course_id}` | PATCH | Actualizar curso | ADMIN, COORDINATOR |
| `/api/v1/courses/{course_id}` | DELETE | Eliminar curso | ADMIN |

### Funcionalidades Especiales:
- **Profesores**: Solo ven sus propios cursos
- **Filtrado automático**: Por `teacher_id` según el rol
- **Relación**: Curso → Profesor → Estudiantes

---

## 👨‍🎓 Gestión de Estudiantes

### Endpoints:
| Endpoint | Método | Descripción | Roles Permitidos |
|----------|--------|-------------|------------------|
| `/api/v1/students/` | GET | Listar estudiantes con métricas | Todos los verificados |
| `/api/v1/students/` | POST | Crear estudiante | ADMIN, COORDINATOR |
| `/api/v1/students/{student_id}` | GET | Ver detalle completo | Todos los verificados |
| `/api/v1/students/{student_id}` | PATCH | Actualizar estudiante | ADMIN, COORDINATOR, TEACHER |
| `/api/v1/students/{student_id}` | DELETE | Eliminar estudiante | ADMIN |

### Datos Incluidos:
- **Información básica**: Usuario vinculado, curso, progreso
- **Métricas**: Tasa de asistencia, alertas pendientes
- **Relaciones**: Notificaciones, reportes, asistencias
- **Filtros**: Por `course_id` obligatorio para TEACHER

---

## 📢 Sistema de Notificaciones

### Endpoints:
| Endpoint | Método | Descripción | Roles Permitidos |
|----------|--------|-------------|------------------|
| `/api/v1/notifications/` | GET | Listar notificaciones | Todos los verificados |
| `/api/v1/notifications/` | POST | Crear notificación | ADMIN, COORDINATOR, TEACHER |
| `/api/v1/notifications/{id}` | PATCH | Actualizar notificación | ADMIN, COORDINATOR, TEACHER |
| `/api/v1/notifications/{id}` | DELETE | Eliminar notificación | ADMIN, COORDINATOR |
| `/api/v1/notifications/test` | POST | Enviar mensaje de prueba | ADMIN, COORDINATOR, TEACHER |
| `/api/v1/notifications/stream/{channel}` | WebSocket | Stream en tiempo real | Todos |

### Estados de Notificación:
- **PENDING**: Recién creada
- **SENT**: Enviada por WhatsApp
- **READ**: Leída por el usuario

### WebSocket:
- **Canal**: Por `student_id`
- **Eventos**: `created`, `updated`, `deleted`

---

## 📊 Reportes y Asistencia

### Endpoints de Asistencia:
| Endpoint | Método | Descripción | Roles Permitidos |
|----------|--------|-------------|------------------|
| `/api/v1/attendance/` | GET | Listar asistencia con resumen | Todos los verificados |
| `/api/v1/attendance/` | POST | Registrar asistencia | ADMIN, COORDINATOR, TEACHER |

### Endpoints de Reportes:
| Endpoint | Método | Descripción | Roles Permitidos |
|----------|--------|-------------|------------------|
| `/api/v1/reports/` | GET | Listar reportes | Todos los verificados |
| `/api/v1/reports/` | POST | Crear reporte | ADMIN, COORDINATOR, TEACHER |
| `/api/v1/reports/{report_id}` | GET | Ver reporte específico | Todos los verificados |
| `/api/v1/reports/{report_id}` | DELETE | Eliminar reporte | ADMIN, COORDINATOR |

---

## 🎓 Integración Google Classroom

### Endpoints:
| Endpoint | Método | Descripción | Headers |
|----------|--------|-------------|---------|
| `/api/v1/classroom/courses` | GET | Obtener cursos de Classroom | `X-Goog-Access-Token` |
| `/api/v1/classroom/sync` | POST | Sincronizar cursos completos | `X-Goog-Access-Token` |
| `/api/v1/classroom/sync/delta` | POST | Sincronización incremental | `X-Goog-Access-Token` |
| `/api/v1/classroom/sync/full` | POST | Sincronización completa | `X-Goog-Access-Token` |
| `/api/v1/classroom/{course_id}/participants` | GET | Participantes del curso | `X-Goog-Access-Token` |
| `/api/v1/classroom/{course_id}/assignments` | GET | Tareas del curso | `X-Goog-Access-Token` |
| `/api/v1/classroom/{course_id}/submissions` | GET | Entregas del curso | `X-Goog-Access-Token` |

### Funcionalidades:
- **Auto-sync**: Cursos, participantes, tareas, entregas
- **Matching**: Usuarios de Google → Usuarios locales
- **Roles**: Auto-detección Teacher/Student
- **Scheduler**: Sincronización automática en background

---

## 📱 Servicio WhatsApp

### Características:
- **Puerto**: 3001
- **Autenticación**: QR Code (una vez)
- **Persistencia**: Sesión guardada en Docker volume
- **Cola**: Redis para procesamiento asíncrono

### Endpoints HTTP:
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Estado del servicio |
| `/status` | GET | Estado completo (isReady, hasQR, queue) |
| `/qr` | GET | Obtener QR code para setup |
| `/send` | POST | Enviar mensaje directo |
| `/clear-session` | POST | Limpiar sesión WhatsApp |
| `/session-info` | GET | Info de la sesión actual |

### Formato de Trabajo (Redis):
```json
{
  "id": "unique-job-id",
  "recipient": {
    "phone": "+5491122334455",
    "name": "User Name"
  },
  "message": {
    "type": "text",
    "text": "Hello! This is your message."
  },
  "metadata": {
    "retries": 0,
    "initiatedBy": "your-service-name",
    "priority": "normal"
  }
}
```

### Variables de Entorno:
- `REDIS_URL`: `redis://redis:6379`
- `WHATSAPP_QUEUE`: `whatsapp:pending`
- `WHATSAPP_MAX_RETRIES`: `5`
- `WHATSAPP_SESSION_DIR`: `/app/session-data`

---

## 🔧 Configuración del Sistema

### Variables de Entorno Principales:
```bash
# Base de datos
DATABASE_URL=sqlite+aiosqlite:///./nerdeala.db

# JWT
JWT_SECRET_KEY=super-secret-key-change-me
JWT_ACCESS_TOKEN_EXPIRES_MINUTES=1440

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5001/oauth/callback

# CORS
CORS_ORIGINS=["http://localhost:5001"]

# WhatsApp HTTP
WA_HTTP_BASE_URL=http://whatsapp-service:3001
WA_HTTP_TIMEOUT=20.0

# Redis
REDIS_URL=redis://redis:6379
```

---

## 📊 Modelos de Datos

### Usuario (User):
```python
{
  "id": "string",
  "name": "string",
  "email": "email@example.com",
  "role": "admin|teacher|student|coordinator",
  "verified": "boolean",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Curso (Course):
```python
{
  "id": "string",
  "name": "string",
  "description": "string|null",
  "teacher_id": "string|null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Estudiante (Student):
```python
{
  "id": "string",
  "user_id": "string",
  "course_id": "string|null",
  "progress": "float(0.0-1.0)",
  "attendance_rate": "float(0.0-1.0)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Notificación (Notification):
```python
{
  "id": "string",
  "student_id": "string",
  "message": "string",
  "status": "pending|sent|read",
  "created_at": "datetime"
}
```

### Asistencia (Attendance):
```python
{
  "id": "string",
  "student_id": "string",
  "date": "date",
  "present": "boolean",
  "created_at": "datetime"
}
```

### Reporte (Report):
```python
{
  "id": "string",
  "student_id": "string",
  "content": "string",
  "created_at": "datetime"
}
```

---

## 🔍 Entidades Adicionales (Google Classroom)

### Participante del Curso:
```python
{
  "google_user_id": "string",
  "email": "string",
  "full_name": "string",
  "photo_url": "string|null",
  "role": "teacher|student",
  "matched_user_id": "string|null"
}
```

### Tarea del Curso:
```python
{
  "id": "string",
  "course_id": "string",
  "title": "string",
  "description": "string|null",
  "work_type": "string",
  "state": "string",
  "due_at": "datetime|null",
  "max_points": "float|null",
  "created_time": "datetime",
  "updated_time": "datetime"
}
```

### Entrega de Tarea:
```python
{
  "id": "string",
  "course_id": "string",
  "coursework_id": "string",
  "google_user_id": "string",
  "matched_user_id": "string|null",
  "state": "string",
  "late": "boolean",
  "turned_in_at": "datetime|null",
  "assigned_grade": "float|null",
  "draft_grade": "float|null"
}
```

---

## 🎨 Recomendaciones para la UI

### Pantallas Principales:
1. **Dashboard**: Métricas generales, alertas pendientes
2. **Cursos**: CRUD con vista según rol
3. **Estudiantes**: Lista con filtros + vista detallada
4. **Notificaciones**: Centro de mensajes con estados
5. **Google Classroom**: Panel de sincronización
6. **WhatsApp**: Configuración y estado del servicio
7. **Reportes**: Analytics y métricas

### Consideraciones UX:
- **Roles**: Interfaces diferentes según permisos
- **Real-time**: WebSockets para notificaciones
- **Filtros**: Por curso, estado, fecha
- **Paginación**: Todos los listados
- **Estados**: Loading, error, empty states
- **OAuth**: Flujo integrado con Google
- **Mobile**: Responsive design

### APIs Críticas para UI:
- **Auth**: Manejo de sesiones y roles
- **Students**: Vista principal para profesores
- **Notifications**: Centro de actividad
- **Classroom**: Sincronización en tiempo real
- **WhatsApp**: Monitoreo de mensajes

### Flujos de Usuario por Rol:

#### ADMIN:
- Dashboard con métricas globales
- Gestión completa de usuarios
- Configuración del sistema
- Acceso a todos los datos

#### COORDINATOR:
- Gestión de cursos y profesores
- Creación de estudiantes
- Supervisión de métricas
- Configuración de notificaciones

#### TEACHER:
- Vista de sus cursos asignados
- Gestión de estudiantes del curso
- Envío de notificaciones
- Registro de asistencia
- Sincronización con Google Classroom

#### STUDENT:
- Vista de su progreso personal
- Notificaciones recibidas
- Historial de asistencia
- Sus reportes

---

## 🚀 Próximos Pasos para Desarrollo UI

### Fase 1: Autenticación
- [ ] Login/Registro tradicional
- [ ] Integración Google OAuth
- [ ] Manejo de sesiones JWT
- [ ] Protección de rutas por rol

### Fase 2: Dashboard
- [ ] Dashboard diferenciado por rol
- [ ] Métricas en tiempo real
- [ ] Centro de notificaciones
- [ ] Estados de carga

### Fase 3: Gestión Principal
- [ ] CRUD de usuarios (ADMIN)
- [ ] Gestión de cursos
- [ ] Lista y detalle de estudiantes
- [ ] Sistema de filtros y búsqueda

### Fase 4: Características Avanzadas
- [ ] WebSocket para notificaciones
- [ ] Integración WhatsApp
- [ ] Sincronización Google Classroom
- [ ] Reportes y analytics

### Fase 5: Optimización
- [ ] Performance y caching
- [ ] Responsive design
- [ ] Testing completo
- [ ] Documentación de usuario

---

## 📱 Endpoints de Estado y Monitoreo

### Health Checks:
| Endpoint | Descripción |
|----------|-------------|
| `/api/v1/health` | Estado de la API |
| `http://whatsapp-service:3001/health` | Estado del servicio WhatsApp |
| `http://whatsapp-service:3001/status` | Estado detallado WhatsApp |

### Configuración en Tiempo Real:
- **CORS**: Configurado para desarrollo local
- **Rate Limiting**: 5 intentos de login por minuto
- **Timeouts**: 20s para WhatsApp HTTP
- **Paginación**: Máximo 100 elementos por página

---

*Documentación generada el: 2025-09-26*
*Versión del proyecto: NerdealA25*
*Autor: Análisis completo del sistema*
