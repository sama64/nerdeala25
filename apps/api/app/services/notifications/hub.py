from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any, DefaultDict

from fastapi import WebSocket

from app.schemas.notification import NotificationRead


class NotificationHub:
    def __init__(self) -> None:
        self._connections: DefaultDict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, channel: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[channel].add(websocket)

    async def disconnect(self, websocket: WebSocket, channel: str) -> None:
        async with self._lock:
            if websocket in self._connections[channel]:
                self._connections[channel].remove(websocket)
            if not self._connections[channel]:
                self._connections.pop(channel, None)

    async def broadcast(self, channel: str, payload: NotificationRead | dict[str, Any]) -> None:
        message = payload.model_dump() if hasattr(payload, "model_dump") else payload
        async with self._lock:
            targets = list(self._connections.get(channel, []))
        for connection in targets:
            await connection.send_json(message)


notification_hub = NotificationHub()
