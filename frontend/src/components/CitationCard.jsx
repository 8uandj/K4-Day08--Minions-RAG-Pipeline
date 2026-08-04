import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ExternalLink, ChevronDown, CheckCircle2, ShieldCheck, Newspaper, Compass, Layers, Scissors, FileText, Scale } from 'lucide-react';

export default function CitationCard({ citations }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!citations || citations.length === 0) return null;

  const isLegalDoc = (cit) => {
    const cat = (cit.category || cit.doc_type || '').toLowerCase();
    const src = (cit.source || cit.title || '').toLowerCase();
    return cat === 'legal' || src.includes('visa') || src.includes('legal') || src.includes('y-te') || src.includes('health');
  };

  const getBadgeStyle = (cit) => {
    if (isLegalDoc(cit)) {
      return {
        badgeClass: 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
        icon: <Scale className="w-3.5 h-3.5 text-sky-700" />,
        label: 'Pháp Lý & Visa (Legal)'
      };
    }
    return {
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
      icon: <Compass className="w-3.5 h-3.5 text-emerald-700" />,
      label: 'Cẩm Nang Du Lịch (News)'
    };
  };

  return (
    <div className="mt-4 border border-teal-200 bg-slate-50/90 rounded-2xl overflow-hidden shadow-xs">
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
            <p className="text-xs text-slate-500">Trích xuất từ ChromaDB Vector Store ({citations.length} chunks)</p>
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
            {citations.map((cit, idx) => {
              const style = getBadgeStyle(cit);
              const scoreVal = typeof cit.score === 'number' ? cit.score : parseFloat(cit.score) || 0.85;
              const scoreDisplay = cit.score_display || (scoreVal <= 1.0 ? `${Math.round(scoreVal * 100)}%` : `${scoreVal}`);

              return (
                <div
                  key={cit.id || idx}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-teal-400 transition-all shadow-2xs group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-teal-800 px-2 py-0.5 rounded bg-teal-100 border border-teal-300">
                        [Nguồn {idx + 1}]
                      </span>

                      {/* Category Badge: Legal vs Travel Guide */}
                      <span className={`text-xs px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${style.badgeClass}`}>
                        {style.icon}
                        {style.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Similarity: {scoreDisplay}
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

                  <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cit.title}</span>
                  </h4>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 italic mb-2">
                    "{cit.snippet || cit.content}"
                  </p>

                  {/* Chunk Context & Indexing Metadata Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-teal-600" />
                      {cit.chunk_id || `chunk_${idx + 1}`}
                    </span>

                    <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200 flex items-center gap-1">
                      <Scissors className="w-3 h-3 text-teal-600" />
                      File: {cit.source}
                    </span>

                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                      Size: {cit.chunk_size || 512}c | Overlap: {cit.chunk_overlap || 50}c
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
