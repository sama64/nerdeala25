import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.api.routes import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.db.session import AsyncSessionLocal, Base, sync_engine
from app.models.user import User, UserRole
from app.services.google_oauth import GoogleOAuthError, ensure_google_access_token
from app.sync.scheduler import shutdown_scheduler, start_scheduler


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title=settings.app_name)
    logger = logging.getLogger("nerdeala.app")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.on_event("startup")
    async def on_startup() -> None:  # pragma: no cover - boot hook
        Base.metadata.create_all(bind=sync_engine)

        async def _token_provider() -> list[tuple[str, str]]:
            async with AsyncSessionLocal() as session:
                result = await session.execute(
                    select(User.id).where(
                        User.verified.is_(True),
                        User.role.in_([UserRole.COORDINATOR, UserRole.ADMIN]),
                    )
                )
                target_user_ids = set(result.scalars().all())
                if settings.classroom_scheduler_user_id:
                    target_user_ids.add(settings.classroom_scheduler_user_id)

                tokens: list[tuple[str, str]] = []
                for user_id in target_user_ids:
                    try:
                        token = await ensure_google_access_token(
                            session,
                            user_id,
                            force_refresh=True,
                        )
                    except GoogleOAuthError as exc:
                        logger.debug(
                            "No hay token válido de Classroom para scheduler user=%s: %s",
                            user_id,
                            exc,
                        )
                        continue
                    tokens.append((user_id, token))
                if not tokens:
                    logger.info("Scheduler: sin coordinadores con token válido por ahora")
                return tokens

        start_scheduler(_token_provider)

    @app.on_event("shutdown")
    async def on_shutdown() -> None:  # pragma: no cover - shutdown hook
        shutdown_scheduler()

    return app


app = create_app()
