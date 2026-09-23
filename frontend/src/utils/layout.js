export function bottom(layout) {
  let max = 0
  let bottomY
  for (let i = 0, len = layout.length; i < len; i++) {
    bottomY = layout[i].y + layout[i].h
    if (bottomY > max) max = bottomY
  }
  return max
}

export function collides(l1, l2) {
  if (l1 === l2) return false
  if (l1.x + l1.w <= l2.x) return false
  if (l1.x >= l2.x + l2.w) return false
  if (l1.y + l1.h <= l2.y) return false
  if (l1.y >= l2.y + l2.h) return false
  return true
}

function getStatics(layout) {
  return layout.filter((l) => l.static)
}

function getFirstCollision(layout, layoutItem) {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (collides(layout[i], layoutItem)) return layout[i]
  }
}

function sortLayoutItemsByRowCol(layout) {
  return [...layout].sort((a, b) => {
    if (a.y > b.y || (a.y === b.y && a.x > b.x)) return 1
    if (a.y === b.y && a.x === b.x) return 0
    return -1
  })
}

function compactItem(compareWith, l, verticalCompact, minPositions) {
  if (verticalCompact) {
    while (l.y > 0 && !getFirstCollision(compareWith, l)) {
      l.y--
    }
  } else if (minPositions) {
    const minY = minPositions[l.i].y
    while (l.y > minY && !getFirstCollision(compareWith, l)) {
      l.y--
    }
  }

  let collides
  while ((collides = getFirstCollision(compareWith, l))) {
    l.y = collides.y + collides.h
  }
  return l
}

export function compact(layout, verticalCompact, minPositions) {
  const compareWith = getStatics(layout)
  const sorted = sortLayoutItemsByRowCol(layout)
  const out = Array(layout.length)

  for (let i = 0, len = sorted.length; i < len; i++) {
    let l = sorted[i]

    if (!l.static) {
      l = compactItem(compareWith, l, verticalCompact, minPositions)
      compareWith.push(l)
    }

    out[layout.indexOf(l)] = l

    delete l.moved
  }

  return out
}

export function cloneLayout(layout) {
  return (layout || []).map((item) => ({ ...item }))
}