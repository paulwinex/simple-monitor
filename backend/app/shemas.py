import re
import string
from enum import StrEnum, auto
from typing import Annotated, Any, Literal, Union

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)


class Table(StrEnum):
    raw = auto()
    hourly = auto()
    history = auto()


class MetricIngestRequest(BaseModel):
    device_id: str
    device_type: str
    name: str
    timestamp: int
    value: int


class BatchIngestRequest(BaseModel):
    host_id: str
    metrics: list[MetricIngestRequest]


class MetricOut(BaseModel):
    timestamp: int
    value: float


class DeviceInfo(BaseModel):
    name: str
    type: str
    label: str
    metrics: list[str]


class HostRegisterRequest(BaseModel):
    host_id: str
    collectors: list[str]


class HostRegisterResponse(BaseModel):
    host_id: str
    registered: bool


class HostConfigResponse(BaseModel):
    host_id: str
    version: int
    collectors: dict = {}


class ConfigVersionResponse(BaseModel):
    version: int


class HostConfigUpdateRequest(BaseModel):
    collectors: dict[str, dict]


class IngestResponse(BaseModel):
    inserted: int


class MetricQueryParams(BaseModel):
    host_id: str
    device_id: str
    name: str
    start_ts: int
    end_ts: int
    table: Table =Table.raw
    limit: int = 1000


class DeviceOut(BaseModel):
    name: str
    type: str
    label: str
    enabled: bool
    details: dict = {}


class HostWithDevicesOut(BaseModel):
    host_id: str
    registered_at: int
    last_seen: int
    devices: list[DeviceOut|dict]


# =============================================================================
# Dashboard Schemas
# =============================================================================

class DashboardConfig(BaseModel):
    """Dashboard configuration."""
    id: int | None = None  # Dashboard ID in database
    name: str = "My Dashboard"
    version: int = 1
    layout: dict = {}
    widgets: dict = {}
    grid_options: dict = {}
    options: dict = {}
    updated_at: int = 0


class DashboardMeta(BaseModel):
    """Lightweight dashboard metadata (no layout/widgets)."""
    id: int
    name: str = "My Dashboard"
    version: int = 1
    options: dict = {}
    updated_at: int = 0


class DashboardCreateRequest(BaseModel):
    """Dashboard creation request."""
    name: str = "My Dashboard"
    options: dict = {}


class DashboardGetResponse(BaseModel):
    """Dashboard get response."""
    id: int
    version: int
    dashboard: DashboardConfig


class DashboardSaveRequest(BaseModel):
    """Dashboard save request."""
    dashboard: DashboardConfig


class DashboardSaveResponse(BaseModel):
    """Dashboard save response."""
    id: int
    version: int
    saved: bool


# =============================================================================
# Batch Query Schemas
# =============================================================================

class MetricQueryRequest(BaseModel):
    """Single metric query request."""
    device_id: str
    name: str
    start_ts: int | None = None
    end_ts: int | None = None
    table: Table = Table.raw
    limit: int = 1000


class MetricQueryResult(BaseModel):
    """Single metric query result."""
    device_id: str
    name: str
    data: list[MetricOut]


class BatchQueryRequest(BaseModel):
    """Batch metrics query request."""
    host_id: str
    queries: list[MetricQueryRequest]


class BatchQueryResponse(BaseModel):
    """Batch metrics query response."""
    results: list[MetricQueryResult]


class LatestQueryRequest(BaseModel):
    """Single latest metric query request."""
    device_id: str
    name: str


class LatestQueryResult(BaseModel):
    """Single latest metric query result."""
    device_id: str
    name: str
    data: MetricOut | None


class BatchLatestRequest(BaseModel):
    """Batch latest metrics query request."""
    host_id: str
    queries: list[LatestQueryRequest]


class BatchLatestResponse(BaseModel):
    """Batch latest metrics query response."""
    results: list[LatestQueryResult]


# --------------------------------------------------------------------------- #
# Theme payload
#
# Field names are camelCase on purpose: they are the on-disk JSON keys of the
# theme document, and the frontend reads them verbatim. Renaming them would
# force an alias layer on both sides for no benefit.
# --------------------------------------------------------------------------- #

THEME_ID_PATTERN = r"^[a-z0-9-]{1,64}$"

# The editor offers exactly these weights, so anything else is a typo.
_FONT_WEIGHTS = (300, 400, 500, 600, 700, 800, 900)

# CSS named colors. Not a typo-tolerance convenience: a bare word cannot inject
# anything, and everything else has to survive the structural check below.
_NAMED_COLORS = frozenset(
    """
    aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue
    blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk
    crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki
    darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
    darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue
    dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite
    gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
    lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
    lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen
    lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen
    linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple
    mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred
    midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab
    orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip
    peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue
    saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue
    slategray slategrey snow springgreen steelblue tan teal thistle tomato transparent
    turquoise violet wheat white whitesmoke yellow yellowgreen currentcolor
    """.split()
)

# Characters that would let a value break out of its declaration and start a
# new one. A valid color never needs them.
_CSS_INJECTION_CHARS = frozenset(";{}<>\\\"'`\n\r\t")

# Font stacks legitimately quote family names ("'Segoe UI'"), so only the
# declaration-breaking characters are rejected there.
_CSS_FAMILY_INJECTION_CHARS = frozenset(";{}<>\\\n\r")

_COLOR_FUNCTIONS = (
    "rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color",
)

_LENGTH_RE = re.compile(r"^-?(?:\d+(?:\.\d+)?|\.\d+)px$")
_UNITLESS_ZERO_RE = re.compile(r"^-?0+(?:\.0+)?$")
_IDENT_RE = re.compile(r"^-?[A-Za-z][A-Za-z0-9-]*$")
_FONT_FAMILY_RE = re.compile(r"^[A-Za-z0-9 ,.'\"_-]+$")
_WEIGHT_RE = re.compile(r"^(?:normal|bold|\d{3})$")


def _assert_safe(value: str, chars: frozenset[str] = _CSS_INJECTION_CHARS) -> None:
    bad = chars & set(value)
    if bad:
        raise ValueError(f"suspicious characters {sorted(bad)!r}")


def _validate_css_color(value: str) -> str:
    """Accept hex, named colors, color functions, var() and color-mix()."""
    _assert_safe(value)
    candidate = value.strip()
    if not candidate:
        raise ValueError("color must not be empty")

    if candidate.startswith("#"):
        digits = candidate[1:]
        if len(digits) in (3, 4, 6, 8) and all(c in string.hexdigits for c in digits):
            return value
        raise ValueError("hex color must have 3, 4, 6 or 8 hex digits")

    if candidate in _NAMED_COLORS:
        return value

    open_paren = candidate.find("(")
    if open_paren != -1:
        if not candidate.endswith(")"):
            raise ValueError("unbalanced parentheses")
        name = candidate[:open_paren].strip()
        if name in _COLOR_FUNCTIONS or name in ("var", "color-mix", "light-dark", "color-contrast"):
            if not candidate[open_paren + 1:-1].strip():
                raise ValueError("empty color function")
            return value
        raise ValueError(f"unsupported color function {name!r}")

    raise ValueError("not a color: expected hex, named color, color function, var() or color-mix()")


def _validate_css_length(value: str) -> str:
    """A px length, or a unitless zero. Deliberately not unit-agnostic."""
    _assert_safe(value)
    candidate = value.strip()
    if _UNITLESS_ZERO_RE.match(candidate) or _LENGTH_RE.match(candidate):
        return value
    raise ValueError("expected a px length (e.g. '8px') or '0'")


def _validate_css_height(value: str) -> str:
    """A px length, a unitless zero, or 'auto'."""
    if value.strip().lower() == "auto":
        return value
    return _validate_css_length(value)


def _validate_font_family(value: str) -> str:
    """A comma separated stack of family names or generic families."""
    _assert_safe(value, _CSS_FAMILY_INJECTION_CHARS)
    if not value.strip():
        raise ValueError("font family must not be empty")
    if not _FONT_FAMILY_RE.match(value):
        raise ValueError("invalid font family stack")
    return value


def _validate_letter_spacing(value: str) -> str:
    """A px length, a unitless zero, or a CSS keyword (normal/inherit)."""
    candidate = value.strip().lower()
    if candidate in ("normal", "inherit", "initial", "unset", "revert"):
        return value
    return _validate_css_length(value)


def _validate_font_weight(value: str | int) -> str:
    """Accept a numeric weight as int or string, plus normal/bold."""
    candidate = str(value).strip().lower()
    if not _WEIGHT_RE.match(candidate):
        raise ValueError("font weight must be 100..900 in hundreds, 'normal' or 'bold'")
    return candidate


CssColor = Annotated[str, AfterValidator(_validate_css_color)]
CssLength = Annotated[str, AfterValidator(_validate_css_length)]
CssHeight = Annotated[str, AfterValidator(_validate_css_height)]
CssLetterSpacing = Annotated[str, AfterValidator(_validate_letter_spacing)]
CssFontFamily = Annotated[str, AfterValidator(_validate_font_family)]
CssFontWeight = Annotated[str, AfterValidator(_validate_font_weight)]


class StrictModel(BaseModel):
    """Closes every nested model and names the allowed keys on typos."""

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def _reject_unknown_keys(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        allowed = set(cls.model_fields)
        unknown = sorted(k for k in data if k not in allowed)
        if unknown:
            raise ValueError(
                f"Unknown field(s) {', '.join(unknown)}. "
                f"Allowed: {', '.join(sorted(allowed))}"
            )
        return data


class ThemeGradientStop(StrictModel):
    """One color position inside a gradient."""

    color: CssColor
    offset: float = Field(ge=0, le=100)


class ThemeGradient(StrictModel):
    """A linear or radial gradient. The editor produces 2..5 stops."""

    type: Literal["linear", "radial"]
    angle: float | None = Field(default=None, ge=0, le=360)
    stops: list[ThemeGradientStop] = Field(min_length=2, max_length=5)

    @model_validator(mode="after")
    def _linear_needs_angle(self) -> "ThemeGradient":
        if self.type == "linear" and self.angle is None:
            raise ValueError("linear gradients require 'angle'")
        return self


class ThemePaint(StrictModel):
    """Placeholder to keep the union below readable; see ThemePaintValue."""


ThemePaintValue = Annotated[Union[ThemeGradient, CssColor], Field(union_mode="left_to_right")]


class ThemeHeaderFont(StrictModel):
    """Title typography. Fully independent of the content font."""

    family: CssFontFamily
    size: CssLength
    weight: int = Field(ge=100, le=900, multiple_of=100)
    letterSpacing: CssLetterSpacing


class ThemeHeaderPadding(StrictModel):
    """Inner spacing of the widget header. The grid keeps its own padding."""

    x: CssLength
    y: CssLength


class ThemeHeader(StrictModel):
    """The widget header strip: its own background and full typography."""

    background: Union[ThemeGradient, CssColor]
    titleColor: CssColor
    titleFont: ThemeHeaderFont
    padding: ThemeHeaderPadding
    height: CssHeight
    align: Literal["left", "center", "right"]


class ThemeBorder(StrictModel):
    width: CssLength
    style: Literal["solid", "dashed", "dotted", "double", "none"]
    radius: CssLength


class ThemeShadowValue(StrictModel):
    """One box-shadow. Offsets and lengths in px, tint and opacity separate."""

    x: CssLength
    y: CssLength
    blur: CssLength
    spread: CssLength
    color: CssColor
    opacity: float = Field(ge=0, le=1)


class ThemeShadow(StrictModel):
    widget: ThemeShadowValue
    text: ThemeShadowValue


class ThemeFont(StrictModel):
    """Content typography. Not applied to the widget title."""

    family: CssFontFamily
    contentSize: CssLength
    contentWeight: int = Field(ge=100, le=900, multiple_of=100)


class ThemeLayoutPadding(StrictModel):
    """Edge padding of the dashboard grid, in whole pixels."""

    top: int = Field(ge=0, le=200)
    right: int = Field(ge=0, le=200)
    bottom: int = Field(ge=0, le=200)
    left: int = Field(ge=0, le=200)


class ThemeLayout(StrictModel):
    """Grid geometry. These drive the layout engine, not CSS, so they are
    plain pixel integers rather than the CSS lengths used elsewhere.

    Every field is required: a client that sends a partial layout has a bug.
    Documents written before the theme owned the grid are handled by the
    default_factory on ThemePayload.layout, not by loosening this model.
    """

    rowHeight: int = Field(ge=10, le=300)
    widgetGap: int = Field(ge=0, le=50)
    containerRowHeight: int = Field(ge=10, le=300)
    containerGapOnBorders: bool
    padding: ThemeLayoutPadding


class ThemeLayoutDefaults(StrictModel):
    """Not used as a type: just keeps the default numbers in one place so the
    payload default and the tests cannot drift apart."""

    rowHeight: int = 30
    widgetGap: int = 10
    containerRowHeight: int = 25
    containerGapOnBorders: bool = True
    padding: ThemeLayoutPadding = Field(
        default_factory=lambda: ThemeLayoutPadding(top=16, right=16, bottom=16, left=16)
    )

    def as_layout(self) -> ThemeLayout:
        return ThemeLayout(**self.model_dump())


THEME_LAYOUT_DEFAULTS = ThemeLayoutDefaults()


class ThemePalette(StrictModel):
    """Flat colors. No header colors here: ThemeHeader owns those now."""

    appBackground: CssColor
    appText: CssColor
    widgetBackground: CssColor
    widgetBorderColor: CssColor
    alertColor: CssColor


class ThemePayload(StrictModel):
    """A complete theme document, version 1.

    The name and id live in the table row; everything under them is the
    document, so the same shape is stored, served and imported.
    """

    id: str = Field(pattern=THEME_ID_PATTERN)
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
    version: Literal[1]
    palette: ThemePalette
    header: ThemeHeader
    border: ThemeBorder
    shadow: ThemeShadow
    font: ThemeFont
    layout: ThemeLayout = Field(
        default_factory=lambda: THEME_LAYOUT_DEFAULTS.as_layout()
    )

    @field_validator("id", mode="before")
    @classmethod
    def _normalize_id(cls, value: Any) -> Any:
        return value.strip().lower() if isinstance(value, str) else value

    @field_validator("name", mode="before")
    @classmethod
    def _reject_blank_name(cls, value: Any) -> Any:
        if isinstance(value, str) and not value.strip():
            raise ValueError("name must not be blank")
        return value


class ThemeCreateRequest(StrictModel):
    """Body of POST /api/v1/themes."""

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
    payload: ThemePayload


class ThemeUpdateRequest(StrictModel):
    """Body of PUT /api/v1/themes/{id}. A full replacement, not a patch."""

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
    payload: ThemePayload


class ThemeSummary(StrictModel):
    """List row: identity plus a preview hint, no full document."""

    id: str
    name: str
    is_builtin: bool = False


class ThemeDocument(ThemeSummary):
    """Full document as stored."""

    payload: ThemePayload
    created_at: int = 0
    updated_at: int = 0


class ThemeDeleteResponse(StrictModel):
    deleted_id: str
    themes_remaining: int
