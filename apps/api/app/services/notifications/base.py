from __future__ import annotations

import abc


class Notifier(abc.ABC):
    @abc.abstractmethod
    async def send_message(self, phone_e164: str, text: str) -> None:
        raise NotImplementedError

    @abc.abstractmethod
    async def send_template(
        self, phone_e164: str, template_id: str, variables: dict[str, object] | None
    ) -> None:
        raise NotImplementedError


class ConsoleNotifier(Notifier):
    async def send_message(self, phone_e164: str, text: str) -> None:
        print("[wa:sim]", phone_e164, text)

    async def send_template(
        self, phone_e164: str, template_id: str, variables: dict[str, object] | None
    ) -> None:
        print("[wa:sim:tpl]", phone_e164, template_id, variables or {})
