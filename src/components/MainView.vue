<template>
  <HeaderView />

  <div class="intro-section">
    <h1>Clean : US</h1>
    <p>블록체인에 기록된 무결성이 보장된 장부를 확인하세요!</p>
    
    <div class="button-group">
      <button @click="scrollToContent" class="scroll-button">게시물 바로가기</button>
      <button @click="goTomakeledger" class="ledger-button">장부 생성하기</button>
    </div>
  </div>

  <div ref="mainContent" class="main-page-container">
    <div class="centered-header-section">
      <h2 class="page-title">모든 게시물</h2>

      <div v-if="errorMessage" class="api-error">
        {{ errorMessage }}
      </div>

      <div class="search-box">
        <input
          type="text"
          placeholder="모임명을 검색해주세요."
          class="search-input"
          v-model="searchQuery"
          @keyup.enter="onSearch"
        />
        <button class="search-button" @click="onSearch">검색</button>
      </div>
    </div>

    <div v-if="loading" class="loading-message">게시물 목록을 불러오는 중...</div>

    <div v-else class="post-grid">
      <div 
        v-for="post in postsData" 
        :key="post.id" 
        class="post-card" 
        @click="goToPostDetail(post.id, post.name)"
      >
        <div class="post-details">
          <h3 class="post-title">{{ post.name }}</h3>
          <p class="post-group">{{ post.groupName }}</p>
          <span class="post-date">{{ post.date }}</span>
        </div>

        <div class="favorite-button" @click.stop="toggleFavorite(post.id)">
          <span v-if="isFavorite(post.id)">★</span>
          <span v-else>☆</span>
        </div>
      </div>

      <div v-if="postsData.length === 0 && !loading" class="no-posts">
        <p>표시할 게시물이 없습니다.</p>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button 
        @click="changePage(currentPage - 1)" 
        :disabled="currentPage === 1"
        class="page-nav-button"
      >
        이전
      </button>

      <span class="divider">|</span>

      <div class="page-numbers">
        <button 
          v-for="page in paginatedPages" 
          :key="page" 
          @click="changePage(page)" 
          :class="['page-number-button', { active: page === currentPage }]">
          {{ page }}
        </button>
      </div>

      <span class="divider">|</span>

      <button 
        @click="changePage(currentPage + 1)" 
        :disabled="currentPage === totalPages"
        class="page-nav-button"
      >
        다음
      </button>
    </div>
  </div>

  <ModalView
    :isVisible="isModalOpen"
    :title="modalTitle"
    @close="isModalOpen = false"
  >
    <p class="instruction-text">장부 접근을 위해 비밀번호를 입력해주세요.</p>

    <div class="input-group">
      <input 
        type="password" 
        v-model="accessPassword" 
        @keyup.enter="handleAccessAttempt"
        placeholder="비밀번호 입력"
        required
        ref="passwordInput"
      >
    </div>
    <p v-if="accessError" class="error-msg">{{ accessError }}</p>

    <template #footer>
      <button @click="handleAccessAttempt" class="btn-confirm" :disabled="!accessPassword">
        접속
      </button>
      <button @click="isModalOpen = false" class="btn-cancel">
        취소
      </button>
    </template>
  </ModalView>
</template>

<script setup>
const MOCK_POSTS = [
  {
    id: 1,
    name: '25년도 1학기 컴퓨터공학과 학생회 장부',
    groupName: '컴퓨터공학과 학생회',
    date: '2025-03-02',
  },
  {
    id: 2,
    name: '25년도 1학기 총학생회 장부',
    groupName: '총학생회',
    date: '2025-03-05',
  },
  {
    id: 3,
    name: '25년도 2학기 동아리 A 장부',
    groupName: '동아리 A',
    date: '2025-09-10',
  },
  {
    id: 4,
    name: '25년도 2학기 동아리 B 장부',
    groupName: '동아리 B',
    date: '2025-07-20',
  },
  // 필요하면 더 추가해서 테스트해도 됨
];

import { useRouter } from 'vue-router';
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { api } from '@/api/axios';
import { useAuth } from '@/composables/useAuth';
import HeaderView from '@/components/HeaderView.vue';
import ModalView from '@/components/ModalView.vue';

const router = useRouter();
const mainContent = ref(null);
const passwordInput = ref(null);

const favoriteIds = ref([]);
const errorMessage = ref('');
const loading = ref(false);

// 💡 추가된 상태 변수: 로그인 상태 확인
const { initialized, isLoggedIn, refreshSession } = useAuth();

// 페이지네이션 및 상태
const postsData = ref([]);
const currentPage = ref(1);
const pageSize = 12;
const totalItems = ref(0);
const searchQuery = ref('');

// 모달 관련 상태
const isModalOpen = ref(false);
const selectedLedgerId = ref(null);
const modalTitle = ref('');
const accessPassword = ref('');
const accessError = ref('');

// API 호출: 게시물 불러오기
const fetchPosts = async (page = currentPage.value) => {
  loading.value = true;
  errorMessage.value = '';

  try {
    // 1) 기본 데이터: 하드코딩된 MOCK_POSTS에서 시작
    let source = [...MOCK_POSTS];

    // 2) 검색어가 있으면 필터링 (모임명 / 그룹명 둘 다 검색)
    if (searchQuery.value && searchQuery.value.trim() !== '') {
      const q = searchQuery.value.trim().toLowerCase();
      source = source.filter((p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.groupName && p.groupName.toLowerCase().includes(q))
      );
    }

    // 3) 전체 개수 / 페이지 계산
    totalItems.value = source.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageItems = source.slice(startIndex, endIndex);

    postsData.value = pageItems;
    currentPage.value = page;

    // 4) 데이터가 없을 때 메시지
    if (source.length === 0) {
      errorMessage.value = '표시할 게시물이 없습니다.';
    }
  } catch (e) {
    console.error('게시물 로드 실패(하드코딩 버전):', e);
    postsData.value = [];
    totalItems.value = 0;
    errorMessage.value = '데이터를 불러오는 중 오류가 발생했습니다.';
  } finally {
    loading.value = false;
  }
};

// 검색
const onSearch = () => {
  currentPage.value = 1;
  fetchPosts(1);
};

// 페이지네이션
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize));

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    fetchPosts(page);
  }
};

const paginatedPages = computed(() => {
  const pages = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage.value - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages.value, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) pages.push(i);
  if (!pages.includes(1)) pages.unshift(1);
  return pages;
});

// 게시물 클릭 → 모달
const goToPostDetail = (id, name) => {
  selectedLedgerId.value = id;
  modalTitle.value = name + ' - 접근';
  accessPassword.value = '';
  accessError.value = '';
  isModalOpen.value = true;
};

// 모달에서 비밀번호 인증
const handleAccessAttempt = async () => {
  accessError.value = '';
  if (!accessPassword.value) {
    accessError.value = '비밀번호를 입력해주세요.';
    return;
  }
  try {
    const res = await api.post(`/group/${selectedLedgerId.value}/verify-password`, {
      password: accessPassword.value,
    });

    if (res.status === 200) {
      isModalOpen.value = false;
      router.push({ name: 'TransactionDetail', params: { id: selectedLedgerId.value } });
    }
  } catch (e) {
    if (e?.response?.status === 401) {
      accessError.value = '비밀번호가 올바르지 않습니다.';
    } else {
      console.error('접속 시도 오류:', e);
      accessError.value = '서버 연결에 실패했습니다.';
    }
  }
};

// 💡 2. 장부 생성하기 버튼 클릭 시 이동 로직 (추가)
const goTomakeledger = async () => {  
  // 1) 아직 세션 초기화가 안 된 상태면 /me 한 번 호출해서 로그인 여부 동기화
  if (!initialized.value) {
    await refreshSession();
  }

  // 2) 로그인 된 경우 → 장부 생성 페이지로 이동
  if (isLoggedIn.value) {
    router.push({ name: 'makeToledger' });
    return;
  }

  // 3) 로그인 안 된 경우 → 알림 + 로그인 페이지로 이동
  alert('장부를 생성하려면 로그인이 필요합니다.');
  router.push({
    name: 'LoginView',
    query: { redirect: '/makeToledger' }   // 로그인 후 돌아오게 하고 싶으면
  });
};


// 모달 열리면 포커스 자동 이동
watch(isModalOpen, async (val) => {
  if (val) {
    await nextTick();
    passwordInput.value?.focus();
  }
});

// 스크롤
const scrollToContent = () => {
  mainContent.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// 즐겨찾기
const isFavorite = (postId) => favoriteIds.value.includes(postId);
const toggleFavorite = (postId) => {
  const currentPost = postsData.value.find(p => p.id === postId);
  if (!currentPost) return;

  if (isFavorite(postId)) {
    favoriteIds.value = favoriteIds.value.filter(id => id !== postId);
  } else {
    favoriteIds.value.push(postId);
  }
  localStorage.setItem('favoriteIds', JSON.stringify(favoriteIds.value));
};


onMounted(async () => {
  if (!initialized.value) {
    await refreshSession();
  }
  fetchPosts(1);
});
</script>

<style scoped>
/* ----------------------------- */
/* 인트로 섹션 */
.intro-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  height: 85vh;
  width: 100%;
  background-color: #f0f4f8;
  color: #333;
  padding: 10px;
}
.intro-section h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
}
.intro-section p {
  font-size: 1.2rem;
  max-width: 500px;
  line-height: 1.6;
}

/* 1. 버튼 그룹 스타일 (추가) */
.button-group {
    display: flex; /* 수평 나열 */
    gap: 15px; /* 버튼 간 간격 */
    margin-top: 30px;
}

.scroll-button,
.ledger-button {
  padding: 12px 25px;
  font-size: 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.scroll-button {
  background-color: #2F80ED;
  color: white;
}
.scroll-button:hover {
  background-color: #1A73E8;
}
.ledger-button {
  background-color: #06c122ff;
  color: white;
}
.ledger-button:hover {
  background-color: #04680aff;
}


/* ----------------------------- */
/* 게시물 영역 */
.main-page-container {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.centered-header-section {
  text-align: center;
  margin-bottom: 30px;
}
.page-title {
  font-size: 2rem;
  margin-bottom: 15px;
}
.api-error {
  color: red;
  margin-bottom: 10px;
}
.search-box {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}
.search-input {
  padding: 8px 12px;
  width: 250px;
  border: 1px solid #ccc;
  border-radius: 5px;
}
.search-button {
  padding: 8px 15px;
  background-color: #28a745;
  border: none;
  border-radius: 5px;
  color: white;
  cursor: pointer;
}
.search-button:hover {
  background-color: #1e7e34;
}

/* 게시물 카드 */
.post-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}
.post-card {
  position: relative;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.favorite-button {
  position: absolute;
  top: 10px;
  right: 12px;
}
.post-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.post-title {
  font-weight: 600;
  font-size: 1.2rem;
  margin-bottom: 8px;
}
.post-group {
  font-size: 0.95rem;
  color: #555;
  margin-bottom: 6px;
}
.post-date {
  font-size: 0.85rem;
  color: #888;
}
.favorite-button {
  font-size: 1.3rem;
  color: #ffcc00;
  cursor: pointer;
  margin-top: 10px;
}
.no-posts {
  text-align: center;
  font-size: 1.1rem;
  color: #666;
  margin-top: 50px;
}

/* 페이지네이션 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
  gap: 10px;
  flex-wrap: wrap;
}
.page-nav-button,
.page-number-button {
  padding: 6px 12px;
  border: 1px solid #ccc;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
}
.page-number-button.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}
.page-nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.divider {
  font-weight: bold;
  color: #555;
}

/* 모달 */
.input-group input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-bottom: 10px;
}
.btn-confirm {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-cancel {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}
.error-msg {
  color: red;
  font-size: 0.9rem;
}
.instruction-text {
  font-size: 1rem;
  margin-bottom: 10px;
}

/* ----------------------------- */
/* 모바일 반응형 */
@media (max-width: 768px) {
  .intro-section h1 {
    font-size: 2rem;
  }
  .intro-section p {
    font-size: 1rem;
  }
  .button-group {
    flex-direction: column; /* 모바일에서 버튼을 수직으로 재배치 */
  }
  .search-box {
    flex-direction: column;
    gap: 8px;
  }
  .search-input {
    width: 100%;
  }
  .post-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}
</style>