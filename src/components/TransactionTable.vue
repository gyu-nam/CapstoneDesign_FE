<template>
  <div class="ledger-table-container">
    
    <header class="table-info-header">
      <button @click="goBackToMain" class="btn-back">
        ← 뒤로가기
      </button>
      
      <h1 class="table-title">
        {{ postData.title || '거래내역 (로드 실패)' }}
      </h1>
      
      <div v-if="postData.id" class="post-meta-info">
        <p class="meta-item">
          <span class="meta-label">장부 ID:</span>
          <span class="meta-value">{{ ledgerId }}</span>
        </p>
        <p class="meta-item">
          <span class="meta-label">그룹:</span>
          <span class="meta-value">{{ postData.group }}</span>
        </p>
        <p class="meta-item">
          <span class="meta-label">작성일:</span>
          <span class="meta-value">{{ formatDate(postData.date) }}</span>
        </p>
      </div>
    </header>
    
    <div class="table-controls">
      <button class="btn-refresh" @click="fetchTransactions" :disabled="loading">
        {{ loading ? '불러오는 중...' : '새로고침' }}
      </button>
      <button class="btn-sync" @click="syncData" :disabled="loading">
        {{ loading ? '동기화 중...' : '동기화' }}
      </button>
    </div>

    <div v-if="error" class="error">❌ {{ error }}</div>
    <div v-if="verificationMessage" :class="['verification-status', { 'success': isVerificationSuccess, 'fail': !isVerificationSuccess }]">
        {{ verificationMessage }}
    </div>

    <div class="table-wrapper">
      <table class="transaction-table">
        <thead>
          <tr>
            <th>거래일시</th>
            <th>메모 (거래처)</th>
            <th class="amount-cell">금액</th>
            <th>블록체인 상태</th>
            <th>블록 번호</th>
            <th>무결성</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(tx, index) in items" 
            :key="tx.id || index" 
            :class="getAmountClass(tx.amount)"
          >
            <td>{{ formatDate(tx.txAt) }}</td>
            <td>{{ tx.shopName }}</td>
            <td class="amount-cell">{{ formatAmount(tx.amount) }}</td>
            <td>
              <span v-if="tx.status === 'ANCHORED'" class="badge ok">기록됨 ✅</span>
              <span v-else class="badge pend">대기중 ⏳</span>
            </td>
            <td>{{ tx.blockNumber ?? '—' }}</td>
            <td>
              <span v-if="tx.integrity === true" class="integrity-result ok">O</span>
              <span v-else-if="tx.integrity === false" class="integrity-result err">X</span>
              <span v-else class="integrity-result muted">—</span>
            </td>
            <td>
              <button 
                  class="btn-action" 
                  @click.stop="verifyMerkleProof(tx)"
                  :disabled="!tx.batchId || loadingVerification"
              >
                {{ tx.integrity === undefined ? '무결성 검증' : '재검증' }}
              </button>
              <div v-if="tx.integrityMessage" 
                  :class="['verification-status', { 'success': tx.integrity, 'fail': !tx.integrity }]">
                {{ tx.integrityMessage }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!items.length && !loading" class="empty-data">표시할 거래가 없습니다.</p>
  </div>
</template>

<script setup>
import { ref, defineProps, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// 라우터/props로부터 ledgerId 받는 부분은 그대로 유지
const props = defineProps({ id: [Number, String] });
const ledgerId = computed(() => props.id || route.params.id || 1);

// 상태값들
const items = ref([]);
const loading = ref(false);
const loadingVerification = ref(false);
const error = ref(null);
const verificationMessage = ref('');
const isVerificationSuccess = ref(false);

// 장부 메타데이터 (제목, 생성일 등)
const ledgerMetadata = ref({});

// 화면 상단에 보이는 postData
const postData = computed(() => {
  return {
    id: ledgerId.value,
    title: ledgerMetadata.value.name || '거래내역 상세 (하드코딩)',
    group: '컴공 25학번 학생회',  // 하드코딩
    date: ledgerMetadata.value.created_at || '2025-01-10',
  };
});

// Helper들
const formatAmount = (amount) => {
  if (amount == null) return '—';
  const sign = String(amount).includes('-') ? '-' : (String(amount).includes('+') ? '+' : '');
  const number = Number(String(amount).replace('+', '').replace('-', ''));
  return sign + number.toLocaleString('ko-KR');
};

const formatDate = (d) => (d ? String(d).slice(0, 10) : '—');

const goBackToMain = () => router.push({ name: 'MainView' });

const getAmountClass = (amount) => {
  if (!amount) return '';
  const amountStr = String(amount);
  if (amountStr.includes('-')) return 'row-debit';
  if (amountStr.includes('+')) return 'row-credit';
  return '';
};

// 📌 하드코딩 거래내역 로드 함수
const fetchTransactions = async () => {
  loading.value = true;
  error.value = null;

  try {
    // 장부 메타데이터 하드코딩
    ledgerMetadata.value = {
      name: '25학년도 2학기 장부',
      created_at: '2025-11-10T12:34:56Z',
    };

    // 거래 내역 하드코딩 (수입/지출 섞어서 예시)
  items.value = [
  {
    id: 'TX-001',
    providerTxId: 'PTX-001',
    txAt: '2025-11-10T09:05:11Z',
    shopName: '입금',
    amount: '+500000',
    createdAt: '2025-10-10T09:05:40Z',
    blockNumber: 5348200,
    integrity: true,
    integrityMessage: '✅ 무결성 검증 성공',
    status: 'ANCHORED',
    batchId: 1,
  },
  {
    id: 'TX-002',
    providerTxId: 'PTX-002',
    txAt: '2025-11-10T10:41:08Z',
    shopName: '편의점',
    amount: '-23000',
    createdAt: '2025-01-10T10:41:50Z',
    blockNumber: 5348305,
    integrity: true,
    integrityMessage: '✅ 무결성 검증 성공',
    status: 'ANCHORED',
    batchId: 1,
  },
  {
    id: 'TX-003',
    providerTxId: 'PTX-003',
    txAt: '2025-11-10T14:12:32Z',
    shopName: '식당',
    amount: '-40000',
    createdAt: '2025-01-10T14:13:02Z',
    blockNumber: 5348458,
    integrity: undefined,
    integrityMessage: '',
    status: 'ANCHORED',
    batchId: 1,
  },
  {
    id: 'TX-004',
    providerTxId: 'PTX-004',
    txAt: '2025-11-11T09:15:20Z',
    shopName: '상점',
    amount: '-45000',
    createdAt: '2025-01-11T09:16:00Z',
    blockNumber: 5349381,
    integrity: true,
    integrityMessage: '✅ 무결성 검증 성공',
    status: 'ANCHORED',
    batchId: 1,
  },
  {
    id: 'TX-005',
    providerTxId: 'PTX-005',
    txAt: '2025-11-11T13:40:10Z',
    shopName: '입금',
    amount: '+100000',
    createdAt: '2025-11-11T13:41:00Z',
    blockNumber: 5349550,
    integrity: undefined,
    integrityMessage: '',
    status: 'ANCHORED',
    batchId: 1,
  },
  {
    id: 'TX-006',
    providerTxId: 'PTX-006',
    txAt: '2025-11-11T17:22:48Z',
    shopName: '상점',
    amount: '-75000',
    createdAt: '2025-11-11T17:23:30Z',
    blockNumber: 5349822,
    integrity: undefined,
    integrityMessage: '',
    status: 'ANCHORED',
    batchId: 2,
  },
  {
    id: 'TX-007',
    providerTxId: 'PTX-007',
    txAt: '2025-11-12T08:15:09Z',
    shopName: '입금',
    amount: '+150000',
    createdAt: '2025-11-12T08:15:45Z',
    blockNumber: 5350310,
    integrity: true,
    integrityMessage: '✅ 무결성 검증 성공',
    status: 'ANCHORED',
    batchId: 2,
  },
  {
    id: 'TX-008',
    providerTxId: 'PTX-008',
    txAt: '2025-11-12T11:21:55Z',
    shopName: '상점',
    amount: '-32000',
    createdAt: '2025-11-12T11:22:15Z',
    blockNumber: 5350450,
    integrity: undefined,
    integrityMessage: '',
    status: 'ANCHORED',
    batchId: 2,
  },
  {
    id: 'TX-009',
    providerTxId: 'PTX-009',
    txAt: '2025-11-12T14:40:28Z',
    shopName: '식당',
    amount: '-50000',
    createdAt: '2025-11-12T14:41:10Z',
    blockNumber: null,
    integrity: undefined,
    integrityMessage: '',
    status: 'PENDING',
    batchId: 0,
  },
  {
    id: 'TX-010',
    providerTxId: 'PTX-010',
    txAt: '2025-11-12T15:55:12Z',
    shopName: '입금',
    amount: '+30000',
    createdAt: '2025-11-12T15:55:56Z',
    blockNumber: null,
    integrity: undefined,
    integrityMessage: '',
    status: 'PENDING',
    batchId: 0,
  },
];
  } catch (e) {
    console.error('하드코딩 거래 내역 로드 실패(?)', e);
    items.value = [];
    error.value = '거래 내역을 불러오지 못했습니다. (하드코딩)';
  } finally {
    loading.value = false;
  }
};

// 📌 동기화 버튼: 그냥 다시 하드코딩 데이터 로드
const syncData = async () => {
  alert('하드코딩 모드: 백엔드 동기화 대신 더미 데이터를 다시 로드합니다.');
  fetchTransactions();
};

// 📌 무결성 검증 버튼: 실제론 블록체인 안 타고, 프론트에서 상태만 바꿔줌
const verifyMerkleProof = async (tx) => {
  if (!tx.id) {
    alert('거래 ID를 찾을 수 없어 검증할 수 없습니다. (하드코딩)');
    return;
  }

  loadingVerification.value = true;
  tx.integrity = undefined;
  tx.integrityMessage = '검증 중... (하드코딩)';

  // 살짝 딜레이 주고 싶으면 setTimeout 써도 되지만, 여기서는 바로 처리
  try {
    // 여기서는 항상 성공했다고 가정
    tx.integrity = true;
    tx.integrityMessage = '✅ 무결성 검증 성공 (하드코딩 - 실제 블록체인 미연결)';
  } catch (e) {
    console.error('무결성 검증 오류(하드코딩):', e);
    tx.integrity = false;
    tx.integrityMessage = '❌ 무결성 검증 실패 (하드코딩 에러)';
  } finally {
    loadingVerification.value = false;
    // 반응성 유지를 위해 배열 업데이트
    items.value = items.value.map((item) => (item.id === tx.id ? { ...tx } : item));
  }
};

// 마운트 시 하드코딩 데이터 로드
onMounted(() => {
  if (!ledgerId.value) {
    error.value = '❌ 장부 ID가 유효하지 않습니다. (하드코딩 모드)';
    return;
  }
  fetchTransactions();
});
</script>

<style scoped>
/* 레이아웃 수정: 버튼 왼쪽, 제목 중앙, 상세정보 오른쪽 */
.table-info-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    margin-bottom: 20px;
    width: 100%;
    position: relative; /* 제목 absolute 위치 지정을 위한 기준점 */
}

.btn-back {
    order: 1;
    margin-right: auto;
    background: #f0f0f0;
    color: #333;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
    position: relative; 
    z-index: 10;
}
.btn-back:hover { background-color: #e0e0e0; }

.table-title {
    /* 핵심 수정: Absolute Position으로 컨테이너 중앙에 배치 */
    position: absolute;
    left: 50%;
    transform: translateX(-50%); /* 정확히 중앙으로 이동 */
    top: 0; 
    white-space: nowrap; 
    
    text-align: center;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0 auto; 
    padding-top: 8px; /* 뒤로가기 버튼과 높이를 맞춤 */
    z-index: 5; 
}

.post-meta-info {
    order: 3;
    margin-left: auto;
    text-align: right;
    font-size: 0.85rem;
    color: #666;
    min-width: 250px;
    position: relative;
    z-index: 10;
}
.meta-item { display: inline-block; margin-left: 15px; font-weight: 400; }
.meta-label { font-weight: 600; margin-right: 3px; }

/* Table controls */
.table-controls {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-bottom: 15px;
    padding-top: 40px; /* 제목과의 간격 확보 */
}

.btn-refresh {
    padding: 8px 15px;
    background-color: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
}
.btn-refresh:hover:not(:disabled) { background-color: #1976D2; }
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-sync {
    padding: 8px 15px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
}
.btn-sync:hover:not(:disabled) { background-color: #388E3C; }
.btn-sync:disabled { opacity: 0.6; cursor: not-allowed; }

/* Table */
.ledger-table-container {
    max-width: 1000px;
    margin: 20px auto;
    padding: 15px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    font-family: Arial, sans-serif;
}

.transaction-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
}

.transaction-table th,
.transaction-table td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
    font-size: 0.9rem;
}

.transaction-table th.amount-cell,
.transaction-table td.amount-cell {
    text-align: right;
}

/* Row highlighting */
.row-debit { background-color: #ffe0e0; }
.row-credit { background-color: #e0f0ff; }

/* Badges */
.badge {
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #fff;
}
.badge.ok { background-color: #4caf50; }
.badge.pend { background-color: #ff9800; }

/* Integrity results */
.integrity-result.ok { color: #4caf50; font-weight: 600; }
.integrity-result.err { color: #e53935; font-weight: 600; }
.integrity-result.muted { color: #999; }

/* Action buttons */
.btn-action {
    padding: 4px 8px;
    font-size: 0.8rem;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    background-color: #2196f3;
    color: #fff;
    transition: background-color 0.2s;
}
.btn-action:hover:not(:disabled) { background-color: #1976d2; }
.btn-action:disabled { background-color: #90caf9; cursor: not-allowed; opacity: 0.7; }

/* Verification messages */
.verification-status {
    padding: 10px;
    margin-top: 5px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.85rem;
}
.verification-status.success { background-color: #dcfce7; color: #166534; border: 1px solid #a7f3d0; }
.verification-status.fail { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

/* Empty data */
.empty-data {
    text-align: center;
    color: #888;
    font-size: 0.9rem;
    margin-top: 20px;
}

/* Error message */
.error {
    color: #b71c1c;
    background-color: #ffebee;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    font-weight: 500;
}
</style>