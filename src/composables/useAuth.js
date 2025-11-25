import { ref } from 'vue';
import { api } from '@/api/axios';

const user = ref(null);
const isLoggedIn = ref(false);
const initialized = ref(false);

async function refreshSession() {
  try {
    const { data } = await api.get('/me');
    isLoggedIn.value = data?.loggedIn === true;
    user.value = data?.userId ? { id: data.userId } : null;
  } catch (_) {
    isLoggedIn.value = false;
    user.value = null;
  } finally {
    initialized.value = true;
  }
}

async function logout() {
  try { await api.post('/logout'); }
  finally {
    isLoggedIn.value = false;
    user.value = null;
  }
}

export function useAuth() {
  return { initialized, isLoggedIn, user, refreshSession, logout };
}