import fs from 'node:fs/promises'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index.ts',
  ],
  declaration: 'node16',
  rollup: {
    emitCJS: false,
  },
  externals: [
    'hast',
    '@avesbox/canary',
    '@avesbox/canary/style.css',
    'vitepress',
  ],
  hooks: {
    'rollup:done': async () => {
      console.log('Building style.css')
      const local = await fs.readFile(new URL('./src/style.css', import.meta.url), 'utf-8')
      await fs.writeFile(new URL('./style.css', import.meta.url), local)
    },
  },
})