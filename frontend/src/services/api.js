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

/**
 * Fetch all input documents indexed in the RAG Pipeline
 */
export async function fetchDocuments() {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`);
    if (!response.ok) {
      throw new Error(`Failed to fetch documents ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('⚠️ Documents fetch offline, using fallback list:', error.message);
    return {
      total: 25,
      documents: [
        { id: 'ha-noi-cam-nang-diem-den.md', filename: 'ha-noi-cam-nang-diem-den.md', title: 'Cẩm nang du lịch Hà Nội', category: 'news', char_count: 4449, estimated_chunks: 8 },
        { id: 'phu-quoc-cam-nang-diem-den.md', filename: 'phu-quoc-cam-nang-diem-den.md', title: 'Cẩm nang du lịch Phú Quốc', category: 'news', char_count: 3573, estimated_chunks: 7 },
        { id: 'da-nang-cam-nang-diem-den.md', filename: 'da-nang-cam-nang-diem-den.md', title: 'Cẩm nang du lịch Đà Nẵng', category: 'news', char_count: 4075, estimated_chunks: 8 },
        { id: 'da-nang-foodie-guide.md', filename: 'da-nang-foodie-guide.md', title: 'Đà Nẵng Foodie Guide', category: 'news', char_count: 6787, estimated_chunks: 13 },
        { id: 'hoi-an-cam-nang-diem-den.md', filename: 'hoi-an-cam-nang-diem-den.md', title: 'Cẩm nang du lịch Hội An', category: 'news', char_count: 4302, estimated_chunks: 8 },
        { id: 'sapa-cam-nang-diem-den.md', filename: 'sapa-cam-nang-diem-den.md', title: 'Cẩm nang du lịch Sa Pa', category: 'news', char_count: 4173, estimated_chunks: 8 },
        { id: 'ha-giang-loop-4-ngay.md', filename: 'ha-giang-loop-4-ngay.md', title: 'Hà Giang Loop 4 Ngày', category: 'news', char_count: 6784, estimated_chunks: 13 },
        { id: 'ha-giang-kinh-nghiem-dia-phuong.md', filename: 'ha-giang-kinh-nghiem-dia-phuong.md', title: 'Hà Giang Kinh Nghiệm Địa Phương', category: 'news', char_count: 5732, estimated_chunks: 11 },
        { id: 'hue-cam-nang-diem-den.md', filename: 'hue-cam-nang-diem-den.md', title: 'Cẩm nang du lịch Huế', category: 'news', char_count: 4088, estimated_chunks: 8 },
        { id: 'quy-nhon-lich-trinh-mot-ngay.md', filename: 'quy-nhon-lich-trinh-mot-ngay.md', title: 'Quy Nhơn 24h Xanh Ngát', category: 'news', char_count: 20785, estimated_chunks: 41 },
        { id: 'nha-trang-cam-nang-diem-den.md', filename: 'nha-trang-cam-nang-diem-den.md', title: 'Cẩm nang du lịch Nha Trang', category: 'news', char_count: 4201, estimated_chunks: 8 },
        { id: 'ninh-binh-cam-nang-diem-den.md', filename: 'ninh-binh-cam-nang-diem-den.md', title: 'Cẩm nang du lịch Ninh Bình', category: 'news', char_count: 3973, estimated_chunks: 8 },
        { id: 'can-tho-cam-nang-diem-den.md', filename: 'can-tho-cam-nang-diem-den.md', title: 'Cẩm nang du lịch Cần Thơ', category: 'news', char_count: 4307, estimated_chunks: 8 },
        { id: 'da-lat-cam-nang-diem-den.md', filename: 'da-lat-cam-nang-diem-den.md', title: 'Cẩm nang du lịch Đà Lạt', category: 'news', char_count: 4051, estimated_chunks: 8 },
        { id: 'ho-chi-minh-city-cam-nang-diem-den.md', filename: 'ho-chi-minh-city-cam-nang-diem-den.md', title: 'Cẩm nang du lịch TP.HCM', category: 'news', char_count: 4379, estimated_chunks: 8 },
        { id: 'phong-nha-cam-nang-diem-den.md', filename: 'phong-nha-cam-nang-diem-den.md', title: 'Cẩm nang Phong Nha - Kẻ Bàng', category: 'news', char_count: 4294, estimated_chunks: 8 },
        { id: 'am-thuc-duong-pho-viet-nam.md', filename: 'am-thuc-duong-pho-viet-nam.md', title: 'Ẩm thực đường phố Việt Nam', category: 'news', char_count: 6782, estimated_chunks: 13 },
        { id: 'vietnam-visa-requirements.md', filename: 'vietnam-visa-requirements.md', title: 'Quy định Visa Việt Nam', category: 'legal', char_count: 3106, estimated_chunks: 6 },
        { id: 'vietnam-e-visa-applications.md', filename: 'vietnam-e-visa-applications.md', title: 'Hướng dẫn nộp E-Visa', category: 'legal', char_count: 2323, estimated_chunks: 5 },
        { id: 'luat-du-lich-09-2017-qh14.md', filename: 'luat-du-lich-09-2017-qh14.md', title: 'Luật Du lịch số 09/2017/QH14', category: 'legal', char_count: 77126, estimated_chunks: 154 },
        { id: 'getting-to-vietnam.md', filename: 'getting-to-vietnam.md', title: 'Hướng dẫn di chuyển tới Việt Nam', category: 'legal', char_count: 5247, estimated_chunks: 10 },
        { id: 'getting-around-vietnam.md', filename: 'getting-around-vietnam.md', title: 'Hướng dẫn di chuyển trong Việt Nam', category: 'legal', char_count: 6368, estimated_chunks: 12 },
        { id: 'health-safety-vietnam.md', filename: 'health-safety-vietnam.md', title: 'Sức khỏe & An toàn du lịch', category: 'legal', char_count: 9150, estimated_chunks: 18 },
        { id: 'cam-nang-cung-duong-phieu-luu-viet-nam.md', filename: 'cam-nang-cung-duong-phieu-luu-viet-nam.md', title: 'Cung đường phượt Việt Nam', category: 'legal', char_count: 2019, estimated_chunks: 4 },
        { id: 'cam-nang-du-lich-ben-vung-viet-nam.md', filename: 'cam-nang-du-lich-ben-vung-viet-nam.md', title: 'Cẩm nang du lịch bền vững', category: 'legal', char_count: 5444, estimated_chunks: 11 }
      ]
    };
  }
}
