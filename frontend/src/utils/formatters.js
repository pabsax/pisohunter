export const getPortalLabel = (source) => {
  if (!source) return 'Anuncio original';
  const s = source.toLowerCase();
  if (s.includes('idealista')) return 'Anuncio en Idealista';
  if (s.includes('fotocasa')) return 'Anuncio en Fotocasa';
  if (s.includes('habitaclia')) return 'Anuncio en Habitaclia';
  if (s.includes('pisos')) return 'Anuncio en Pisos.com';
  return `Anuncio en ${source}`;
};
