import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/tokens.css'
import './styles/app.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')
