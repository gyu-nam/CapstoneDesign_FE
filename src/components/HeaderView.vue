<template>
  <header class="header-container">
    <div class="header-left">
      <!-- 🚨 1. 로고 클릭 시 MainPage.vue로 이동 -->
      <img 
        src="@/assets/logo.png" 
        alt="로고" 
        class="logo" 
        @click="goToMain" 
        style="cursor: pointer;"
      />
    </div>

    <div class="header-center"> 
    </div>

    <div class="header-right">
      <button class="icon-button account-button">
        <!-- 🚨 2. SVG 클릭 시 로그인 상태 확인 후 AdminPage로 이동 -->
        <svg 
          @click="handleAdminClick" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          class="icon user-icon"
          style="cursor: pointer;"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </button>
      
      <!-- 🚨 3 & 4. 로그인 상태에 따라 버튼 텍스트와 기능 변경 -->
      <button 
        class="login-button" 
        :class="{ logout: isLoggedIn }"
        @click="handleAuthClick"
      >
        로그아웃
      </button>
    </div>
  </header>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';


const router = useRouter(); 
const { isLoggedIn, initialized, refreshSession, logout } = useAuth();

// ----------------------------------------------------
// 1, 2, 3, 4. 라우팅 및 인증 핸들러 함수
// ----------------------------------------------------

// 1. 로고 클릭 시 MainPage.vue로 이동
const goToMain = () => {
    router.push({ name: 'MainView' });
};

// 2. SVG 클릭 핸들러 (AdminPage 이동, 로그인 상태 검사)
const handleAdminClick = async () => {
  if (!initialized.value) await refreshSession();

  if (isLoggedIn.value) {
    router.push({ name: 'AdminPage' });
  } 
  else {
    alert('로그인시 사용가능합니다.');
    router.push({
      name: 'LoginView',
      query: { redirect: '/AdminPage' }
    });
  }
};


// 3 & 4. 로그인/로그아웃 버튼 클릭 핸들러
const handleAuthClick = async () => {
  if (!initialized.value) await refreshSession();
  if (isLoggedIn.value) {
    await logout();
    router.push({ name: 'MainView' });
  } else {
    router.push({ name: 'LoginView' });
  }
};

// 최초 마운트 시 세션 상태 동기화(빠르게)
onMounted(() => {
  if (!initialized.value) refreshSession();
});
</script>

<style scoped>
/* 🚨 cursor: pointer 추가 (UI 피드백) */
.header-left .logo,
.icon-button .icon {
    cursor: pointer; 
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  box-sizing: border-box;

  height: 72px;
  padding: 0 40px;

  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
}

/* 각 섹션의 스타일 */
.header-left,
.header-right {
  display: flex;
  align-items: center;
}

.header-center {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
}

.header-left {
  gap: 10px;
  cursor: pointer;
}

/* 왼쪽 섹션 - 로고 */
.header-left .logo {
  height: 52px;
  width: auto;
}

.brand-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: #222;
  letter-spacing: 0.03em;
}

/* 오른쪽 섹션 - 버튼들 */
.header-right {
  flex: 0 0 auto;
  gap: 16px;
  justify-content: flex-end;
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
}

.icon-button .icon {
  width: 24px;
  height: 24px;
  color: #555;
}

.login-button {
  background-color: #007bff;
  color: white;
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: 0.2s;
}

.login-button.logout {
  background-color: #007bff;
}

.login-button.logout:hover {
  background-color: #0056b3;
}
</style>