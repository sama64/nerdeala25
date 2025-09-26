# Nerdeala Vibeathon

Plataforma educativa full stack para integrar Google Classroom con paneles de progreso, seguimiento de asistencia y notificaciones inteligentes. El proyecto combina un frontend en Next.js + Tailwind con un backend en FastAPI + SQLAlchemy, siguiendo los lineamientos de accesibilidad, seguridad y mantenibilidad definidos en las guías de implementación.

## Estructura

```
apps/
 ├─ api/               # Backend FastAPI
 │   ├─ app/
 │   │   ├─ api/routes # Endpoints (auth, students, courses, etc.)
 │   │   ├─ core       # Configuración, seguridad y logging
 │   │   ├─ models     # Modelos SQLAlchemy
 │   │   ├─ repositories # Capa de persistencia/CRUD
 │   │   ├─ schemas    # Modelos Pydantic de entrada/salida
 │   │   └─ services   # Integraciones externas (Classroom, emails, notificaciones)
 │   └─ tests/         # Pruebas de integración con pytest + httpx
 └─ web/               # Frontend Next.js (App Router)
     ├─ src/app        # Rutas (landing, autenticación, dashboard en español)
     ├─ src/components # UI reusable y providers de contexto
     ├─ src/features   # Lógica de datos (React Query + API client)
     └─ src/lib        # Utilidades compartidas (fetcher, env, api client)

services/
 └─ whatsapp/          # WhatsApp notification service
     ├─ index.js       # Redis queue consumer + whatsapp-web.js
     ├─ Dockerfile     # Container with Chrome/Puppeteer setup
     └─ README.md      # Service documentation

tests/
 └─ push_sample_whatsapp_job.py  # Test script for WhatsApp service
```

## Requisitos previos

- **Backend**: Python 3.11 ó 3.12 (pydantic-core aún no publica wheel estable para 3.13), virtualenv, acceso a SQLite o PostgreSQL.
- **Frontend**: Node.js 18+, npm o pnpm.
- **Generales**: OpenSSL para bcrypt, opcionalmente Redis si se habilitan flujos de rate limiting avanzados.

## Puesta en marcha

### Backend (FastAPI)

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --reload
```

Variables clave (ver `.env.example`):

- `DATABASE_URL` / `SYNC_DATABASE_URL` (SQLite por defecto)  
- `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRES_MINUTES`  
- `CLASSROOM_API_BASE_URL`, `CLASSROOM_SERVICE_ACCOUNT_FILE` (modo demo cuando se deja vacío)  
- `CORS_ORIGINS` para habilitar el dominio del frontend  

### Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev
```

Ajusta `NEXT_PUBLIC_API_BASE_URL` en el entorno del frontend para apuntar al backend (por defecto `http://localhost:8000`).

### WhatsApp Service (Opcional)

Servicio de notificaciones WhatsApp que consume mensajes desde una cola Redis:

```bash
# 1. Construir el servicio
docker compose -f docker-compose.whatsapp.yml build whatsapp-service

# 2. Autenticación inicial (una sola vez)
python setup-whatsapp-web.py
# Escanea el código QR, espera "session saved correctly", luego Ctrl+C

# 3. Iniciar el servicio
docker compose -f docker-compose.whatsapp.yml up -d

# 4. Probar con un mensaje
python tests/push_sample_whatsapp_job.py
```

El servicio mantiene la sesión de WhatsApp persistente y procesa automáticamente los mensajes añadidos a la cola `whatsapp:pending`. Ver `services/whatsapp/README.md` para más detalles.

## Estrategia de pruebas

- **Backend**: pruebas de integración con `pytest` y `httpx.AsyncClient` (`apps/api/tests`). Incluye escenarios de registro/verificación/login, sincronización con Classroom y ciclo de vida de estudiantes. Ejecuta con:
  ```bash
  cd apps/api
  pytest
  ```
- **Frontend (planificado)**: añadir pruebas de componentes con Playwright o React Testing Library, validando accesibilidad (using `@testing-library/jest-dom`) y flujos críticos: autenticación, panel de progreso, envío de notificaciones. Se recomienda configurar Playwright para cubrir rutas del dashboard con un backend mockeado.
- **E2E sugerido**: orquestar ambos servicios con Docker Compose y emplear Playwright/Cypress contra instancias reales para validar flujos completos (vinculación Classroom, creación de notificaciones, visualización de métricas).

## Consideraciones de despliegue

- **Contenedores**: empaquetar `apps/api` y `apps/web` en contenedores separados. FastAPI puede servirse con Uvicorn + Gunicorn; Next.js puede construirse en modo estático (`next build`) o desplegarse en Vercel.
- **Base de datos**: en producción apostar por PostgreSQL con SSL y manejar migraciones con Alembic. Configurar pool de conexiones y health checks.
- **Autenticación y seguridad**: almacenar secretos en un gestor (AWS Secrets Manager, GCP Secret Manager). Configurar HTTPS, CORS restrictivo y cabeceras seguras (CSP, HSTS) en el reverse proxy.
- **Integración Classroom**: cuando se disponga de credenciales reales, montar el archivo de servicio en un volumen seguro y definir `CLASSROOM_SERVICE_ACCOUNT_FILE`. Establecer job programado (cron/Cloud Scheduler) para sincronizaciones recurrentes.
- **Observabilidad**: habilitar logs estructurados (JSON) y métricas con Prometheus/Grafana o Cloud Monitoring. Configurar alertas sobre fallos de sincronización o picos en errores 4xx/5xx.

## Roadmap sugerido

1. Añadir test automatizados en el frontend y cobertura de accesibilidad (axe, Lighthouse).  
2. Incorporar WebSockets en producción mediante Redis o Postgres listen/notify para escalar el hub de notificaciones.  
3. Completar módulo de envíos (entregas) con un modelo específico y sincronización directa desde Classroom API.

## Licencia

Proyecto educativo para el reto Nerdeala Vibeathon. Ajusta y reutiliza según necesites.
