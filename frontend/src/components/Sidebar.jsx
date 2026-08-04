import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Sparkles, MessageSquare, Compass, ChevronLeft, ChevronRight, History, MapPin } from 'lucide-react';
import ParameterPanel from './ParameterPanel';
import { SUGGESTED_TOPICS } from '../data/mockData';

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  conversations,
  activeConvId,
  setActiveConvId,
  onNewChat,
  onSelectTopic,
  ragParams,
  setRagParams,
  dbStatus
}) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 320 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-slate-50/90 border-r border-slate-200/90 backdrop-blur-xl shrink-0 z-30 select-none shadow-lg"
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-teal-600 hover:bg-teal-500 text-white shadow-md flex items-center justify-center border border-white z-40 transition-transform hover:scale-110"
        title={isCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* Header Logo & Title */}
      <div className="p-4 border-b border-slate-200/80 flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 via-sky-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0">
          <Compass className="w-6 h-6 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        </div>

        {!isCollapsed && (
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-sm text-slate-900 tracking-tight truncate">
                AI Travel Assistant
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 flex items-center gap-0.5 shrink-0">
                <Sparkles className="w-2.5 h-2.5" /> RAG
              </span>
            </div>
            <p className="text-[11px] text-teal-700 font-semibold truncate">Smart Tour Guide 🇻🇳</p>
          </div>
        )}
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
            isCollapsed
              ? 'px-0 bg-teal-600 hover:bg-teal-500 text-white'
              : 'px-4 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-500 hover:to-sky-500 text-white hover:shadow-teal-500/25 hover:shadow-lg'
          }`}
          title="Tạo Cuộc Trò Chuyện Mới"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Tạo Trò Chuyện Mới</span>}
        </button>

        {/* Parameter Control Panel */}
        {!isCollapsed && (
          <div>
            <ParameterPanel ragParams={ragParams} setRagParams={setRagParams} dbStatus={dbStatus} />
          </div>
        )}

        {/* Suggested Quick Topics */}
        {!isCollapsed && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
              <span>💡 Chủ Đề Gợi Ý</span>
              <span className="text-teal-700 font-semibold">Fast Tour</span>
            </h3>
            <div className="space-y-1.5">
              {SUGGESTED_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => onSelectTopic(topic)}
                  className="w-full p-2.5 rounded-xl bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-400 transition-all text-left group flex items-start gap-2.5 shadow-2xs"
                >
                  <span className="text-lg shrink-0 mt-0.5">{topic.icon}</span>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors truncate">
                      {topic.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">{topic.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Conversations History */}
        <div className="space-y-2">
          {!isCollapsed && (
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Lịch Sử Chuyến Đi</span>
            </h3>
          )}

          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`w-full p-2.5 rounded-xl transition-all text-left flex items-center gap-2.5 ${
                  activeConvId === conv.id
                    ? 'bg-teal-100/80 border border-teal-300 text-teal-900 font-bold shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/70'
                }`}
                title={conv.title}
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-teal-600" />
                {!isCollapsed && (
                  <div className="overflow-hidden flex-1">
                    <div className="text-xs font-semibold truncate">{conv.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{conv.date}</div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between bg-slate-100/50">
          <span className="flex items-center gap-1 font-medium">
            <MapPin className="w-3 h-3 text-amber-500" /> Vietnam Travel RAG
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">
            v2.4 Live
          </span>
        </div>
      )}
    </motion.aside>
  );
}
