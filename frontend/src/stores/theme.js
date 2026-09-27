import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { Notify } from 'quasar'
import {
  FALLBACK_THEME,
  applyThemeTokens,
  cloneTheme,
  getAppliedRevision,
  getThemeLayout,
  normalizeTheme
} from 'src/utils/themes'
import {
  createTheme as createThemeApi,
  deleteTheme as deleteThemeApi,
  exportTheme as exportThemeApi,
  getTheme as getThemeApi,
  getThemes as getThemesApi,
  updateTheme as updateThemeApi
} from 'src/services/api'

/**
 * The theme catalog, backed by the API.
 *
 * The applied theme is kept separate from the catalog on purpose: the editor
 * previews uncommitted changes through `preview()`, and Save is what makes them
 * real. Nothing here writes to localStorage - the dashboard remembers its theme
 * in Dashboard.options.theme, and the UI chrome has its own store.
 */
export const useThemeStore = defineStore('theme', () => {
  /** [{ id, name, is_builtin }] */
  const themes = ref([])
  /** id -> full normalized document */
  const documents = ref({})
  const currentThemeId = ref(FALLBACK_THEME.id)
  /** An uncommitted document from the editor, if a preview is running. */
  const previewDocument = ref(null)
  const appliedRevision = ref(getAppliedRevision())
  const isLoading = ref(false)
  const loadError = ref(null)

  /** The document currently on screen. Always a complete, valid theme. */
  const currentTheme = computed(
    () => documents.value[currentThemeId.value] || normalizeTheme(FALLBACK_THEME)
  )

  /**
   * The document the UI is actually showing: the editor's draft while a preview
   * runs, the committed one otherwise. Colours reach CSS through the tokens,
   * but layout is read by components, so it has to come from here. While a
   * preview runs a leaf may hold a value the user is still typing, so read
   * layout through `layout` (or normalizeTheme) rather than straight off it.
   */
  const activeDocument = computed(
    () => previewDocument.value || documents.value[currentThemeId.value] || normalizeTheme(FALLBACK_THEME)
  )

  /** Grid geometry in effect right now, preview included. */
  const layout = computed(() => getThemeLayout(activeDocument.value))

  const themeOptions = computed(() =>
    themes.value.map((theme) => ({ label: theme.name, value: theme.id }))
  )

  /** Whether the catalog has been fetched at least once. */
  const hasThemes = computed(() => themes.value.length > 0)

  function documentFor(themeId) {
    return documents.value[themeId] || null
  }

  function has(themeId) {
    return Object.prototype.hasOwnProperty.call(documents.value, themeId)
  }

  /**
   * Load the catalog. A failure is not fatal: the fallback theme keeps the
   * dashboard styled, and the user can still edit and export.
   */
  async function loadThemes() {
    isLoading.value = true
    loadError.value = null
    try {
      const summaries = await getThemesApi()
      themes.value = summaries

      const loaded = await Promise.all(
        summaries.map(async (summary) => {
          try {
            const document = await getThemeApi(summary.id)
            return [summary.id, normalizeTheme(document.payload)]
          } catch {
            // One unreachable theme must not blank the whole catalog.
            return [summary.id, normalizeTheme(FALLBACK_THEME)]
          }
        })
      )
      documents.value = Object.fromEntries(loaded)
    } catch (error) {
      loadError.value = error?.message || 'Не удалось загрузить темы'
      Notify.create({
        type: 'warning',
        message: 'Темы не загружены, используется тема по умолчанию',
        timeout: 4000
      })
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Apply a theme to the document. `document` may be partial: it is normalized
   * first, so a half-built editor draft still renders.
   */
  function apply(themeOrDocument, themeId) {
    const id = themeId || themeOrDocument?.id
    const document = normalizeTheme(themeOrDocument)
    previewDocument.value = null
    if (id) {
      documents.value = { ...documents.value, [id]: document }
      themes.value = themes.value.some((theme) => theme.id === id)
        ? themes.value
        : [...themes.value, { id, name: document.name, is_builtin: false }]
    }
    if (id) currentThemeId.value = id
    appliedRevision.value = applyThemeTokens(document)
    return document
  }

  /**
   * Live preview: apply a draft without touching the catalog. Used by the
   * editor on every change; Cancel re-applies the saved document. Lenient, so
   * a value the user is still typing survives the round trip; the tokens are
   * built from a strict pass, so only valid values reach the CSS.
   */
  function preview(themeOrDocument) {
    previewDocument.value = normalizeTheme(themeOrDocument, 'lenient')
    appliedRevision.value = applyThemeTokens(previewDocument.value)
  }

  /** Re-apply the committed document for the given (or current) theme. */
  function revert(themeId) {
    const id = themeId || currentThemeId.value
    return apply(documents.value[id] || FALLBACK_THEME, id)
  }

  /** Switch dashboards: apply the theme the dashboard asked for. */
  function setThemeId(themeId) {
    const id = has(themeId) ? themeId : FALLBACK_THEME.id
    currentThemeId.value = id
    appliedRevision.value = applyThemeTokens(documents.value[id] || FALLBACK_THEME)
  }

  /**
   * Add a theme to the catalog.
   *
   * `apply: false` writes the row and stops there: `currentThemeId` stays where
   * the dashboard left it and no tokens are written, so the editor's Save can
   * persist a theme the dashboard is not using without re-pointing the
   * dashboard or killing the live preview.
   */
  async function create(name, payload, { apply: shouldApply = true } = {}) {
    const created = await createThemeApi(name, payload)
    const document = normalizeTheme(created.payload)
    documents.value = { ...documents.value, [created.id]: document }
    themes.value = [...themes.value, { id: created.id, name: created.name, is_builtin: created.is_builtin }]
    if (shouldApply) {
      currentThemeId.value = created.id
      appliedRevision.value = applyThemeTokens(document)
    }
    return created
  }

  /** Replace a theme in full. See `create` for what `apply: false` skips. */
  async function update(themeId, name, payload, { apply: shouldApply = true } = {}) {
    const saved = await updateThemeApi(themeId, name, payload)
    const document = normalizeTheme(saved.payload)
    documents.value = { ...documents.value, [themeId]: document }
    themes.value = themes.value.map((theme) =>
      theme.id === themeId ? { ...theme, name: saved.name } : theme
    )
    if (shouldApply) appliedRevision.value = applyThemeTokens(document)
    return saved
  }

  async function remove(themeId) {
    await deleteThemeApi(themeId)
    delete documents.value[themeId]
    themes.value = themes.value.filter((theme) => theme.id !== themeId)
    if (currentThemeId.value === themeId) setThemeId(FALLBACK_THEME.id)
  }

  async function exportOne(themeId) {
    return exportThemeApi(themeId || currentThemeId.value)
  }

  function duplicateOf(themeId) {
    const source = documents.value[themeId]
    return source ? cloneTheme(source) : cloneTheme(FALLBACK_THEME)
  }

  return {
    themes,
    documents,
    currentThemeId,
    currentTheme,
    activeDocument,
    previewDocument,
    layout,
    themeOptions,
    hasThemes,
    appliedRevision,
    isLoading,
    loadError,
    has,
    documentFor,
    loadThemes,
    apply,
    preview,
    revert,
    setThemeId,
    create,
    update,
    remove,
    exportOne,
    duplicateOf
  }
})
