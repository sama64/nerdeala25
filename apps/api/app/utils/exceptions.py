from fastapi import HTTPException, status


class DomainError(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def to_http_exception(error: DomainError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail=error.message)
