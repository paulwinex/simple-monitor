/**
 * Theme primitives.
 *
 * Everything here is a pure function over a theme document. No Vue, no DOM on
 * import, no localStorage reads at module scope, so the whole module can be
 * exercised from plain node (see themes.check.mjs).
 *
 * A theme document is the same shape the backend stores and validates:
 *
 *   { id, name, version: 1, palette: {5 colors}, header: {...},
 *     border: {...}, shadow: { widget, text }, font: {...} }
 *
 * The header owns its own background and typography. Nothing about the header
 * lives in `palette` any more, and `palette.widgetHeaderBackground` /
 * `palette.widgetTitleColor` are not part of version 1.
 */

export const THEME_VERSION = 1

/** Storage key for the UI chrome preference (light/dark/system). */
export const UI_THEME_STORAGE_KEY = 'sm-ui-theme'

/** Every CSS custom property the dashboard reads. */
export const THEME_TOKEN_NAMES = Object.freeze([
  '--sm-app-bg',
  '--sm-app-text',
  '--sm-widget-bg',
  '--sm-widget-border-color',
  '--sm-widget-border-width',
  '--sm-widget-border-style',
  '--sm-widget-radius',
  '--sm-widget-shadow',
  '--sm-text-shadow',
  '--sm-alert-color',
  '--sm-header-bg',
  '--sm-header-color',
  '--sm-header-font-family',
  '--sm-header-font-size',
  '--sm-header-font-weight',
  '--sm-header-letter-spacing',
  '--sm-header-padding-x',
  '--sm-header-padding-y',
  '--sm-header-height',
  '--sm-header-align',
  '--sm-font-family',
  '--sm-font-size',
  '--sm-font-weight'
])

export const FONT_WEIGHTS = Object.freeze([300, 400, 500, 600, 700, 800, 900])
export const BORDER_STYLES = Object.freeze(['solid', 'dashed', 'dotted', 'double', 'none'])
export const HEADER_ALIGNMENTS = Object.freeze(['left', 'center', 'right'])
export const GRADIENT_TYPES = Object.freeze(['linear', 'radial'])

/** The editor cannot add a sixth stop, and the backend rejects one. */
export const MIN_GRADIENT_STOPS = 2
export const MAX_GRADIENT_STOPS = 5

/**
 * Static fallback, mirroring the backend's `light` preset. Used before the
 * catalog loads and when the API is unreachable, so the dashboard is never
 * unstyled.
 */
export const FALLBACK_THEME = Object.freeze({
  id: 'light',
  name: 'Light',
  version: THEME_VERSION,
  palette: {
    appBackground: '#f5f5f5',
    appText: '#333333',
    widgetBackground: '#ffffff',
    widgetBorderColor: '#e0e0e0',
    alertColor: '#c10015'
  },
  header: {
    background: '#f5f5f5',
    titleColor: '#424242',
    titleFont: {
      family: "Roboto, 'Segoe UI', sans-serif",
      size: '14px',
      weight: 600,
      letterSpacing: '0'
    },
    padding: { x: '12px', y: '8px' },
    height: 'auto',
    align: 'left'
  },
  border: { width: '1px', style: 'solid', radius: '4px' },
  shadow: {
    widget: { x: '0', y: '1px', blur: '3px', spread: '0', color: '#000000', opacity: 0.12 },
    text: { x: '0', y: '1px', blur: '2px', spread: '0', color: '#000000', opacity: 0.15 }
  },
  font: {
    family: "Roboto, 'Segoe UI', sans-serif",
    contentSize: '13px',
    contentWeight: 400
  }
})

// --------------------------------------------------------------------------- //
// Small helpers
// --------------------------------------------------------------------------- //

/** Deep clone through JSON: theme documents are plain data by construction. */
export function cloneTheme(value) {
  return JSON.parse(JSON.stringify(value))
}

export function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** A paint is either a CSS color string or a gradient object. */
export function isGradient(value) {
  return isPlainObject(value) && (value.type === 'linear' || value.type === 'radial')
}

export function isPaint(value) {
  return typeof value === 'string' || isGradient(value)
}

const CSS_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
// The real CSS named colors. Carrying the list keeps the editor from producing
// a document the backend rejects with 422; themes.check.mjs asserts this list
// stays identical to the one in backend/app/shemas.py.
const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue
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
   turquoise violet wheat white whitesmoke yellow yellowgreen currentcolor`
    .split(/\s+/)
    .filter(Boolean)
)
// Every alternative is anchored at both ends. An unanchored "^name" would
// accept "not a color at all" on its first word.
const COLOR_FUNCTION_RE =
  /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|var|color-mix|light-dark|color-contrast)\([^()]*\)$/

/** Structural color check, mirroring the backend validator. */
export function isCssColor(value) {
  if (typeof value !== 'string') return false
  const candidate = value.trim()
  if (!candidate) return false
  if (/[;{}<>\\"'`]/.test(candidate)) return false
  if (CSS_COLOR_RE.test(candidate)) return true
  if (NAMED_COLORS.has(candidate.toLowerCase())) return true
  return COLOR_FUNCTION_RE.test(candidate)
}

const PX_LENGTH_RE = /^-?(?:\d+(?:\.\d+)?|\.\d+)px$/
const ZERO_RE = /^-?0+(?:\.0+)?$/

export function isCssLength(value) {
  if (typeof value !== 'string') return false
  const candidate = value.trim()
  if (/[;{}<>\\]/.test(candidate)) return false
  return ZERO_RE.test(candidate) || PX_LENGTH_RE.test(candidate)
}

export function isHeaderHeight(value) {
  return value === 'auto' || isCssLength(value)
}

export function isFontWeight(value) {
  return FONT_WEIGHTS.includes(value)
}

/** #rgb / #rgba / #rrggbb / #rrggbbaa -> {r,g,b}, else null. */
export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null
  let digits = hex.trim().replace(/^#/, '')
  if (digits.length === 3 || digits.length === 4) {
    digits = digits.slice(0, 3).split('').map((c) => c + c).join('')
  }
  if (digits.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(digits)) return null
  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16)
  }
}

/** Legacy helper kept for canvas widgets. Returns the input unchanged if it is not hex. */
export function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

/**
 * Apply an alpha to a color. Only hex can be re-aliased safely: for
 * color-mix()/var()/rgba() the author already expressed the intent, so the
 * value is left alone instead of being mangled into something wrong.
 */
export function applyOpacity(color, alpha) {
  if (typeof color !== 'string') return color
  if (typeof alpha !== 'number' || Number.isNaN(alpha) || alpha >= 1) return color
  const rgb = hexToRgb(color)
  if (!rgb) return color
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

// --------------------------------------------------------------------------- //
// Paint and shadow composition
// --------------------------------------------------------------------------- //

/** Render a paint (color string or gradient object) as one CSS value. */
export function paintToCss(paint) {
  if (typeof paint === 'string') return paint
  if (!isGradient(paint)) return 'transparent'

  const stops = Array.isArray(paint.stops) ? paint.stops : []
  if (stops.length === 0) return 'transparent'

  const parts = stops.map((stop) => `${stop.color} ${stop.offset}%`)
  if (paint.type === 'radial') {
    return `radial-gradient(circle at center, ${parts.join(', ')})`
  }
  const angle = typeof paint.angle === 'number' ? paint.angle : 180
  return `linear-gradient(${angle}deg, ${parts.join(', ')})`
}

/** Render a shadow record as a CSS box-shadow/text-shadow value. */
export function shadowToCss(shadow) {
  if (!isPlainObject(shadow)) return 'none'
  const color = applyOpacity(shadow.color, shadow.opacity)
  const parts = [shadow.x, shadow.y, shadow.blur, shadow.spread]
  if (parts.some((part) => typeof part !== 'string')) return 'none'
  if (parts.every((part) => part.trim() === '0')) return 'none'
  return `${parts.join(' ')} ${color}`
}

// --------------------------------------------------------------------------- //
// Normalization
// --------------------------------------------------------------------------- //

function color(value, fallback) {
  return isCssColor(value) ? value : fallback
}

function length(value, fallback) {
  return isCssLength(value) ? value : fallback
}

function height(value, fallback) {
  return isHeaderHeight(value) ? value : fallback
}

function family(value, fallback) {
  if (typeof value !== 'string') return fallback
  if (!value.trim()) return fallback
  if (/[;{}<>\\\n\r]/.test(value)) return fallback
  return value
}

function weight(value, fallback) {
  const numeric = typeof value === 'string' ? Number(value) : value
  return isFontWeight(numeric) ? numeric : fallback
}

function letterSpacing(value, fallback) {
  if (typeof value === 'string') {
    const keyword = value.trim().toLowerCase()
    if (['normal', 'inherit', 'initial', 'unset', 'revert'].includes(keyword)) return value
  }
  return length(value, fallback)
}

/** Clamp a numeric field into range; `fallback` only when it is not a number. */
function clamp(value, min, max, fallback) {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (typeof numeric !== 'number' || Number.isNaN(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

/** Normalize one gradient, keeping only well-formed stops. */
function gradient(value, fallback) {
  if (!isGradient(value)) return fallback

  const stops = Array.isArray(value.stops) ? value.stops : []
  const cleaned = stops
    .filter((stop) => isPlainObject(stop) && isCssColor(stop.color))
    .map((stop) => ({ color: stop.color, offset: clamp(stop.offset, 0, 100, 0) }))

  // Too few stops is not a gradient at all, so the leaf's own fallback wins.
  if (cleaned.length < MIN_GRADIENT_STOPS) return fallback

  const capped = cleaned.slice(0, MAX_GRADIENT_STOPS)
  const type = oneOf(value.type, GRADIENT_TYPES, 'linear')
  if (type === 'radial') {
    // A radial gradient has no direction; angle is not carried over.
    return { type, stops: capped }
  }
  return { type, angle: clamp(value.angle, 0, 360, 180), stops: capped }
}

function paint(value, fallback) {
  if (typeof value === 'string' && isCssColor(value)) return value
  if (isGradient(value)) return gradient(value, fallback)
  return fallback
}

function shadow(value, fallback) {
  if (!isPlainObject(value)) return cloneTheme(fallback)
  return {
    x: length(value.x, fallback.x),
    y: length(value.y, fallback.y),
    blur: length(value.blur, fallback.blur),
    spread: length(value.spread, fallback.spread),
    color: color(value.color, fallback.color),
    opacity: clamp(value.opacity, 0, 1, fallback.opacity)
  }
}

/**
 * Produce a complete, closed theme document from arbitrary input.
 *
 * Every leaf is coerced against the fallback, so unknown keys are dropped and
 * out-of-range values are replaced. That is what makes a partially broken
 * document from an older build or a hand-edited import renderable instead of
 * blank.
 */
export function normalizeTheme(raw) {
  const base = FALLBACK_THEME
  const source = isPlainObject(raw) ? raw : {}

  const paletteSource = isPlainObject(source.palette) ? source.palette : {}
  const headerSource = isPlainObject(source.header) ? source.header : {}
  const titleFontSource = isPlainObject(headerSource.titleFont) ? headerSource.titleFont : {}
  const paddingSource = isPlainObject(headerSource.padding) ? headerSource.padding : {}
  const borderSource = isPlainObject(source.border) ? source.border : {}
  const shadowSource = isPlainObject(source.shadow) ? source.shadow : {}
  const fontSource = isPlainObject(source.font) ? source.font : {}

  return {
    id: typeof source.id === 'string' && source.id.trim() ? source.id : base.id,
    name: typeof source.name === 'string' && source.name.trim() ? source.name : base.name,
    version: THEME_VERSION,
    palette: {
      appBackground: color(paletteSource.appBackground, base.palette.appBackground),
      appText: color(paletteSource.appText, base.palette.appText),
      widgetBackground: color(paletteSource.widgetBackground, base.palette.widgetBackground),
      widgetBorderColor: color(paletteSource.widgetBorderColor, base.palette.widgetBorderColor),
      alertColor: color(paletteSource.alertColor, base.palette.alertColor)
    },
    header: {
      background: paint(headerSource.background, base.header.background),
      titleColor: color(headerSource.titleColor, base.header.titleColor),
      titleFont: {
        family: family(titleFontSource.family, base.header.titleFont.family),
        size: length(titleFontSource.size, base.header.titleFont.size),
        weight: weight(titleFontSource.weight, base.header.titleFont.weight),
        letterSpacing: letterSpacing(
          titleFontSource.letterSpacing,
          base.header.titleFont.letterSpacing
        )
      },
      padding: {
        x: length(paddingSource.x, base.header.padding.x),
        y: length(paddingSource.y, base.header.padding.y)
      },
      height: height(headerSource.height, base.header.height),
      align: oneOf(headerSource.align, HEADER_ALIGNMENTS, base.header.align)
    },
    border: {
      width: length(borderSource.width, base.border.width),
      style: oneOf(borderSource.style, BORDER_STYLES, base.border.style),
      radius: length(borderSource.radius, base.border.radius)
    },
    shadow: {
      widget: shadow(shadowSource.widget, base.shadow.widget),
      text: shadow(shadowSource.text, base.shadow.text)
    },
    font: {
      family: family(fontSource.family, base.font.family),
      contentSize: length(fontSource.contentSize, base.font.contentSize),
      contentWeight: weight(fontSource.contentWeight, base.font.contentWeight)
    }
  }
}

/**
 * Report what is wrong with a document without changing it. The editor shows
 * these next to the offending control; the backend remains the authority.
 */
export function validateTheme(raw) {
  const problems = []
  if (!isPlainObject(raw)) {
    return [{ path: '', message: 'not an object' }]
  }

  const checkColor = (value, path) => {
    if (value !== undefined && !isCssColor(value)) {
      problems.push({ path, message: 'not a CSS color' })
    }
  }
  const checkLength = (value, path) => {
    if (value !== undefined && !isCssLength(value)) {
      problems.push({ path, message: 'expected a px length or 0' })
    }
  }
  const checkFamily = (value, path) => {
    if (value === undefined) return
    if (typeof value !== 'string' || !value.trim() || /[;{}<>\\\n\r]/.test(value)) {
      problems.push({ path, message: 'expected a font family stack' })
    }
  }

  Object.entries(FALLBACK_THEME.palette).forEach(([key, fallback]) => {
    checkColor(raw.palette?.[key], `palette.${key}`)
    if (raw.palette?.[key] === undefined) {
      problems.push({ path: `palette.${key}`, message: `missing (expected ${fallback})` })
    }
  })

  checkColor(raw.header?.titleColor, 'header.titleColor')
  checkFamily(raw.header?.titleFont?.family, 'header.titleFont.family')
  checkLength(raw.header?.titleFont?.size, 'header.titleFont.size')
  if (
    raw.header?.titleFont?.letterSpacing !== undefined &&
    !isCssLength(raw.header.titleFont.letterSpacing)
  ) {
    problems.push({ path: 'header.titleFont.letterSpacing', message: 'expected a px length or 0' })
  }
  checkLength(raw.header?.padding?.x, 'header.padding.x')
  checkLength(raw.header?.padding?.y, 'header.padding.y')
  if (raw.header?.height !== undefined && !isHeaderHeight(raw.header.height)) {
    problems.push({ path: 'header.height', message: "expected 'auto' or a px length" })
  }
  if (raw.header?.align !== undefined && !HEADER_ALIGNMENTS.includes(raw.header.align)) {
    problems.push({ path: 'header.align', message: `expected one of ${HEADER_ALIGNMENTS.join(', ')}` })
  }

  const headerBackground = raw.header?.background
  if (headerBackground !== undefined) {
    if (typeof headerBackground === 'string') {
      checkColor(headerBackground, 'header.background')
    } else if (isGradient(headerBackground)) {
      if (headerBackground.type === 'linear' && typeof headerBackground.angle !== 'number') {
        problems.push({ path: 'header.background.angle', message: 'linear gradients need an angle' })
      }
      const stops = Array.isArray(headerBackground.stops) ? headerBackground.stops : []
      if (stops.length < MIN_GRADIENT_STOPS || stops.length > MAX_GRADIENT_STOPS) {
        problems.push({
          path: 'header.background.stops',
          message: `expected ${MIN_GRADIENT_STOPS}-${MAX_GRADIENT_STOPS} stops, got ${stops.length}`
        })
      }
      stops.forEach((stop, index) => {
        checkColor(stop?.color, `header.background.stops.${index}.color`)
      })
    } else {
      problems.push({ path: 'header.background', message: 'expected a color or a gradient' })
    }
  }

  ;['width', 'radius'].forEach((key) => checkLength(raw.border?.[key], `border.${key}`))
  if (raw.border?.style !== undefined && !BORDER_STYLES.includes(raw.border.style)) {
    problems.push({ path: 'border.style', message: `expected one of ${BORDER_STYLES.join(', ')}` })
  }

  ;['widget', 'text'].forEach((slot) => {
    const value = raw.shadow?.[slot]
    if (!isPlainObject(value)) {
      problems.push({ path: `shadow.${slot}`, message: 'expected an object' })
      return
    }
    ;['x', 'y', 'blur', 'spread'].forEach((key) =>
      checkLength(value[key], `shadow.${slot}.${key}`)
    )
    checkColor(value.color, `shadow.${slot}.color`)
    if (value.opacity !== undefined && (typeof value.opacity !== 'number' || value.opacity < 0 || value.opacity > 1)) {
      problems.push({ path: `shadow.${slot}.opacity`, message: 'expected 0..1' })
    }
  })

  checkLength(raw.font?.contentSize, 'font.contentSize')
  checkFamily(raw.font?.family, 'font.family')
  ;['header.titleFont.weight', 'font.contentWeight'].forEach((path) => {
    const value = path === 'font.contentWeight' ? raw.font?.contentWeight : raw.header?.titleFont?.weight
    if (value !== undefined && !isFontWeight(typeof value === 'string' ? Number(value) : value)) {
      problems.push({ path, message: `expected one of ${FONT_WEIGHTS.join(', ')}` })
    }
  })

  if (raw.version !== undefined && raw.version !== THEME_VERSION) {
    problems.push({ path: 'version', message: `expected ${THEME_VERSION}` })
  }

  return problems
}

// --------------------------------------------------------------------------- //
// Tokens
// --------------------------------------------------------------------------- //

/** Build the full CSS custom property map for a theme document. */
export function buildThemeTokens(theme) {
  const t = normalizeTheme(theme)
  return {
    '--sm-app-bg': t.palette.appBackground,
    '--sm-app-text': t.palette.appText,
    '--sm-widget-bg': t.palette.widgetBackground,
    '--sm-widget-border-color': t.palette.widgetBorderColor,
    '--sm-widget-border-width': t.border.width,
    '--sm-widget-border-style': t.border.style,
    '--sm-widget-radius': t.border.radius,
    '--sm-widget-shadow': shadowToCss(t.shadow.widget),
    '--sm-text-shadow': shadowToCss(t.shadow.text),
    '--sm-alert-color': t.palette.alertColor,
    '--sm-header-bg': paintToCss(t.header.background),
    '--sm-header-color': t.header.titleColor,
    '--sm-header-font-family': t.header.titleFont.family,
    '--sm-header-font-size': t.header.titleFont.size,
    '--sm-header-font-weight': String(t.header.titleFont.weight),
    '--sm-header-letter-spacing': t.header.titleFont.letterSpacing,
    '--sm-header-padding-x': t.header.padding.x,
    '--sm-header-padding-y': t.header.padding.y,
    '--sm-header-height': t.header.height,
    '--sm-header-align': t.header.align,
    '--sm-font-family': t.font.family,
    '--sm-font-size': t.font.contentSize,
    '--sm-font-weight': String(t.font.contentWeight)
  }
}

/** Serialized form for a `style` attribute, ready to bind with v-bind. */
export function buildThemeStyle(theme) {
  const tokens = buildThemeTokens(theme)
  return Object.entries(tokens)
    .map(([name, value]) => `${name}:${value}`)
    .join(';')
}

let appliedRevision = 0

/**
 * Monotonic counter of applied themes. Canvas widgets cannot observe CSS
 * variables changing, so they watch this and redraw.
 */
export function getAppliedRevision() {
  return appliedRevision
}

export function bumpAppliedRevision() {
  appliedRevision += 1
  return appliedRevision
}

/**
 * Write the tokens onto an element (document.body by default).
 * Returns the new revision number.
 */
export function applyThemeTokens(theme, element) {
  const target = element || (typeof document !== 'undefined' ? document.body : null)
  const tokens = buildThemeTokens(theme)
  if (target && target.style && typeof target.style.setProperty === 'function') {
    Object.entries(tokens).forEach(([name, value]) => target.style.setProperty(name, value))
  }
  return bumpAppliedRevision()
}

/** Read one token back, for canvas widgets that cannot use var(). */
export function readThemeToken(name, element) {
  const target = element || (typeof document !== 'undefined' ? document.body : null)
  if (!target || typeof getComputedStyle !== 'function') return ''
  return getComputedStyle(target).getPropertyValue(name).trim()
}

/** Read every token at once. */
export function readThemeTokens(element) {
  const target = element || (typeof document !== 'undefined' ? document.body : null)
  if (!target || typeof getComputedStyle !== 'function') return {}
  const computed = getComputedStyle(target)
  return THEME_TOKEN_NAMES.reduce((acc, name) => {
    acc[name] = computed.getPropertyValue(name).trim()
    return acc
  }, {})
}

// --------------------------------------------------------------------------- //
// Nested access, for the editor's declarative field descriptors
// --------------------------------------------------------------------------- //

export function getThemePath(source, path) {
  if (!path) return source
  return String(path)
    .split('.')
    .reduce((node, key) => (isPlainObject(node) ? node[key] : undefined), source)
}

/** Immutably set a nested value, cloning only the nodes on the path. */
export function setThemePath(source, path, value) {
  const keys = String(path).split('.')
  const [head, ...rest] = keys
  const next = isPlainObject(source) ? { ...source } : {}
  if (rest.length === 0) {
    next[head] = value
    return next
  }
  next[head] = setThemePath(next[head], rest.join('.'), value)
  return next
}

export function hasThemePath(source, path) {
  return getThemePath(source, path) !== undefined
}

// --------------------------------------------------------------------------- //
// UI chrome preference (independent of the dashboard theme)
// --------------------------------------------------------------------------- //

export const NAMED_COLOR_LIST = Object.freeze([...NAMED_COLORS].sort())

export const UI_THEMES = Object.freeze(['light', 'dark', 'system'])

export function isUiTheme(value) {
  return UI_THEMES.includes(value)
}

/** Resolve 'system' against the OS preference. */
export function resolveUiTheme(preference) {
  const chosen = isUiTheme(preference) ? preference : 'system'
  if (chosen !== 'system') return chosen
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// --------------------------------------------------------------------------- //
// Canvas helpers
// --------------------------------------------------------------------------- //

/**
 * Colours a <canvas> needs, read from the applied tokens.
 *
 * Canvas cannot resolve `var(--sm-*)`, so chart widgets have to sample the
 * computed values instead. Reading them at draw time (rather than caching a
 * palette) means an editor preview is reflected on the very next frame.
 */
export function readCanvasTheme(element) {
  const text = readThemeToken('--sm-app-text', element) || '#333333'
  const surface = readThemeToken('--sm-widget-bg', element) || '#ffffff'
  return {
    text,
    surface,
    /** A faint version of `text`, for grid lines. */
    grid: applyOpacity(text, 0.12),
    /** A mid version of `text`, for tick labels on axis lines. */
    muted: applyOpacity(text, 0.55)
  }
}
