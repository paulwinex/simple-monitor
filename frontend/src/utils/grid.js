// The grid is fed `margin: [gapX, 0]` and the plain row height, so a grid item box is
// exactly `h * rowHeight` tall and the library never adds the gap to every row.
// The vertical gap is applied inside the item instead (bottom padding of the widget
// wrapper), which keeps it out of the row height entirely.
//
// The padding must not exceed the item box, otherwise the widget would overflow into
// the row below, so the painted gap is capped at the row content height.
export const MIN_GRID_ROW_HEIGHT = 10

export function gridWidgetGap(gap, rowHeight) {
  const spacing = Number.isFinite(gap) ? Math.max(0, gap) : 0
  const row = Number.isFinite(rowHeight) ? rowHeight : MIN_GRID_ROW_HEIGHT
  return Math.max(0, Math.min(spacing, row - MIN_GRID_ROW_HEIGHT))
}
