import { getSavedTheme } from 'src/utils/themes'

export default async ({ app }) => {
  const $q = app.config.globalProperties.$q
  $q.dark.set(getSavedTheme().dark)
}