import DefaultTheme from 'vitepress/theme'
import './style.css'
import { EnhanceAppContext } from 'vitepress'
import { setupCanaryTheme } from '@avesbox/canary'
import TwoslashFloatingVue
 from '@shikijs/vitepress-twoslash/client'

import '@shikijs/vitepress-twoslash/style.css'
import '@avesbox/canary/style.css'

export default {
    extends: DefaultTheme,
    enhanceApp(ctx: EnhanceAppContext) {
        setupCanaryTheme()
        ctx.app.use(TwoslashFloatingVue) 
    }
}