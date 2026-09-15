import React from 'react';
import { 
  Building2, Car, Bed, MapPin, ChevronRight, 
  ClipboardList, ExternalLink, Sparkles 
} from 'lucide-react';

const COLUMNS = [
  { id: 'nuevo', label: 'Bandeja de Entrada', color: 'border-slate-700 bg-slate-900/40 text-slate-300' },
  { id: 'interesante', label: '⭐ Interesantes', color: 'border-emerald-500/30 bg-emerald-950/10 text-emerald-400' },
  { id: 'contactado', label: '📞 Contactados', color: 'border-cyan-500/30 bg-cyan-950/10 text-cyan-400' },
  { id: 'visita_agendada', label: '📅 Visita Agendada', color: 'border-amber-500/30 bg-amber-950/10 text-amber-400' },
  { id: 'visitado', label: '✅ Visitados', color: 'border-indigo-500/30 bg-indigo-950/10 text-indigo-400' },
  { id: 'oferta', label: '🤝 Oferta / Negociación', color: 'border-purple-500/30 bg-purple-950/10 text-purple-400' },
  { id: 'descartado', label: '❌ Descartados', color: 'border-rose-500/30 bg-rose-950/10 text-rose-400' },
];

export default function KanbanBoard({ 
  properties, 
  onSelectProperty, 
  onOpenChecklist, 
  onUpdateStatus 
}) {
  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-[1200px]">
        {COLUMNS.map((col) => {
          const colProperties = properties.filter((p) => p.status === col.id);

          return (
            <div 
              key={col.id} 
              className={`w-80 flex-shrink-0 rounded-2xl border p-3 flex flex-col ${col.color}`}
            >
              {/* Encabezado de la columna */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-bold text-xs sm:text-sm tracking-wide">
                  {col.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                  {colProperties.length}
                </span>
              </div>

              {/* Lista de tarjetas */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[75vh] pr-1">
                {colProperties.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                    No hay pisos en esta fase
                  </div>
                ) : (
                  colProperties.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onSelectProperty(p)}
                      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-md hover:shadow-lg transition cursor-pointer space-y-2 group"
                    >
                      {/* Cabecera de la mini-tarjeta */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-base text-white">
                          {p.price.toLocaleString()} €
                        </span>
                        <div className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                          p.score >= 80 
                            ? 'bg-emerald-500 text-slate-950' 
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          ★ {p.score}
                        </div>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-emerald-400 transition">
                        {p.title}
                      </h4>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 text-[11px] text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400" /> {p.neighborhood}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800">
                          {p.rooms} habs • {p.area_m2}m²
                        </span>
                        {p.has_elevator && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                            Ascensor
                          </span>
                        )}
                        {p.has_garage && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                            Garaje
                          </span>
                        )}
                      </div>

                      {/* Selector de cambio de fase rápido */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={p.status}
                          onChange={(e) => onUpdateStatus(p.id, e.target.value)}
                          className="w-full bg-slate-950 text-slate-300 border border-slate-700 text-[11px] rounded-lg px-2 py-1 font-medium focus:ring-1 focus:ring-emerald-500 outline-none"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.id} value={c.id}>
                              Mover a: {c.label}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => onOpenChecklist(p)}
                          title="Abrir checklist de visita"
                          className="p-1 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition flex-shrink-0"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
