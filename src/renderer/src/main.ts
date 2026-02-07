import './assets/main.css'

import { createApp } from 'vue'
import App from './app.vue'
import { configureApp } from './core'

const app = createApp(App)

configureApp(app)
app.mount('#app')
