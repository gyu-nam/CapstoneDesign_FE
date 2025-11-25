<template>
  <div class="registration-container">
    <div class="form-wrapper">
      <div class="logo-section">
        <!-- NOTE: 로컬 이미지 경로이므로 브라우저에서 보이지 않을 수 있습니다. -->
        <!-- <img src="@/assets/logo.png" alt="로고" class="logo" /> -->
      </div>

      <form @submit.prevent="submitForm">
        <h1 class="form-title">회원가입</h1>

        <!-- 이메일 -->
        <div class="input-group">
          <label for="email" class="input-label">이메일</label>
          <div class="input-with-button">
            <input
              type="email"
              id="email"
              v-model="formData.email"
              placeholder="example@pukyong.ac.kr"
              class="input-field"
              required
            />
            <button
              type="button"
              @click="sendVerificationEmail"
              class="verify-button"
              :disabled="isSendingEmail || !isPukyongEmailValid || isEmailVerified"
            >
              {{ isSendingEmail ? '전송 중...' : (isEmailSent ? '재전송' : '인증하기') }}
            </button>
          </div>
          <div v-if="formData.email && !isPukyongEmailValid" class="message error-message">
            이메일은 '@pukyong.ac.kr' 도메인만 사용할 수 있습니다.
          </div>
          <div v-if="isEmailSent" class="message success">
            인증번호가 전송되었습니다.
          </div>
        </div>

        <!-- 인증번호 -->
        <div class="input-group" v-if="isEmailSent && !isEmailVerified">
          <label for="verification-code" class="input-label">인증번호</label>
          <div class="input-with-button">
            <input
              type="text"
              id="verification-code"
              v-model="verificationCode"
              ref="codeInput"
              placeholder="6자리 인증번호"
              class="input-field"
              required
            />
            <button
              type="button"
              @click="checkVerificationCode"
              class="verify-button"
            >
              확인
            </button>
          </div>
        </div>

        <div v-if="isEmailVerified" class="message success">
          본인인증이 성공했습니다.
        </div>
        
        <div class="content-aligned-group"> 
          <!-- 비밀번호 -->
          <div class="input-group">
            <label for="password" class="input-label">비밀번호</label>
            <input
              type="password"
              id="password"
              v-model="formData.password"
              placeholder="비밀번호를 입력하세요"
              class="input-field"
              @blur="validatePassword"
              required
            />
          </div>
          <span v-if="errors.password" class="error-msg">{{ errors.password }}</span>

          <!-- 비밀번호 확인 -->
          <div class="input-group">
            <label for="confirm-password" class="input-label">비밀번호 재입력</label>
            <input
              type="password"
              id="confirm-password"
              v-model="formData.confirmPassword"
              placeholder="비밀번호를 다시 입력하세요"
              class="input-field"
              @blur="validatePasswordConfirm"
              required
            />
          </div>
          <span v-if="errors.passwordConfirm" class="error-msg">{{ errors.passwordConfirm }}</span>
        
          <!-- 이름 -->
          <div class="input-group">
            <label for="name" class="input-label">이름</label>
            <input
              type="text"
              id="name"
              v-model="formData.name"
              placeholder="이름을 입력하세요"
              class="input-field"
              required
            />
          </div>

          <!-- 생년월일 -->
          <div class="input-group">
            <label for="dob" class="input-label">생년월일 (8자리)</label>
            <input
              type="text"
              id="dob"
              v-model="formData.dob"
              placeholder="예: 19990101"
              maxlength="8"
              class="input-field"
              required
            />
          </div>

          <!-- 입학년도 -->
          <div class="input-group">
            <label for="enrollment-year" class="input-label">입학년도 (학번)</label>
            <select
              id="enrollment-year"
              v-model="formData.enrollmentYear"
              class="select-field"
              required
            >
              <option disabled value="">입학년도를 선택하세요</option>
              <option v-for="year in enrollmentYears" :key="year" :value="year">{{ year }}</option>
            </select>
          </div>

          <!-- 학과 -->
          <div class="input-group">
            <label for="department" class="input-label">학과</label>
            <select
              id="department"
              v-model="formData.department"
              class="select-field"
              required
            >
              <option disabled value="">학과를 선택하세요</option>
              <option 
                v-for="dept in majors" 
                :key="dept.collegeName + (dept.departmentName || '')"
                :value="dept.departmentName"
              >
                {{ dept.departmentName }} 
              </option>
            </select>
          </div>
        </div>

        <!-- 체크박스 -->
        <div class="checkbox-group">
          <div class="checkbox-item">
            <input
              id="is-treasurer"
              type="checkbox"
              v-model="formData.isTreasurer"
              class="checkbox-input"
            />
            <label for="is-treasurer" class="checkbox-label">
              총무만 회원가입 가능합니다.
            </label>
          </div>
          <div class="checkbox-item">
            <input
              id="is-real-name"
              type="checkbox"
              v-model="formData.isRealName"
              class="checkbox-input"
              required
            />
            <label for="is-real-name" class="checkbox-label">
              본인 명의를 이용하여 가입을 진행하겠습니다.
            </label>
          </div>
          <div class="checkbox-item">
            <input
              id="is-over-14"
              type="checkbox"
              v-model="formData.isOver14"
              class="checkbox-input"
              required
            />
            <label for="is-over-14" class="checkbox-label">
              만 14세 이상입니다.
            </label>
          </div>
        </div>

        <!-- 제출 버튼 -->
        <button
          type="submit"
          :disabled="!isFormValid || submitting"
          class="submit-button"
        >
          {{ submitting ? '가입 처리 중...' : '회원가입 완료' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api/axios';

const router = useRouter(); 

// 💡 회원가입 폼 데이터를 명세서와 일치하도록 필드명을 명확히 분리하여 사용합니다.
const formData = ref({
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  dob: '',
  enrollmentYear: '',
  department: '',
  isTreasurer: false,
  isRealName: false,
  isOver14: false,
});

const errors = ref({ password: '', passwordConfirm: '' });
const majors = ref([]); 
const enrollmentYears = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

// 이메일 인증 관련
const isEmailSent = ref(false);
const isSendingEmail = ref(false);
const verificationCode = ref(''); // 인증코드 자체를 저장
const isEmailVerified = ref(false);
const codeInput = ref(null);
const submitting = ref(false);

const isPukyongEmailValid = computed(() => {
  if (!formData.value.email) return true;
  return /@pukyong\.ac\.kr$/.test(formData.value.email);
});

const isPasswordValid = computed(() => !errors.value.password && formData.value.password.length > 0);
const isPasswordMismatch = computed(() => errors.value.passwordConfirm !== '');

const isFormValid = computed(() => {
  return (
    isPukyongEmailValid.value && 
    formData.value.email &&
    isEmailVerified.value && // 인증 완료 필수
    formData.value.password &&
    formData.value.confirmPassword &&
    formData.value.name &&
    /^\d{8}$/.test(formData.value.dob) &&
    formData.value.enrollmentYear &&
    formData.value.department &&
    formData.value.isRealName &&
    formData.value.isOver14 &&
    isPasswordValid.value &&
    !isPasswordMismatch.value
  );
});

// ---------------- 비밀번호 검사 ----------------
const validatePassword = () => {
  const pass = formData.value.password;
  const email = formData.value.email.split('@')[0];
  const hasLetter = /[A-Za-z]/.test(pass);
  const hasDigit = /\d/.test(pass);
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(pass);
  const isSequential = /(.)\1{2,}/.test(pass);

  if (pass.length < 8 || pass.length > 16) {
    errors.value.password = '비밀번호는 8자리 이상 16자리 이하로 입력하세요.';
    return;
  }
  if (!hasLetter || !hasDigit || !hasSpecial) {
    errors.value.password = '영문, 숫자, 특수문자를 모두 포함해야 합니다.';
    return;
  }
  if (isSequential) {
    errors.value.password = '같은 문자가 3회 이상 연속될 수 없습니다.';
    return;
  }
  if (email.length > 3 && pass.includes(email)) {
    errors.value.password = '비밀번호는 이메일(ID)과 유사할 수 없습니다.';
    return;
  }
  errors.value.password = '';
  validatePasswordConfirm();
};

const validatePasswordConfirm = () => {
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.passwordConfirm = '비밀번호가 일치하지 않습니다.';
  } else {
    errors.value.passwordConfirm = '';
  }
};

// ---------------- 이메일 인증 ----------------
const sendVerificationEmail = async () => {
  if (!isPukyongEmailValid.value) {
    alert("이메일은 '@pukyong.ac.kr'만 사용할 수 있습니다.");
    return;
  }

  try {
    isSendingEmail.value = true;
    
    // 💡 명세서 반영: 요청 필드명을 'mail_verifications.email'로 수정
    const body = new URLSearchParams({ 
      'mail_verifications.email': formData.value.email.trim() 
    });
    
    const res = await api.post('/api/email-verification/send', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    
    if (res.status === 200) {
      alert('인증번호가 전송되었습니다.');
      isEmailSent.value = true;
      await nextTick();
      codeInput.value?.focus();
    } else {
      alert('이메일 전송에 실패했습니다.');
    }
  } catch (err) {
    console.error('이메일 전송 실패:', err);
    alert(err?.response?.data?.message || '이메일 전송에 실패했습니다.');
  } finally {
    isSendingEmail.value = false;
  }
};

const checkVerificationCode = async () => {
  if (!verificationCode.value) {
    alert('인증번호를 입력해주세요.');
    return;
  }
  try {
    // 💡 명세서 반영: 요청 필드명을 'mail_verification.email'와 'mail_verification.code'로 수정
    const body = new URLSearchParams({
      'mail_verification.email': formData.value.email.trim(),
      'mail_verification.code': verificationCode.value.trim(),
    });
    
    await api.post('/api/email-verification/verify', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    
    alert('본인인증이 성공했습니다.');
    isEmailVerified.value = true;
  } catch (err) {
    console.error('인증 확인 실패:', err);
    alert(err?.response?.data?.message || '인증번호가 일치하지 않거나 만료되었습니다.');
  }
};

// ---------------- 회원가입 ----------------
const submitForm = async () => {
  if (!formData.value.isTreasurer) {
    alert("총무만 회원가입할 수 있습니다.");
    return;
  }

  if (!isFormValid.value) {
    alert("입력 정보를 모두 올바르게 채워주세요. (인증 및 비밀번호 포함)");
    return;
  }
  
  // 💡 명세서에 맞게 모든 필드를 포함하여 전송 (users.email, users.password 필드 포함)
  const registrationParams = new URLSearchParams({
    // 필수 명세 필드
    'users.email': formData.value.email.trim(),
    'users.password': formData.value.password,
    
    // 추가 폼 필드 (서버에서 이 필드들을 받도록 명세서 확장 필요)
    name: formData.value.name,
    dob: formData.value.dob,
    enrollmentYear: formData.value.enrollmentYear,
    department: formData.value.department,
    isTreasurer: formData.value.isTreasurer,
    isRealName: formData.value.isRealName,
    isOver14: formData.value.isOver14,
  });


  submitting.value = true;
  try {
    await api.post('/api/register', registrationParams, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
    router.push({ name: 'LoginView' });
  } catch (error) {
    console.error('회원가입 API 오류:', error);
    alert(error?.response?.data?.message || '서버 오류가 발생했습니다.');
  } finally {
    submitting.value = false;
  }
};

// ---------------- 학과 불러오기 ----------------
const fetchMajors = async () => {
  try {
    const res = await api.get('/api/majors'); // 💡 API 경로에 '/api/' 추가 가정
    majors.value = Array.isArray(res.data)
      ? res.data.filter((m) => m.departmentName)
      : [];
  } catch (err) {
    console.error('학과 데이터 로드 실패:', err);
  }
};

onMounted(fetchMajors);
</script>

<style scoped>
.content-aligned-group {
  width: 95%;
}

.error-msg, .error-message {
  display: block;
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
  padding-left: 0.75rem;
}

.registration-container {
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
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.logo-section {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 1.5rem;
    height: 40px; /* 로고 높이 */
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1f2937;
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
  weight:95%;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
}

.input-field,
.select-field {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.375rem;
  border: 2px solid #f2f2f2;
  font-size: 0.875rem;
  color: #1f2937;
  transition: border-color 0.15s ease-in-out;
}

.input-field:focus,
.select-field:focus {
  outline: none;
  border-color: #4ca7cc;
  box-shadow: 0 0 0 3px rgba(76, 167, 204, 0.25);
}

.input-with-button {
  display: flex;
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

.verify-button:hover {
  background-color: #4ca7cc;
}

.checkbox-group {
  margin-bottom: 1.5rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  margin-top: 1rem;
}

.checkbox-input {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  border: 1px solid #f2f2f2;
  cursor: pointer;
}

.checkbox-label {
  margin-left: 0.5rem;
  font-size: 0.875rem;
  color: #1f2937;
}

.checkbox-input:checked {
  background-color: #62cff6;
  border-color: #62cff6;
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

.message {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: center;
}

.success {
  color: #4CAF50;
}
</style>