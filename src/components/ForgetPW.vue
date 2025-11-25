<template>
  <div class="reset-password-container">
    <div class="form-wrapper">
      <div class="logo-section">
        <img 
          src="@/assets/logo.png" 
          alt="로고" 
          class="logo" 
          @click="goToMain"
        />
      </div>

      <form @submit.prevent="resetPassword">
        <h1 class="form-title">비밀번호 찾기</h1>

        <div class="input-group">
          <label for="email" class="input-label">이메일</label>
          <div class="input-with-button">
            <input
              type="email"
              id="email"
              v-model="formData.email"
              placeholder="example@pukyong.ac.kr"
              class="input-field"
              :disabled="isEmailVerified || isCodeSent"
              required
            />
            <button
              type="button"
              @click="sendVerificationCode"
              :disabled="!isPukyongEmailValid || !formData.email || isEmailVerified || isSending"
              class="verify-button"
            >
              {{ isSending ? '전송 중...' : (isCodeSent ? '재전송' : '인증하기') }}
            </button>
          </div>
          <div v-if="formData.email && !isPukyongEmailValid" class="message error-message">
            이메일은 '@pukyong.ac.kr' 도메인만 사용할 수 있습니다.
          </div>
          <div v-if="isCodeSent && !isEmailVerified" class="message success-message">
            인증번호가 전송되었습니다.
          </div>
        </div>

        <div class="input-group" v-if="isCodeSent && !isEmailVerified">
          <label for="verification-code" class="input-label">이메일 인증번호</label>
          <div class="input-with-button">
            <input
              type="text"
              id="verification-code"
              v-model="formData.verificationCode"
              placeholder="인증번호를 입력하세요"
              class="input-field"
              ref="codeInput"
              required
              :disabled="isVerifying"
            />
            <button
              type="button"
              @click="verifyCode"
              :disabled="!formData.verificationCode || isVerifying"
              class="verify-button"
            >
              {{ isVerifying ? '확인 중...' : '확인' }}
            </button>
          </div>
          <div 
            v-if="verificationMessage" 
            :class="['message', verificationSuccess ? 'success-message' : 'error-message']"
          >
            {{ verificationMessage }}
          </div>
        </div>
        
        <div v-if="isEmailVerified" class="message success-message verified-message">
          인증이 완료되었습니다. 이제 비밀번호 재설정을 진행하세요.
        </div>

        <button
          type="submit"
          :disabled="!isFormValid"
          class="submit-button"
        >
          비밀번호 재설정
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/axios';

const router = useRouter();

// 폼 상태
const formData = ref({
  email: '',
  verificationCode: '',
});

// 인증 관련 상태
const isCodeSent = ref(false);
const isEmailVerified = ref(false);
const verificationMessage = ref('');
const verificationSuccess = ref(false);
const isSending = ref(false);
const isVerifying = ref(false);
const codeInput = ref(null);

// 메인으로 이동
const goToMain = () => router.push({ name: 'MainView' });

// 이메일 도메인 검사
const isPukyongEmailValid = computed(() => {
  if (!formData.value.email) return true;
  return /@pukyong\.ac\.kr$/.test(formData.value.email);
});

// 폼 유효성 검사 (인증이 완료되어야 다음 단계로 넘어갈 수 있음)
const isFormValid = computed(() =>
  formData.value.email.trim() !== '' && isEmailVerified.value
);

// ---------------- 이메일 인증 코드 전송 ----------------
const sendVerificationCode = async () => {
  if (!isPukyongEmailValid.value) {
    alert("이메일은 '@pukyong.ac.kr' 도메인만 사용할 수 있습니다.");
    return;
  }
  
  // 인증 상태 초기화
  isEmailVerified.value = false;
  verificationMessage.value = '';
  verificationSuccess.value = false;

  try {
    isSending.value = true;
    
    // 명세서 반영: 요청 필드명을 'mail_verifications.email'로 수정
    const body = new URLSearchParams({ 'mail_verifications.email': formData.value.email.trim() });

    const { status } = await api.post('/api/email-verification/send', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (status >= 200 && status < 300) {
      isCodeSent.value = true;
      alert('인증번호가 전송되었습니다.');
      await nextTick();
      codeInput.value?.focus();
    } else {
      alert('인증번호 전송에 실패했습니다. 다시 시도해주세요.');
    }
  } catch (error) {
    console.error('이메일 전송 실패:', error);
    alert(error?.response?.data?.message || '서버 오류로 인증번호 전송에 실패했습니다.');
  } finally {
    isSending.value = false;
  }
};

// ---------------- 인증 코드 확인 및 본인 확인 요청 ----------------
const verifyCode = async () => {
  if (!formData.value.verificationCode) {
    alert('인증번호를 입력해주세요.');
    return;
  }

  try {
    isVerifying.value = true;
    
    // 1. 인증 코드 일치 여부 확인 (API: /api/email-verification/verify)
    // 명세서 반영: 요청 필드명을 'mail_verification.email'와 'mail_verification.code'로 수정
    const verifyBody = new URLSearchParams({
      'mail_verification.email': formData.value.email.trim(),
      'mail_verification.code': formData.value.verificationCode.trim(),
    });

    const verifyRes = await api.post('/api/email-verification/verify', verifyBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (verifyRes.status !== 200) {
        throw new Error("인증번호 확인에 실패했습니다.");
    }
    
    // 2. 인증 성공 후 비밀번호 재설정 요청 (API: /api/password/reset-request)
    // 명세서 반영: users.email 만 요청합니다.
    const resetRequestBody = new URLSearchParams({
        'users.email': formData.value.email.trim(),
    });

    const resetReqRes = await api.post('/api/password/reset-request', resetRequestBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (resetReqRes.status !== 200) {
        throw new Error("비밀번호 재설정 요청에 실패했습니다.");
    }

    isEmailVerified.value = true;
    verificationSuccess.value = true;
    verificationMessage.value = '✅ 인증이 완료되었습니다. 다음 단계로 진행하세요.';

  } catch (error) {
    console.error('인증 및 재설정 요청 실패:', error);
    verificationSuccess.value = false;
    verificationMessage.value = error?.response?.data?.message || '❌ 인증 실패: 인증번호 불일치 또는 서버 오류.';
  } finally {
    isVerifying.value = false;
  }
};

// ---------------- 비밀번호 재설정 페이지로 이동 ----------------
const resetPassword = () => {
  if (!isFormValid.value) {
    alert('이메일을 입력하고 이메일 인증을 완료해주세요.');
    return;
  }

  // 인증이 완료된 이메일 정보를 쿼리 파라미터로 다음 페이지에 전달
  // NOTE: 다음 페이지(GotoPW)는 이메일을 받아 재설정 폼을 띄워야 합니다.
  router.push({ name: 'GotoPW', query: { email: formData.value.email } });
};
</script>

<style scoped>
.message {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  padding-left: 0.75rem;
}
.error-message {
  color: #ef4444;
}
.success-message {
  color: #10b981;
}
.verified-message {
  padding: 1rem;
  border: 1px solid #10b981;
  border-radius: 0.5rem;
  text-align: center;
  font-weight: bold;
  margin-top: 1rem;
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
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.logo-section {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 1.5rem;
  height: 40px;
}

.logo {
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
}

.input-field {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.375rem;
  border: 2px solid #f2f2f2;
  font-size: 0.875rem;
  color: #1f2937;
  transition: border-color 0.15s ease-in-out;
}

.input-field:focus {
  outline: none;
  border-color: #4ca7cc;
  box-shadow: 0 0 0 3px rgba(76, 167, 204, 0.25);
}

.input-with-button {
  display: flex;
}

.input-with-button .input-field {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.verify-button {
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  background-color: #88d4ff;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.15s ease-in-out;
  white-space: nowrap;
}

.verify-button:hover:not(:disabled) {
  background-color: #62cff6;
}

.verify-button:disabled {
  background-color: #d1d5db;
  cursor: not-allowed;
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