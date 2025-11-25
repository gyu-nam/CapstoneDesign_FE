<template>
  <div>
    <HeaderView />
    <div class="admin-page-container">
      <h2>👤 마이페이지 (관리)</h2>

      <div v-if="isLoading" class="loading-state">
        <p>데이터를 불러오는 중입니다...</p>
      </div>
      
      <div v-else>
        <section class="user-info-card">
          <h3>계정 정보</h3>
          <div class="info-item">
            <span class="label">이메일:</span>
            <span class="value">{{ userData.email || '알 수 없음' }}</span>
          </div>
          <div class="info-item">
            <span class="label">가입 시각:</span>
            <span class="value">{{ formatTimestamp(userData.created_at) }}</span>
          </div>
        </section>

        <section class="groups-ledgers-section">
          <h3>그룹 및 장부 관리 ({{ uniqueGroups.length }}개 그룹)</h3>
          
          <div v-if="uniqueGroups.length === 0" class="no-data">
            등록된 그룹이 없습니다.
          </div>

          <div v-else class="group-list">
            <div v-for="group in uniqueGroups" :key="group.id" class="group-card">
              <div class="group-header">
                <h4>📦 그룹명: **{{ group.name }}**</h4>
                <button @click="resetGroupPassword(group)" class="reset-button">
                  비밀번호 재설정
                </button>
              </div>
              
              <div class="ledgers-list">
                <h5>📖 연결된 장부 ({{ group.ledgers.length }}개)</h5>
                <div v-for="ledger in group.ledgers" :key="ledger.id" class="ledger-item">
                  **{{ ledger.name }}**
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="accounts-section">
          <h3>💳 연결된 계좌 정보 ({{ userData.accounts.length }}개 계좌)</h3>

          <div v-if="userData.accounts.length === 0" class="no-data">
            등록된 계좌가 없습니다.
          </div>
          
          <table v-else class="accounts-table">
            <thead>
              <tr>
                <th>그룹명</th> 
                <th>장부명</th> 
                <th>은행명</th>
                <th>계좌번호 (끝 4자리)</th>
                <th>예금주</th>
                <th>등록 시각</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="account in userData.accounts" :key="account.id">
                <td>{{ account.group_name }}</td> 
                <td>{{ account.ledger_name }}</td> 
                <td>{{ account.bank_name }}</td>
                <td>**** **** {{ account.account_last4 }}</td>
                <td>{{ account.holder_name }}</td>
                <td>{{ formatTimestamp(account.registered_at) }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <div class="withdrawal-section">
          <button @click="confirmWithdrawal" class="withdrawal-button" :disabled="isWithdrawing">
            {{ isWithdrawing ? '탈퇴 처리 중...' : '회원 탈퇴' }}
          </button>
        </div>
      </div>
    </div>
    
    <GroupPW 
      v-if="isModalOpen" 
      :groupInfo="selectedGroupInfo"
      @close-modal="isModalOpen = false"
      @password-reset-success="handlePasswordResetSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import HeaderView from '@/components/HeaderView.vue';
import GroupPW from '@/components/GroupPW.vue'; 


// API URL 상수 정의
const USER_INFO_URL = 'api/user/info';
const ACCOUNT_CHECK_URL = '/user/account-check';
const USER_LEAVE_URL = 'api/user/leave'; // POST

// 상태 변수
const isLoading = ref(true);
const isWithdrawing = ref(false);
const isModalOpen = ref(false);
// 모달에 전달할 그룹 정보 객체 (ID, Hash 포함)
const selectedGroupInfo = ref(null); 


// 초기 데이터 구조 (API 응답 필드명을 따름)
const userData = ref({
  email: '',
  created_at: '',
  // accounts는 '/user/account-check' 응답 리스트를 저장합니다.
  accounts: [], 
});

/**
 * Computed: accounts 배열에서 그룹 정보를 추출하여 중복 없는 그룹 목록을 생성합니다.
 * 명세서 변경: accounts 응답에 groups.id, groups.name, groups.password_hash가 포함되었다고 가정합니다.
 */
const uniqueGroups = computed(() => {
  const groupsMap = new Map();
  
  userData.value.accounts.forEach(account => {
    // API 응답에서 그룹 및 장부 정보 추출 (명세서 확장 필드 사용)
    const groupId = account['groups.id'];
    const groupName = account['groups.name'];
    const groupHash = account['groups.password_hash'];
    const ledgerName = account['ledgers.name'];

    // 1. 그룹 정보 가공
    if (!groupsMap.has(groupId)) {
      groupsMap.set(groupId, {
        id: groupId,
        name: groupName,
        password_hash: groupHash,
        ledgers: [] 
      });
    }

    // 2. 장부 정보 가공
    const existingGroup = groupsMap.get(groupId);
    const ledgerId = account.id + ledgerName; // 장부 ID가 없으므로 임시 생성
    
    // 장부 중복 방지 (같은 그룹에 동일한 장부 이름이 여러 계좌에 연결될 수 있음)
    if (!existingGroup.ledgers.some(l => l.name === ledgerName)) {
      existingGroup.ledgers.push({ 
        id: ledgerId, 
        name: ledgerName 
      });
    }
  });

  return Array.from(groupsMap.values());
});


// --- 데이터 호출 메서드 ---

/**
 * API 연동: 사용자 정보 (email, created_at)를 서버에서 가져옵니다. (GET api/user/info)
 */
const fetchUserInfo = async () => {
  try {
    const response = await fetch(USER_INFO_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // TODO: 인증 토큰 (예: JWT)을 헤더에 포함해야 합니다.
      },
    });

    if (!response.ok) {
      throw new Error('사용자 정보 로딩 실패.');
    }

    const data = await response.json();
    userData.value.created_at = data['users.created_at']; 
    userData.value.email = data['users.email']; 
    
  } catch (error) {
    console.error('사용자 데이터 로딩 중 오류 발생:', error);
  }
};

/**
 * API 연동: 계좌 정보 및 장부 정보를 서버에서 가져옵니다. (GET /user/account-check)
 */
const fetchAccountAndLedgerInfo = async () => {
  try {
    const response = await fetch(ACCOUNT_CHECK_URL, {
      method: 'GET',
      headers: {
        // TODO: 인증 토큰을 헤더에 포함해야 합니다.
      },
    });

    if (!response.ok) {
      throw new Error('계좌/장부 정보 로딩 실패.');
    }

    const data = await response.json();
    
    // 명세서 확장 필드 포함 매핑:
    userData.value.accounts = data.map(account => ({
      id: account['accounts.id'], // 고유 키
      bank_name: account.bank_name,
      account_last4: account.account_last4,
      holder_name: account.holder_name,
      registered_at: account.registered_at, 
      ledger_name: account['ledgers.name'], // 장부 이름
      group_name: account['groups.name'], // 그룹 이름 (계좌표 표시용)
      // NOTE: groups.id, groups.password_hash는 uniqueGroups 가공에 사용되지만,
      // accounts 배열에도 원본 필드 그대로 남겨둡니다.
    }));
    
  } catch (error) {
    console.error('계좌/장부 정보 로딩 중 오류 발생:', error);
  }
};


// --- UI/액션 메서드 ---

/**
 * ISO 형식의 타임스탬프를 보기 좋은 형식으로 변환합니다.
 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '알 수 없음';
  
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  } catch (e) {
    return timestamp; 
  }
};

/**
 * 그룹 비밀번호 재설정 모달을 띄우는 함수입니다.
 * @param {object} group - 그룹 정보 객체 (ID 및 password_hash 포함)
 */
const resetGroupPassword = (group) => {
  // 1번 방식: 상위 컴포넌트에서 조회한 그룹 정보를 모달에 전달
  selectedGroupInfo.value = group;
  isModalOpen.value = true;
  console.log(`그룹 ID ${group.id}의 비밀번호 재설정 모달을 엽니다. Hash: ${group.password_hash}`);
};

/**
 * 비밀번호 재설정 성공 후 호출되는 함수 (GroupPW.vue 모달에서 발생)
 */
const handlePasswordResetSuccess = () => {
    isModalOpen.value = false; // 모달 닫기
    alert('그룹 비밀번호가 성공적으로 재설정되었습니다.');
    // TODO: 필요하다면 데이터 새로고침 (loadAllData())
};

/**
 * API 연동: 회원 탈퇴를 확인하고 서버에 요청하는 함수입니다. (POST api/user/leave)
 */
const confirmWithdrawal = async () => {
  const message = '정말로 탈퇴하십니까? 삭제된 데이터는 돌아오지 않습니다.';
  
  if (window.confirm(message)) {
    isWithdrawing.value = true;
    
    try {
      const response = await fetch(USER_LEAVE_URL, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
          // TODO: 인증 토큰을 헤더에 포함해야 합니다.
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`회원 탈퇴가 성공적으로 처리되었습니다: ${data.message}.`);
        
        // TODO: 탈퇴 성공 후 로그인 페이지 또는 홈으로 리다이렉트
        console.log("탈퇴 성공, 리다이렉트 필요.");
        
      } else {
        const errorText = await response.text();
        throw new Error(`탈퇴 처리 중 오류가 발생했습니다. (HTTP 상태: ${response.status}, 응답: ${errorText})`);
      }
    } catch (error) {
      console.error('회원 탈퇴 처리 중 오류 발생:', error);
      alert('회원 탈퇴에 실패했습니다: ' + error.message);
    } finally {
      isWithdrawing.value = false;
    }
  }
};


/**
 * 모든 초기 데이터를 병렬로 로드하는 함수
 */
const loadAllData = async () => {
  isLoading.value = true;
  try {
    await Promise.all([
      fetchUserInfo(),
      fetchAccountAndLedgerInfo()
    ]);
  } catch (error) {
    console.error('데이터 로딩 중 치명적인 오류 발생:', error);
  } finally {
    isLoading.value = false;
  }
};


// --- 생명주기 훅 ---
onMounted(() => {
  loadAllData();
});
</script>

<style scoped>
/* * 기존 스타일 코드 유지 */
.admin-page-container {
  max-width: 900px;
  margin: 40px auto;
  padding: 30px;
  background-color: #f9f9f9;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  font-family: 'Arial', sans-serif;
}
.loading-state {
    text-align: center;
    padding: 50px;
    color: #6c757d;
    font-size: 1.2em;
}

h2 { text-align: center; color: #333; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
h3 { color: #007bff; margin-top: 30px; margin-bottom: 15px; border-left: 5px solid #007bff; padding-left: 10px; }
h4 { color: #555; font-size: 1.1em; margin: 0; }
h5 { color: #777; font-size: 0.95em; margin-top: 10px; margin-bottom: 5px; }
section { padding: 20px; margin-bottom: 25px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); }

/* --- 사용자 정보 스타일 --- */
.user-info-card .info-item { display: flex; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px dashed #eee; }
.user-info-card .label { font-weight: bold; color: #555; width: 100px; flex-shrink: 0; }
.user-info-card .value { color: #333; }

/* --- 그룹 및 장부 스타일 --- */
.group-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.group-card { border: 1px solid #ddd; border-radius: 6px; padding: 15px; background-color: #fefefe; transition: box-shadow 0.3s ease; }
.group-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.group-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #eee; margin-bottom: 10px; }
.reset-button { background-color: #ffc107; color: #333; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em; transition: background-color 0.2s; }
.reset-button:hover { background-color: #e0a800; }
.ledgers-list { margin-top: 10px; }
.ledger-item { background-color: #e9f7ff; color: #007bff; padding: 5px 10px; border-radius: 4px; margin-bottom: 5px; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* --- 계좌 정보 스타일 --- */
.accounts-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
.accounts-table th, .accounts-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
.accounts-table th { background-color: #f0f0f0; color: #333; font-weight: bold; }
.accounts-table tr:hover { background-color: #f5f5f5; }

/* --- 기타 스타일 --- */
.no-data { text-align: center; padding: 20px; color: #999; border: 1px dashed #ddd; border-radius: 4px; margin-top: 15px; }

/* --- 회원 탈퇴 버튼 스타일 --- */
.withdrawal-section { text-align: right; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
.withdrawal-button { background-color: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 1em; font-weight: bold; transition: background-color 0.2s, opacity 0.2s; }
.withdrawal-button:hover:not(:disabled) { background-color: #c82333; }
.withdrawal-button:disabled { opacity: 0.7; cursor: not-allowed; }
</style>