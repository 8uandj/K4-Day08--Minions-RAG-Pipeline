import React from 'react';
import { Calendar, MapPin, Clock, DollarSign, Star, UtensilsCrossed, CheckCircle, Navigation } from 'lucide-react';

export function ItineraryWidget({ itinerary }) {
  if (!itinerary || itinerary.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2 text-teal-700 font-extrabold text-sm">
        <Calendar className="w-4.5 h-4.5 text-teal-600" />
        <span>🗺️ Lịch Trình Chi Tiết Theo Ngày (Day-by-Day Itinerary)</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {itinerary.map((dayItem, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition-all hover:border-teal-400 hover:shadow-md"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-teal-600 via-teal-700 to-sky-700 text-white flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-amber-400 text-slate-950 shadow-xs">
                  {dayItem.day}
                </span>
                <h4 className="text-sm font-bold text-white">{dayItem.title}</h4>
              </div>

              {dayItem.distance && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 flex items-center gap-1 font-mono font-medium">
                  <Navigation className="w-3 h-3 text-amber-300" />
                  {dayItem.distance}
                </span>
              )}
            </div>

            {/* Timeline Activities */}
            <div className="p-4 space-y-3 bg-slate-50/50">
              {dayItem.activities.map((act, actIdx) => (
                <div key={actIdx} className="flex items-start gap-3 text-xs group">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono font-bold flex items-center gap-1 border border-amber-300 shrink-0">
                    <Clock className="w-3 h-3 text-amber-700" />
                    {act.time}
                  </span>
                  <p className="text-slate-800 leading-relaxed pt-0.5 font-medium group-hover:text-teal-700 transition-colors">
                    {act.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CostTableWidget({ costSummary }) {
  if (!costSummary || costSummary.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm">
        <DollarSign className="w-4.5 h-4.5 text-amber-600" />
        <span>💰 Bảng Dự Trù Chi Phí Du Lịch (Estimated Budget)</span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Hạng Mục</th>
                <th className="px-4 py-3">Chi Tiết Diễn Giải</th>
                <th className="px-4 py-3 text-right">Chi Phí (VNĐ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {costSummary.map((row, idx) => (
                <tr
                  key={idx}
                  className={`${
                    row.isTotal
                      ? 'bg-amber-100/80 text-amber-900 font-extrabold border-t-2 border-amber-300'
                      : 'hover:bg-slate-50 transition-colors'
                  }`}
                >
                  <td className="px-4 py-3 flex items-center gap-2 font-semibold">
                    {row.isTotal ? <CheckCircle className="w-4 h-4 text-amber-600" /> : <span className="w-2 h-2 rounded-full bg-teal-500" />}
                    {row.category}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.details}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function FoodGridWidget({ recommendedFoods }) {
  if (!recommendedFoods || recommendedFoods.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 text-sky-700 font-extrabold text-sm">
        <UtensilsCrossed className="w-4.5 h-4.5 text-sky-600" />
        <span>🍲 Gợi Ý Đặc Sản Local Phải Thử (Local Cuisine Highlights)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {recommendedFoods.map((food, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-sky-400 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-2xl">{food.image}</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1 border border-amber-300">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  {food.rating}
                </span>
              </div>
              <h5 className="font-extrabold text-slate-900 text-sm mb-1">{food.name}</h5>
              <p className="text-xs text-slate-600 line-clamp-2 mb-2">{food.desc}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1">
              <div className="flex items-center gap-1 text-[11px] text-teal-700 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="truncate">{food.location}</span>
              </div>
              <div className="text-[11px] text-amber-700 font-mono font-bold">
                💰 {food.price}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
