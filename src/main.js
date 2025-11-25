import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import axios from "axios"
import { useAuth } from '@/composables/useAuth'

axios.defaults.withCredentials = true;

const app = createApp(App).use(store).use(router);

const { refreshSession } = useAuth();
refreshSession().finally(() => {
  app.mount('#app');
});
