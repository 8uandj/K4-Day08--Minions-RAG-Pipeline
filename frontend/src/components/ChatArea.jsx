import React, { useRef, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import InputBar from './InputBar';
import { SUGGESTED_TOPICS } from '../data/mockData';
import { Compass } from 'lucide-react';

export default function ChatArea({
  messages,
  activeDestination,
  onSendMessage,
  onClearChat,
  onExportChat,
  onToggleMobileSidebar,
  onSelectTopic,
  isGenerating,
  suggestedChips
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const chipsToDisplay = (suggestedChips && suggestedChips.length > 0) ? suggestedChips : SUGGESTED_TOPICS;

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
                Tôi được tích hợp hệ thống ChromaDB RAG (204 chunks cẩm nang du lịch & pháp lý nhập cảnh), sẵn sàng lập lịch trình chi tiết, tư vấn visa và gợi ý quán ngon.
              </p>
            </div>

            {/* Quick Prompt Cards */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-4">
              {chipsToDisplay.map((topic) => (
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
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
                  Đang truy vấn ChromaDB Vector Store & tổng hợp cẩm nang du lịch...
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
