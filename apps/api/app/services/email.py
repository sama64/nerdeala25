import logging

logger = logging.getLogger("nerdeala.email")


async def send_verification_email(email: str, token: str) -> None:
    logger.info("Enviar correo de verificación a %s con token %s", email, token)


async def send_password_reset_email(email: str, token: str) -> None:
    logger.info("Enviar correo de recuperación a %s con token %s", email, token)
