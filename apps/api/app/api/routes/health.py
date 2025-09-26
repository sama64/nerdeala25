from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health", summary="Verifica el estado del servicio")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
