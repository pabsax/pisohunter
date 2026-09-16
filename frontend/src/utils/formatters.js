export const getPortalName = (source) => {
  if (!source) return 'Portal';
  const s = source.toLowerCase();
  if (s.includes('idealista')) return 'Idealista';
  if (s.includes('fotocasa')) return 'Fotocasa';
  if (s.includes('habitaclia')) return 'Habitaclia';
  if (s.includes('pisos')) return 'Pisos.com';
  return source.charAt(0).toUpperCase() + source.slice(1);
};

export const getPortalBadgeColor = (source) => {
  if (!source) return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  const s = source.toLowerCase();
  if (s.includes('idealista')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (s.includes('fotocasa')) return 'bg-pink-500/15 text-pink-300 border-pink-500/30';
  if (s.includes('pisos')) return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
  if (s.includes('habitaclia')) return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
  return 'bg-zinc-800 text-zinc-300 border-white/10';
};

export const getPortalLabel = (source) => {
  if (!source) return 'Anuncio original';
  const name = getPortalName(source);
  return `Anuncio en ${name}`;
};
