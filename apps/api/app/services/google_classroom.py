from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx
from tenacity import RetryError, retry, stop_after_attempt, wait_exponential

from app.core.config import settings


@dataclass(slots=True)
class ClassroomCourse:
    id: str
    name: str
    section: str | None = None
    room: str | None = None
    alternate_link: str | None = None


class ClassroomIntegrationError(RuntimeError):
    pass


class GoogleClassroomService:
    def __init__(self, base_url: str | None = None) -> None:
        self._base_url = base_url or settings.classroom_api_base_url

    @retry(wait=wait_exponential(multiplier=1, min=1, max=10), stop=stop_after_attempt(3))
    async def _request(self, method: str, endpoint: str, token: str, **kwargs: Any) -> Any:
        if settings.classroom_service_account_file is None:
            # Demo mode: return fixture data without making network calls.
            return self._demo_response(endpoint)

        async with httpx.AsyncClient() as client:
            response = await client.request(
                method,
                f"{self._base_url}{endpoint}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
                **kwargs,
            )
        response.raise_for_status()
        return response.json()

    async def fetch_courses(self, token: str) -> list[ClassroomCourse]:
        try:
            payload = await self._request("GET", "/courses", token)
        except RetryError as exc:  # pragma: no cover - network path
            raise ClassroomIntegrationError("No se pudo sincronizar cursos de Classroom") from exc

        courses_data = payload.get("courses", []) if isinstance(payload, dict) else []
        return [
            ClassroomCourse(
                id=course.get("id", ""),
                name=course.get("name", ""),
                section=course.get("section"),
                room=course.get("room"),
                alternate_link=course.get("alternateLink"),
            )
            for course in courses_data
            if course.get("id") and course.get("name")
        ]

    def _demo_response(self, endpoint: str) -> dict[str, Any]:
        if endpoint == "/courses":
            return {
                "courses": [
                    {
                        "id": "demo-course-1",
                        "name": "Matemáticas Avanzadas",
                        "section": "A",
                        "room": "Lab 2",
                        "alternateLink": "https://classroom.google.com/demo-course-1",
                    },
                    {
                        "id": "demo-course-2",
                        "name": "Historia Universal",
                        "section": "B",
                        "room": "Sala 3",
                        "alternateLink": "https://classroom.google.com/demo-course-2",
                    },
                ]
            }
        return {}


google_classroom_service = GoogleClassroomService()
