import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { SAMPLE_CHAT_MESSAGES, INITIAL_CONVERSATIONS } from './data/mockData';
import { sendChatMessage, fetchHealthStatus, fetchDestinations, fetchConfigMeta } from './services/api';

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState('conv-1');
  const [messages, setMessages] = useState(SAMPLE_CHAT_MESSAGES);
  const [activeDestination, setActiveDestination] = useState('Hướng Dẫn Visa & Quy Định Nhập Cảnh');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dbStatus, setDbStatus] = useState('Checking Vector DB...');
  const [suggestedChips, setSuggestedChips] = useState([]);
  const [configMeta, setConfigMeta] = useState(null);

  // Task 9 RAG Control Parameters State
  const [ragParams, setRagParams] = useState({
    topK: 5,
    enableHyDE: true,
    enableRRF: true,
    docCategory: 'all', // 'all' | 'news' | 'legal'
    destinationFilter: 'all', // 'all' | 'ha-noi' | 'phu-quoc' | ...
    alpha: 0.5, // 0.0 = BM25, 1.0 = Dense, 0.5 = Hybrid
    chunkSize: 512,
    chunkOverlap: 50,
    chunkingMethod: 'Recursive Character'
  });

  // Check Backend, Vector DB health and load config metadata on mount
  useEffect(() => {
    async function loadInitialData() {
      const healthRes = await fetchHealthStatus();
      if (healthRes && healthRes.status === 'ok') {
        const count = healthRes.document_count || 204;
        setDbStatus(`Connected (${count} chunks | ${healthRes.embedding_model || 'BAAI/bge-m3'})`);
      } else {
        setDbStatus('Offline Mode (Local Fallback)');
      }

      const metaRes = await fetchConfigMeta();
      if (metaRes) {
        setConfigMeta(metaRes);
      }

      const destRes = await fetchDestinations();
      if (destRes && destRes.suggested_chips) {
        setSuggestedChips(destRes.suggested_chips);
      }
    }
    loadInitialData();
  }, []);

  // Handle New Chat creation
  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConv = {
      id: newId,
      title: 'Chuyến Đi / Tra Cứu Mới',
      date: 'Vừa xong',
      preview: 'Đang chờ câu hỏi từ bạn...'
    };

    setConversations([newConv, ...conversations]);
    setActiveConvId(newId);
    setMessages([]);
    setActiveDestination('Tra Cứu Thông Tin Mới');
  };

  // Handle suggested topic click
  const handleSelectTopic = (topic) => {
    setActiveDestination(topic.title);
    handleSendMessage(topic.query);
  };

  // Real Task 9 API RAG query handling
  const handleSendMessage = async (text) => {
    if (!text || !text.trim()) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      // Call FastAPI Backend Endpoint
      const apiResult = await sendChatMessage({
        message: text,
        topK: ragParams.topK,
        useHyDE: ragParams.enableHyDE,
        useRRF: ragParams.enableRRF,
        docCategory: ragParams.docCategory,
        destinationFilter: ragParams.destinationFilter,
        alpha: ragParams.alpha
      });

      const assistantMsg = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: apiResult.answer,
        latencyMs: apiResult.latencyMs,
        retrievalStats: apiResult.retrievalStats,
        citations: apiResult.citations,
        itinerary: apiResult.itinerary,
        costSummary: apiResult.costSummary,
        recommendedFoods: apiResult.recommendedFoods
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Error sending chat message:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear Chat messages
  const handleClearChat = () => {
    setMessages([]);
  };

  // Export conversation history as JSON file
  const handleExportChat = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AI_Travel_Assistant_${activeDestination.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased">
      {/* Desktop / Collapsible Sidebar */}
      <div className="hidden md:flex h-full">
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          conversations={conversations}
          activeConvId={activeConvId}
          setActiveConvId={setActiveConvId}
          onNewChat={handleNewChat}
          onSelectTopic={handleSelectTopic}
          ragParams={ragParams}
          setRagParams={setRagParams}
          dbStatus={dbStatus}
          configMeta={configMeta}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="hidden md:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-80 h-full">
            <Sidebar
              isCollapsed={false}
              setIsCollapsed={() => setMobileSidebarOpen(false)}
              conversations={conversations}
              activeConvId={activeConvId}
              setActiveConvId={setActiveConvId}
              onNewChat={() => {
                handleNewChat();
                setMobileSidebarOpen(false);
              }}
              onSelectTopic={(topic) => {
                handleSelectTopic(topic);
                setMobileSidebarOpen(false);
              }}
              ragParams={ragParams}
              setRagParams={setRagParams}
              dbStatus={dbStatus}
              configMeta={configMeta}
            />
          </div>
        </div>
      )}

      {/* Main Chat Work Area */}
      <ChatArea
        messages={messages}
        activeDestination={activeDestination}
        onSendMessage={handleSendMessage}
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onSelectTopic={handleSelectTopic}
        isGenerating={isGenerating}
        suggestedChips={suggestedChips}
        ragParams={ragParams}
        dbStatus={dbStatus}
      />
    </div>
  );
}
