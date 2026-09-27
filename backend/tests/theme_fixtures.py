"""Shared theme payload builder for backend tests.

Not a test module (name does not match python_files = "test_*.py").
"""


def make_theme_payload(theme_id: str = "midnight", name: str = "Midnight") -> dict:
    """A complete, valid theme document. Override keys per test."""
    return {
        "id": theme_id,
        "name": name,
        "version": 1,
        "palette": {
            "appBackground": "#0d1117",
            "appText": "#c9d1d9",
            "widgetBackground": "#161b22",
            "widgetBorderColor": "#30363d",
            "alertColor": "#f85149",
        },
        "header": {
            "background": {
                "type": "linear",
                "angle": 180,
                "stops": [
                    {"color": "#1c2128", "offset": 0},
                    {"color": "#161b22", "offset": 100},
                ],
            },
            "titleColor": "#e6edf3",
            "titleFont": {
                "family": "Roboto, 'Segoe UI', sans-serif",
                "size": "14px",
                "weight": 600,
                "letterSpacing": "0",
            },
            "padding": {"x": "12px", "y": "8px"},
            "height": "auto",
            "align": "left",
        },
        "border": {"width": "1px", "style": "solid", "radius": "6px"},
        "shadow": {
            "widget": {
                "x": "0", "y": "2px", "blur": "8px", "spread": "0",
                "color": "#000000", "opacity": 0.4,
            },
            "text": {
                "x": "0", "y": "1px", "blur": "3px", "spread": "0",
                "color": "#000000", "opacity": 0.6,
            },
        },
        "font": {
            "family": "Roboto, 'Segoe UI', sans-serif",
            "contentSize": "13px",
            "contentWeight": 400,
        },
        "layout": {
            "rowHeight": 32,
            "widgetGap": 12,
            "containerRowHeight": 26,
            "containerGapOnBorders": False,
            "padding": {"top": 20, "right": 18, "bottom": 20, "left": 18},
        },
    }
