import React, { useState } from 'react';
import { Sliders, ToggleLeft, ToggleRight, Database, Scissors, Eye, Layers, Filter, ShieldAlert, Compass } from 'lucide-react';

const CHUNKING_METHODS = [
  { id: 'Recursive Character', label: 'Recursive Char', desc: 'Tách theo khoảng trắng & ngắt câu' },
  { id: 'Semantic Chunking', label: 'Semantic', desc: 'Tách theo ngữ nghĩa câu' },
  { id: 'Fixed Size', label: 'Fixed Size', desc: 'Cắt cố định theo số ký tự' },
  { id: 'Markdown Header Aware', label: 'Markdown Header', desc: 'Tách theo tiêu đề # ## ###' }
];

const DOC_CATEGORIES = [
  { id: 'all', label: 'Tất cả (All)', icon: <Filter className="w-3.5 h-3.5" />, desc: 'Tra cứu toàn bộ tài liệu Cẩm nang & Pháp lý' },
  { id: 'news', label: 'Cẩm nang (News)', icon: <Compass className="w-3.5 h-3.5 text-teal-600" />, desc: 'Chỉ tra cứu bài viết điểm đến & ẩm thực' },
  { id: 'legal', label: 'Pháp lý (Legal)', icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />, desc: 'Chỉ tra cứu Visa, E-visa, Y tế & An toàn' }
];

const SAMPLE_TEXT = "Hà Giang là vùng đất thiên nhiên hùng vĩ với con đèo Mã Pí Lèng nổi tiếng. Khi phượt xe máy, du khách cần lưu ý tốc độ dưới 30km/h khi qua các khúc cua gấp. Sương mù ban sáng xuất hiện dày đặc từ tháng 10 đến tháng 12. Thưởng thức bánh cuốn canh và lẩu gà đen tại phố cổ Đồng Văn là trải nghiệm không thể bỏ qua.";

export default function ParameterPanel({ ragParams, setRagParams, dbStatus }) {
  const [activeTab, setActiveTab] = useState('retrieval'); // 'retrieval' | 'chunking'
  const isConnected = !dbStatus || dbStatus.includes('Connected') || dbStatus.includes('ok');

  // Compute live preview chunks for sample text
  const getSimulatedChunks = () => {
    const size = ragParams.chunkSize || 512;
    const overlap = ragParams.chunkOverlap || 50;

    // Chunk 1 text snippet
    const chunk1Text = SAMPLE_TEXT.slice(0, Math.min(size, SAMPLE_TEXT.length));

    // Overlap text
    const overlapStart = Math.max(0, chunk1Text.length - overlap);
    const overlapText = chunk1Text.slice(overlapStart);
    const nonOverlapChunk1 = chunk1Text.slice(0, overlapStart);

    // Chunk 2 text snippet
    const chunk2Start = Math.max(0, chunk1Text.length - overlap);
    const chunk2Text = SAMPLE_TEXT.slice(chunk2Start, Math.min(chunk2Start + size, SAMPLE_TEXT.length));

    return {
      nonOverlapChunk1,
      overlapText,
      chunk2Text: chunk2Text.slice(overlapText.length),
      chunk1Length: chunk1Text.length,
      estimatedTokens: Math.round(size / 4)
    };
  };

  const preview = getSimulatedChunks();

  return (
    <div className="p-3.5 rounded-2xl border border-teal-200/80 bg-teal-50/50 backdrop-blur-md space-y-3 shadow-xs">
      {/* Header & Status */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-teal-600" />
          RAG Control Panel
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${isConnected
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
            : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          BAAI/bge-m3
        </span>
      </div>

      {/* Tab Switcher: Retrieval vs Chunking */}
      <div className="flex p-1 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs font-bold">
        <button
          onClick={() => setActiveTab('retrieval')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'retrieval'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Retrieval
        </button>

        <button
          onClick={() => setActiveTab('chunking')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'chunking'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <Scissors className="w-3.5 h-3.5 ml-1.5" />
          Chunking Strategy
        </button>
      </div>

      {/* TAB 1: RETRIEVAL PARAMS & CATEGORY FILTER */}
      {activeTab === 'retrieval' && (
        <div className="space-y-3 pt-1">
          {/* Document Category Filter */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-teal-600" /> Loại Tài Liệu (Doc Type)
              </span>
              <span className="text-[10px] font-mono text-teal-800 bg-white px-1.5 py-0.5 rounded border border-teal-200 font-bold">
                {ragParams.docType || 'all'}
              </span>
            </label>

            <div className="grid grid-cols-3 gap-1">
              {DOC_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setRagParams((prev) => ({ ...prev, docType: cat.id }))}
                  className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${(ragParams.docType || 'all') === cat.id
                      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                    }`}
                  title={cat.desc}
                >
                  {cat.icon}
                  <span className="truncate">{cat.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top-K Slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 font-medium">Top-K Documents</span>
              <span className="font-mono text-teal-700 font-bold px-1.5 py-0.5 rounded bg-white border border-teal-300 shadow-2xs">
                {ragParams.topK} docs
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={ragParams.topK}
              onChange={(e) => setRagParams((prev) => ({ ...prev, topK: parseInt(e.target.value) }))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>1 (Nhanh)</span>
              <span>5 (Tối ưu)</span>
              <span>10 (Chuyên sâu)</span>
            </div>
          </div>

          {/* HyDE Retrieval Toggle */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div>
              <div className="text-xs font-semibold text-slate-800">HyDE Retrieval</div>
              <div className="text-[10px] text-slate-500">Hypothetical Document Embeddings</div>
            </div>
            <button
              onClick={() => setRagParams((prev) => ({ ...prev, enableHyDE: !prev.enableHyDE }))}
              className={`transition-colors p-1 rounded-lg ${ragParams.enableHyDE ? 'text-teal-600' : 'text-slate-400'
                }`}
            >
              {ragParams.enableHyDE ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
            </button>
          </div>

          {/* PageIndex Fallback Toggle */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div>
              <div className="text-xs font-semibold text-slate-800">PageIndex Fallback</div>
              <div className="text-[10px] text-slate-500">Full PDF Page Rank Search</div>
            </div>
            <button
              onClick={() => setRagParams((prev) => ({ ...prev, enablePageIndex: !prev.enablePageIndex }))}
              className={`transition-colors p-1 rounded-lg ${ragParams.enablePageIndex ? 'text-teal-600' : 'text-slate-400'
                }`}
            >
              {ragParams.enablePageIndex ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: CHUNKING & INDEXING SETTINGS */}
      {activeTab === 'chunking' && (
        <div className="space-y-3 pt-1">
          {/* Chunking Method Chips */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Phương pháp Chunking (Method)</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CHUNKING_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setRagParams((prev) => ({ ...prev, chunkingMethod: m.id }))}
                  className={`p-1.5 text-left rounded-lg border text-[11px] font-semibold transition-all ${ragParams.chunkingMethod === m.id
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                    }`}
                  title={m.desc}
                >
                  <div className="truncate">{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Chunk Size Slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 font-medium">Chunk Size</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-teal-800 font-bold text-[11px] px-1.5 py-0.5 rounded bg-white border border-teal-300">
                  {ragParams.chunkSize || 512} chars
                </span>
                <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  ~{preview.estimatedTokens} tokens
                </span>
              </div>
            </div>
            <input
              type="range"
              min="128"
              max="2048"
              step="32"
              value={ragParams.chunkSize || 512}
              onChange={(e) => setRagParams((prev) => ({ ...prev, chunkSize: parseInt(e.target.value) }))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>128</span>
              <span>512 (Standard)</span>
              <span>2048 (Large)</span>
            </div>
          </div>

          {/* Chunk Overlap Slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 font-medium">Chunk Overlap</span>
              <span className="font-mono text-amber-800 font-bold text-[11px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300">
                {ragParams.chunkOverlap || 50} chars
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="256"
              step="10"
              value={ragParams.chunkOverlap || 50}
              onChange={(e) => setRagParams((prev) => ({ ...prev, chunkOverlap: parseInt(e.target.value) }))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0 (No Overlap)</span>
              <span>50 (Optimal)</span>
              <span>256</span>
            </div>
          </div>

          {/* Live Visual Chunk Preview Card */}
          <div className="p-2.5 rounded-xl bg-white border border-teal-200 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-teal-800 border-b border-teal-100 pb-1">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-teal-600" /> Xem Trước Chunk (Visual Preview)
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Sample Article</span>
            </div>

            <div className="text-[11px] font-sans leading-relaxed text-slate-700 p-2 rounded bg-slate-50 border border-slate-200">
              <span className="bg-teal-100 text-teal-900 font-medium rounded px-0.5">
                {preview.nonOverlapChunk1}
              </span>
              {preview.overlapText && (
                <span className="bg-amber-200 text-amber-950 font-bold underline decoration-amber-500 rounded px-0.5" title="Đoạn Overlap chồng lấp">
                  {preview.overlapText}
                </span>
              )}
              {preview.chunk2Text && (
                <span className="bg-sky-100 text-sky-900 font-medium rounded px-0.5 opacity-80">
                  {preview.chunk2Text}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400" /> Chunk #1 ({preview.chunk1Length}c)
              </span>
              <span className="flex items-center gap-1 font-bold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Overlap ({ragParams.chunkOverlap || 50}c)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* System DB Status */}
      <div className="flex items-center justify-between pt-1 border-t border-teal-200/60 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Database className="w-3.5 h-3.5 text-sky-600" />
          <span>Vector Database</span>
        </div>
        <span className={`font-semibold flex items-center gap-1 ${isConnected ? 'text-emerald-700' : 'text-amber-700'
          }`}>
          {dbStatus || 'Connected'}
        </span>
      </div>
    </div>
  );
}
