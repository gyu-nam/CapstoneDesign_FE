<template>
  <div>
    <HeaderView />
    <div class="page">
      <div class="card">
        <h1 class="title">그룹 생성하기</h1>

        <form @submit.prevent="createGroup" class="form">
          <div v-if="isProcessing" class="loading-overlay">
            <p>처리 중: {{ processingMessage }}</p>
          </div>

          <div class="form-group">
            <label for="groupName">그룹방 이름 <span class="required">*</span></label>
            <input
              type="text"
              id="groupName"
              v-model="form.name"
              required
              placeholder="예시: 25년도 2학기 OO학생회 장부"
              :disabled="isProcessing"
            />
          </div>

          <div class="account-box">
            <h2>계좌 등록</h2>
            <p>그룹의 공동 회계 관리를 위해 계좌 정보를 등록합니다.</p>

            <div class="form-group">
              <label for="bankSelect">은행 선택 <span class="required">*</span></label>
              <select id="bankSelect" v-model="form.bank_name" required :disabled="isProcessing">
                <option value="" disabled>은행을 선택해주세요</option>
                <option v-for="bank in banks" :key="bank" :value="bank">
                  {{ bank }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="accountNumber">계좌번호 <span class="required">*</span></label>
              <input
                type="text"
                id="accountNumber"
                v-model="form.account"
                required
                pattern="\d*"
                title="숫자만 입력해주세요."
                placeholder="- 없이 숫자만 입력"
                :disabled="isProcessing"
              />
            </div>

            <div class="form-group">
              <label for="accountHolder">예금주명 <span class="required">*</span></label>
              <input
                type="text"
                id="accountHolder"
                v-model="form.holder_name"
                required
                placeholder="예금주 이름을 입력하세요"
                :disabled="isProcessing"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="groupPassword">그룹 방 비밀번호 설정 <span class="required">*</span></label>
            <input
              type="password"
              id="groupPassword"
              v-model="form.password_hash"
              required
              @input="validatePassword"
              placeholder="4글자 이상의 숫자 조합을 입력해주세요"
              :class="{ 'input-error': passwordError }"
              :disabled="isProcessing"
            />
            <p v-if="passwordError" class="error-text">
              비밀번호는 4글자 이상의 숫자로만 입력해야 합니다.
            </p>
          </div>

          <button type="submit" :disabled="!isFormValid || isProcessing">
            {{ isProcessing ? '처리 중...' : '그룹 생성 완료' }}
          </button>
        </form>

        <div v-if="message" class="modal-overlay">
          <div class="modal">
            <h3 :class="messageType === 'error' ? 'error-title' : 'success-title'">
              {{ messageType === 'error' ? '실패!' : '성공!' }}
            </h3>
            <p>{{ message }}</p>
            <button @click="closeModalAndRedirect">닫기</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, ref, onMounted } from "vue";
import HeaderView from '@/components/HeaderView.vue';

// API URL 상수
const ACCOUNT_REGISTER_URL = '/api/user/account-register';
const PASSWORD_REGISTER_URL = (groupId) => `/api/group/${groupId}/password`; // POST

// 은행 목록 (기존 데이터 유지)
const banks = [
  "KDB산업은행", "IBK기업은행", "KB국민은행", "KEB하나은행", "수협은행", "NH농협은행", "우리은행", "SC은행",
  "씨티은행", "대구은행", "부산은행", "광주은행", "제주은행", "전북은행", "경남은행", "MG새마을금고",
  "신협", "저축은행", "산림조합", "우체국", "하나은행", "신한은행", "케이뱅크", "카카오뱅크", "토스뱅크",
  "SBI저축은행", "KB증권", "미래에셋증권", "삼성증권", "한국투자증권", "NH투자증권", "교보증권", "하이투자증권",
  "현대차투자증권", "키움증권", "이베스트증권", "SK증권", "대신증권", "한화투자증권", "하나증권", "토스증권",
  "신한투자증권", "DB금융투자", "유진투자", "메리츠증권", "토스머니", "토스포인트",
];

const form = reactive({
  name: "", // 그룹 이름
  bank_name: "", // 은행명
  account: "", // 전체 계좌번호
  holder_name: "", // 예금주명
  password_hash: "", // 그룹 비밀번호
});

const passwordError = ref(true); // 비밀번호 유효성 상태
const message = ref(""); // 모달 메시지
const messageType = ref(""); // 모달 메시지 타입 (success/error)
const isProcessing = ref(false); // 처리 중 상태
const processingMessage = ref(""); // 처리 메시지 (로딩 시)

// --- Computed & Validation ---

// 비밀번호 검증: 4글자 이상의 숫자 조합
const validatePassword = () => {
  const pass = form.password_hash.trim();
  passwordError.value = !/^\d{4,}$/.test(pass);
};

// 버튼 활성화 여부
const isFormValid = computed(() => {
  const accountValid = form.bank_name !== "" && form.account.trim() !== "" && form.holder_name.trim() !== "";
  return form.name.trim() !== "" && !passwordError.value && accountValid;
});

// --- API Methods ---

/**
 * 1단계: 계좌 정보 등록 및 그룹 ID 획득 (POST api/user/account-register)
 * - 명세서: bank_name, holder_name, account_last4, groups.name 요청
 * - 명세서: groups.id 응답
 */
const registerAccount = async () => {
  processingMessage.value = "1/2단계: 계좌 등록 및 장부 생성 중...";

  
  const params = new URLSearchParams();
    params.append("bank_name", form.bank_name);       
    params.append("account_number", form.account);
   if (form.holder_name.trim() !== "") {
    params.append("holder_name", form.holder_name.trim());
  }

  try {
    const response = await fetch(ACCOUNT_REGISTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': "application/x-www-form-urlencoded;charset=UTF-8",
        // TODO: 인증 토큰 헤더 포함 필요
      },
      body: params.toString(),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`계좌 등록 실패 (HTTP ${response.status})`);
    }

    const data = await response.json();
    
    return data.id;
    
    
  } catch (error) {
    console.error("계좌 등록 및 장부 생성 오류:", error);
    messageType.value = "error";
    message.value = `[1단계 오류] 계좌 등록 실패: ${error.message}`;
    throw error;
  }
};

/**
 * 2단계: 그룹 비밀번호 등록 (POST /api/group/{groupId}/password)
 * - 명세서: groups.password_hash, groups.id 요청
 */
const registerGroupPassword = async (groupId) => {
  processingMessage.value = "2/2단계: 그룹 비밀번호 등록 중...";

  // 명세서에 따라 groups.password_hash와 groups.id를 모두 요청 body에 포함합니다.
  const passwordRegisterData = {
    "groups.password_hash": form.password_hash,
    "groups.id": groupId,
  };

  try {
    const response = await fetch(PASSWORD_REGISTER_URL(groupId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: 인증 토큰 헤더 포함 필요
      },
      body: JSON.stringify(passwordRegisterData),
    });

    if (!response.ok) {
      throw new Error(`비밀번호 등록 실패 (HTTP ${response.status})`);
    }

    // 명세서: 응답 데이터 groups.id 반환
    const data = await response.json();
    return data; 
    
  } catch (error) {
    console.error("그룹 비밀번호 등록 오류:", error);
    messageType.value = "error";
    message.value = `[2단계 오류] 비밀번호 등록 실패: ${error.message}`;
    throw error; // 상위 함수에서 처리 중단
  }
};


// --- 메인 그룹 생성 함수 (순차적 실행) ---

const createGroup = async () => {
  if (!isFormValid.value) {
    messageType.value = "error";
    message.value = "필수 입력 항목을 확인하거나 비밀번호를 올바르게 입력해주세요.";
    return;
  }

  isProcessing.value = true;
  message.value = ""; // 기존 메시지 초기화
  let newGroupId = null;

  try {
    // 1. 계좌 등록 및 그룹 ID 획득
    newGroupId = await registerAccount();
    
    // 2. 그룹 비밀번호 등록
    await registerGroupPassword(newGroupId);

    // 모든 단계 성공
    messageType.value = "success";
    message.value = `그룹과 장부(${form.name})가 성공적으로 생성되었습니다!`;
    
  } catch (err) {
    // 오류는 개별 API 함수에서 이미 message.value에 할당했음
    console.log("순차 처리 중단됨.");
  } finally {
    isProcessing.value = false;
  }
};


// --- UI/Helper Methods ---

const closeModalAndRedirect = () => {
  const isSuccess = messageType.value === 'success';

  message.value = ''; 
  messageType.value = '';

  if (isSuccess) {
    // TODO: 성공 시 라우터 이동
    // router.push('/admin'); 같은 거
  }
};


onMounted(validatePassword);
</script>

<style scoped>
/* (스타일은 이전과 동일) */
.page {
  min-height: 100vh;
  background-color: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.card {
  background: white;
  border: 1px solid #eee;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
  padding: 2rem;
  max-width: 600px;
  width: 100%;
}
.title {
  font-size: 1.8rem;
  font-weight: 800;
  text-align: center;
  color: #111;
  border-bottom: 2px solid #eee;
  padding-bottom: 1rem;
  margin-bottom: 2rem;
}
.form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    border-radius: 12px;
    font-weight: 700;
    color: #007bff;
    text-align: center;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
label {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}
.required {
  color: red;
}
input,
select {
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  transition: border 0.2s, box-shadow 0.2s;
}
input:focus,
select:focus {
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}
.account-box {
  background-color: #f0f7ff;
  border: 1px solid #cde3ff;
  padding: 1.25rem;
  border-radius: 10px;
}
.account-box h2 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 0.25rem;
}
.account-box p {
  color: #1d4ed8;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}
.input-error {
  border-color: #dc2626;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
}
.error-text {
  color: #dc2626;
  font-size: 0.85rem;
}
button[type="submit"] {
  background-color: #16a34a;
  color: white;
  font-weight: 700;
  padding: 0.9rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
button[type="submit"]:hover:not(:disabled) {
  background-color: #15803d;
  transform: scale(1.01);
}
button[type="submit"]:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  max-width: 360px;
  width: 100%;
  text-align: center;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}
.modal h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 800;
}
.success-title {
  color: #16a34a;
}
.error-title {
  color: #dc2626;
}
.modal p {
  color: #444;
  white-space: pre-line;
}
.modal button {
  margin-top: 1rem;
  width: 100%;
  background-color: #2563eb;
  color: white;
  padding: 0.6rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.modal button:hover {
  background-color: #1d4ed8;
}
</style>