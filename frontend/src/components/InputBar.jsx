import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Sparkles, FileText, X } from 'lucide-react';

export default function InputBar({ onSendMessage, isGenerating }) {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((!input.trim() && !attachedFile) || isGenerating) return;

    let fullQuery = input.trim();
    if (attachedFile) {
      fullQuery = `[Đã đính kèm tệp: ${attachedFile.name}]\n` + fullQuery;
    }

    onSendMessage(fullQuery);
    setInput('');
    setAttachedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
  };

  const toggleVoice = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setInput('Gợi ý cho tôi các điểm check-in hoàng hôn đẹp nhất tại Hà Giang...');
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-white/90 border-t border-slate-200/90 backdrop-blur-xl sticky bottom-0 z-20 shadow-lg">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* File preview pill */}
        {attachedFile && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-300 text-xs text-teal-900 font-semibold shadow-xs">
            <FileText className="w-4 h-4 text-teal-600" />
            <span className="max-w-[200px] truncate">{attachedFile.name}</span>
            <button
              onClick={() => setAttachedFile(null)}
              className="p-0.5 rounded-full hover:bg-teal-200 text-slate-500 hover:text-slate-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating Input Container */}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center gap-2 p-2 rounded-2xl bg-white border border-slate-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 shadow-md transition-all"
        >
          {/* File Attachment Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-teal-700 transition-colors shrink-0"
            title="Đính kèm Cẩm nang PDF / Đề xuất tour"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={toggleVoice}
            className={`p-2.5 rounded-xl transition-colors shrink-0 ${
              isRecording
                ? 'bg-red-100 text-red-600 animate-pulse border border-red-300'
                : 'hover:bg-slate-100 text-slate-500 hover:text-amber-600'
            }`}
            title="Nhập bằng giọng nói"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Textarea Prompt Field */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi AI về lịch trình, đặc sản, vé máy bay hay kinh nghiệm du lịch..."
            className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 text-sm focus:outline-none resize-none max-h-32 py-2 px-1 font-sans font-medium"
          />

          {/* Glowing Send Button */}
          <button
            type="submit"
            disabled={(!input.trim() && !attachedFile) || isGenerating}
            className={`p-3 rounded-xl transition-all shrink-0 flex items-center justify-center shadow-md ${
              input.trim() || attachedFile
                ? 'bg-gradient-to-r from-teal-600 via-emerald-600 to-sky-600 hover:from-teal-500 hover:to-sky-500 text-white font-bold shadow-teal-500/25 hover:scale-105 active:scale-95'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
            title="Gửi câu hỏi"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        {/* Footer Subtext */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-2">
          <span className="flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Trợ lý AI tổng hợp từ Cẩm nang du lịch & Blog uy tín.
          </span>
          <span className="hidden sm:inline text-slate-400 font-mono">
            Enter để gửi • Shift + Enter xuống dòng
          </span>
        </div>
      </div>
    </div>
  );
}
