const API_BASE_URL = '/api';

/**
 * Fetch health status of the backend API & Vector DB
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
      vector_db: 'Disconnected (Offline Mode)',
      embedding_model: 'BAAI/bge-m3'
    };
  }
}

/**
 * Send chat message and RAG parameters to FastAPI backend
 */
export async function sendChatMessage({
  message,
  topK = 5,
  useHyDE = true,
  usePageIndex = true,
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
      answer: `⚠️ **Lỗi kết nối máy chủ RAG API (${error.message}).**\n\nHệ thống tạm thời sử dụng chế độ lưu trữ ngoại tuyến. Vui lòng kiểm tra server \`python -m uvicorn app:app --port 8000\`.`,
      citations: [
        {
          id: 'cit-offline',
          title: 'Dữ liệu Cẩm nang Ngoại tuyến',
          source: 'Offline Cache',
          snippet: 'Kết nối API không khả dụng, dữ liệu được tải từ bộ nhớ đệm ứng dụng.',
          score: '90%',
          url: null,
          type: 'blog',
          chunk_id: 1,
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
