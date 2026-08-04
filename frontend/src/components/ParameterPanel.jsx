import React, { useState, useEffect } from 'react';
import { Sliders, ToggleLeft, ToggleRight, Database, Scissors, Eye, Layers, Filter, ShieldAlert, Compass, MapPin, Zap, FileText, Search, BookOpen, ExternalLink } from 'lucide-react';
import { fetchDocuments } from '../services/api';

const CHUNKING_METHODS = [
  { id: 'Recursive Character', label: 'Recursive Char', desc: 'Tách theo khoảng trắng & ngắt câu' },
  { id: 'Semantic Chunking', label: 'Semantic', desc: 'Tách theo ngữ nghĩa câu' },
  { id: 'Fixed Size', label: 'Fixed Size', desc: 'Cắt cố định theo số ký tự' },
  { id: 'Markdown Header Aware', label: 'Markdown Header', desc: 'Tách theo tiêu đề # ## ###' }
];

const SAMPLE_TEXT = "Hà Giang là vùng đất thiên nhiên hùng vĩ với con đèo Mã Pí Lèng nổi tiếng. Khi phượt xe máy, du khách cần lưu ý tốc độ dưới 30km/h khi qua các khúc cua gấp. Sương mù ban sáng xuất hiện dày đặc từ tháng 10 đến tháng 12. Thưởng thức bánh cuốn canh và lẩu gà đen tại phố cổ Đồng Văn là trải nghiệm không thể bỏ qua.";

export default function ParameterPanel({ ragParams, setRagParams, dbStatus, configMeta }) {
  const [activeTab, setActiveTab] = useState('retrieval'); // 'retrieval' | 'chunking' | 'documents'
  const [documentsList, setDocumentsList] = useState([]);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState('all'); // 'all' | 'news' | 'legal'
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  const isConnected = !dbStatus || dbStatus.includes('Connected') || dbStatus.includes('ok');

  useEffect(() => {
    if (activeTab === 'documents' && documentsList.length === 0) {
      setIsLoadingDocs(true);
      fetchDocuments().then((res) => {
        setDocumentsList(res.documents || []);
        setIsLoadingDocs(false);
      });
    }
  }, [activeTab]);

  const destinationsList = (configMeta && configMeta.destinations) || [
    { id: 'all', name: 'Tất cả địa điểm' },
    { id: 'ha-noi', name: 'Hà Nội' },
    { id: 'phu-quoc', name: 'Phú Quốc' },
    { id: 'ho-chi-minh-city', name: 'TP. Hồ Chí Minh' },
    { id: 'hoi-an', name: 'Hội An' },
    { id: 'sa-pa', name: 'Sa Pa' }
  ];

  const categoriesList = [
    { id: 'all', label: 'Tất cả (All)', icon: <Filter className="w-3.5 h-3.5" />, desc: 'Tra cứu toàn bộ tài liệu Cẩm nang & Pháp lý' },
    { id: 'news', label: 'Cẩm nang (News)', icon: <Compass className="w-3.5 h-3.5 text-teal-600" />, desc: 'Chỉ tra cứu bài viết điểm đến & ẩm thực' },
    { id: 'legal', label: 'Pháp lý (Legal)', icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />, desc: 'Chỉ tra cứu Visa, E-visa, Y tế & An toàn' }
  ];

  const filteredDocs = documentsList.filter((doc) => {
    const matchesCat = docCategoryFilter === 'all' || doc.category === docCategoryFilter;
    const matchesSearch =
      !docSearchQuery ||
      doc.title.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      doc.filename.toLowerCase().includes(docSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getAlphaLabel = (val) => {
    if (val === 1.0) return 'Pure Dense (Vector)';
    if (val === 0.0) return 'Pure Sparse (BM25)';
    return `Hybrid (${Math.round(val * 100)}% Dense / ${Math.round((1 - val) * 100)}% Sparse)`;
  };

  return (
    <div className="p-3.5 rounded-2xl border border-teal-200/80 bg-teal-50/50 backdrop-blur-md space-y-3 shadow-xs">
      {/* Header & Status */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-teal-600" />
          RAG Pipeline Controls
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${isConnected
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
            : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          BAAI/bge-m3
        </span>
      </div>

      {/* Tab Switcher: Retrieval vs Chunking vs Documents */}
      <div className="flex p-1 bg-white rounded-xl border border-slate-200 shadow-2xs text-[11px] font-bold">
        <button
          onClick={() => setActiveTab('retrieval')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'retrieval'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Pipeline
        </button>

        <button
          onClick={() => setActiveTab('chunking')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'chunking'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          Chunking
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'documents'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <BookOpen className="w-3.5 h-3.5 ml-1.5" />
          Tài Liệu ({documentsList.length || 25})
        </button>
      </div>

      {/* TAB 1: RAG RETRIEVAL CONTROLS */}
      {activeTab === 'retrieval' && (
        <div className="space-y-3 pt-1">
          {/* Document Category Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-teal-600" /> Document Category
              </span>
              <span className="text-[10px] font-mono text-teal-800 bg-white px-1.5 py-0.5 rounded border border-teal-200 font-bold">
                {ragParams.docCategory || 'all'}
              </span>
            </label>

            <div className="grid grid-cols-3 gap-1">
              {categoriesList.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setRagParams((prev) => ({ ...prev, docCategory: cat.id }))}
                  className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${(ragParams.docCategory || 'all') === cat.id
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

          {/* Destination Selector Dropdown */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-600" /> Destination Filter
            </label>
            <select
              value={ragParams.destinationFilter || 'all'}
              onChange={(e) => setRagParams((prev) => ({ ...prev, destinationFilter: e.target.value }))}
              className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl p-2 focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            >
              {destinationsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hybrid Weight / Alpha Slider */}
          <div className="space-y-1 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-800 font-bold flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-teal-600" />
                Hybrid Search Weight (α)
              </span>
              <span className="font-mono text-teal-800 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[10px]">
                {ragParams.alpha !== undefined ? ragParams.alpha : 0.5}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.1"
              value={ragParams.alpha !== undefined ? ragParams.alpha : 0.5}
              onChange={(e) => setRagParams((prev) => ({ ...prev, alpha: parseFloat(e.target.value) }))}
              className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-slate-500 italic text-center font-medium">
              {getAlphaLabel(ragParams.alpha !== undefined ? ragParams.alpha : 0.5)}
            </p>
          </div>

          {/* Top-K Chunks Slider */}
          <div className="space-y-1 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 font-semibold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-teal-600" /> Top-K Chunks
              </span>
              <span className="font-mono text-teal-800 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[10px]">
                {ragParams.topK || 5} chunks
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={ragParams.topK || 5}
              onChange={(e) => setRagParams((prev) => ({ ...prev, topK: parseInt(e.target.value, 10) }))}
              className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Toggle Switches: HyDE, RRF, Document Reordering */}
          <div className="space-y-2 pt-1">
            {/* HyDE Query Expansion */}
            <button
              onClick={() => setRagParams((prev) => ({ ...prev, enableHyDE: !prev.enableHyDE }))}
              className="w-full p-2.5 rounded-xl border bg-white flex items-center justify-between text-xs font-semibold hover:border-teal-300 transition-all shadow-2xs"
            >
              <span className="flex items-center gap-2 text-slate-800 font-bold">
                <Zap className="w-4 h-4 text-amber-500" />
                HyDE Query Expansion
              </span>
              {ragParams.enableHyDE ? (
                <ToggleRight className="w-6 h-6 text-teal-600" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-slate-400" />
              )}
            </button>

            {/* RRF Reranking */}
            <button
              onClick={() => setRagParams((prev) => ({ ...prev, enableRRF: !prev.enableRRF }))}
              className="w-full p-2.5 rounded-xl border bg-white flex items-center justify-between text-xs font-semibold hover:border-teal-300 transition-all shadow-2xs"
            >
              <span className="flex items-center gap-2 text-slate-800 font-bold">
                <Database className="w-4 h-4 text-teal-600" />
                RRF Reranking (Reciprocal Rank)
              </span>
              {ragParams.enableRRF ? (
                <ToggleRight className="w-6 h-6 text-teal-600" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-slate-400" />
              )}
            </button>

            {/* Document Reordering (Lost-in-the-Middle) */}
            <button
              onClick={() => setRagParams((prev) => ({ ...prev, enableReordering: !prev.enableReordering }))}
              className="w-full p-2.5 rounded-xl border bg-white flex items-center justify-between text-xs font-semibold hover:border-teal-300 transition-all shadow-2xs"
            >
              <span className="flex items-center gap-2 text-slate-800 font-bold">
                <Layers className="w-4 h-4 text-purple-600" />
                Document Reordering (Lost-in-the-Middle)
              </span>
              {ragParams.enableReordering !== false ? (
                <ToggleRight className="w-6 h-6 text-teal-600" />
              ) : (
                <ToggleLeft className="w-6 h-6 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: CHUNKING STRATEGY */}
      {activeTab === 'chunking' && (
        <div className="space-y-3 pt-1">
          {/* Chunking Method Radio Selectors */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Scissors className="w-3.5 h-3.5 text-teal-600" /> Chunking Strategy
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {CHUNKING_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setRagParams((prev) => ({ ...prev, chunkingMethod: m.id }))}
                  className={`p-2 rounded-xl border text-left text-xs transition-all ${(ragParams.chunkingMethod || 'Recursive Character') === m.id
                      ? 'border-teal-600 bg-teal-50/80 text-teal-900 shadow-2xs font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200'
                    }`}
                >
                  <div className="truncate font-bold">{m.label}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Chunk Size Slider */}
          <div className="space-y-1 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 font-semibold">Chunk Size (chars)</span>
              <span className="font-mono text-teal-800 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[10px]">
                {ragParams.chunkSize || 512} chars
              </span>
            </div>
            <input
              type="range"
              min="128"
              max="2048"
              step="64"
              value={ragParams.chunkSize || 512}
              onChange={(e) => setRagParams((prev) => ({ ...prev, chunkSize: parseInt(e.target.value, 10) }))}
              className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Chunk Overlap Slider */}
          <div className="space-y-1 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 font-semibold">Chunk Overlap</span>
              <span className="font-mono text-teal-800 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 text-[10px]">
                {ragParams.chunkOverlap || 50} chars
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              step="10"
              value={ragParams.chunkOverlap || 50}
              onChange={(e) => setRagParams((prev) => ({ ...prev, chunkOverlap: parseInt(e.target.value, 10) }))}
              className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB 3: INDEXED DOCUMENTS CORPUS LIST (SCROLLABLE) */}
      {activeTab === 'documents' && (
        <div className="space-y-2.5 pt-1">
          {/* Header & Filter Controls */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5 text-teal-800">
                <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                Indexed Documents Corpus
              </span>
              <span className="text-[10px] font-mono bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full border border-teal-300 font-extrabold">
                {filteredDocs.length} tệp
              </span>
            </div>

            {/* Document Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Lọc tên tài liệu..."
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 focus:ring-2 focus:ring-teal-500 focus:outline-hidden text-slate-800 font-medium"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1 text-[10px] font-bold">
              <button
                onClick={() => setDocCategoryFilter('all')}
                className={`flex-1 py-1 rounded-lg border transition-all ${docCategoryFilter === 'all'
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-200'
                  }`}
              >
                Tất cả ({documentsList.length})
              </button>
              <button
                onClick={() => setDocCategoryFilter('news')}
                className={`flex-1 py-1 rounded-lg border transition-all ${docCategoryFilter === 'news'
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-200'
                  }`}
              >
                Cẩm nang ({documentsList.filter((d) => d.category === 'news').length})
              </button>
              <button
                onClick={() => setDocCategoryFilter('legal')}
                className={`flex-1 py-1 rounded-lg border transition-all ${docCategoryFilter === 'legal'
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-teal-200'
                  }`}
              >
                Pháp lý ({documentsList.filter((d) => d.category === 'legal').length})
              </button>
            </div>
          </div>

          {/* Scrollable Container with Document Items */}
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs scrollbar-thin scrollbar-thumb-teal-300">
            {isLoadingDocs ? (
              <div className="p-4 text-center text-xs text-slate-500 animate-pulse font-sans">
                Đang tải danh sách tài liệu...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-sans italic">
                Không tìm thấy tài liệu phù hợp.
              </div>
            ) : (
              filteredDocs.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 transition-all shadow-2xs space-y-1 group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-sans font-bold text-slate-800 text-xs truncate flex items-center gap-1.5" title={doc.title}>
                      <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate">{doc.title}</span>
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0 border ${doc.category === 'legal'
                          ? 'bg-sky-100 text-sky-900 border-sky-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                    >
                      {doc.category === 'legal' ? 'Legal' : 'News'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    <span className="truncate text-teal-800 font-semibold" title={doc.filename}>
                      {doc.filename}
                    </span>
                    <span className="shrink-0 text-slate-400 font-semibold">
                      ~{doc.estimated_chunks} chunks ({Math.round(doc.char_count / 1000)}k)
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
