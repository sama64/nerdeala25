import logging

from app.core.config import settings


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
    logging.getLogger("uvicorn").handlers = []
    logging.info("Logging configurado para %s", settings.app_name)
