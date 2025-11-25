<template>
  <div class="modal-overlay" @click.self="!isProcessing && $emit('close-modal')">
    <div class="modal-content">
      <header class="modal-header">
        <h3>🔑 그룹 비밀번호 재설정 (그룹 ID: {{ groupInfo.id }})</h3>
        <button class="close-button" @click="$emit('close-modal')" :disabled="isProcessing">×</button>
      </header>
      
      <div class="modal-body">
        
        <div v-if="!isVerified" class="step-container">
          <h4>1단계: 기존 비밀번호 확인</h4>
          <input 
            type="password" 
            v-model="oldPassword" 
            placeholder="기존 그룹 비밀번호를 입력하세요"
            class="pw-input"
            :disabled="isProcessing"
          />
          <button @click="verifyPassword" class="action-button verify-button" :disabled="isProcessing || !oldPassword.length">
            {{ isProcessing ? '검증 중...' : '검증 버튼' }}
          </button>
          <p v-if="verificationError" class="error-message">{{ verificationError }}</p>
        </div>

        <div v-else class="step-container verified-step">
          <h4>2단계: 새 비밀번호 설정</h4>
          <input 
            type="password" 
            v-model="newPassword" 
            placeholder="새 비밀번호 (6자 이상)"
            class="pw-input"
            :disabled="isProcessing"
          />
          <input 
            type="password" 
            v-model="confirmPassword" 
            placeholder="새 비밀번호 확인"
            class="pw-input"
            :disabled="isProcessing"
          />
          <button 
            @click="saveNewPassword" 
            class="action-button save-button"
            :disabled="!isNewPasswordValid || isProcessing"
          >
            {{ isProcessing ? '저장 중...' : '저장 버튼' }}
          </button>
          <p v-if="saveError" class="error-message">{{ saveError }}</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue';

// API URL 상수 정의
// 💡 검증 API: GET 메소드. old_password를 쿼리 파라미터로 전달합니다.
const VERIFY_PW_URL = (groupId, password) => `/api/group/${groupId}/password/status?old_password=${encodeURIComponent(password)}`;
// 💡 재설정 API: POST 메소드.
const RESET_PW_URL = (groupId) => `/api/group/${groupId}/password/reset`; 

const props = defineProps({
  // AdminPage.vue에서 전달한 그룹 정보 객체 (id, name, password_hash 포함)
  groupInfo: {
    type: Object,
    required: true,
    validator: (value) => {
      return typeof value.id !== 'undefined';
    }
  }
});

// AdminPage.vue로 성공 이벤트를 보냅니다.
const emit = defineEmits(['close-modal', 'password-reset-success']);

// 상태 변수
const isProcessing = ref(false); 
const isVerified = ref(false);
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const verificationError = ref('');
const saveError = ref('');

// --- computed 속성 ---

const isNewPasswordValid = computed(() => {
  const minLength = 6; 
  if (newPassword.value.length < minLength) return false;
  if (newPassword.value !== confirmPassword.value) return false;
  return true;
});


// --- 메서드 ---

/**
 * 1단계: API 연동: 기존 비밀번호를 검증하는 함수입니다. (GET /api/group/{groupId}/password/status)
 */
const verifyPassword = async () => {
  verificationError.value = '';
  saveError.value = '';
  
  if (!oldPassword.value) {
    verificationError.value = '기존 비밀번호를 입력해주세요.';
    return;
  }
  
  isProcessing.value = true;
  const groupId = props.groupInfo.id;
  
  // 💡 GET 요청 URL에 old_password를 쿼리 파라미터로 포함
  const url = VERIFY_PW_URL(groupId, oldPassword.value); 

  try {
    const response = await fetch(url, {
      method: 'GET', // 명세서에 따름
      headers: {
        'Content-Type': 'application/json',
        // TODO: 인증 토큰을 헤더에 포함해야 합니다.
      },
    });

    // 명세서: 응답 데이터 {isSet: true}
    if (response.ok) {
      const data = await response.json();
      
      // 추측입니다: isSet이 true이면 검증 성공으로 간주
      if (data.isSet === true) { 
        isVerified.value = true;
        // NOTE: oldPassword는 2단계 재설정 API를 위해 유지합니다.
        console.log("기존 비밀번호 검증 성공. 2단계로 이동.");
      } else {
        // isSet: false 또는 서버에서 비밀번호 불일치 오류 응답
        verificationError.value = '비밀번호가 일치하지 않습니다.';
      }
    } else {
      // HTTP 오류 (4xx, 5xx) 발생
      const errorText = await response.text();
      verificationError.value = `검증 실패. 서버 응답: ${errorText}`;
    }
  } catch (error) {
    console.error('비밀번호 검증 중 네트워크 오류 발생:', error);
    verificationError.value = '네트워크 연결 상태를 확인해주세요.';
  } finally {
    isProcessing.value = false;
  }
};


/**
 * 2단계: API 연동: 새 비밀번호를 저장하는 함수입니다. (POST /api/group/{groupId}/password/reset)
 */
const saveNewPassword = async () => {
  saveError.value = '';

  if (!isNewPasswordValid.value) {
    saveError.value = '새 비밀번호는 6자 이상이어야 하며, 확인 입력과 일치해야 합니다.';
    return;
  }

  isProcessing.value = true;
  const groupId = props.groupInfo.id;
  const url = RESET_PW_URL(groupId);
  
  try {
    const response = await fetch(url, {
      method: 'POST', // 💡 명세서에 따름
      headers: {
        'Content-Type': 'application/json',
        // TODO: 인증 토큰을 헤더에 포함해야 합니다.
      },
      // 명세서: 요청 데이터 old_password, new_password
      body: JSON.stringify({ 
        old_password: oldPassword.value, 
        new_password: newPassword.value 
      }),
    });

    // 명세서: 응답 데이터 {"message": "Password reset successfully"}
    if (response.ok) {
      console.log("새 비밀번호 저장 성공.");
      // AdminPage.vue로 성공 이벤트를 발생시키고 모달 닫기
      emit('password-reset-success'); 
    } else {
      const errorText = await response.text();
      saveError.value = `비밀번호 저장 실패. 서버 응답: ${errorText}`;
      console.error("새 비밀번호 저장 실패.");
    }
  } catch (error) {
    console.error('비밀번호 저장 중 네트워크 오류 발생:', error);
    saveError.value = '네트워크 연결 상태를 확인해주세요.';
  } finally {
    isProcessing.value = false;
  }
};

</script>

<style scoped>
/*--배경--*/
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6); 
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; 
}

/* --- 모달 내용 컨테이너 --- */
.modal-content {
  background-color: #fff;
  padding: 25px;
  border-radius: 8px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  position: relative;
  animation: slide-in 0.3s ease-out; 
}

/* 모달 등장 애니메이션 */
@keyframes slide-in {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* --- 헤더 및 닫기 버튼 --- */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.modal-header h3 {
  color: #007bff;
  margin: 0;
  font-size: 1.3em;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.8em;
  color: #888;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  transition: color 0.2s;
}

.close-button:hover {
  color: #333;
}

/* --- 바디 및 단계별 컨테이너 --- */
.step-container {
  padding: 15px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  background-color: #fcfcfc;
}

.step-container h4 {
  color: #555;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 5px;
}

.verified-step {
  border-color: #28a745;
  background-color: #e6ffec;
}

.pw-input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 1em;
}

/* --- 버튼 스타일 --- */
.action-button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.2s;
}

.verify-button {
  background-color: #007bff;
}

.verify-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.save-button {
  background-color: #28a745; /* 녹색 */
}

.save-button:hover:not(:disabled) {
  background-color: #1e7e34;
}

.action-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.6;
}

/* --- 메시지 스타일 --- */
.error-message {
  color: #dc3545;
  margin-top: 10px;
  font-size: 0.9em;
  font-weight: bold;
}
</style>