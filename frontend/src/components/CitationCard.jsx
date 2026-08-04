import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ExternalLink, ChevronDown, CheckCircle2, ShieldCheck, Newspaper, Compass } from 'lucide-react';

export default function CitationCard({ citations }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!citations || citations.length === 0) return null;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'official':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'news':
        return <Newspaper className="w-4 h-4 text-sky-600" />;
      default:
        return <Compass className="w-4 h-4 text-amber-600" />;
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'official':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'news':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="mt-4 border border-teal-200 bg-slate-50/90 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-teal-50/80 hover:bg-teal-100/60 transition-colors text-left border-b border-teal-100"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              📍 Nguồn Tham Khảo & Cẩm Nang (Citations)
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-200/80 text-teal-900 border border-teal-300">
                {citations.length} nguồn RAG
              </span>
            </span>
            <p className="text-xs text-slate-500">Đã được truy vấn & xác thực độ tin cậy từ Vector Database</p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 space-y-3"
          >
            {citations.map((cit, idx) => (
              <div
                key={cit.id || idx}
                className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-teal-400 transition-all shadow-2xs group"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-teal-800 px-2 py-0.5 rounded bg-teal-100 border border-teal-300">
                      [Nguồn {idx + 1}]
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 font-semibold ${getTypeBadgeClass(cit.type)}`}>
                      {getTypeIcon(cit.type)}
                      {cit.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Similarity: {cit.score}
                    </span>

                    {cit.url && (
                      <a
                        href={cit.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-semibold underline underline-offset-2 opacity-90 group-hover:opacity-100 transition-opacity"
                      >
                        Mở liên kết <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-800 mb-1">{cit.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 italic">
                  "{cit.snippet}"
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
