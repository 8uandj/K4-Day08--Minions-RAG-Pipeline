import React from 'react';
import { Sliders, ToggleLeft, ToggleRight, Database } from 'lucide-react';

export default function ParameterPanel({ ragParams, setRagParams, dbStatus }) {
  const isConnected = !dbStatus || dbStatus.includes('Connected') || dbStatus.includes('ok');

  return (
    <div className="p-3.5 rounded-2xl border border-teal-200/80 bg-teal-50/50 backdrop-blur-md space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-teal-600" />
          RAG Control Panel
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
          isConnected
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
            : 'bg-amber-100 text-amber-800 border-amber-300'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          BAAI/bge-m3
        </span>
      </div>

      {/* Top-K Slider */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-700 font-medium">Top-K Documents</span>
          <span className="font-mono text-teal-700 font-bold px-1.5 py-0.5 rounded bg-white border border-teal-300 shadow-xs">
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
      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-slate-800">HyDE Retrieval</div>
          <div className="text-[10px] text-slate-500">Hypothetical Document Embeddings</div>
        </div>
        <button
          onClick={() => setRagParams((prev) => ({ ...prev, enableHyDE: !prev.enableHyDE }))}
          className={`transition-colors p-1 rounded-lg ${
            ragParams.enableHyDE ? 'text-teal-600' : 'text-slate-400'
          }`}
        >
          {ragParams.enableHyDE ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
        </button>
      </div>

      {/* PageIndex Fallback Toggle */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-slate-800">PageIndex Fallback</div>
          <div className="text-[10px] text-slate-500">Full PDF Page Rank Search</div>
        </div>
        <button
          onClick={() => setRagParams((prev) => ({ ...prev, enablePageIndex: !prev.enablePageIndex }))}
          className={`transition-colors p-1 rounded-lg ${
            ragParams.enablePageIndex ? 'text-teal-600' : 'text-slate-400'
          }`}
        >
          {ragParams.enablePageIndex ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
        </button>
      </div>

      {/* System DB Status */}
      <div className="flex items-center justify-between pt-1 border-t border-teal-200/60 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Database className="w-3.5 h-3.5 text-sky-600" />
          <span>Vector Database</span>
        </div>
        <span className={`font-semibold flex items-center gap-1 ${
          isConnected ? 'text-emerald-700' : 'text-amber-700'
        }`}>
          {dbStatus || 'Connected'}
        </span>
      </div>
    </div>
  );
}
