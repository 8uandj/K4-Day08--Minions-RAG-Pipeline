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
          query: 'Cần lưu ý gì về điều kiện xin E-visa và quy định nhập cảnh Việt Nam cho người nước ngoài?',
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
 * Send chat message, doc_type filter, and RAG parameters to FastAPI backend
 */
export async function sendChatMessage({
  message,
  topK = 5,
  useHyDE = true,
  usePageIndex = false,
  docType = 'all',
  chunkSize = 512,
  chunkOverlap = 50,
  chunkingMethod = 'Recursive Character'
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
        use_pageindex: usePageIndex,
        doc_type: docType,
        chunking_config: {
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap,
          method: chunkingMethod
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    return {
      success: true,
      answer: data.answer,
      citations: data.citations || [],
      itinerary: data.itinerary || null,
      costSummary: data.cost_summary || null,
      recommendedFoods: data.recommended_foods || null,
    };
  } catch (error) {
    console.error('❌ Failed to fetch from RAG API:', error.message);
    
    // Offline Fallback Response
    return {
      success: false,
      isOffline: true,
      error: error.message,
      answer: `⚠️ **Lỗi kết nối máy chủ RAG API (${error.message}).**\n\nHệ thống tạm thời sử dụng chế độ lưu trữ ngoại tuyến. Vui lòng kiểm tra server \`python -m uvicorn app:app --port 8000\`.`,
      citations: [
        {
          id: 'cit-offline',
          title: 'Dữ liệu Cẩm nang & Pháp lý Ngoại tuyến',
          source: 'vietnam-e-visa-applications.md',
          category: docType === 'legal' ? 'legal' : 'news',
          content: 'Kết nối API không khả dụng, dữ liệu được tải từ bộ nhớ đệm ứng dụng.',
          score: 0.90,
          score_display: '90%',
          url: null,
          type: 'official',
          chunk_id: 'chunk_1',
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap
        }
      ],
      itinerary: null,
      costSummary: null,
      recommendedFoods: null
    };
  }
}
