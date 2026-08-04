import React, { useRef, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import InputBar from './InputBar';
import { Compass, Zap } from 'lucide-react';

const SUGGESTIONS_BY_CATEGORY = {
  all: [
    {
      id: 'evisa-legal',
      icon: '📑',
      title: 'Quy định E-Visa mới nhất 2026',
      subtitle: 'Thủ tục visa điện tử & 45 ngày miễn thị thực',
      query: 'Cần chuẩn bị những thủ tục visa gì và quy định nhập cảnh mới nhất khi tới Việt Nam?',
      category: 'legal'
    },
    {
      id: 'phu-quoc',
      icon: '🏝️',
      title: 'Kinh nghiệm du lịch Phú Quốc',
      subtitle: 'Bãi Sao, hòn Thơm, lặn ngắm san hô & hải sản',
      query: 'Lập lịch trình du lịch Phú Quốc 3N2Đ tự túc chi tiết, gợi ý các bãi biển đẹp và hải sản ngon.',
      category: 'news'
    },
    {
      id: 'hanoi-food',
      icon: '🍜',
      title: 'Món ăn nên thử ở Hà Nội',
      subtitle: 'Phở gia truyền, bún chả, cà phê trứng',
      query: 'Danh sách các món ăn đặc sản Hà Nội nhất định phải thử kèm địa chỉ chuẩn vị local ở Phố Cổ.',
      category: 'news'
    },
    {
      id: 'hoian-schedule',
      icon: '🏮',
      title: 'Lịch trình 3 ngày ở Hội An',
      subtitle: 'Thả đèn hoa đăng, cao lầu, biển An Bàng',
      query: 'Gợi ý lịch trình tham quan Hội An 3 ngày tự túc, check-in phố cổ và nhà cổ.',
      category: 'news'
    }
  ],
  legal: [
    {
      id: 'evisa-latest',
      icon: '📑',
      title: 'Quy định E-visa mới nhất',
      subtitle: 'Thời hạn 90 ngày & các nước được áp dụng',
      query: 'Quy định E-visa Việt Nam mới nhất hiện nay áp dụng cho những quốc gia nào và thời hạn bao nhiêu ngày?',
      category: 'legal'
    },
    {
      id: 'visa-free',
      icon: '🛡️',
      title: 'Miễn thị thực nhập cảnh',
      subtitle: 'Danh sách 13 nước miễn visa 45 ngày',
      query: 'Những quốc gia nào được miễn thị thực tạm trú 45 ngày khi nhập cảnh Việt Nam?',
      category: 'legal'
    },
    {
      id: 'health-safety',
      icon: '🏥',
      title: 'Quy định Y tế & An toàn du lịch',
      subtitle: 'Bảo hiểm du lịch, tiêm chủng & hotline cấp cứu',
      query: 'Những lưu ý về y tế, bảo hiểm sức khỏe và an toàn khi du lịch Việt Nam?',
      category: 'legal'
    },
    {
      id: 'entry-ports',
      icon: '✈️',
      title: 'Cửa khẩu chấp nhận E-visa',
      subtitle: 'Sân bay quốc tế & cửa khẩu đường bộ',
      query: 'Danh sách các sân bay quốc tế và cửa khẩu chấp nhận nhập cảnh bằng E-visa Việt Nam?',
      category: 'legal'
    }
  ],
  news: [
    {
      id: 'hoian-3days',
      icon: '🏮',
      title: 'Lịch trình 3 ngày ở Hội An',
      subtitle: 'Phố cổ, làng rau Trà Quế & biển An Bàng',
      query: 'Gợi ý lịch trình du lịch Hội An 3 ngày tự túc, các điểm check-in đẹp và quán ăn truyền thống.',
      category: 'news'
    },
    {
      id: 'hanoi-must-try',
      icon: '🍜',
      title: 'Món ăn nên thử ở Hà Nội',
      subtitle: 'Phở, bún chả, chả cá Lăng, cà phê trứng',
      query: 'Top 10 món ăn ẩm thực đường phố Hà Nội ngon nhất định phải thử.',
      category: 'news'
    },
    {
      id: 'phuquoc-beaches',
      icon: '🏝️',
      title: 'Khám phá bãi biển Phú Quốc',
      subtitle: 'Bãi Kem, Bãi Trường, Hòn Mây Rút',
      query: 'Các bãi biển đẹp nhất Phú Quốc và kinh nghiệm lặn biển ngắm san hô.',
      category: 'news'
    },
    {
      id: 'sapa-trekking',
      icon: '⛰️',
      title: 'Trekking bản làng Sa Pa',
      subtitle: 'Fansipan, bản Cát Cát, Mường Hoa',
      query: 'Lịch trình trekking bản làng Sa Pa 2N1Đ ngắm ruộng bậc thang và săn mây.',
      category: 'news'
    }
  ]
};

export default function ChatArea({
  messages,
  activeDestination,
  onSendMessage,
  onClearChat,
  onExportChat,
  onToggleMobileSidebar,
  onSelectTopic,
  isGenerating,
  ragParams
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const activeCategory = (ragParams && ragParams.docCategory) || 'all';
  const categoryChips = SUGGESTIONS_BY_CATEGORY[activeCategory] || SUGGESTIONS_BY_CATEGORY.all;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/60 relative overflow-hidden">
      {/* Top Header */}
      <ChatHeader
        activeDestination={activeDestination}
        onClearChat={onClearChat}
        onExportChat={onExportChat}
        onToggleMobileSidebar={onToggleMobileSidebar}
      />

      {/* Main Message Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
        {messages.length === 0 ? (
          /* Empty Welcome State */
          <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12 space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500 via-sky-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-teal-500/20 animate-bounce">
              <Compass className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Xin chào! Tôi là Trợ Lý Hướng Dẫn Viên Du Lịch AI 🇻🇳
              </h2>
              <p className="text-sm text-slate-600 max-w-lg leading-relaxed font-medium">
                Tích hợp **Task 9 Hybrid Retrieval Pipeline** (ChromaDB Vector + BM25 + HyDE + RRF Reranking). Chọn chủ đề bên dưới để bắt đầu:
              </p>
            </div>

            {/* Dynamic Category Suggested Prompts */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-4">
              {categoryChips.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => onSelectTopic(topic)}
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-400 transition-all hover:shadow-md hover:shadow-teal-500/10 group flex items-start gap-3 shadow-xs"
                >
                  <span className="text-2xl p-2 rounded-xl bg-slate-100 group-hover:scale-110 transition-transform">
                    {topic.icon || '📍'}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {topic.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{topic.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Populated Messages Feed */
          <div className="max-w-4xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Generating Streaming Spinner Indicator */}
            {isGenerating && (
              <div className="flex items-center gap-3 my-4">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-600 to-amber-500 flex items-center justify-center text-white shadow-md animate-spin">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-700 font-medium flex items-center gap-2 shadow-xs">
                  <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
                  Đang chạy Retrieval Pipeline (HyDE + RRF + ChromaDB & BM25)...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Input Bar */}
      <InputBar onSendMessage={onSendMessage} isGenerating={isGenerating} />
    </div>
  );
}
