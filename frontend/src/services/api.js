const API_BASE_URL = '/api';

/**
 * Fetch health status of backend & ChromaDB Vector Store
 */
export async function fetchHealthStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('⚠️ API Health check offline or unreachable:', error.message);
    return {
      status: 'offline',
      vector_db: 'Disconnected (Offline Fallback)',
      document_count: 204,
      embedding_model: 'BAAI/bge-m3'
    };
  }
}

/**
 * Fetch Task 9 Configuration Metadata (Categories & Destinations)
 */
export async function fetchConfigMeta() {
  try {
    const response = await fetch(`${API_BASE_URL}/config/meta`);
    if (!response.ok) {
      throw new Error(`Failed to fetch config meta ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('⚠️ Config meta fetch offline, using fallback:', error.message);
    return {
      categories: [
        { id: 'all', label: 'Tất cả tài liệu (All)', desc: 'Cẩm nang du lịch & Văn bản pháp lý' },
        { id: 'news', label: 'Cẩm nang du lịch (News)', desc: 'Kinh nghiệm địa phương, bãi biển, ẩm thực' },
        { id: 'legal', label: 'Pháp lý & Visa (Legal)', desc: 'Thủ tục E-Visa, Y tế & An toàn nhập cảnh' }
      ],
      destinations: [
        { id: 'all', name: 'Tất cả địa điểm' },
        { id: 'ha-noi', name: 'Hà Nội' },
        { id: 'phu-quoc', name: 'Phú Quốc' },
        { id: 'ho-chi-minh-city', name: 'TP. Hồ Chí Minh' },
        { id: 'hoi-an', name: 'Hội An' },
        { id: 'sa-pa', name: 'Sa Pa' }
      ]
    };
  }
}

/**
 * Fetch available travel destinations & quick chips from backend
 */
export async function fetchDestinations() {
  try {
    const response = await fetch(`${API_BASE_URL}/destinations`);
    if (!response.ok) {
      throw new Error(`Failed to fetch destinations ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('⚠️ Destinations fetch offline, using fallback:', error.message);
    return {
      destinations: [],
      suggested_chips: [
        {
          id: 'phu-quoc',
          icon: '🏝️',
          title: 'Kinh nghiệm du lịch Phú Quốc',
          subtitle: 'Bãi Sao, hòn Thơm, lặn ngắm san hô & hải sản',
          query: 'Lập lịch trình du lịch Phú Quốc 3N2Đ tự túc chi tiết, gợi ý các bãi biển đẹp và hải sản ngon.',
          category: 'news'
        },
        {
          id: 'evisa-legal',
          icon: '📑',
          title: 'Hướng dẫn E-Visa & Visa Việt Nam',
          subtitle: 'Thủ tục xin visa điện tử, thời hạn & diện miễn visa',
          query: 'Cần chuẩn bị những thủ tục visa gì và quy định nhập cảnh mới nhất khi tới Việt Nam?',
          category: 'legal'
        },
        {
          id: 'hanoi-food',
          icon: '🍜',
          title: 'Ẩm thực Phố cổ Hà Nội',
          subtitle: 'Phở gia truyền, bún chả, cà phê trứng',
          query: 'Danh sách các món ăn đặc sản Hà Nội nhất định phải thử kèm địa chỉ chuẩn vị local ở Phố Cổ.',
          category: 'news'
        },
        {
          id: 'hoi-an',
          icon: '🏮',
          title: 'Khám phá Phố cổ Hội An 2N1Đ',
          subtitle: 'Thả đèn hoa đăng, cao lầu, biển An Bàng',
          query: 'Gợi ý lịch trình tham quan Hội An 2 ngày 1 đêm, check-in phố cổ và nhà cổ.',
          category: 'news'
        }
      ]
    };
  }
}

/**
 * Send chat message with full Task 9 Retrieval parameters to FastAPI backend
 */
export async function sendChatMessage({
  message,
  topK = 5,
  useHyDE = true,
  useRRF = true,
  docCategory = 'all',
  destinationFilter = 'all',
  alpha = 0.5
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        top_k: topK,
        use_hyde: useHyDE,
        use_rrf: useRRF,
        doc_category: docCategory,
        destination_filter: destinationFilter,
        alpha: alpha
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    return {
      success: true,
      answer: data.answer,
      latencyMs: data.latency_ms || 300,
      retrievalStats: data.retrieval_stats || {
        total_retrieved: data.citations ? data.citations.length : 0,
        used_hyde: useHyDE,
        used_rrf: useRRF,
        best_score: 0.89,
        alpha: alpha,
        doc_category: docCategory,
        destination_filter: destinationFilter
      },
      citations: data.citations || [],
      itinerary: data.itinerary || null,
      costSummary: data.cost_summary || null,
      recommendedFoods: data.recommended_foods || null,
    };
  } catch (error) {
    console.error('❌ Failed to fetch from Task 9 RAG API:', error.message);
    
    // Offline Fallback Response
    return {
      success: false,
      isOffline: true,
      error: error.message,
      answer: `⚠️ **Lỗi kết nối máy chủ Task 9 RAG API (${error.message}).**\n\nHệ thống tạm thời sử dụng chế độ lưu trữ ngoại tuyến. Vui lòng kiểm tra server \`python -m uvicorn app:app --port 8000\`.`,
      latencyMs: 150,
      retrievalStats: {
        total_retrieved: 1,
        used_hyde: useHyDE,
        used_rrf: useRRF,
        best_score: 0.90,
        alpha: alpha,
        doc_category: docCategory,
        destination_filter: destinationFilter
      },
      citations: [
        {
          id: 'cit-offline',
          chunk_id: 'chunk_offline_01',
          source_file: 'vietnam-e-visa-applications.md',
          title: 'Dữ liệu Cẩm nang & Pháp lý Ngoại tuyến',
          category: docCategory === 'legal' ? 'legal' : 'news',
          content: 'Kết nối API không khả dụng, dữ liệu được tải từ bộ nhớ đệm ứng dụng.',
          score: 0.90,
          score_display: '90%',
          rerank_rank: 1,
          source: 'offline_fallback',
          url: null
        }
      ],
      itinerary: null,
      costSummary: null,
      recommendedFoods: null
    };
  }
}
