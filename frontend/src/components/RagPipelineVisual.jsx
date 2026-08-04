import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, BrainCircuit, Database, FileSearch, GitMerge, MessageSquareText, Search, Sparkles } from 'lucide-react';

const getLatestAssistantMessage = (messages) => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].sender === 'assistant') return messages[i];
  }
  return null;
};

export default function RagPipelineVisual({ messages, ragParams, dbStatus, isGenerating }) {
  const latestAssistant = getLatestAssistantMessage(messages || []);
  const stats = latestAssistant?.retrievalStats;
  const citationCount = latestAssistant?.citations?.length || stats?.total_retrieved || 0;
  const alpha = ragParams?.alpha ?? stats?.alpha ?? 0.5;
  const densePercent = Math.round(alpha * 100);
  const sparsePercent = 100 - densePercent;
  const topK = ragParams?.topK || 5;
  const isConnected = dbStatus?.includes('Connected') || dbStatus?.includes('ok');

  const steps = [
    {
      id: 'query',
      label: 'Query',
      desc: 'Câu hỏi người dùng',
      icon: MessageSquareText,
      active: messages?.some((msg) => msg.sender === 'user')
    },
    {
      id: 'hyde',
      label: 'HyDE',
      desc: ragParams?.enableHyDE ? 'Mở rộng truy vấn' : 'Đang tắt',
      icon: BrainCircuit,
      active: Boolean(ragParams?.enableHyDE)
    },
    {
      id: 'hybrid',
      label: 'Hybrid Search',
      desc: `${densePercent}% Dense / ${sparsePercent}% BM25`,
      icon: Search,
      active: true
    },
    {
      id: 'rrf',
      label: 'RRF Rank',
      desc: ragParams?.enableRRF ? 'Fusion reranking' : 'Đang tắt',
      icon: GitMerge,
      active: Boolean(ragParams?.enableRRF)
    },
    {
      id: 'context',
      label: 'Context',
      desc: `${citationCount || topK} chunks`,
      icon: FileSearch,
      active: citationCount > 0 || isGenerating
    },
    {
      id: 'answer',
      label: 'Answer',
      desc: latestAssistant ? `${latestAssistant.latencyMs || 300}ms` : 'Sẵn sàng',
      icon: Bot,
      active: Boolean(latestAssistant)
    }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold truncate">Visual RAG Pipeline</h3>
            <p className="text-[11px] text-slate-300 truncate">Task 9: Chunking, retrieval, rerank, citation-grounded answer</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className={`px-2.5 py-1 rounded-full border ${isConnected ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40' : 'bg-amber-500/15 text-amber-200 border-amber-400/40'}`}>
            <Database className="w-3 h-3 inline mr-1" />
            {dbStatus || 'Checking Vector DB'}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-slate-100">
            Top-K {topK}
          </span>
        </div>
      </div>

      <div className="p-4 bg-gradient-to-b from-white to-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] gap-2 items-stretch">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.id}>
                <div className={`rounded-xl border p-3 min-h-24 flex flex-col justify-between transition-all ${
                  step.active
                    ? 'bg-white border-teal-300 shadow-xs'
                    : 'bg-slate-100 border-slate-200 opacity-70'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      step.active ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <Icon className="w-4.5 h-4.5" />
                    </span>
                    <span className={`w-2 h-2 rounded-full ${step.active ? 'bg-emerald-500' : 'bg-slate-300'} ${isGenerating && step.active ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">{step.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{step.desc}</div>
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center text-slate-300">
                    <ArrowRight className={`w-4 h-4 ${isGenerating ? 'text-teal-500 animate-pulse' : ''}`} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-2">
              <span>Hybrid Alpha</span>
              <span className="font-mono text-teal-700">α={alpha}</span>
            </div>
            <div className="h-2 rounded-full bg-amber-200 overflow-hidden">
              <div className="h-full bg-teal-600" style={{ width: `${densePercent}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-500 font-mono">
              <span>BM25 {sparsePercent}%</span>
              <span>Dense {densePercent}%</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-bold text-slate-700 mb-2">Document Filter</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
                {ragParams?.docCategory || 'all'}
              </span>
              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200 truncate">
                {ragParams?.destinationFilter || 'all'}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-[11px] font-bold text-slate-700 mb-2">Output Evidence</div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Citations</span>
              <span className="text-lg font-extrabold text-teal-700">{citationCount}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
