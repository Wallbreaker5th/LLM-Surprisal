import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import ElementPlus from 'element-plus'
import Clarity from '@microsoft/clarity'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './style.css'

import en from './locales/en.json'
import zh from './locales/zh.json'

const i18n = createI18n({
  legacy: false, // you must set `false`, to use Composition API
  locale: 'en', // set locale
  fallbackLocale: 'en', // set fallback locale
  messages: {
    en,
    zh,
  },
})

Clarity.init("s7ymb0ns6z")

const app = createApp(App)

app.use(i18n)
app.use(ElementPlus)
app.mount('#app')
