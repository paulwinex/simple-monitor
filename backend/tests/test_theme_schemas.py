import pytest
from pydantic import ValidationError

from app.shemas import ThemePayload
from tests.theme_fixtures import make_theme_payload


def test_valid_payload_round_trips():
    payload = ThemePayload.model_validate(make_theme_payload())

    assert payload.id == "midnight"
    assert payload.name == "Midnight"
    assert payload.version == 1
    assert payload.palette.appBackground == "#0d1117"
    assert payload.palette.appText == "#c9d1d9"
    assert payload.palette.widgetBackground == "#161b22"
    assert payload.palette.widgetBorderColor == "#30363d"
    assert payload.palette.alertColor == "#f85149"
    assert payload.border.width == "1px"
    assert payload.border.style == "solid"
    assert payload.border.radius == "6px"
    assert payload.shadow.widget.opacity == pytest.approx(0.4)
    assert payload.shadow.text.opacity == pytest.approx(0.6)
    assert payload.font.contentSize == "13px"
    assert payload.font.contentWeight == 400


def test_header_block_round_trips():
    payload = ThemePayload.model_validate(make_theme_payload())

    assert payload.header.background.type == "linear"
    assert payload.header.background.angle == 180
    assert len(payload.header.background.stops) == 2
    assert payload.header.titleColor == "#e6edf3"
    assert payload.header.titleFont.size == "14px"
    assert payload.header.titleFont.weight == 600
    assert payload.header.titleFont.letterSpacing == "0"
    assert payload.header.padding.x == "12px"
    assert payload.header.padding.y == "8px"
    assert payload.header.height == "auto"
    assert payload.header.align == "left"


def test_id_is_lowercased():
    assert ThemePayload.model_validate(make_theme_payload(theme_id="MidNight")).id == "midnight"


@pytest.mark.parametrize("bad_id", ["", "with space", "under_score", "a" * 65, "юникод"])
def test_invalid_id_is_rejected(bad_id):
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(make_theme_payload(theme_id=bad_id))


def test_name_is_trimmed_and_must_not_be_empty():
    assert ThemePayload.model_validate(make_theme_payload(name="  Midnight  ")).name == "Midnight"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(make_theme_payload(name="   "))


def test_palette_no_longer_owns_header_colors():
    # The header block took these over; leaving them in palette is a typo.
    raw = make_theme_payload()
    raw["palette"]["widgetTitleColor"] = "#ffffff"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_palette_no_longer_owns_header_background():
    raw = make_theme_payload()
    raw["palette"]["widgetHeaderBackground"] = "#ffffff"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_header_is_required():
    raw = make_theme_payload()
    del raw["header"]
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_unknown_palette_key_is_rejected():
    raw = make_theme_payload()
    raw["palette"]["borderColor"] = "#ffffff"
    with pytest.raises(ValidationError) as exc:
        ThemePayload.model_validate(raw)
    assert "borderColor" in str(exc.value)


def test_unknown_key_error_lists_the_allowed_keys():
    # Pydantic's own extra="forbid" message does not, and the user cannot guess
    # the intended key from it.
    raw = make_theme_payload()
    raw["palette"]["borderColor"] = "#ffffff"
    with pytest.raises(ValidationError) as exc:
        ThemePayload.model_validate(raw)
    assert "widgetBorderColor" in str(exc.value)


def test_nested_unknown_key_lists_that_models_allowed_keys():
    raw = make_theme_payload()
    raw["header"]["padding"]["xx"] = "8px"
    with pytest.raises(ValidationError) as exc:
        ThemePayload.model_validate(raw)
    message = str(exc.value)
    assert "xx" in message
    assert "x" in message


def test_legacy_dark_flag_is_rejected():
    raw = make_theme_payload()
    raw["dark"] = True
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_legacy_is_builtin_is_rejected():
    raw = make_theme_payload()
    raw["isBuiltin"] = True
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_missing_required_key_is_rejected():
    raw = make_theme_payload()
    del raw["border"]["radius"]
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_missing_title_font_leaf_is_rejected():
    raw = make_theme_payload()
    del raw["header"]["titleFont"]["weight"]
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_linear_gradient_requires_angle():
    raw = make_theme_payload()
    raw["header"]["background"] = {
        "type": "linear",
        "stops": [{"color": "#000000", "offset": 0}, {"color": "#ffffff", "offset": 100}],
    }
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_radial_gradient_ignores_angle():
    raw = make_theme_payload()
    raw["header"]["background"] = {
        "type": "radial",
        "angle": 45,
        "stops": [{"color": "#000000", "offset": 0}, {"color": "#ffffff", "offset": 100}],
    }
    payload = ThemePayload.model_validate(raw)
    assert payload.header.background.type == "radial"


def test_gradient_requires_two_stops():
    raw = make_theme_payload()
    raw["header"]["background"] = {
        "type": "linear", "angle": 180,
        "stops": [{"color": "#000000", "offset": 0}],
    }
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_gradient_accepts_five_stops():
    raw = make_theme_payload()
    raw["header"]["background"] = {
        "type": "linear", "angle": 180,
        "stops": [{"color": "#000000", "offset": n * 25} for n in range(5)],
    }
    payload = ThemePayload.model_validate(raw)
    assert len(payload.header.background.stops) == 5


def test_gradient_rejects_six_stops():
    # The editor tops out at five; the schema has to agree or the editor can
    # produce a document the backend refuses.
    raw = make_theme_payload()
    raw["header"]["background"] = {
        "type": "linear", "angle": 180,
        "stops": [{"color": "#000000", "offset": n * 20} for n in range(6)],
    }
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_gradient_offset_range_is_enforced():
    raw = make_theme_payload()
    raw["header"]["background"] = {
        "type": "linear", "angle": 180,
        "stops": [{"color": "#000000", "offset": 0}, {"color": "#ffffff", "offset": 120}],
    }
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_solid_header_background_is_accepted():
    raw = make_theme_payload()
    raw["header"]["background"] = "#1c2128"
    payload = ThemePayload.model_validate(raw)
    assert payload.header.background == "#1c2128"


def test_garbage_color_is_rejected():
    raw = make_theme_payload()
    raw["palette"]["appText"] = "definitely not a color"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_css_function_color_is_accepted():
    raw = make_theme_payload()
    raw["palette"]["appText"] = "color-mix(in srgb, #ffffff 50%, #000000)"
    assert ThemePayload.model_validate(raw).palette.appText.startswith("color-mix")


def test_named_color_is_accepted():
    raw = make_theme_payload()
    raw["palette"]["appText"] = "rebeccapurple"
    assert ThemePayload.model_validate(raw).palette.appText == "rebeccapurple"


@pytest.mark.parametrize("style", ["solid", "dashed", "dotted", "double", "none"])
def test_border_style_enum_accepts_all_documented_values(style):
    raw = make_theme_payload()
    raw["border"]["style"] = style
    assert ThemePayload.model_validate(raw).border.style == style


def test_border_style_rejects_unknown_value():
    raw = make_theme_payload()
    raw["border"]["style"] = "wobbly"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


@pytest.mark.parametrize("align", ["left", "center", "right"])
def test_header_align_enum(align):
    raw = make_theme_payload()
    raw["header"]["align"] = align
    assert ThemePayload.model_validate(raw).header.align == align


def test_header_align_rejects_unknown_value():
    raw = make_theme_payload()
    raw["header"]["align"] = "justify"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_header_height_accepts_auto_and_px():
    for value in ("auto", "32px", "0px"):
        raw = make_theme_payload()
        raw["header"]["height"] = value
        assert ThemePayload.model_validate(raw).header.height == value


@pytest.mark.parametrize("value", ["40", "40rem", "tall", ""])
def test_header_height_rejects_junk(value):
    raw = make_theme_payload()
    raw["header"]["height"] = value
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_padding_rejects_junk():
    raw = make_theme_payload()
    raw["header"]["padding"]["x"] = "wide"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_letter_spacing_rejects_junk():
    raw = make_theme_payload()
    raw["header"]["titleFont"]["letterSpacing"] = "loose"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_title_weight_out_of_range_is_rejected():
    raw = make_theme_payload()
    raw["header"]["titleFont"]["weight"] = 50
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_content_weight_out_of_range_is_rejected():
    raw = make_theme_payload()
    raw["font"]["contentWeight"] = 1000
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_font_size_rejects_junk():
    raw = make_theme_payload()
    raw["font"]["contentSize"] = "big"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_version_is_pinned_to_one():
    raw = make_theme_payload()
    raw["version"] = 2
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_shadow_opacity_range_is_enforced():
    raw = make_theme_payload()
    raw["shadow"]["widget"]["opacity"] = 1.5
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_shadow_color_is_validated_as_a_paint():
    raw = make_theme_payload()
    raw["shadow"]["widget"]["color"] = "nope nope nope"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_gradient_stop_color_is_validated_as_a_paint():
    raw = make_theme_payload()
    raw["header"]["background"]["stops"][0]["color"] = "nope nope nope"
    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_json_schema_marks_everything_required_and_closed():
    schema = ThemePayload.model_json_schema()

    # layout is the one optional key: documents written before the theme owned
    # the grid are filled in rather than rejected.
    assert set(schema["required"]) == {
        "id", "name", "version", "palette", "header", "border", "shadow", "font"
    }
    assert schema["additionalProperties"] is False
    header = schema["$defs"]["ThemeHeader"]
    assert set(header["required"]) == {
        "background", "titleColor", "titleFont", "padding", "height", "align"
    }
    assert header["additionalProperties"] is False


def test_layout_is_fully_required_once_present():
    schema = ThemePayload.model_json_schema()

    assert set(schema["$defs"]["ThemeLayout"]["required"]) == {
        "rowHeight", "widgetGap", "containerRowHeight", "containerGapOnBorders", "padding"
    }
    assert schema["$defs"]["ThemeLayout"]["additionalProperties"] is False
    assert set(schema["$defs"]["ThemeLayoutPadding"]["required"]) == {
        "top", "right", "bottom", "left"
    }


def test_payload_without_layout_falls_back_to_defaults():
    raw = make_theme_payload()
    del raw["layout"]

    payload = ThemePayload.model_validate(raw)

    assert payload.layout.rowHeight == 30
    assert payload.layout.widgetGap == 10
    assert payload.layout.containerRowHeight == 25
    assert payload.layout.containerGapOnBorders is True
    assert payload.layout.padding.model_dump() == {
        "top": 16, "right": 16, "bottom": 16, "left": 16
    }


def test_layout_values_are_kept_as_given():
    payload = ThemePayload.model_validate(make_theme_payload())

    assert payload.layout.rowHeight == 32
    assert payload.layout.widgetGap == 12
    assert payload.layout.containerRowHeight == 26
    assert payload.layout.containerGapOnBorders is False
    assert payload.layout.padding.top == 20
    assert payload.layout.padding.left == 18


@pytest.mark.parametrize(
    "key,value",
    [
        ("rowHeight", 9),
        ("rowHeight", 301),
        ("rowHeight", 30.5),
        ("widgetGap", -1),
        ("widgetGap", 51),
        ("containerRowHeight", 0),
        ("containerRowHeight", 1000),
    ],
)
def test_layout_out_of_range_is_rejected(key, value):
    raw = make_theme_payload()
    raw["layout"][key] = value

    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_layout_padding_is_range_checked_on_every_side():
    raw = make_theme_payload()
    raw["layout"]["padding"]["bottom"] = 201

    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_partial_layout_is_rejected():
    raw = make_theme_payload()
    del raw["layout"]["padding"]

    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)


def test_layout_rejects_unknown_keys():
    raw = make_theme_payload()
    raw["layout"]["colNum"] = 12

    with pytest.raises(ValidationError):
        ThemePayload.model_validate(raw)
