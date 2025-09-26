from dataclasses import dataclass
from math import ceil


@dataclass(slots=True)
class Pagination:
    total: int
    page: int
    size: int

    @property
    def pages(self) -> int:
        return ceil(self.total / self.size) if self.size else 0


@dataclass(slots=True)
class Paginated:
    items: list
    pagination: Pagination


def paginate(items: list, total: int, page: int, size: int) -> Paginated:
    return Paginated(items=items, pagination=Pagination(total=total, page=page, size=size))
