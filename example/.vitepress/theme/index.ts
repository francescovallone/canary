import DefaultTheme from 'vitepress/theme'
import './style.css'
import { EnhanceAppContext } from 'vitepress'
import { setupCanaryTheme } from '../../../src/canary.client'

import '../../../src/canary.css'

export default {
    extends: DefaultTheme,
    enhanceApp(ctx: EnhanceAppContext) {
        setupCanaryTheme(ctx)
    }
}