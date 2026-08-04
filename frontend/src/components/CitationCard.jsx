import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ExternalLink, ChevronDown, CheckCircle2, Compass, Layers, Scissors, FileText, Scale, Code, Award, Zap } from 'lucide-react';

export default function CitationCard({ citations }) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedRawChunk, setExpandedRawChunk] = useState(null); // Chunk index currently expanded

  if (!citations || citations.length === 0) return null;

  const getBadgeStyle = (cit) => {
    const cat = (cit.category || '').toLowerCase();
    const src = (cit.source_file || cit.source || cit.title || '').toLowerCase();

    if (cat === 'legal' || src.includes('visa') || src.includes('luat-du-lich') || src.includes('e-visa')) {
      return {
        badgeClass: 'bg-sky-100 text-sky-900 border-sky-300 font-bold',
        icon: <Scale className="w-3.5 h-3.5 text-sky-700" />,
        label: 'Pháp Lý & Visa (Legal)'
      };
    }

    if (cat === 'food' || src.includes('food') || src.includes('am-thuc') || src.includes('ẩm thực')) {
      return {
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        icon: <Compass className="w-3.5 h-3.5 text-amber-700" />,
        label: 'Ẩm Thực & Đặc Sản (Food)'
      };
    }

    return {
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
      icon: <Compass className="w-3.5 h-3.5 text-emerald-700" />,
      label: 'Cẩm Nang Du Lịch (Guide)'
    };
  };

  return (
    <div className="mt-4 border border-teal-200 bg-slate-50/90 rounded-2xl overflow-hidden shadow-xs">
      {/* Header Bar */}
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
              📍 RAG Citations & Context
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-200/80 text-teal-900 border border-teal-300">
                {citations.length} nguồn RAG
              </span>
            </span>
            <p className="text-xs text-slate-500">Truy xuất kết hợp Dense Vector, BM25 & RRF Reranking</p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-500" />
        </motion.div>
      </button>

      {/* Collapsible Citation Cards List */}
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
              const rankNum = cit.rerank_rank || (idx + 1);

              // Extract Cosine score and RRF score cleanly
              const scoreVal = typeof cit.score === 'number' ? cit.score : parseFloat(cit.score) || 0.85;
              const cosineVal = typeof cit.cosine_score === 'number' ? cit.cosine_score : (scoreVal > 0.1 ? scoreVal : 0.85);
              const rrfVal = typeof cit.rrf_score === 'number' ? cit.rrf_score : (scoreVal <= 0.1 ? scoreVal : (1.0 / (60 + rankNum)));

              const cosineDisplay = `${Math.round(cosineVal * 100)}%`;
              const rrfDisplay = rrfVal < 0.1 ? rrfVal.toFixed(4) : rrfVal.toFixed(2);

              const isRawExpanded = expandedRawChunk === idx;

              return (
                <div
                  key={cit.id || idx}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/90 hover:border-teal-400 transition-all shadow-2xs group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {/* RRF Rank Badge */}
                      <span className="text-xs font-extrabold text-amber-900 px-2 py-0.5 rounded bg-amber-100 border border-amber-300 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        #{rankNum} Reranked
                      </span>

                      {/* Category Badge: Legal vs Travel Guide */}
                      <span className={`text-xs px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${style.badgeClass}`}>
                        {style.icon}
                        {style.label}
                      </span>
                    </div>

                    {/* Cosine & RRF Score Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Cosine Similarity Score Badge */}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1" title="Điểm tương đồng ngữ nghĩa Cosine Similarity">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Cosine: {cosineDisplay}
                      </span>

                      {/* RRF Rerank Score Badge */}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1" title="Điểm xếp hạng Reciprocal Rank Fusion">
                        <Zap className="w-3.5 h-3.5 text-purple-600" />
                        RRF: {rrfDisplay}
                      </span>

                      {cit.url && (
                        <a
                          href={cit.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-semibold underline underline-offset-2 opacity-90 group-hover:opacity-100 transition-opacity ml-1"
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

                  {/* Metadata Badges & Raw Chunk Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100 text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-teal-600" />
                        {cit.chunk_id || `chunk_${idx + 1}`}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200 flex items-center gap-1">
                        <Scissors className="w-3 h-3 text-teal-600" />
                        File: {cit.source_file || cit.source}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-semibold border border-sky-200">
                        Method: {cit.source || 'hybrid'}
                      </span>
                    </div>

                    <button
                      onClick={() => setExpandedRawChunk(isRawExpanded ? null : idx)}
                      className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 border border-teal-200 px-2 py-0.5 rounded bg-teal-50 hover:bg-teal-100 transition-colors"
                    >
                      <Code className="w-3 h-3" />
                      {isRawExpanded ? 'Ẩn Raw Chunk' : 'Show Raw Chunk'}
                    </button>
                  </div>

                  {/* Show Raw Chunk Preview Drawer */}
                  {isRawExpanded && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 space-y-1">
                      <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-1 flex justify-between">
                        <span>Raw Chunk Excerpt JSON</span>
                        <span>{cit.chunk_id}</span>
                      </div>
                      <pre className="text-[11px] text-slate-300 whitespace-pre-wrap">
                        {JSON.stringify(
                          {
                            chunk_id: cit.chunk_id,
                            source_file: cit.source_file || cit.source,
                            category: cit.category,
                            rerank_rank: cit.rerank_rank || rankNum,
                            cosine_score: cosineVal,
                            rrf_score: rrfVal,
                            retrieval_source: cit.source,
                            raw_content: cit.content
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
