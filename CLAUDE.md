# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (FastAPI) - `apps/api/`
```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --reload  # Development server
pytest                        # Run tests
ruff check .                   # Linting
mypy .                         # Type checking
```

### Frontend (Next.js) - `apps/web/`
```bash
cd apps/web
npm install
npm run dev        # Development server (port 5001)
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript checking
```

### WhatsApp Service (Optional) - `services/whatsapp/`
```bash
# Setup (one-time)
python setup-whatsapp-web.py
# Run service
docker compose -f docker-compose.whatsapp.yml up -d
# Test
python tests/push_sample_whatsapp_job.py
```

## Architecture Overview

This is a full-stack educational platform integrating Google Classroom with progress tracking, attendance monitoring, and intelligent notifications.

### Backend (`apps/api/`)
- **FastAPI** with **SQLAlchemy** ORM and **Pydantic** schemas
- **Repository pattern** for data access (`app/repositories/`)
- **Service layer** for external integrations (`app/services/`)
- **Layered architecture**: routes → schemas → repositories → models
- **Google Classroom integration** via service account authentication
- **JWT-based authentication** with bcrypt password hashing
- **Redis** for job queues and caching (optional)

### Frontend (`apps/web/`)
- **Next.js 14** with App Router
- **TailwindCSS** + **Headless UI** for styling
- **React Query** (@tanstack/react-query) for server state management
- **React Hook Form** + **Zod** for form validation
- **TypeScript** throughout with strict typing

### Key Integrations
- **Google Classroom API**: Syncs courses, assignments, participants, and submissions
- **WhatsApp notifications**: Redis queue-based messaging service
- **Database**: SQLite (development) / PostgreSQL (production)

### Important Patterns
1. **API Client**: Centralized in `apps/web/src/lib/` with typed responses
2. **Authentication**: JWT tokens with refresh mechanism
3. **Error Handling**: Structured error responses across API endpoints
4. **Data Sync**: ETL-style operations for Google Classroom data with ETag caching
5. **Notifications**: Event-driven system using Redis queues

### Environment Configuration
- Backend: `.env` with database URLs, JWT secrets, Classroom API credentials
- Frontend: `NEXT_PUBLIC_API_BASE_URL` for API endpoint configuration
- See `.env.example` files for required variables

### Database Models
Key entities: User, Course, Student, CourseAssignment, CourseSubmission, Notification
All models use SQLAlchemy with async support and include audit fields (created_at, updated_at).

### Testing Strategy
- Backend: Integration tests with pytest and httpx.AsyncClient
- Frontend: Component testing recommended with React Testing Library
- E2E: Docker Compose orchestration for full-stack testing