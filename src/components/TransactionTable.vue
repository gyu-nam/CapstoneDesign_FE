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
          <span class="meta-label">모임:</span>
          <span class="meta-value">{{ postData.group }}</span>
        </p>
        <p class="meta-item">
          <span class="meta-label">작성일:</span>
          <span class="meta-value">{{ postData.date }}</span>
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
import { api } from '@/api/axios'; 
import { ethers } from "ethers";
import { keccak256 } from "js-sha3";


const router = useRouter(); 
const route = useRoute(); 

const props = defineProps({ id: [Number, String] });
const ledgerId = computed(() => props.id || route.params.id);

const items = ref([]); 
const loading = ref(false);
const loadingVerification = ref(false);
const error = ref(null);
const verificationMessage = ref('');
const isVerificationSuccess = ref(false);

// 💡 장부 메타데이터 상태 (postData computed 속성에서 사용)
const ledgerMetadata = ref({}); 

let provider = null;
let contract = null;
const RPC_URL = "https://rpc-amoy.polygon.technology/";
const CONTRACT_ADDRESS = "0xYourActualMerkleContractAddressHere";
const CONTRACT_ABI = [
  "function merkleRoots(uint256) view returns (bytes32)",
  "function recordMerkleRoot(bytes32) external"
];


const postData = computed(() => {
    return { 
        id: ledgerId.value, 
        title: ledgerMetadata.value.name || '거래내역 상세',
        group: '정보 미정', // API에서 제공되지 않음
        date: ledgerMetadata.value.created_at || '날짜 미정'
    };
});

const initContract = () => {
    try {
        provider = new ethers.JsonRpcProvider(RPC_URL); 
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    } catch (e) {
        console.error("Contract 초기화 실패:", e);
        error.value = "블록체인 연결 초기화 실패. RPC URL을 확인하세요.";
    }
};

// Merkle Proof 계산 함수
const computeMerkleRoot = (leaf, proof) => {
    if (!leaf || !proof || !Array.isArray(proof)) {
      console.error("머클 계산 실패: leaf 또는 proof 데이터 오류");
      return null;
    }
    
    let hash = leaf.toLowerCase();
    
    for (const { node, position } of proof) {
      const sibling = node.toLowerCase();
      const h = hash.replace(/^0x/, "");
      const s = sibling.replace(/^0x/, "");

      if (position === "L") {
        hash = "0x" + keccak256(s + h);
      } 
      else if (position === "R") {
        hash = "0x" + keccak256(h + s);
      } 
      else {
        console.error("proof position 값 오류:", position);
        return null;
      }
    }
    return hash;
};


// --- Helper Functions ---
const formatAmount = (amount) => {
    if (amount == null) return '—';
    const sign = String(amount).includes('-') ? '-' : (String(amount).includes('+') ? '+' : '');
    const number = Number(String(amount).replace('+', '').replace('-', ''));
    return sign + number.toLocaleString('ko-KR');
};

const formatDate = (d) => d ? String(d).slice(0, 10) : '—';
const goBackToMain = () => router.push({ name: 'MainView' });
const getAmountClass = (amount) => {
    if (!amount) return '';
    const amountStr = String(amount);
    if (amountStr.includes('-')) return 'row-debit';
    if (amountStr.includes('+')) return 'row-credit';
    return '';
};

// --- API Functions ---

const fetchTransactions = async () => {
    loading.value = true;
    error.value = null;
    if (!ledgerId.value) { error.value = "장부 ID가 유효하지 않습니다."; loading.value = false; return; }

    try {
        const { data } = await api.get(`/api/ledgers/${ledgerId.value}/transactions`);
        
        // 🚨 API 응답 구조 가정: { transactions: [..], ledgers: { name: '...', created_at: '...' } }
        const rawTxs = data.transactions || [];
        // 💡 장부 메타데이터 업데이트
        ledgerMetadata.value = data.ledgers || {}; 

        if (rawTxs.length > 0) {
            items.value = rawTxs.map((tx) => ({
                id: tx.transaction_id || tx.provider_tx_id || tx.tx_hash,
                
                providerTxId: tx.provider_tx_id, 
                txAt: tx.tx_at, 
                shopName: tx.shop_name, 
                amount: String(tx.amount),
                createdAt: tx.create_at,
                
                blockNumber: tx.anchors ? tx.anchors.block_number : '—',
                
                integrity: undefined,
                integrityMessage: '',
                status: tx.anchors ? 'ANCHORED' : 'PENDING',
                batchId: tx.anchors ? tx.anchors.batch_id : 0, 
            }));
        } else {
            items.value = [];
            error.value = '거래 내역을 불러오지 못했습니다.';
        }
    } catch (e) {
        console.error('거래 내역 로드 실패:', e);
        items.value = [];
        error.value = e?.response?.data?.message || '거래 내역 로드 중 서버 오류가 발생했습니다.';
    } finally {
        loading.value = false;
    }
};

const syncData = async () => {
    alert('백엔드 데이터 동기화 요청 (가정). 거래 내역을 새로고침합니다.');
    fetchTransactions();
};

const verifyMerkleProof = async tx => {
    if (!tx.id) { alert("거래 ID를 찾을 수 없어 검증할 수 없습니다."); return; }
    if (!tx.batchId) { alert("블록체인 기록 대기 중이거나 Batch ID가 없습니다."); return; }

    if (!contract) initContract();
    if (!contract) { alert(error.value || "컨트랙트 초기화에 실패했습니다."); return; }

    loadingVerification.value = true;
    tx.integrity = undefined;
    tx.integrityMessage = '검증 중...';

    let proofResponseData;
    try {
        // 1. 💡 명세서 반영: URL 경로와 Path Parameter 사용 + Query Parameter 사용
        // URL: /api/transactions/proof/{provider_tx_id}
        // Query: ?ledgerId=...
        const proofUrl = `/api/transactions/proof/${tx.providerTxId}`; 
        
        const { data } = await api.get(proofUrl, {
            params: {
                ledgerId: ledgerId.value // Query Parameter로 전송
            }
        }); 
        proofResponseData = data;
        
        // 🚨 Merkle Proof 검증에 필요한 proof 배열 필드가 명세서 응답에 누락되어 있음.
        // 클라이언트 검증을 위해 'proof' 필드가 있다고 가정하고 코드를 유지합니다.
        if (!proofResponseData.leaf || !proofResponseData.proof || proofResponseData.batchId === undefined) {
         throw new Error("백엔드로부터 올바른 Merkle Proof 데이터를 받지 못했습니다. (Leaf, Proof, Batch ID 필요)");
       }
    } catch (e) {
        console.error('Proof 데이터 로드 실패:', e);
        tx.integrity = false;
        tx.integrityMessage = `❌ 무결성 검증 데이터 로드 실패: ${e.message || e?.response?.data?.message || '네트워크 오류'}`;
        items.value = items.value.map((it) => (it.id === tx.id ? { ...tx } : it));
        loadingVerification.value = false;
        return;
    }

    try {
        // 🚨 proof 필드는 명세서에 없지만, 클라이언트 검증을 위해 사용합니다.
        const { leaf, proof, batchId } = proofResponseData;

        // 1. 온체인 Merkle Root 조회
        const scMerkleRootBytes = await contract.merkleRoots(batchId);
        const scMerkleRoot = String(scMerkleRootBytes).toLowerCase();

        // 2. 프론트에서 Merkle Proof 를 통해 root 계산
        const computedRoot = computeMerkleRoot(leaf, proof).toLowerCase();

        // 3. 무결성 검증
        if (computedRoot === scMerkleRoot) {
            tx.integrity = true;
            tx.integrityMessage = "✅ 무결성 검증 성공 (Merkle Proof 일치)";
        } else {
            tx.integrity = false;
            tx.integrityMessage = "❌ 무결성 검증 실패 (Proof 불일치)";
            console.warn(`Computed Root: ${computedRoot}, SC Root: ${scMerkleRoot}`);
        }

    } catch (e) {
        console.error("SC 호출 및 검증 오류:", e);
        tx.integrity = false;
        tx.integrityMessage = `❌ 블록체인 검증 오류: 컨트랙트 호출 또는 Merkle 계산 오류.`;
    } finally {
        loadingVerification.value = false;
        items.value = items.value.map(item => item.id === tx.id ? {...tx} : item);
    }
};

onMounted(() => {
    if (ledgerId.value) {
        fetchTransactions();
        initContract();
    } else {
        error.value = "❌ 장부 ID가 유효하지 않습니다.";
    }
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