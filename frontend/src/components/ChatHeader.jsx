import React from 'react';
import { Menu, Trash2, Download, MapPin } from 'lucide-react';

export default function ChatHeader({
  activeDestination,
  onClearChat,
  onExportChat,
  onToggleMobileSidebar
}) {
  return (
    <header className="px-4 py-3 bg-white/90 border-b border-slate-200/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-3">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 md:hidden"
          title="Mở Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Destination & Status Badge */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>{activeDestination || 'Điểm Đến: Hà Giang & Cao Nguyên Đá'}</span>
            </h2>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-semibold border border-teal-300">
              RAG Active
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 font-semibold">Online & Ready to guide</span>
            <span className="text-slate-300">•</span>
            <span className="hidden md:inline text-slate-600">Trợ lý du lịch thông minh Việt Nam</span>
          </div>
        </div>
      </div>

      {/* Header Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExportChat}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          title="Xuất lịch trình & hội thoại"
        >
          <Download className="w-3.5 h-3.5 text-sky-600" />
          <span className="hidden sm:inline">Xuất Trò Chuyện</span>
        </button>

        <button
          onClick={onClearChat}
          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          title="Xóa đoạn chat hiện tại"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
          <span className="hidden sm:inline">Xóa Chat</span>
        </button>
      </div>
    </header>
  );
}
