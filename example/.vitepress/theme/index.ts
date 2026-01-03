import DefaultTheme from 'vitepress/theme'
import './style.css'
import { EnhanceAppContext } from 'vitepress'
import { setupCanaryTheme } from '../../../src/canary.client'
import TwoslashFloatingVue
 from '@shikijs/vitepress-twoslash/client'
import Theme
 from 'vitepress/theme'

import '@shikijs/vitepress-twoslash/style.css'
import '../../../src/canary.css'

export default {
    extends: DefaultTheme,
    enhanceApp(ctx: EnhanceAppContext) {
        setupCanaryTheme(ctx)
        ctx.app.use(TwoslashFloatingVue) 
    }
}