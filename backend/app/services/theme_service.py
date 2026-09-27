"""CRUD for the theme catalog.

Ownership rules encoded here:
  - the server owns `id`; it is a slug derived from the name and is what
    Dashboard.options.theme stores, so renames must not move it;
  - built-in presets may be edited (the editor's "duplicate" flow relies on
    that) but never deleted;
  - seeding only happens while the table is empty, so user themes are never
    overwritten by a restart.
"""

import json
import re
import time
from pathlib import Path

from sqlalchemy import func, select

from app.services.base import BaseService
from app.persistence.models import Theme
from app.shemas import (
    ThemeDeleteResponse,
    ThemeDocument,
    ThemePayload,
    ThemeSummary,
)

PRESETS_PATH = Path(__file__).resolve().parent.parent / "themes" / "presets.json"

_SLUG_STRIP_RE = re.compile(r"[^a-z0-9]+")
_SLUG_EDGE_RE = re.compile(r"^-+|-+$")

# Cyrillic has to become Latin: the id column is ASCII-only and the UI is
# Russian-facing, so rejecting a Cyrillic name would block the common case.
# Multi-character digraphs come first so "щ" is not read as "ш" + "ч".
_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    # Ukrainian and Belarusian letters that reach a Russian UI in pasted names.
    "і": "i", "ї": "yi", "є": "ye", "ґ": "g", "ў": "u",
}
_TRANSLIT_RE = re.compile("|".join(sorted(_TRANSLIT, key=len, reverse=True)))

MAX_ID_LENGTH = 64
SUFFIX_RESERVE = 8  # room for "-9999" when de-duplicating


class ThemeError(Exception):
    """Base class for theme errors the API maps onto status codes."""

    status_code = 400


class ThemeNotFound(ThemeError):
    status_code = 404


class ThemeImmutable(ThemeError):
    """Raised when a built-in preset is targeted by a destructive operation."""

    status_code = 409


class ThemeIdMismatch(ThemeError):
    """Raised when a submitted payload carries a different id than its row."""

    status_code = 422


def slugify_theme_id(name: str) -> str:
    """Transliterate, lowercase, dash-separate, [a-z0-9-] only, length bounded.

    Raises ValueError when nothing usable survives, rather than inventing an
    id: an unnamed theme is a client bug worth surfacing.
    """
    # Lowercase first: the table is keyed by lowercase letters, so an uppercase
    # "Н" that missed the table would be stripped and silently lose a letter.
    transliterated = _TRANSLIT_RE.sub(lambda m: _TRANSLIT[m.group(0)], name.lower())
    slug = _SLUG_STRIP_RE.sub("-", transliterated).strip("-")
    if not slug:
        raise ValueError(f"theme name {name!r} has no usable characters for an id")
    return slug[:MAX_ID_LENGTH].strip("-") or slug[:1]


def _unique_theme_id(base: str, taken: set[str]) -> str:
    """Append -2, -3, ... until the slug is free."""
    trimmed = base[: MAX_ID_LENGTH - SUFFIX_RESERVE].strip("-") or base[:1]
    if trimmed not in taken:
        return trimmed
    counter = 2
    while True:
        candidate = f"{trimmed}-{counter}"
        if candidate not in taken:
            return candidate
        counter += 1


def _coerce(payload: ThemePayload | dict) -> ThemePayload:
    """Validate on the way in. The service does not trust its caller."""
    if isinstance(payload, ThemePayload):
        return payload
    return ThemePayload.model_validate(payload)


def _to_summary(theme: Theme) -> ThemeSummary:
    return ThemeSummary(id=theme.id, name=theme.name, is_builtin=bool(theme.is_builtin))


def _to_document(theme: Theme) -> ThemeDocument:
    return ThemeDocument(
        id=theme.id,
        name=theme.name,
        is_builtin=bool(theme.is_builtin),
        payload=ThemePayload.model_validate(theme.payload),
        created_at=theme.created_at,
        updated_at=theme.updated_at,
    )


class ThemeService(BaseService):
    """Service for theme catalog management."""

    async def _count(self) -> int:
        result = await self.session.execute(select(func.count()).select_from(Theme))
        return int(result.scalar_one())

    # ----------------------------------------------------------------- #
    # Read
    # ----------------------------------------------------------------- #

    async def list_themes(self) -> list[ThemeSummary]:
        """All themes as summaries, built-ins first then by name."""
        rows = await Theme.list_all(self.session)
        return [_to_summary(row) for row in rows]

    async def get_theme(self, theme_id: str) -> ThemeDocument:
        """Full document for one theme."""
        theme = await Theme.get_by_id(self.session, theme_id)
        if theme is None:
            raise ThemeNotFound(f"theme {theme_id!r} not found")
        return _to_document(theme)

    async def export_theme(self, theme_id: str) -> dict:
        """A portable copy of one theme: identity plus the document."""
        document = await self.get_theme(theme_id)
        return {
            "id": document.id,
            "name": document.name,
            "payload": document.payload.model_dump(mode="json"),
        }

    # ----------------------------------------------------------------- #
    # Write
    # ----------------------------------------------------------------- #

    async def create_theme(
        self, name: str, payload: ThemePayload | dict
    ) -> ThemeDocument:
        """Insert a theme. The id comes from the name, not from the payload."""
        document = _coerce(payload)
        taken = {row.id for row in await Theme.list_all(self.session)}
        theme_id = _unique_theme_id(slugify_theme_id(name), taken)

        stored = document.model_copy(update={"id": theme_id, "name": name.strip()})
        now = int(time.time())
        row = Theme(
            id=theme_id,
            name=name.strip(),
            payload=stored.model_dump(mode="json"),
            is_builtin=0,
            created_at=now,
            updated_at=now,
        )
        self.session.add(row)
        await self.session.commit()
        return _to_document(row)

    async def update_theme(
        self, theme_id: str, name: str, payload: ThemePayload | dict
    ) -> ThemeDocument:
        """Replace a theme in full. The id never changes."""
        document = _coerce(payload)
        row = await Theme.get_by_id(self.session, theme_id)
        if row is None:
            raise ThemeNotFound(f"theme {theme_id!r} not found")
        if document.id != theme_id:
            raise ThemeIdMismatch(
                f"payload id {document.id!r} does not match theme id {theme_id!r}"
            )

        row.name = name.strip()
        row.payload = document.model_copy(
            update={"id": theme_id, "name": name.strip()}
        ).model_dump(mode="json")
        row.updated_at = int(time.time())
        await self.session.commit()
        return _to_document(row)

    async def delete_theme(self, theme_id: str) -> ThemeDeleteResponse:
        """Delete a user theme. Built-in presets are protected."""
        row = await Theme.get_by_id(self.session, theme_id)
        if row is None:
            raise ThemeNotFound(f"theme {theme_id!r} not found")
        if row.is_builtin:
            raise ThemeImmutable(f"built-in theme {theme_id!r} cannot be deleted")

        await self.session.delete(row)
        await self.session.commit()

        total = await self._count()
        return ThemeDeleteResponse(deleted_id=theme_id, themes_remaining=total)

    # ----------------------------------------------------------------- #
    # Seeding
    # ----------------------------------------------------------------- #

    async def ensure_presets(self) -> int:
        """Seed the built-in presets into an empty table. Returns the count added."""
        existing = await self._count()
        if existing:
            return 0

        now = int(time.time())
        added = 0
        for preset in self._load_presets():
            payload = ThemePayload.model_validate(preset["payload"])
            self.session.add(
                Theme(
                    id=payload.id,
                    name=preset["name"],
                    payload=payload.model_dump(mode="json"),
                    is_builtin=1,
                    created_at=now,
                    updated_at=now,
                )
            )
            added += 1

        await self.session.commit()
        return added

    @staticmethod
    def _load_presets() -> list[dict]:
        """Read presets.json. A broken file must not take the API down."""
        try:
            raw = json.loads(PRESETS_PATH.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            raise RuntimeError(f"cannot read theme presets from {PRESETS_PATH}: {exc}") from exc
        return list(raw.get("presets", []))
