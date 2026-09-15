import React, { useState } from 'react';
import { 
  X, ExternalLink, Bookmark, MapPin, Building, 
  Car, Bed, Bath, Maximize2, Check, AlertCircle 
} from 'lucide-react';

export default function PropertyModal({ 
  property, 
  onClose, 
  isFavorite, 
  onToggleFavorite 
}) {
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const photos = property.photos && property.photos.length > 0 
    ? property.photos 
    : ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80'];

  const score = Math.round(property.score || 0);
  const financials = property.financials;
  const breakdown = property.score_breakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="bg-[#111217] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-4 bg-[#111217]/90 sticky top-0 z-10">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {property.price.toLocaleString()} €
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {property.neighborhood}, Albacete
              </span>
            </div>
            <p className="text-xs text-zinc-400 truncate max-w-lg mt-0.5">
              {property.title}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(property.id)}
              className={`p-2 rounded-xl border transition ${
                isFavorite 
                  ? 'bg-white text-zinc-950 border-white' 
                  : 'bg-zinc-900 text-zinc-300 hover:text-white border-white/10'
              }`}
              title={isFavorite ? 'Guardado' : 'Guardar'}
            >
              <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          
          {/* Main Photo & Thumbnails */}
          <div className="space-y-2">
            <div className="aspect-[16/9] bg-zinc-950 rounded-2xl overflow-hidden relative border border-white/5">
              <img 
                src={photos[selectedPhoto]} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhoto(idx)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition ${
                      idx === selectedPhoto ? 'border-white opacity-100 scale-95' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Direct External Link - High Contrast & Prominent */}
          {property.url && (
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.08] flex items-center justify-between gap-4">
              <div>
                <span className="text-xs text-zinc-400 block font-medium">Fuente del anuncio:</span>
                <span className="text-sm font-semibold text-white capitalize">
                  {property.source === 'habitaclia' ? 'Habitaclia / Fotocasa' : 'Pisos.com'}
                </span>
              </div>
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs flex items-center gap-2 transition shadow-sm"
              >
                <span>Abrir anuncio original</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-700" />
              </a>
            </div>
          )}

          {/* Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/[0.06]">
              <span className="text-zinc-500 block">Ascensor</span>
              <span className="font-semibold text-zinc-200 text-sm mt-0.5 block">
                {property.has_elevator ? 'Sí' : 'Sin ascensor'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/[0.06]">
              <span className="text-zinc-500 block">Superficie</span>
              <span className="font-semibold text-zinc-200 text-sm mt-0.5 block">
                {property.area_m2} m² ({property.rooms} habs)
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/[0.06]">
              <span className="text-zinc-500 block">Garaje</span>
              <span className="font-semibold text-zinc-200 text-sm mt-0.5 block">
                {property.has_garage ? 'Incluido' : 'No incluido'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/[0.06]">
              <span className="text-zinc-500 block">Afinidad (Score)</span>
              <span className="font-semibold text-zinc-200 text-sm mt-0.5 block">
                {score}% coincidencia
              </span>
            </div>
          </div>

          {/* Financial Breakdown (Castilla-La Mancha) */}
          {financials && (
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h4 className="font-semibold text-white text-sm">
                  Costes Reales de Compra (Castilla-La Mancha)
                </h4>
                <span className="text-xs text-zinc-400">
                  ITP 9% + Aranceles Oficiales
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between text-zinc-400">
                    <span>Precio de compra:</span>
                    <span className="text-zinc-200 font-medium">{financials.purchase_price.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>ITP Castilla-La Mancha (9%):</span>
                    <span className="text-zinc-200 font-medium">{financials.itp_tax.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Notaría, Registro y Tasación:</span>
                    <span className="text-zinc-200 font-medium">{(financials.notary_fee + financials.registry_fee + financials.management_fee + financials.valuation_fee).toLocaleString()} €</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-zinc-400">
                    <span>Entrada (20%):</span>
                    <span className="text-zinc-200 font-medium">{financials.down_payment_needed.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Efectivo total a aportar:</span>
                    <span className="text-white font-semibold">{financials.total_cash_needed.toLocaleString()} €</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-zinc-400">Diagnóstico viabilidad:</span>
                    <span className={financials.is_solvent ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                      {financials.is_solvent ? 'Operación viable' : 'Requiere ajustar aportación'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-zinc-400">Cuota hipoteca estimada (30 años al 2.75%):</span>
                <span className="text-base font-semibold text-white">~{financials.monthly_mortgage_payment.toLocaleString()} €/mes</span>
              </div>
            </div>
          )}

          {/* Pros & Cons */}
          {breakdown && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.06] space-y-2">
                <span className="text-zinc-400 font-semibold uppercase tracking-wider block text-[11px]">
                  Puntos a favor
                </span>
                {breakdown.pros.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-zinc-300">
                    <Check className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.06] space-y-2">
                <span className="text-zinc-400 font-semibold uppercase tracking-wider block text-[11px]">
                  A tener en cuenta
                </span>
                {breakdown.cons.length > 0 ? (
                  breakdown.cons.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-zinc-400">
                      <AlertCircle className="w-3.5 h-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-zinc-500">Sin factores negativos detectados.</span>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {property.description && (
            <div className="space-y-2 text-xs text-zinc-300 leading-relaxed border-t border-white/[0.06] pt-4">
              <h5 className="font-semibold text-white text-sm">Descripción del anuncio</h5>
              <p className="whitespace-pre-line text-zinc-400">{property.description}</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
