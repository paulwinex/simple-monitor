/**
 * Node checks for utils/themes.js. Run: node src/utils/themes.check.mjs
 *
 * There is no frontend test runner in this project, so the pure functions are
 * exercised here instead. Exits non-zero on the first failure.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const {
  THEME_VERSION,
  THEME_TOKEN_NAMES,
  FALLBACK_THEME,
  MIN_GRADIENT_STOPS,
  MAX_GRADIENT_STOPS,
  FONT_WEIGHTS,
  BORDER_STYLES,
  HEADER_ALIGNMENTS,
  LAYOUT_RANGES,
  PADDING_RANGE,
  FALLBACK_LAYOUT,
  getThemeLayout,
  normalizeTheme,
  validateTheme,
  buildThemeTokens,
  buildThemeStyle,
  applyThemeTokens,
  getAppliedRevision,
  paintToCss,
  shadowToCss,
  applyOpacity,
  hexToRgba,
  hexToRgb,
  isCssColor,
  isCssLength,
  isGradient,
  isPlainObject,
  getThemePath,
  setThemePath,
  changedThemePaths,
  cloneTheme,
  resolveUiTheme,
  NAMED_COLOR_LIST
} = await import(resolve(here, 'themes.js'))

const FALLBACK = FALLBACK_THEME

let checks = 0
function check(name, fn) {
  fn()
  checks += 1
}

// --------------------------------------------------------------------------- //
// Fallback document
// --------------------------------------------------------------------------- //

check('fallback theme is version 1', () => {
  assert.equal(FALLBACK_THEME.version, THEME_VERSION)
})

check('fallback theme is a valid document', () => {
  assert.deepEqual(validateTheme(FALLBACK_THEME), [])
})

check('fallback has no legacy header keys in palette', () => {
  assert.equal('widgetHeaderBackground' in FALLBACK_THEME.palette, false)
  assert.equal('widgetTitleColor' in FALLBACK_THEME.palette, false)
})

// --------------------------------------------------------------------------- //
// Normalization
// --------------------------------------------------------------------------- //

check('normalize of nothing returns the fallback', () => {
  assert.deepEqual(normalizeTheme(null), cloneTheme(FALLBACK))
  assert.deepEqual(normalizeTheme(undefined), cloneTheme(FALLBACK))
  assert.deepEqual(normalizeTheme('garbage'), cloneTheme(FALLBACK))
})

check('normalize drops unknown keys', () => {
  const result = normalizeTheme({
    ...cloneTheme(FALLBACK),
    legacyDarkFlag: true,
    palette: { ...FALLBACK.palette, borderColor: '#fff', widgetTitleColor: '#fff' }
  })
  assert.equal('legacyDarkFlag' in result, false)
  assert.equal('borderColor' in result.palette, false)
  assert.equal('widgetTitleColor' in result.palette, false)
})

check('normalize fills a missing header block from the fallback', () => {
  const raw = cloneTheme(FALLBACK)
  delete raw.header
  const result = normalizeTheme(raw)
  assert.deepEqual(result.header, cloneTheme(FALLBACK.header))
})

check('normalize fills each missing header leaf', () => {
  const result = normalizeTheme({ ...cloneTheme(FALLBACK), header: {} })
  assert.deepEqual(result.header, cloneTheme(FALLBACK.header))
})

check('normalize keeps a valid gradient', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.background = {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#111111', offset: 0 },
      { color: '#222222', offset: 100 }
    ]
  }
  const result = normalizeTheme(raw)
  assert.equal(result.header.background.type, 'linear')
  assert.equal(result.header.background.angle, 90)
  assert.equal(result.header.background.stops.length, 2)
})

check('normalize caps a six-stop gradient at five', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.background = {
    type: 'linear',
    angle: 180,
    stops: Array.from({ length: 6 }, (_, n) => ({ color: '#000000', offset: n * 20 }))
  }
  assert.equal(normalizeTheme(raw).header.background.stops.length, MAX_GRADIENT_STOPS)
})

check('normalize replaces a one-stop gradient with the fallback', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.background = { type: 'linear', angle: 0, stops: [{ color: '#000000', offset: 0 }] }
  const result = normalizeTheme(raw)
  assert.equal(typeof result.header.background, 'string')
})

check('normalize drops stops with a bad color', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.background = {
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#000000', offset: 0 },
      { color: 'not a color at all', offset: 50 },
      { color: '#ffffff', offset: 100 }
    ]
  }
  const result = normalizeTheme(raw)
  assert.equal(result.header.background.stops.length, 2)
})

check('normalize gives a radial gradient no angle', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.background = {
    type: 'radial',
    angle: 45,
    stops: [
      { color: '#000000', offset: 0 },
      { color: '#ffffff', offset: 100 }
    ]
  }
  const result = normalizeTheme(raw)
  assert.equal(result.header.background.type, 'radial')
  assert.equal('angle' in result.header.background, false)
})

check('normalize gives a linear gradient an angle', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.background = {
    type: 'linear',
    stops: [
      { color: '#000000', offset: 0 },
      { color: '#ffffff', offset: 100 }
    ]
  }
  assert.equal(normalizeTheme(raw).header.background.angle, 180)
})

check('normalize clamps a bad offset', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.background = {
    type: 'linear',
    angle: 180,
    stops: [
      { color: '#000000', offset: -50 },
      { color: '#ffffff', offset: 400 }
    ]
  }
  const stops = normalizeTheme(raw).header.background.stops
  assert.equal(stops[0].offset, 0)
  assert.equal(stops[1].offset, 100)
})

check('normalize rejects a rem length', () => {
  const raw = cloneTheme(FALLBACK)
  raw.border.radius = '4rem'
  assert.equal(normalizeTheme(raw).border.radius, FALLBACK.border.radius)
})

check('normalize rejects a unitless nonzero length', () => {
  const raw = cloneTheme(FALLBACK)
  raw.font.contentSize = '13'
  assert.equal(normalizeTheme(raw).font.contentSize, FALLBACK.font.contentSize)
})

check('normalize accepts unitless zero', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.titleFont.letterSpacing = '0'
  assert.equal(normalizeTheme(raw).header.titleFont.letterSpacing, '0')
})

check('normalize accepts auto height', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.height = 'auto'
  assert.equal(normalizeTheme(raw).header.height, 'auto')
})

check('normalize rejects an out-of-range weight', () => {
  const raw = cloneTheme(FALLBACK)
  raw.font.contentWeight = 50
  assert.equal(normalizeTheme(raw).font.contentWeight, FALLBACK.font.contentWeight)
})

check('normalize accepts every offered weight', () => {
  FONT_WEIGHTS.forEach((weight) => {
    const raw = cloneTheme(FALLBACK)
    raw.font.contentWeight = weight
    assert.equal(normalizeTheme(raw).font.contentWeight, weight)
  })
})

check('normalize rejects an unknown border style', () => {
  const raw = cloneTheme(FALLBACK)
  raw.border.style = 'wobbly'
  assert.equal(normalizeTheme(raw).border.style, FALLBACK.border.style)
})

check('normalize rejects an unknown align', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.align = 'justify'
  assert.equal(normalizeTheme(raw).header.align, FALLBACK.header.align)
})

check('normalize rejects a css injection attempt in a color', () => {
  const raw = cloneTheme(FALLBACK)
  raw.palette.appText = '#fff; background: url(http://evil)'
  assert.equal(normalizeTheme(raw).palette.appText, FALLBACK.palette.appText)
})

check('normalize rejects a css injection attempt in a font family', () => {
  const raw = cloneTheme(FALLBACK)
  raw.font.family = 'Arial; } body { display: none'
  assert.equal(normalizeTheme(raw).font.family, FALLBACK.font.family)
})

check('normalize keeps a quoted font stack', () => {
  const raw = cloneTheme(FALLBACK)
  raw.font.family = "Roboto, 'Segoe UI', sans-serif"
  assert.equal(normalizeTheme(raw).font.family, "Roboto, 'Segoe UI', sans-serif")
})

check('normalize keeps color-mix and var colors', () => {
  const raw = cloneTheme(FALLBACK)
  raw.palette.appText = 'color-mix(in srgb, #ffffff 50%, #000000)'
  assert.equal(normalizeTheme(raw).palette.appText, 'color-mix(in srgb, #ffffff 50%, #000000)')
  raw.palette.appBackground = 'var(--sm-widget-bg)'
  assert.equal(normalizeTheme(raw).palette.appBackground, 'var(--sm-widget-bg)')
})

check('normalize is idempotent', () => {
  const once = normalizeTheme({ header: { align: 'center' } })
  assert.deepEqual(normalizeTheme(once), once)
})

check('normalize always reports version 1', () => {
  assert.equal(normalizeTheme({ version: 7 }).version, THEME_VERSION)
})

// --------------------------------------------------------------------------- //
// Normalization modes
// --------------------------------------------------------------------------- //

/** Every leaf of a document, however deep, for the "no undefined" checks. */
function leafValues(value, out = []) {
  if (Array.isArray(value)) value.forEach((item) => leafValues(item, out))
  else if (isPlainObject(value)) Object.values(value).forEach((item) => leafValues(item, out))
  else out.push(value)
  return out
}

check('strict is the default mode', () => {
  const broken = { palette: { appText: '#1a' } }
  assert.equal(normalizeTheme(broken).palette.appText, FALLBACK.palette.appText)
  assert.equal(normalizeTheme(broken, 'strict').palette.appText, FALLBACK.palette.appText)
})

check('an unknown mode is rejected', () => {
  assert.throws(() => normalizeTheme(FALLBACK, 'lennient'), /unknown mode/)
})

check('lenient keeps a half-typed colour', () => {
  assert.equal(normalizeTheme({ palette: { appText: '#1a' } }, 'lenient').palette.appText, '#1a')
  assert.equal(normalizeTheme({ palette: { appText: '' } }, 'lenient').palette.appText, '')
  assert.equal(normalizeTheme({ palette: { appText: '#1a2' } }, 'lenient').palette.appText, '#1a2')
})

check('lenient falls back only where a value is absent', () => {
  const lenient = normalizeTheme({}, 'lenient')
  assert.equal(lenient.palette.appText, FALLBACK.palette.appText)
  assert.equal(lenient.header.background, FALLBACK.header.background)
  assert.equal(lenient.layout.rowHeight, FALLBACK.layout.rowHeight)
  assert.equal(lenient.shadow.widget.x, FALLBACK.shadow.widget.x)
  // A wrong type is not a value in progress, it is junk: still the fallback.
  assert.equal(normalizeTheme({ palette: { appText: 42 } }, 'lenient').palette.appText, FALLBACK.palette.appText)
})

check('lenient keeps a half-typed length, family and height', () => {
  const lenient = normalizeTheme(
    { border: { width: '1' }, font: { family: 'Ro' }, header: { height: '40' } },
    'lenient'
  )
  assert.equal(lenient.border.width, '1')
  assert.equal(lenient.font.family, 'Ro')
  assert.equal(lenient.header.height, '40')
  assert.equal(lenient.header.titleFont.letterSpacing, FALLBACK.header.titleFont.letterSpacing)
})

check('lenient keeps raw CSS paint values untouched', () => {
  const mixed = 'color-mix(in srgb, #fff 50%, #000)'
  const lenient = normalizeTheme(
    { palette: { appBackground: mixed }, header: { background: 'var(--brand)' } },
    'lenient'
  )
  assert.equal(lenient.palette.appBackground, mixed)
  assert.equal(lenient.header.background, 'var(--brand)')
})

check('lenient keeps an in-progress gradient stop', () => {
  const draft = setThemePath(normalizeTheme(cloneTheme(FALLBACK), 'lenient'), 'header.background', {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#1a', offset: 0 },
      { color: '#ffffff', offset: 100 }
    ]
  })
  const lenient = normalizeTheme(draft, 'lenient')
  assert.equal(lenient.header.background.stops[0].color, '#1a')
  assert.equal(lenient.header.background.angle, 90)
})

check('lenient drops a gradient stop whose colour is absent', () => {
  const lenient = normalizeTheme(
    {
      header: {
        background: { type: 'linear', angle: 0, stops: [{ offset: 0 }, { color: '#ffffff', offset: 100 }] }
      }
    },
    'lenient'
  )
  // One usable stop is not a gradient, so the leaf's own fallback wins.
  assert.equal(lenient.header.background, FALLBACK.header.background)
})

check('lenient keeps a number the user is still typing', () => {
  const lenient = normalizeTheme({ layout: { rowHeight: 9999, padding: { top: null } } }, 'lenient')
  assert.equal(lenient.layout.rowHeight, 9999)
  assert.equal(lenient.layout.padding.top, null)
  // The grid is fed numbers, so it clamps on the way out instead of in the draft.
  assert.equal(getThemeLayout(lenient).rowHeight, 300)
  assert.equal(getThemeLayout(lenient).padding.top, FALLBACK_LAYOUT.padding.top)
})

check('lenient treats an emptied number field as empty, not as zero', () => {
  assert.equal(normalizeTheme({ layout: { rowHeight: '' } }, 'lenient').layout.rowHeight, null)
})

check('lenient keeps a blank id as "assigned on save"', () => {
  assert.equal(normalizeTheme({ id: '', name: '' }, 'lenient').id, '')
  assert.equal(normalizeTheme({ id: 'dark' }, 'lenient').id, 'dark')
  assert.equal(normalizeTheme({ id: '' }).id, FALLBACK.id)
})

check('lenient never throws on a broken draft', () => {
  const junk = {
    palette: 'not an object',
    header: 7,
    shadow: { widget: 'no', text: null },
    border: [],
    layout: { rowHeight: 'x', padding: 3 }
  }
  const lenient = normalizeTheme(junk, 'lenient')
  for (const leaf of leafValues(lenient)) assert.notEqual(leaf, undefined)
  assert.deepEqual(validateTheme(normalizeTheme(lenient)), [])
})

check('lenient leaves a valid document alone', () => {
  assert.deepEqual(normalizeTheme(FALLBACK, 'lenient'), cloneTheme(FALLBACK))

  const presets = JSON.parse(
    readFileSync(resolve(here, '../../../backend/app/themes/presets.json'), 'utf8')
  )
  for (const preset of presets.presets) {
    assert.deepEqual(
      normalizeTheme(preset.payload, 'lenient'),
      normalizeTheme(preset.payload),
      preset.id
    )
  }
})

check('tokens from a lenient draft carry no undefined and no empty value', () => {
  // Strict normalization is the last gate before CSS, so a half-typed value can
  // only ever become the fallback there - never a hole in a custom property.
  const draft = normalizeTheme(
    {
      palette: { appText: '#1a' },
      header: { background: 'var(--x)' },
      layout: { rowHeight: null, padding: { top: '' } },
      shadow: { widget: { x: '' } }
    },
    'lenient'
  )
  const tokens = buildThemeTokens(draft)
  assert.equal(Object.keys(tokens).length, THEME_TOKEN_NAMES.length)
  for (const [name, value] of Object.entries(tokens)) {
    assert.notEqual(value, undefined, name)
    assert.notEqual(value, '', name)
  }
  assert.equal(tokens['--sm-app-text'], FALLBACK.palette.appText)
  assert.equal(tokens['--sm-header-bg'], 'var(--x)')
})

check('the editor loop keeps what the control sent', () => {
  // The discarded return value of setThemePath is what left every control in the
  // dialog looking dead, so the whole loop is driven here, not just the leaves.
  const draft = normalizeTheme(cloneTheme(FALLBACK), 'lenient')
  const edited = setThemePath(draft, 'layout.rowHeight', 42)
  assert.equal(getThemePath(edited, 'layout.rowHeight'), 42)
  assert.notEqual(edited, draft)
  assert.equal(getThemePath(draft, 'layout.rowHeight'), FALLBACK.layout.rowHeight)

  const previewed = normalizeTheme(edited, 'lenient')
  assert.equal(getThemePath(previewed, 'layout.rowHeight'), 42)
  assert.equal(getThemeLayout(previewed).rowHeight, 42)
})

check('a lenient round trip does not invent a change', () => {
  // The dirty signal is a diff between the draft and the snapshot taken when
  // editing started, so normalizing must not alter a stored document.
  const document = normalizeTheme(cloneTheme(FALLBACK))
  const paths = ['border.radius', 'palette.appText']
  assert.deepEqual(changedThemePaths(document, normalizeTheme(document, 'lenient'), paths), [])

  const edited = setThemePath(document, 'border.radius', '8px')
  const draft = normalizeTheme(edited, 'lenient')
  assert.deepEqual(changedThemePaths(edited, draft, paths), [])
  assert.equal(getThemePath(draft, 'border.radius'), '8px')
})

check('changedThemePaths reports the leaves that differ, in order', () => {
  const before = cloneTheme(FALLBACK)
  const after = setThemePath(setThemePath(before, 'border.radius', '8px'), 'header.align', 'center')
  assert.deepEqual(
    changedThemePaths(before, after, ['border.radius', 'palette.appText', 'header.align']),
    ['border.radius', 'header.align']
  )
  assert.deepEqual(changedThemePaths(before, cloneTheme(before), ['border.radius']), [])
  // Typed and typed back: the document is where it started, so it is not dirty.
  const restored = setThemePath(after, 'border.radius', FALLBACK.border.radius)
  assert.deepEqual(changedThemePaths(before, restored, ['border.radius', 'header.align']), [
    'header.align'
  ])
})

check('changedThemePaths sees a gradient as one leaf', () => {
  const before = cloneTheme(FALLBACK)
  const after = setThemePath(before, 'header.background', {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#111111', offset: 0 },
      { color: '#222222', offset: 100 }
    ]
  })
  const paths = ['header.background']
  assert.deepEqual(changedThemePaths(before, after, paths), ['header.background'])
  assert.deepEqual(changedThemePaths(after, normalizeTheme(after, 'lenient'), paths), [])
  assert.deepEqual(changedThemePaths(after, normalizeTheme(after, 'strict'), paths), [])
})

check('changedThemePaths ignores a path neither document carries', () => {
  assert.deepEqual(changedThemePaths(FALLBACK, cloneTheme(FALLBACK), ['nope.nope']), [])
  // A key that appears under a missing parent is a real difference.
  assert.deepEqual(
    changedThemePaths(FALLBACK, { ...cloneTheme(FALLBACK), id: 'x' }, ['id']),
    ['id']
  )
  assert.deepEqual(changedThemePaths(FALLBACK, cloneTheme(FALLBACK), ['id']), [])
})

// --------------------------------------------------------------------------- //
// Validation
// --------------------------------------------------------------------------- //

check('validate passes the fallback', () => {
  assert.deepEqual(validateTheme(FALLBACK), [])
})

check('validate reports a missing leaf', () => {
  const raw = cloneTheme(FALLBACK)
  delete raw.palette.alertColor
  const problems = validateTheme(raw)
  assert.equal(problems.length, 1)
  assert.equal(problems[0].path, 'palette.alertColor')
})

check('validate reports a bad color', () => {
  const raw = cloneTheme(FALLBACK)
  raw.palette.alertColor = 'nope nope nope'
  const problems = validateTheme(raw)
  assert.equal(problems[0].path, 'palette.alertColor')
})

check('validate reports a bad gradient stop count', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.background = { type: 'linear', angle: 0, stops: [{ color: '#000', offset: 0 }] }
  const paths = validateTheme(raw).map((p) => p.path)
  assert.equal(paths.includes('header.background.stops'), true)
})

check('validate reports a linear gradient without an angle', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.background = {
    type: 'linear',
    stops: [
      { color: '#000000', offset: 0 },
      { color: '#ffffff', offset: 100 }
    ]
  }
  const paths = validateTheme(raw).map((p) => p.path)
  assert.equal(paths.includes('header.background.angle'), true)
})

check('validate does not require an angle on a radial gradient', () => {
  const raw = cloneTheme(FALLBACK)
  raw.header.background = {
    type: 'radial',
    stops: [
      { color: '#000000', offset: 0 },
      { color: '#ffffff', offset: 100 }
    ]
  }
  assert.deepEqual(validateTheme(raw), [])
})

check('validate reports out-of-range shadow opacity', () => {
  const raw = cloneTheme(FALLBACK)
  raw.shadow.widget.opacity = 1.5
  const paths = validateTheme(raw).map((p) => p.path)
  assert.equal(paths.includes('shadow.widget.opacity'), true)
})

// --------------------------------------------------------------------------- //
// Paint and shadow composition
// --------------------------------------------------------------------------- //

check('paintToCss passes a color through', () => {
  assert.equal(paintToCss('#abcdef'), '#abcdef')
})

check('paintToCss renders a linear gradient', () => {
  const gradient = {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#000000', offset: 0 },
      { color: '#ffffff', offset: 100 }
    ]
  }
  assert.equal(paintToCss(gradient), 'linear-gradient(90deg, #000000 0%, #ffffff 100%)')
})

check('paintToCss renders a radial gradient without an angle', () => {
  const gradient = {
    type: 'radial',
    stops: [
      { color: '#000000', offset: 0 },
      { color: '#ffffff', offset: 100 }
    ]
  }
  assert.equal(paintToCss(gradient), 'radial-gradient(circle at center, #000000 0%, #ffffff 100%)')
})

check('paintToCss defaults a missing angle to 180', () => {
  const gradient = {
    type: 'linear',
    stops: [
      { color: '#000000', offset: 0 },
      { color: '#ffffff', offset: 100 }
    ]
  }
  assert.ok(paintToCss(gradient).startsWith('linear-gradient(180deg,'))
})

check('paintToCss renders three stops', () => {
  const gradient = {
    type: 'linear',
    angle: 0,
    stops: [
      { color: '#111111', offset: 0 },
      { color: '#222222', offset: 50 },
      { color: '#333333', offset: 100 }
    ]
  }
  assert.equal(
    paintToCss(gradient),
    'linear-gradient(0deg, #111111 0%, #222222 50%, #333333 100%)'
  )
})

check('shadowToCss composes offsets and alpha', () => {
  const value = shadowToCss({
    x: '0',
    y: '2px',
    blur: '8px',
    spread: '0',
    color: '#000000',
    opacity: 0.4
  })
  assert.equal(value, '0 2px 8px 0 rgba(0, 0, 0, 0.4)')
})

check('shadowToCss is none when every offset is zero', () => {
  const value = shadowToCss({ x: '0', y: '0', blur: '0', spread: '0', color: '#000000', opacity: 0.5 })
  assert.equal(value, 'none')
})

check('shadowToCss keeps a non-hex tint as authored', () => {
  const value = shadowToCss({
    x: '0',
    y: '1px',
    blur: '2px',
    spread: '0',
    color: 'color-mix(in srgb, red 50%, transparent)',
    opacity: 0.8
  })
  assert.ok(value.includes('color-mix(in srgb, red 50%, transparent)'))
})

check('applyOpacity re-alphas hex only', () => {
  assert.equal(applyOpacity('#000000', 0.4), 'rgba(0, 0, 0, 0.4)')
  assert.equal(applyOpacity('#000000', 1), '#000000')
  assert.equal(applyOpacity('rebeccapurple', 0.4), 'rebeccapurple')
})

check('hexToRgb handles 3 and 6 digit forms', () => {
  assert.deepEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 })
  assert.deepEqual(hexToRgb('#0d1117'), { r: 13, g: 17, b: 23 })
  assert.equal(hexToRgb('nope'), null)
})

check('hexToRgba returns the input when it is not hex', () => {
  assert.equal(hexToRgba('var(--x)', 0.5), 'var(--x)')
})

// --------------------------------------------------------------------------- //
// Tokens
// --------------------------------------------------------------------------- //

check('buildThemeTokens covers every declared token name', () => {
  const tokens = buildThemeTokens(FALLBACK)
  assert.deepEqual(Object.keys(tokens).sort(), [...THEME_TOKEN_NAMES].sort())
})

check('buildThemeTokens emits exactly 23 tokens', () => {
  assert.equal(THEME_TOKEN_NAMES.length, 23)
})

check('buildThemeTokens maps the header block, not palette', () => {
  const tokens = buildThemeTokens({
    ...cloneTheme(FALLBACK),
    header: { ...cloneTheme(FALLBACK.header), titleColor: '#123456', height: '40px', align: 'right' }
  })
  assert.equal(tokens['--sm-header-color'], '#123456')
  assert.equal(tokens['--sm-header-height'], '40px')
  assert.equal(tokens['--sm-header-align'], 'right')
})

check('buildThemeTokens renders the header background as one value', () => {
  const tokens = buildThemeTokens({
    ...cloneTheme(FALLBACK),
    header: {
      ...cloneTheme(FALLBACK.header),
      background: {
        type: 'linear',
        angle: 180,
        stops: [
          { color: '#111111', offset: 0 },
          { color: '#222222', offset: 100 }
        ]
      }
    }
  })
  assert.equal(tokens['--sm-header-bg'], 'linear-gradient(180deg, #111111 0%, #222222 100%)')
})

check('buildThemeTokens stringifies weights', () => {
  const tokens = buildThemeTokens(FALLBACK)
  assert.equal(tokens['--sm-header-font-weight'], '600')
  assert.equal(tokens['--sm-font-weight'], '400')
})

check('buildThemeTokens is stable for a broken document', () => {
  const tokens = buildThemeTokens({ palette: { appText: 'junk' } })
  assert.equal(Object.keys(tokens).length, THEME_TOKEN_NAMES.length)
  assert.equal(tokens['--sm-app-text'], FALLBACK.palette.appText)
})

check('buildThemeStyle is a bindable style string', () => {
  const style = buildThemeStyle(FALLBACK)
  assert.ok(style.startsWith('--sm-app-bg:'))
  assert.ok(style.includes('--sm-widget-radius:4px'))
})

// --------------------------------------------------------------------------- //
// Application
// --------------------------------------------------------------------------- //

check('applyThemeTokens writes every token onto an element', () => {
  const written = {}
  const element = {
    style: {
      setProperty(name, value) {
        written[name] = value
      }
    }
  }
  const revision = applyThemeTokens(FALLBACK, element)
  assert.equal(Object.keys(written).length, THEME_TOKEN_NAMES.length)
  assert.equal(typeof revision, 'number')
})

check('applyThemeTokens bumps the revision every time', () => {
  const element = { style: { setProperty() {} } }
  const before = getAppliedRevision()
  const first = applyThemeTokens(FALLBACK, element)
  const second = applyThemeTokens(FALLBACK, element)
  assert.equal(first, before + 1)
  assert.equal(second, before + 2)
})

// --------------------------------------------------------------------------- //
// Nested access for the editor
// --------------------------------------------------------------------------- //

check('getThemePath reads a nested leaf', () => {
  assert.equal(getThemePath(FALLBACK, 'header.titleFont.weight'), 600)
  assert.equal(getThemePath(FALLBACK, 'nope.nope'), undefined)
})

check('setThemePath does not mutate the source', () => {
  const source = cloneTheme(FALLBACK)
  const next = setThemePath(source, 'header.titleColor', '#ffffff')
  assert.equal(source.header.titleColor, FALLBACK.header.titleColor)
  assert.equal(next.header.titleColor, '#ffffff')
})

check('setThemePath creates missing intermediate objects', () => {
  const next = setThemePath({}, 'header.titleFont.weight', 700)
  assert.deepEqual(next, { header: { titleFont: { weight: 700 } } })
})

check('setThemePath can write a whole gradient', () => {
  const gradient = {
    type: 'radial',
    stops: [
      { color: '#000000', offset: 0 },
      { color: '#ffffff', offset: 100 }
    ]
  }
  const next = setThemePath(cloneTheme(FALLBACK), 'header.background', gradient)
  assert.deepEqual(next.header.background, gradient)
})

// --------------------------------------------------------------------------- //
// UI theme
// --------------------------------------------------------------------------- //

check('resolveUiTheme passes explicit choices through', () => {
  assert.equal(resolveUiTheme('light'), 'light')
  assert.equal(resolveUiTheme('dark'), 'dark')
})

check('resolveUiTheme defaults an unknown choice to light', () => {
  assert.equal(resolveUiTheme('neon'), 'light')
  assert.equal(resolveUiTheme(undefined), 'light')
})

check('isGradient distinguishes a paint from a color', () => {
  assert.equal(isGradient('#fff'), false)
  assert.equal(isGradient({ type: 'linear', stops: [] }), true)
  assert.equal(isGradient({ type: 'wobbly', stops: [] }), false)
})

check('color and length guards reject injection', () => {
  assert.equal(isCssColor('#fff'), true)
  assert.equal(isCssColor('red; }'), false)
  assert.equal(isCssLength('8px'), true)
  assert.equal(isCssLength('8'), false)
  assert.equal(isCssLength('0'), true)
})

check('gradient stop bounds are 2..5', () => {
  assert.equal(MIN_GRADIENT_STOPS, 2)
  assert.equal(MAX_GRADIENT_STOPS, 5)
})

check('named color list matches the backend validator', () => {
  // The editor must not be able to save a color the backend then rejects, so
  // the two lists are compared here rather than trusted to stay in sync.
  const backendShemas = resolve(here, '../../../backend/app/shemas.py')
  const source = readFileSync(backendShemas, 'utf8')
  const marker = source.indexOf('_NAMED_COLORS = frozenset(')
  assert.notEqual(marker, -1, 'backend no longer declares _NAMED_COLORS')
  const firstQuote = source.indexOf('"""', marker)
  const secondQuote = source.indexOf('"""', firstQuote + 3)
  const backendNames = new Set(
    source
      .slice(firstQuote + 3, secondQuote)
      .split(/\s+/)
      .filter(Boolean)
  )

  assert.ok(backendNames.size > 100, `parsed only ${backendNames.size} names from the backend`)
  assert.deepEqual(NAMED_COLOR_LIST, [...backendNames].sort())
})

check('color guard accepts every backend named color', () => {
  NAMED_COLOR_LIST.forEach((name) => {
    assert.equal(isCssColor(name), true, name)
  })
})

check('color guard rejects an unknown bare word', () => {
  assert.equal(isCssColor('junk'), false)
  assert.equal(isCssColor('not a color at all'), false)
})

check('color guard takes the values the backend validator takes', () => {
  // backend/app/shemas.py:_validate_css_color accepts these, so the editor
  // must not drop them on the way to the API.
  const accepted = [
    'color-mix(in oklch, var(--sm-widget-bg) 40%, #fff)',
    'rgb(calc(1 * 2), 0, 0)',
    'var(--sm-header-bg)'
  ]
  accepted.forEach((value) => {
    assert.equal(isCssColor(value), true, value)
    assert.equal(
      normalizeTheme(setThemePath(cloneTheme(FALLBACK), 'header.background', value)).header.background,
      value,
      value
    )
  })
  // ... and still rejects what it rejects.
  assert.equal(isCssColor('rgb()'), false)
  assert.equal(isCssColor('linear-gradient(red, blue)'), false)
  assert.equal(isCssColor('var(--x) } body { display: none'), false)
})

check('app.scss declares exactly the declared tokens', () => {
  const scss = readFileSync(resolve(here, '../css/app.scss'), 'utf8')
  const block = scss.slice(scss.indexOf(':root {'), scss.indexOf('}', scss.indexOf(':root {')))
  const declared = [...block.matchAll(/^\s*(--sm-[a-z-]+)\s*:/gm)].map((m) => m[1])
  assert.deepEqual(declared.sort(), [...THEME_TOKEN_NAMES].sort())
})

check('app.scss defaults match the fallback theme tokens', () => {
  const scss = readFileSync(resolve(here, '../css/app.scss'), 'utf8')
  const block = scss.slice(scss.indexOf(':root {'), scss.indexOf('}', scss.indexOf(':root {')))
  const declared = {}
  for (const match of block.matchAll(/(--sm-[a-z-]+)\s*:\s*([^;]+);/g)) {
    declared[match[1]] = match[2].trim()
  }
  const expected = buildThemeTokens(FALLBACK)
  Object.keys(expected).forEach((name) => {
    assert.equal(declared[name], expected[name], `${name}: scss=${declared[name]} js=${expected[name]}`)
  })
})

// --------------------------------------------------------------------------- //
// Editor field descriptors vs the backend schema
// --------------------------------------------------------------------------- //

/** Field declarations found in a Pydantic model body, keyed by name. */
function parsePydanticFields(source, className) {
  const start = source.indexOf(`class ${className}(`)
  assert.notEqual(start, -1, `backend no longer declares ${className}`)
  const body = source.slice(start)
  const end = body.indexOf('\nclass ')
  const fields = {}
  for (const line of (end === -1 ? body : body.slice(0, end)).split('\n')) {
    const match = line.match(/^    (\w+)\s*:\s*(.+)$/)
    if (match) fields[match[1]] = match[2].trim()
  }
  return fields
}

/** The numbers the backend fills a layout-less document in with. */
function parseBackendLayoutDefaults() {
  const start = backendSource.indexOf('class ThemeLayoutDefaults(')
  assert.notEqual(start, -1, 'backend no longer declares ThemeLayoutDefaults')
  // A blank line inside the docstring would cut the class in half, so the end
  // is the next top-level statement.
  const end = backendSource.indexOf('\nTHEME_LAYOUT_DEFAULTS', start)
  const body = backendSource.slice(start, end === -1 ? undefined : end)
  const number = (key) => Number(body.match(new RegExp(`${key}: int = (\\d+)`))?.[1])
  const flag = body.match(/containerGapOnBorders: bool = (\w+)/)?.[1]
  const padding = body.match(
    /ThemeLayoutPadding\(\s*top=(\d+),\s*right=(\d+),\s*bottom=(\d+),\s*left=(\d+)\s*\)/
  )
  assert.ok(padding, 'backend no longer builds default padding inline')
  const [top, right, bottom, left] = padding.slice(1).map(Number)
  return {
    rowHeight: number('rowHeight'),
    widgetGap: number('widgetGap'),
    containerRowHeight: number('containerRowHeight'),
    containerGapOnBorders: flag === 'True',
    padding: { top, right, bottom, left }
  }
}

const descriptorsPath = resolve(here, '../components/theme-editor/themeEditorFields.json')
const descriptors = JSON.parse(readFileSync(descriptorsPath, 'utf8'))
const backendSource = readFileSync(resolve(here, '../../../backend/app/shemas.py'), 'utf8')

const descriptorPaths = descriptors.sections.flatMap((section) => section.fields.map((f) => f.path))

check('every descriptor path exists in the backend schema', () => {
  // The editor is generated from these descriptors, so a path the backend does
  // not know about would be a field the user can set but can never save.
  const NESTED = {
    header: { titleFont: 'ThemeHeaderFont', padding: 'ThemeHeaderPadding' },
    shadow: { widget: 'ThemeShadowValue', text: 'ThemeShadowValue' },
    layout: { padding: 'ThemeLayoutPadding' }
  }
  const GROUPS = {
    palette: 'ThemePalette',
    header: 'ThemeHeader',
    border: 'ThemeBorder',
    shadow: 'ThemeShadow',
    font: 'ThemeFont',
    layout: 'ThemeLayout'
  }

  for (const path of descriptorPaths) {
    const parts = path.split('.')
    let model = GROUPS[parts[0]]
    assert.ok(model, `${path}: unknown top-level group '${parts[0]}'`)

    for (const part of parts.slice(1)) {
      const fields = parsePydanticFields(backendSource, model)
      assert.ok(fields[part], `${path}: '${part}' is not a field of ${model}`)

      // Descend only when the backend declares a nested model for this field.
      const nestedName = NESTED[parts[0]]?.[part]
      if (nestedName) {
        model = nestedName
        continue
      }
      const nestedType = fields[part].match(/^(\w+)$/)?.[1]
      const asModel = Object.values(GROUPS).concat(Object.values(NESTED).flat()).includes(nestedType)
      assert.ok(!asModel, `${path}: '${part}' is a model (${nestedType}) but has no nested descriptor support`)
    }
  }
})

check('descriptor enumerations match the backend literals', () => {
  const headerFields = parsePydanticFields(backendSource, 'ThemeHeader')
  const borderFields = parsePydanticFields(backendSource, 'ThemeBorder')
  assert.match(headerFields.align, /Literal\["left", "center", "right"\]/)
  assert.match(borderFields.style, /Literal\["solid", "dashed", "dotted", "double", "none"\]/)
  assert.deepEqual([...HEADER_ALIGNMENTS], ['left', 'center', 'right'])
  assert.deepEqual([...BORDER_STYLES], ['solid', 'dashed', 'dotted', 'double', 'none'])
})

check('descriptor types are known to the editor', () => {
  const known = new Set([
    'color', 'paint', 'shadow', 'align', 'borderStyle', 'weight', 'height',
    'length', 'lengthOrKeyword', 'fontFamily', 'px', 'toggle'
  ])
  for (const section of descriptors.sections) {
    assert.ok(section.id, 'section without id')
    assert.ok(section.title, `${section.id}: section without title`)
    for (const field of section.fields) {
      assert.ok(known.has(field.type), `${field.path}: unknown control type '${field.type}'`)
      assert.ok(field.label, `${field.path}: field without label`)
    }
  }
})

check('descriptor paths are unique and dotted', () => {
  assert.equal(new Set(descriptorPaths).size, descriptorPaths.length)
  for (const path of descriptorPaths) {
    assert.match(path, /^[a-zA-Z]+(\.[a-zA-Z]+)+$/, path)
  }
})

check('every editable payload field has a descriptor', () => {
  // A field the backend requires but the editor cannot reach would be frozen at
  // whatever normalizeTheme() happens to default it to.
  const countOf = (prefix, model) => descriptorPaths.filter((p) => p.startsWith(prefix)).length
  const sizeOf = (name) => Object.keys(parsePydanticFields(backendSource, name)).length

  assert.equal(countOf('palette.', 'ThemePalette'), sizeOf('ThemePalette'))
  assert.equal(countOf('border.', 'ThemeBorder'), sizeOf('ThemeBorder'))
  assert.equal(countOf('font.', 'ThemeFont'), sizeOf('ThemeFont'))

  // header: the two nested objects are addressed leaf by leaf, so they are
  // replaced by their own children rather than counted as fields themselves.
  const headerFlat = sizeOf('ThemeHeader') - 2
  assert.equal(
    countOf('header.', 'ThemeHeader'),
    headerFlat + sizeOf('ThemeHeaderFont') + sizeOf('ThemeHeaderPadding')
  )

  // shadow: two fully expanded shadows, no leaf descriptors.
  assert.equal(countOf('shadow.', 'ThemeShadow'), sizeOf('ThemeShadow'))
  assert.equal(sizeOf('ThemeShadowValue'), 6)

  // layout: padding is addressed leaf by leaf, so the nested object is replaced
  // by its four children.
  assert.equal(countOf('layout.', 'ThemeLayout'), sizeOf('ThemeLayout') - 1 + sizeOf('ThemeLayoutPadding'))
})

check('layout defaults match the backend', () => {
  // A document written before the theme owned the grid is filled in on both
  // sides, so the numbers cannot drift apart unnoticed.
  const layout = parseBackendLayoutDefaults()
  assert.equal(layout.rowHeight, FALLBACK_LAYOUT.rowHeight)
  assert.equal(layout.widgetGap, FALLBACK_LAYOUT.widgetGap)
  assert.equal(layout.containerRowHeight, FALLBACK_LAYOUT.containerRowHeight)
  assert.equal(layout.containerGapOnBorders, FALLBACK_LAYOUT.containerGapOnBorders)
  for (const side of ['top', 'right', 'bottom', 'left']) {
    assert.equal(layout.padding[side], FALLBACK_LAYOUT.padding[side], `padding.${side}`)
  }
})

check('layout ranges match the backend bounds', () => {
  const layoutClass = parsePydanticFields(backendSource, 'ThemeLayout')
  const paddingClass = parsePydanticFields(backendSource, 'ThemeLayoutPadding')

  // Plain substring checks: a declaration reads "int = Field(ge=10, le=300)".
  const hasBound = (declared, bound) => declared.includes(bound)
  for (const [key, range] of Object.entries(LAYOUT_RANGES)) {
    const declared = layoutClass[key]
    assert.equal(hasBound(declared, `ge=${range.min}`), true, `${key}: backend min is ${range.min}`)
    assert.equal(hasBound(declared, `le=${range.max}`), true, `${key}: backend max is ${range.max}`)
  }
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const declared = paddingClass[side]
    assert.equal(
      hasBound(declared, `ge=${PADDING_RANGE.min}`),
      true,
      `padding.${side}: backend min is ${PADDING_RANGE.min}`
    )
    assert.equal(
      hasBound(declared, `le=${PADDING_RANGE.max}`),
      true,
      `padding.${side}: backend max is ${PADDING_RANGE.max}`
    )
  }
  // The one field without a range is the boolean.
  assert.match(layoutClass.containerGapOnBorders, /^bool/)
})

check('every preset carries a complete layout', () => {
  const presets = JSON.parse(
    readFileSync(resolve(here, '../../../backend/app/themes/presets.json'), 'utf8')
  )
  const problems = validateTheme(presets.presets[0].payload)
  assert.deepEqual(problems, [], problems.map((p) => `${p.path} ${p.message}`).join('; '))

  for (const preset of presets.presets) {
    const layout = preset.payload.layout
    assert.ok(layout, `${preset.id}: no layout group`)
    for (const key of Object.keys(LAYOUT_RANGES)) {
      assert.ok(Number.isInteger(layout[key]), `${preset.id}: layout.${key}`)
    }
    assert.equal(typeof layout.containerGapOnBorders, 'boolean', `${preset.id}: containerGapOnBorders`)
    for (const side of ['top', 'right', 'bottom', 'left']) {
      assert.ok(Number.isInteger(layout.padding?.[side]), `${preset.id}: layout.padding.${side}`)
    }
  }
})

check('a document without layout is filled in, not rejected', () => {
  const bare = cloneTheme(FALLBACK_THEME)
  delete bare.layout
  // The whole document is normalized, not just the missing group, so what the
  // store holds after loading an old row is still a valid theme.
  const filled = normalizeTheme(bare)
  assert.deepEqual(getThemeLayout(filled), FALLBACK_LAYOUT)
  assert.deepEqual(validateTheme(filled), [])
})

check('layout values are clamped to the backend range', () => {
  const doc = cloneTheme(FALLBACK_THEME)
  assert.equal(getThemeLayout({ ...doc, layout: { ...doc.layout, rowHeight: 5 } }).rowHeight, 10)
  assert.equal(getThemeLayout({ ...doc, layout: { ...doc.layout, rowHeight: 9999 } }).rowHeight, 300)
  assert.equal(getThemeLayout({ ...doc, layout: { ...doc.layout, widgetGap: -4 } }).widgetGap, 0)
  const padded = getThemeLayout({
    ...doc,
    layout: { ...doc.layout, padding: { top: 900, right: -1, bottom: 12.6, left: 'x' } }
  })
  assert.equal(padded.padding.top, 200)
  assert.equal(padded.padding.right, 0)
  assert.equal(padded.padding.bottom, 13)
  assert.equal(padded.padding.left, FALLBACK_LAYOUT.padding.left)
})

check('out-of-range layout is reported by validateTheme', () => {
  const doc = cloneTheme(FALLBACK_THEME)
  const problems = validateTheme({
    ...doc,
    layout: { ...doc.layout, rowHeight: 9, padding: { ...doc.layout.padding, top: 201 } }
  })
  const paths = problems.map((error) => error.path)
  assert.equal(paths.length, 2, paths.join(', '))
  assert.ok(paths.includes('layout.rowHeight'), paths.join(', '))
  assert.ok(paths.includes('layout.padding.top'), paths.join(', '))
})

check('a non-boolean containerGapOnBorders is rejected', () => {
  const doc = cloneTheme(FALLBACK_THEME)
  const problems = validateTheme({
    ...doc,
    layout: { ...doc.layout, containerGapOnBorders: 'yes' }
  })
  assert.equal(problems.length, 1, JSON.stringify(problems))
})

check('the grid-options keys the dashboard still owns are not theme fields', () => {
  // colNum and auto-layout belong to the dashboard, not to the theme: a theme
  // that carried them would change how a grid is built, not how it looks.
  const groupNames = new Set(Object.keys(FALLBACK_THEME))
  assert.equal(groupNames.has('colNum'), false)
  assert.equal(groupNames.has('verticalCompact'), false)
  assert.equal(groupNames.has('layout'), true)
})

check('source file declares no vue import', () => {
  const source = readFileSync(resolve(here, 'themes.js'), 'utf8')
  assert.equal(/from ['"]vue['"]/.test(source), false)
})

console.log(`themes.js: ${checks} checks passed`)
