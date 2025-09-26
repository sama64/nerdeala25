from __future__ import annotations

import logging
import time

import httpx

from app.core.config import settings
from app.services.notifications.base import ConsoleNotifier, Notifier

logger = logging.getLogger("nerdeala.notifications.whatsapp")


class HttpWhatsAppNotifier(Notifier):
    def __init__(self) -> None:
        if not settings.wa_http_base_url:
            raise ValueError("WA_HTTP_BASE_URL no está configurado")
        self._base = settings.wa_http_base_url.rstrip("/")
        self._api_key = settings.wa_http_api_key
        self._timeout = settings.wa_http_timeout

    def _headers(self) -> dict[str, str]:
        headers = {"accept": "application/json"}
        if self._api_key:
            headers["authorization"] = f"Bearer {self._api_key}"
        return headers

    async def send_message(self, phone_e164: str, text: str) -> None:
        # Format message for WhatsApp service /send endpoint
        payload = {
            "id": f"api-{int(time.time())}-{phone_e164.replace('+', '')}",
            "recipient": {
                "phone": phone_e164,
                "name": "API User"
            },
            "message": {
                "type": "text",
                "text": text
            },
            "metadata": {
                "retries": 0,
                "initiatedBy": "nerdeala-api",
                "priority": "normal"
            }
        }
        url = f"{self._base}/send"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, json=payload, headers=self._headers())
        if response.status_code >= 400:
            _log_http_error(response)
        response.raise_for_status()

    async def send_template(
        self, phone_e164: str, template_id: str, variables: dict[str, object] | None
    ) -> None:
        payload = {
            "to": phone_e164,
            "template": template_id,
            "variables": variables or {},
        }
        url = f"{self._base}/api/whatsapp/send-template"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, json=payload, headers=self._headers())
        if response.status_code >= 400:
            _log_http_error(response)
        response.raise_for_status()


def _log_http_error(response: httpx.Response) -> None:
    try:
        body = response.json()
    except ValueError:
        body = response.text
    logger.error(
        "Error enviando Whatsapp (%s): %s",
        response.status_code,
        body,
    )


def get_notifier() -> Notifier:
    base_url = settings.wa_http_base_url
    if not base_url:
        return ConsoleNotifier()
    try:
        return HttpWhatsAppNotifier()
    except ValueError:
        logger.warning("WA_HTTP_BASE_URL no configurado, usando ConsoleNotifier")
        return ConsoleNotifier()
