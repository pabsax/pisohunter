import React from 'react';
import { ExternalLink, Bookmark, Building, Car, MapPin } from 'lucide-react';

export default function PropertyCard({ 
  property, 
  onSelect, 
  isFavorite, 
  onToggleFavorite 
}) {
  const photos = property.photos && property.photos.length > 0 
    ? property.photos 
    : ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80'];

  const score = Math.round(property.score || 0);
  const priceM2 = property.area_m2 > 0 ? Math.round(property.price / property.area_m2) : null;
  const isDistant = score < 50 && (property.neighborhood.includes('Pedanías') || property.neighborhood.includes('Salobral'));

  return (
    <div 
      onClick={() => onSelect(property)}
      className="group bg-[#111217] hover:bg-[#14161c] border border-white/[0.06] hover:border-white/[0.16] rounded-2xl overflow-hidden transition-all duration-300 flex flex-col cursor-pointer shadow-sm hover:shadow-xl"
    >
      {/* Property Image with Ambient Overlays */}
      <div className="relative aspect-[16/10] bg-zinc-950 overflow-hidden">
        <img 
          src={photos[0]} 
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Source portal badge (Top-Left) */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-zinc-300 tracking-wide capitalize">
            {property.source || 'inmueble'}
          </span>
          {isDistant && (
            <span className="px-2 py-0.5 rounded-full bg-red-950/80 backdrop-blur-md border border-red-500/30 text-[10px] font-semibold text-red-300">
              Lejos (+15km)
            </span>
          )}
        </div>

        {/* Score / Affiliation pill (Top-Right) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-white flex items-center gap-1">
            <span className={score >= 85 ? 'text-emerald-400' : score >= 70 ? 'text-zinc-200' : 'text-zinc-400'}>
              {score}%
            </span>
            <span className="text-[10px] text-zinc-400 font-normal">afinidad</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(property.id);
            }}
            className={`p-1.5 rounded-full backdrop-blur-md border transition ${
              isFavorite 
                ? 'bg-white text-zinc-950 border-white' 
                : 'bg-black/50 text-white/70 hover:text-white border-white/10'
            }`}
            title={isFavorite ? 'Quitar de guardados' : 'Guardar en favoritos'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Location chip (Bottom-Left) */}
        <div className="absolute bottom-3 left-3">
          <span className="text-xs font-medium text-white/90 drop-shadow-sm flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-zinc-300" />
            {property.neighborhood}
          </span>
        </div>
      </div>

      {/* Body Information */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Price & m2 */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-white">
                {property.price.toLocaleString()} €
              </span>
              {priceM2 && (
                <span className="text-xs text-zinc-400">
                  {priceM2.toLocaleString()} €/m²
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-zinc-200 line-clamp-1 group-hover:text-white transition-colors mt-1">
            {property.title}
          </h3>

          {/* Clean Specs Row */}
          <div className="flex items-center flex-wrap gap-x-2 text-xs text-zinc-400 mt-2">
            <span>{property.rooms} {property.rooms === 1 ? 'hab' : 'habs'}</span>
            <span className="text-zinc-600">·</span>
            <span>{property.area_m2} m²</span>
            <span className="text-zinc-600">·</span>
            <span className={property.has_elevator ? 'text-zinc-300' : 'text-zinc-500'}>
              {property.has_elevator ? 'Con ascensor' : 'Sin ascensor'}
            </span>
            {property.has_garage && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-300">Garaje</span>
              </>
            )}
          </div>
        </div>

        {/* Footer: Direct Portal Link */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-[11px] text-zinc-400">
            {property.source === 'habitaclia' ? 'Anuncio en Habitaclia' : 'Anuncio en Pisos.com'}
          </span>

          {property.url && (
            <a
              href={property.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-200 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <span>Ver anuncio</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
