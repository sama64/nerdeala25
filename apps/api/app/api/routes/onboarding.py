from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User, UserRole
from app.repositories import user_contacts, user_onboarding, users
from app.schemas.onboarding import OnboardingState, OnboardingUpdate
from app.schemas.user import UserUpdate
from app.services.notifications.http_wa import get_notifier

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

logger = logging.getLogger("nerdeala.onboarding")

_SELF_ASSIGNABLE_ROLES = {
    UserRole.COORDINATOR,
    UserRole.TEACHER,
    UserRole.STUDENT,
}


async def _serialize_state(
    session: AsyncSession,
    user: User,
) -> OnboardingState:
    state = await user_onboarding.get(session, user.id)
    contact = await user_contacts.get(session, user.id)

    phone = None
    if state and state.phone_e164:
        phone = state.phone_e164
    elif contact and contact.phone_e164:
        phone = contact.phone_e164

    return OnboardingState(
        completed=bool(state and state.completed_at),
        completed_at=state.completed_at if state else None,
        selected_role=(state.selected_role or user.role if state else user.role),
        whatsapp_opt_in=state.whatsapp_opt_in if state else False,
        phone_e164=phone,
    )


@router.get("/", response_model=OnboardingState)
async def get_onboarding_state(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OnboardingState:
    return await _serialize_state(session, current_user)


@router.post("/", response_model=OnboardingState)
async def update_onboarding_state(
    payload: OnboardingUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OnboardingState:
    updated_user = current_user

    if payload.role is not None and payload.role != current_user.role:
        logger.info(f"Updating user {current_user.id} role from {current_user.role} to {payload.role}")
        
        if payload.role not in _SELF_ASSIGNABLE_ROLES and current_user.role not in (UserRole.ADMIN,):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No puedes seleccionar ese rol desde la app",
            )
        updated_user = await users.update(session, current_user, UserUpdate(role=payload.role))
        await session.commit()  # Commit the role update first
        await session.refresh(updated_user)  # Refresh to get updated data
        
        logger.info(f"User {updated_user.id} role successfully updated to {updated_user.role}")

    phone_value = payload.phone_e164 if payload.phone_e164 is not None else None

    # Check if this is completing onboarding for the first time
    existing_onboarding = await user_onboarding.get(session, updated_user.id)
    is_completing_onboarding = (
        payload.completed and 
        (not existing_onboarding or not existing_onboarding.completed_at)
    )

    await user_onboarding.upsert(
        session,
        user_id=updated_user.id,
        selected_role=payload.role,
        whatsapp_opt_in=payload.whatsapp_opt_in,
        phone_e164=phone_value,
        mark_completed=payload.completed,
    )

    if payload.whatsapp_opt_in is not None or payload.phone_e164 is not None:
        await user_contacts.upsert(
            session,
            user_id=updated_user.id,
            phone_e164=phone_value if payload.whatsapp_opt_in else None,
        )

    await session.commit()

    # Send welcome message if completing onboarding and opted in to WhatsApp
    if is_completing_onboarding and payload.whatsapp_opt_in and phone_value:
        await _send_welcome_message(updated_user, phone_value)

    return await _serialize_state(session, updated_user)


async def _send_welcome_message(user: User, phone: str) -> None:
    """Send a welcome WhatsApp message after completing onboarding"""
    try:
        notifier = get_notifier()
        
        role_text = {
            UserRole.STUDENT: "estudiante",
            UserRole.TEACHER: "profesor/a", 
            UserRole.COORDINATOR: "coordinador/a",
            UserRole.ADMIN: "administrador/a"
        }.get(user.role, "usuario")
        
        name = user.full_name or user.email or "Usuario"
        
        message = (
            f"🎉 *¡Bienvenido/a a Scholaris, {name}!*\n\n"
            f"✅ Has completado tu configuración como {role_text}.\n\n"
            f"🚀 *¿Qué podes hacer ahora?*\n"
            f"• 📚 Revisar tus cursos y tareas\n"
            f"• 📊 Ver estadísticas y reportes\n"
            f"• 📱 Recibir notificaciones automáticas\n"
            f"• ✅ Gestionar asistencia\n\n"
            f"💡 *Tip:* Explorá el panel principal para familiarizarte con todas las funciones.\n\n"
            f"📞 Si tenés alguna duda, no dudes en contactarnos.\n\n"
            f"¡Gracias por elegir Scholaris para gestionar tu educación! 🎓"
        )
        
        await notifier.send_message(phone, message)
        logger.info("Welcome message sent to %s (%s)", phone, user.email or user.id)
        
    except Exception:
        logger.exception("Error sending welcome message to %s", phone)
