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

const isLoading = ref(true);
const isWithdrawing = ref(false);
const isModalOpen = ref(false);

const selectedGroupInfo = ref(null);

const userData = ref({
  email: '',
  created_at: '',
  accounts: [],
});

const uniqueGroups = computed(() => {
  const groupsMap = new Map();
  
  userData.value.accounts.forEach(account => {
    const groupId = account.group_id;
    const groupName = account.group_name;
    const ledgerName = account.ledger_name;

    if (!groupsMap.has(groupId)) {
      groupsMap.set(groupId, {
        id: groupId,
        name: groupName,
        ledgers: []
      });
    }

    const g = groupsMap.get(groupId);

    if (!g.ledgers.some(l => l.name === ledgerName)) {
      g.ledgers.push({
        id: `${groupId}-${ledgerName}`,
        name: ledgerName
      });
    }
  });

  return Array.from(groupsMap.values());
});

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '알 수 없음';
  return new Date(timestamp).toLocaleString('ko-KR');
};

const resetGroupPassword = (group) => {
  selectedGroupInfo.value = group;
  isModalOpen.value = true;
};

const handlePasswordResetSuccess = () => {
  isModalOpen.value = false;
  alert('그룹 비밀번호가 성공적으로 재설정되었습니다.');
};

const confirmWithdrawal = async () => {
  alert('하드코딩 상태에서는 탈퇴 요청이 전송되지 않습니다.');
};

onMounted(() => {
  // -----------------------
  // 💾 하드코딩 데이터 주입
  // -----------------------
  userData.value = {
    email: "test@example.com",
    created_at: "2025-11-10T12:34:56Z",
    accounts: [
      {
        id: 1,
        bank_name: "KB국민은행",
        account_last4: "1234",
        holder_name: "김규남",
        registered_at: "2025-11-11T10:20:30Z",
        ledger_name: "2학기 장부",
        group_name: "25학년도 학생회",
        group_id: 10,
      },
      {
        id: 2,
        bank_name: "신한은행",
        account_last4: "9876",
        holder_name: "김규남",
        registered_at: "2025-11-11T15:45:00Z",
        ledger_name: "2학기 장부",
        group_name: "동아리 A",
        group_id: 20,
      },
    ]
  };

  isLoading.value = false;
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