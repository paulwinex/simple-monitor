import type { BootFile } from '#q-app/wrappers'
import { registerAllWidgets } from '../components/widgets/index'

export default (({ app }) => {
  // Register all widget types on app startup
  registerAllWidgets()
}) satisfies BootFile
