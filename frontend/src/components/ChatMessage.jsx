import React from 'react';
import { motion } from 'framer-motion';
import { Compass, User, Copy, Check, Zap, Bookmark, Sun, Sunrise, Sunset, Moon, Sparkles } from 'lucide-react';
import CitationCard from './CitationCard';
import { ItineraryWidget, CostTableWidget, FoodGridWidget } from './RichWidgets';

export default function ChatMessage({ message }) {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render inline formatting: **bold**, [Source: ...] badges, and strip leftover raw #
  const renderInlineFormatted = (text) => {
    if (!text) return null;

    // Clean stray leading/trailing # if any
    let cleaned = text.replace(/^#+\s*/, '').replace(/\s*#+$/, '');

    const parts = cleaned.split(/(\[Nguồn:.*?\]|\[Source:.*?\]|\[Document \d+.*?\]|\[[\w-]+\.md\]|\*\*.*?\*\*)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-extrabold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (
        (part.startsWith('[Nguồn:') || part.startsWith('[Source:') || part.startsWith('[Document') || part.endsWith('.md]')) &&
        part.startsWith('[') && part.endsWith(']')
      ) {
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-1.5 py-0.5 mx-0.5 my-0.5 rounded-md bg-amber-100/90 text-amber-900 border border-amber-300 shadow-2xs"
            title="Nguồn trích dẫn RAG"
          >
            📌 {part}
          </span>
        );
      }
      return part;
    });
  };

  // Icon selector for time-of-day subheadings
  const getTimeIcon = (headingText) => {
    const lower = headingText.toLowerCase();
    if (lower.includes('sáng') || lower.includes('morning')) return <Sunrise className="w-3.5 h-3.5 text-amber-600" />;
    if (lower.includes('trưa') || lower.includes('noon')) return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    if (lower.includes('chiều') || lower.includes('afternoon')) return <Sunset className="w-3.5 h-3.5 text-orange-500" />;
    if (lower.includes('tối') || lower.includes('night') || lower.includes('evening')) return <Moon className="w-3.5 h-3.5 text-indigo-500" />;
    return <Sparkles className="w-3.5 h-3.5 text-teal-600" />;
  };

  // Structured Markdown Parser (Handles all heading levels #, ##, ###, ####, bullets, lists)
  const renderRichMarkdown = (content) => {
    if (!content) return null;

    const lines = content.split('\n');
    const renderedElements = [];

    lines.forEach((line, idx) => {
      let trimmed = line.trim();

      // Skip empty lines (render minor spacing)
      if (!trimmed || trimmed === '---' || trimmed === '***') {
        renderedElements.push(<div key={`spacer-${idx}`} className="h-1.5" />);
        return;
      }

      // Check for headings with any number of # (1 to 6)
      const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();

        if (!text) return;

        if (level === 1) {
          renderedElements.push(
            <h1 key={`h1-${idx}`} className="text-base font-black text-slate-900 border-b-2 border-teal-300 pb-1.5 mt-3 mb-2 flex items-center gap-2">
              <Compass className="w-5 h-5 text-teal-600 shrink-0" />
              <span>{renderInlineFormatted(text)}</span>
            </h1>
          );
        } else if (level === 2) {
          renderedElements.push(
            <h2 key={`h2-${idx}`} className="text-sm font-extrabold text-teal-950 mt-3 mb-1.5 flex items-center gap-2 bg-gradient-to-r from-teal-50 to-emerald-50 px-3 py-1.5 rounded-xl border border-teal-200 shadow-2xs">
              <Bookmark className="w-4 h-4 text-teal-700 shrink-0" />
              <span>{renderInlineFormatted(text)}</span>
            </h2>
          );
        } else if (level === 3) {
          renderedElements.push(
            <h3 key={`h3-${idx}`} className="text-sm font-bold text-teal-900 mt-2.5 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600 inline-block shrink-0" />
              <span>{renderInlineFormatted(text)}</span>
            </h3>
          );
        } else {
          // Level 4, 5, 6: (e.g. #### Sáng, #### Trưa, #### Chiều, #### Tối)
          renderedElements.push(
            <div key={`h4-${idx}`} className="mt-2.5 mb-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/90 text-xs font-extrabold shadow-2xs">
              {getTimeIcon(text)}
              <span>{renderInlineFormatted(text)}</span>
            </div>
          );
        }
        return;
      }

      // Check for List items: -, *, •, 1., 2.
      const listMatch = trimmed.match(/^([-*•]\s+|\d+\.\s+)(.*)/);
      if (listMatch) {
        const prefix = listMatch[1];
        const itemContent = listMatch[2].trim();
        const isNum = prefix.match(/^\d+/);

        renderedElements.push(
          <div key={`li-${idx}`} className="flex items-start gap-2 my-1 pl-1 group">
            <span className={`text-xs shrink-0 mt-1 font-bold ${isNum ? 'w-5 h-5 rounded-full bg-teal-100 text-teal-800 border border-teal-300 flex items-center justify-center text-[10px]' : 'text-teal-600'}`}>
              {isNum ? isNum[0] : '•'}
            </span>
            <div className="text-sm leading-relaxed text-slate-800 flex-1">
              {renderInlineFormatted(itemContent)}
            </div>
          </div>
        );
        return;
      }

      // Regular Paragraphs
      renderedElements.push(
        <p key={`p-${idx}`} className="text-sm leading-relaxed text-slate-800 my-1">
          {renderInlineFormatted(trimmed)}
        </p>
      );
    });

    return renderedElements;
  };

  const stats = message.retrievalStats;
  const latencyMs = message.latencyMs || 320;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start gap-3 my-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar Icon */}
      <div
        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
          isUser
            ? 'bg-gradient-to-tr from-sky-600 to-teal-500 text-white'
            : 'bg-gradient-to-tr from-teal-600 via-emerald-600 to-amber-500 text-white'
        }`}
      >
        {isUser ? <User className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
      </div>

      {/* Message Bubble Container */}
      <div className={`max-w-[88%] sm:max-w-[82%] space-y-1.5`}>
        {/* Header Name & Timestamp */}
        <div className={`flex items-center gap-2 text-xs text-slate-400 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="font-bold text-slate-700">
            {isUser ? 'Bạn' : 'Trợ Lý Du Lịch AI'}
          </span>
          <span>•</span>
          <span className="text-slate-400 font-mono text-[11px]">{message.timestamp}</span>
        </div>

        {/* Message Body Bubble */}
        <div
          className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm border relative group ${
            isUser
              ? 'bg-gradient-to-r from-teal-600 to-sky-600 text-white border-teal-500/30 rounded-tr-none'
              : 'bg-white text-slate-800 border-slate-200/90 rounded-tl-none shadow-xs'
          }`}
        >
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200 z-10"
            title="Sao chép nội dung"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Text Content */}
          <div className="font-sans space-y-1">
            {isUser ? message.content : renderRichMarkdown(message.content)}
          </div>

          {/* Interactive Rich Content (Itineraries, Costs, Foods, Citations) */}
          {!isUser && (
            <>
              {message.itinerary && <ItineraryWidget itinerary={message.itinerary} />}
              {message.costSummary && <CostTableWidget costSummary={message.costSummary} />}
              {message.recommendedFoods && <FoodGridWidget recommendedFoods={message.recommendedFoods} />}
              {message.citations && <CitationCard citations={message.citations} />}

              {/* Execution Metadata Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span className="flex items-center gap-1 text-teal-700 font-bold">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  ⚡ Retrieved {message.citations ? message.citations.length : (stats?.total_retrieved || 0)} chunks in {latencyMs}ms
                </span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  {stats?.used_hyde ? 'HyDE' : 'No-HyDE'} + {stats?.used_rrf ? 'RRF' : 'No-RRF'} (α={stats?.alpha !== undefined ? stats.alpha : 0.5})
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
