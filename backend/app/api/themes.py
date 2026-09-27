from fastapi import APIRouter, HTTPException, status

from app.api.deps import ThemeServiceDep
from app.services.theme_service import ThemeError
from app.shemas import (
    ThemeCreateRequest,
    ThemeDeleteResponse,
    ThemeDocument,
    ThemePayload,
    ThemeSummary,
    ThemeUpdateRequest,
)

router = APIRouter(prefix="/themes", tags=["themes"])


def _http_error(exc: ThemeError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))


# NOTE: "/schema" is declared before "/{theme_id}" on purpose. FastAPI matches in
# declaration order, so a dynamic path above it would swallow "schema" and the
# editor's field discovery would get a 422 instead of a schema.
@router.get("/schema")
async def get_theme_schema() -> dict:
    """JSON Schema of a theme document, for editor field discovery."""
    return ThemePayload.model_json_schema()


@router.get("", response_model=list[ThemeSummary])
async def list_themes(service: ThemeServiceDep):
    """List all themes (summaries: id, name, is_builtin)."""
    return await service.list_themes()


@router.get("/{theme_id}", response_model=ThemeDocument)
async def get_theme(theme_id: str, service: ThemeServiceDep):
    """Get one full theme document."""
    try:
        return await service.get_theme(theme_id)
    except ThemeError as exc:
        raise _http_error(exc) from exc


@router.get("/{theme_id}/export")
async def export_theme(theme_id: str, service: ThemeServiceDep):
    """Export a theme as a portable JSON document."""
    try:
        return await service.export_theme(theme_id)
    except ThemeError as exc:
        raise _http_error(exc) from exc


@router.post("", response_model=ThemeDocument, status_code=status.HTTP_201_CREATED)
async def create_theme(body: ThemeCreateRequest, service: ThemeServiceDep):
    """Create a theme. The server derives the id from the name."""
    try:
        return await service.create_theme(body.name, body.payload)
    except ThemeError as exc:
        raise _http_error(exc) from exc


@router.put("/{theme_id}", response_model=ThemeDocument)
async def update_theme(theme_id: str, body: ThemeUpdateRequest, service: ThemeServiceDep):
    """Replace a theme in full. The id in the path stays authoritative."""
    try:
        return await service.update_theme(theme_id, body.name, body.payload)
    except ThemeError as exc:
        raise _http_error(exc) from exc


@router.delete("/{theme_id}", response_model=ThemeDeleteResponse)
async def delete_theme(theme_id: str, service: ThemeServiceDep):
    """Delete a user theme. Built-in presets are refused with 409."""
    try:
        return await service.delete_theme(theme_id)
    except ThemeError as exc:
        raise _http_error(exc) from exc
