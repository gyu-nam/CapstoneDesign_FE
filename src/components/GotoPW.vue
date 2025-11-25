<template>
  <div class="reset-password-container">
    <div class="form-wrapper">
      <div class="logo-section">
        <img 
          src="@/assets/logo.png" 
          alt="로고" 
          class="logo" 
          @click="goToMain"
          style="cursor: pointer;"
        />
      </div>

      <form @submit.prevent="completeReset">
        <h1 class="form-title">비밀번호 재설정</h1>

        <div class="input-group">
          <label for="new-password" class="input-label" :class="{ 'error-text': errors.password }">
            새 비밀번호
          </label>
          <input
            type="password"
            id="new-password"
            v-model="formData.password"
            placeholder="새 비밀번호를 입력하세요"
            class="input-field"
            :class="{ 'error-border': errors.password }"
            @input="validatePassword"
            required
          />
        </div>
        <span v-if="errors.password" class="error-msg">{{ errors.password }}</span>

        <div class="input-group">
          <label for="confirm-password" class="input-label" :class="{ 'error-text': errors.passwordConfirm }">
            새 비밀번호 재입력
          </label>
          <input
            type="password"
            id="confirm-password"
            v-model="formData.passwordConfirm"
            placeholder="새 비밀번호를 다시 입력하세요"
            class="input-field"
            :class="{ 'error-border': errors.passwordConfirm }"
            @input="validatePasswordConfirm"
            required
          />
        </div>
        <span v-if="errors.passwordConfirm" class="error-msg">{{ errors.passwordConfirm }}</span>

        <div class="password-rules-section">
          <p class="rule-text" :class="{ 'error-text': errors.password }">
            1. 8~16자의 영문 대소문자, 숫자, 특수문자를 포함해야 합니다.<br />
            2. 같은 문자가 3회 이상 연속될 수 없습니다.<br />
            3. 이메일(ID)과 동일할 수 없습니다.
          </p>
          <p class="warning-text" v-if="successMessage">{{ successMessage }}</p>
          <p class="warning-text" v-if="errorMessage">{{ errorMessage }}</p>
        </div>

        <button
          type="submit"
          :disabled="!isFormValid"
          class="submit-button"
        >
          완료
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api } from '@/api/axios';

const router = useRouter();
const route = useRoute();

// 폼 상태
const formData = ref({
  password: '',
  passwordConfirm: '', 
});

// 에러 상태
const errors = ref({
  password: '',
  passwordConfirm: ''
});

const successMessage = ref('');
const errorMessage = ref('');

// 필수 쿼리 파라미터 확인 (onMounted 시 이메일과 코드가 없으면 첫 단계로 되돌림)
onMounted(() => {
  // NOTE: ForgetPW.vue에서 쿼리로 email과 code를 전달한다고 가정함
  const email = route.query.email;
  const code = route.query.code;
  if (!email || !code) {
    alert('비밀번호 재설정을 위해 이메일 인증이 필요합니다.');
    router.replace({ name: 'ForgetPW' });
  }
});

// ----------------------------------------------------
// 1. 로고 클릭 시 메인으로 이동
// ----------------------------------------------------
const goToMain = () => {
  router.push({ name: 'MainView' });
};

// ----------------------------------------------------
// 2. 비밀번호 유효성 검사
// ----------------------------------------------------
const validatePassword = () => {
  const pass = formData.value.password;
  // 이메일에서 사용자명 부분만 추출 (ID 유사성 검사용)
  const userEmailPart = route.query.email ? String(route.query.email).split('@')[0] : ''; 

  const hasLetter = /[A-Za-z]/.test(pass);
  const hasDigit = /\d/.test(pass);
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(pass);
  const isSequential = /(.)\1{2,}/.test(pass);

  errors.value.password = '';

  if (pass.length < 8 || pass.length > 16) {
    errors.value.password = '비밀번호는 8자리 이상 16자리 이하로 입력하세요.';
  } else if (!hasLetter || !hasDigit || !hasSpecial) {
    errors.value.password = '영문, 숫자, 특수문자를 모두 포함해야 합니다.';
  } else if (isSequential) {
    errors.value.password = '같은 문자가 3회 이상 연속될 수 없습니다.';
  } else if (userEmailPart && pass.includes(userEmailPart) && userEmailPart.length > 3) {
    errors.value.password = '비밀번호는 이메일과 동일할 수 없습니다.';
  }

  // passwordConfirm이 입력된 경우에만 검사
  if (formData.value.passwordConfirm) {
    validatePasswordConfirm();
  }
};

// 비밀번호 확인 검사
const validatePasswordConfirm = () => {
  if (formData.value.password !== formData.value.passwordConfirm) {
    errors.value.passwordConfirm = '비밀번호가 일치하지 않습니다.';
  } else {
    errors.value.passwordConfirm = '';
  }
};

// 유효성 확인
const isPasswordValid = computed(() => errors.value.password === '' && formData.value.password.length > 0);
const isFormValid = computed(() => (
  !!route.query.email &&
  !!route.query.code &&
  formData.value.password &&
  formData.value.passwordConfirm &&
  isPasswordValid.value &&
  errors.value.passwordConfirm === ''
));

// ----------------------------------------------------
// 3. 완료 버튼 클릭 시 비밀번호 재설정 요청 (API: api/password/reset)
// ----------------------------------------------------
const completeReset = async () => {
  if (!isFormValid.value) {
    errorMessage.value = '입력된 비밀번호와 규칙을 다시 확인해주세요.';
    return;
  }

  successMessage.value = '';
  errorMessage.value = '';

  try {
    // 💡 명세서 필드명에 맞춰 users.email, users.password, mail_verification.code 전송
    const body = new URLSearchParams({
      'users.email': String(route.query.email), // 명세서 필드명
      'users.password': formData.value.password, // 명세서 필드명
      'mail_verification.code': String(route.query.code), // 명세서 필드명
    });

    const { status, data } = await api.post('/api/password/reset', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // 명세서 응답 데이터: {message: "Password reset successful"}
    if (status === 200) {
      successMessage.value = '비밀번호 재설정을 완료했습니다.';
      setTimeout(() => router.push({ name: 'LoginView' }), 1000);
    } else {
      errorMessage.value = data?.message || '비밀번호 재설정에 실패했습니다.';
    }
  } catch (e) {
    console.error('API 호출 중 오류:', e);
    errorMessage.value = e?.response?.data?.message || '서버가 불안정합니다. 다시 시도해주세요.';
  }
};
</script>

<style scoped>
.error-msg {
  display: block;
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
  padding-left: 0.75rem;
}

.reset-password-container {
  min-height: 100vh;
  background-color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  font-family: Arial, sans-serif;
}

.form-wrapper {
  width: 100%;
  max-width: 42rem;
  background-color: #ffffff;
  border: 2px solid #f2f2f2;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.logo-section {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 1.5rem;
  height: 40px;
}

.logo-section .logo {
  cursor: pointer;
  height: 100%;
  width: auto;
}

.form-title {
  font-size: 1.5rem;
  font-weight: bold;
  text-align: center;
  color: #1f2937;
  margin-bottom: 2rem;
}

.input-group {
  margin-bottom: 1rem;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
  transition: color 0.2s ease-in-out;
}

.input-field {
  display: block;
  width: 95%;
  padding: 0.75rem;
  border-radius: 0.375rem;
  border: 2px solid #f2f2f2;
  font-size: 0.875rem;
  color: #1f2937;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.input-field:focus {
  outline: none;
  border-color: #4ca7cc;
  box-shadow: 0 0 0 3px rgba(76, 167, 204, 0.25);
}

.password-rules-section {
  margin-bottom: 1.5rem;
}

.rule-text {
  font-size: 0.75rem;
  color: #a0a0a0;
  line-height: 1.5;
  transition: color 0.2s ease-in-out;
}

.warning-text {
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.5rem;
  font-weight: 500;
}

.error-text {
  color: #ef4444 !important;
}

.error-border {
  border-color: #ef4444 !important;
}

.submit-button {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  color: #ffffff;
  background-color: #4ca7cc;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
}

.submit-button:hover:not(:disabled) {
  background-color: #3d83a1;
}

.submit-button:disabled {
  background-color: #d1d5db;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .form-wrapper {
    padding: 1rem;
  }
}
</style>