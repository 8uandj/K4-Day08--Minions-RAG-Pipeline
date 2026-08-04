import React from 'react';
import { motion } from 'framer-motion';
import { Compass, User, Copy, Check } from 'lucide-react';
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

  // Helper function to render text with bold syntax **text**
  const renderFormattedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-extrabold text-teal-800">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

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
      <div className={`max-w-[85%] sm:max-w-[78%] space-y-1.5`}>
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
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity border border-slate-200"
            title="Sao chép nội dung"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Text Content */}
          <div className="whitespace-pre-wrap font-sans space-y-2">
            {renderFormattedText(message.content)}
          </div>

          {/* Interactive Rich Content (Itineraries, Costs, Foods) */}
          {!isUser && (
            <>
              {message.itinerary && <ItineraryWidget itinerary={message.itinerary} />}
              {message.costSummary && <CostTableWidget costSummary={message.costSummary} />}
              {message.recommendedFoods && <FoodGridWidget recommendedFoods={message.recommendedFoods} />}
              {message.citations && <CitationCard citations={message.citations} />}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
