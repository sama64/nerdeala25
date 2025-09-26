from __future__ import annotations

import base64
import bcrypt
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Any, Union

from jose import JWTError, jwt

from app.core.config import settings


_BCRYPT_SHA256_PREFIX = "$bcrypt-sha256$"
_BCRYPT_DEFAULT_ROUNDS = 12


def _parse_bcrypt_sha256(hash_value: str) -> tuple[int, str, int, str, str]:
    if not hash_value.startswith(_BCRYPT_SHA256_PREFIX):
        raise ValueError("invalid bcrypt-sha256 hash")

    body = hash_value[len(_BCRYPT_SHA256_PREFIX) :]
    parts = body.split("$")
    if len(parts) != 3:
        raise ValueError("invalid bcrypt-sha256 format")

    header, salt, digest = parts
    if header.startswith("v="):
        try:
            params = dict(item.split("=") for item in header.split(","))
        except ValueError as exc:  # malformed header segment
            raise ValueError("invalid bcrypt-sha256 params") from exc
        version = int(params.get("v", "0"))
        ident = params.get("t")
        rounds = int(params.get("r", "0"))
        if not ident:
            raise ValueError("missing bcrypt ident")
    else:
        try:
            ident, rounds_str = header.split(",")
        except ValueError as exc:
            raise ValueError("invalid legacy bcrypt-sha256 header") from exc
        version = 1
        rounds = int(rounds_str)

    if version not in (1, 2):
        raise ValueError("unsupported bcrypt-sha256 version")
    if not salt or not digest:
        raise ValueError("invalid bcrypt-sha256 payload")

    return version, ident, rounds, salt, digest


def _bcrypt_sha256_digest(
    password: str, *, ident: str, rounds: int, salt: str, version: int
) -> str:
    password_bytes = password.encode("utf-8")
    if version == 1:
        digest_input = hashlib.sha256(password_bytes).digest()
    else:
        digest_input = hmac.new(salt.encode("ascii"), password_bytes, hashlib.sha256).digest()

    key = base64.b64encode(digest_input)
    config = f"${ident}${rounds:02d}${salt}".encode("ascii")
    hashed = bcrypt.hashpw(key, config).decode("ascii")
    return hashed[-31:]


def create_access_token(subject: Union[str, Any], expires_minutes: int | None = None) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=expires_minutes or settings.jwt_access_token_expires_minutes
    )
    to_encode = {"sub": str(subject), "exp": expire}
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        subject = payload.get("sub")
        return str(subject) if subject is not None else None
    except JWTError:
        return None


def get_password_hash(password: str) -> str:
    config = bcrypt.gensalt(rounds=_BCRYPT_DEFAULT_ROUNDS).decode("ascii")
    _, ident, rounds_str, salt = config.split("$")
    rounds = int(rounds_str)
    digest = _bcrypt_sha256_digest(password, ident=ident, rounds=rounds, salt=salt, version=2)
    return f"{_BCRYPT_SHA256_PREFIX}v=2,t={ident},r={rounds}${salt}${digest}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if hashed_password.startswith(_BCRYPT_SHA256_PREFIX):
        try:
            version, ident, rounds, salt, digest = _parse_bcrypt_sha256(hashed_password)
        except ValueError:
            return False
        candidate = _bcrypt_sha256_digest(
            plain_password,
            ident=ident,
            rounds=rounds,
            salt=salt,
            version=version,
        )
        return hmac.compare_digest(candidate, digest)

    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except ValueError:
        return False
