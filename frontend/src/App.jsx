import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { SAMPLE_CHAT_MESSAGES, INITIAL_CONVERSATIONS } from './data/mockData';

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState('conv-1');
  const [messages, setMessages] = useState(SAMPLE_CHAT_MESSAGES);
  const [activeDestination, setActiveDestination] = useState('Hà Giang 3N2Đ - Phượt Xe Máy');
  const [isGenerating, setIsGenerating] = useState(false);

  // RAG Control Parameters State
  const [ragParams, setRagParams] = useState({
    topK: 5,
    enableHyDE: true,
    enablePageIndex: true
  });

  // Handle New Chat creation
  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConv = {
      id: newId,
      title: 'Chuyến Đi Mới',
      date: 'Vừa xong',
      preview: 'Đang chờ câu hỏi từ bạn...'
    };

    setConversations([newConv, ...conversations]);
    setActiveConvId(newId);
    setMessages([]);
    setActiveDestination('Tạo Chuyến Đi Mới');
  };

  // Handle suggested topic click
  const handleSelectTopic = (topic) => {
    setActiveDestination(topic.title);
    handleSendMessage(topic.query);
  };

  // Simulated AI response generation with RAG retrieval simulation
  const handleSendMessage = (text) => {
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: text
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    // Simulate AI response delay
    setTimeout(() => {
      let aiMsgContent = `Cảm ơn câu hỏi của bạn! Dựa trên dữ liệu tìm kiếm RAG (Top-${ragParams.topK} documents) với mô hình **BAAI/bge-m3**, tôi đã tổng hợp thông tin tốt nhất cho chuyến đi:`;

      let simulatedCitations = [
        {
          id: 'cit-new-1',
          title: `Cẩm Nang Du Lịch Chi Tiết: ${text.slice(0, 30)}...`,
          source: 'Cục Du Lịch Quốc Gia Việt Nam - Official',
          snippet: 'Dữ liệu thời tiết, tuyến đường giao thông và các khu du lịch trọng điểm đã được cập nhật mới nhất cho năm 2026.',
          score: '92%',
          url: 'https://vietnamtourism.gov.vn',
          type: 'official'
        },
        {
          id: 'cit-new-2',
          title: 'Review Thực Tế Từ Cộng Đồng Phượt Việt Nam',
          source: 'Check-in Vietnam Community',
          snippet: 'Nên chuẩn bị sẵn trang phục giữ ấm khi về đêm và đặt phòng nghỉ trước ít nhất 3 ngày để đảm bảo có vị trí view đẹp.',
          score: '87%',
          url: 'https://checkinvietnam.com',
          type: 'blog'
        }
      ];

      const assistantMsg = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `${aiMsgContent}\n\n• **Điểm nổi bật:** Lịch trình được tối ưu theo các tham số HyDE: ${ragParams.enableHyDE ? 'Bật' : 'Tắt'} và PageIndex Fallback: ${ragParams.enablePageIndex ? 'Bật' : 'Tắt'}.\n• **Khuyến nghị:** Chuẩn bị đầy đủ giấy tờ cá nhân, bảo hiểm du lịch và kiểm tra xe cẩn thận trước khi xuất phát.`,
        citations: simulatedCitations
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsGenerating(false);
    }, 1200);
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
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
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
      />
    </div>
  );
}
