/**
 * PisoHunter Albacete - Extractor Masivo de Búsqueda de Idealista en 1-Clic
 * Ejecútalo como Bookmarklet estando en cualquier página de resultados de búsqueda de Idealista.
 * Extrae automáticamente todos los 30 pisos de la página y los importa en tu base de datos de PisoHunter.
 */
javascript:(function() {
  const articles = document.querySelectorAll('article.item, div.item-multimedia-container');
  if (!articles || articles.length === 0) {
    alert('PisoHunter: No se detectaron anuncios en esta página de Idealista.');
    return;
  }

  const items = [];
  articles.forEach(art => {
    try {
      const linkEl = art.querySelector('a.item-link') || art.querySelector('a[href*="/inmueble/"]');
      if (!linkEl) return;

      const title = (linkEl.getAttribute('title') || linkEl.innerText || '').trim();
      const href = linkEl.href;
      if (!href || items.some(i => i.url === href)) return;

      // Precio
      const priceEl = art.querySelector('.item-price') || art.querySelector('.price');
      let price = 0;
      if (priceEl) {
        const cleanPrice = priceEl.innerText.replace(/\./g, '').replace(/[^\d]/g, '');
        price = parseFloat(cleanPrice) || 0;
      }

      // Detalles (m2, habs, planta, ascensor)
      const details = Array.from(art.querySelectorAll('.item-detail, .item-details span, .item-detail-char span')).map(e => e.innerText.trim().toLowerCase());
      const allText = (art.innerText || '').toLowerCase();

      let rooms = 2;
      let area_m2 = 80;
      let has_elevator = !allText.includes('sin ascensor');
      let floor = null;
      let has_garage = allText.includes('garaje') || allText.includes('parking');

      details.forEach(d => {
        const mHab = d.match(/(\d+)\s*hab/);
        if (mHab) rooms = parseInt(mHab[1]);

        const mM2 = d.match(/(\d+)\s*m/);
        if (mM2) area_m2 = parseFloat(mM2[1]);

        const mFloor = d.match(/(\d+)ª/);
        if (mFloor) floor = parseInt(mFloor[1]);
        if (d.includes('bajo')) floor = 0;
      });

      // Fotos
      const photos = [];
      const imgs = art.querySelectorAll('img');
      imgs.forEach(img => {
        const src = img.getAttribute('data-ondemand-img') || img.src;
        if (src && src.startsWith('http') && !src.includes('data:image') && !photos.includes(src)) {
          photos.push(src);
        }
      });

      // Barrio / Ubicación
      let neighborhood = 'Albacete Capital';
      const known = ['centro', 'ensanche', 'franciscanos', 'feria', 'parque sur', 'hospital', 'imaginalia', 'fatima', 'industria', 'villacerrada', 'medicina', 'san pablo'];
      for (const k of known) {
        if (allText.includes(k)) {
          neighborhood = k.charAt(0).toUpperCase() + k.slice(1);
          break;
        }
      }

      items.push({
        title: title || 'Piso en Albacete',
        url: href,
        source: 'idealista',
        price: price,
        rooms: rooms,
        bathrooms: 1,
        area_m2: area_m2,
        floor: floor,
        has_elevator: has_elevator,
        has_garage: has_garage,
        neighborhood: neighborhood,
        photos: photos.slice(0, 8),
        description: title
      });
    } catch (e) {
      console.error('Error parseando piso:', e);
    }
  });

  if (items.length === 0) {
    alert('PisoHunter: No se pudieron extraer datos de los inmuebles.');
    return;
  }

  // Enviar a PisoHunter
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:#090a0f;color:#fff;padding:16px 24px;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);font-family:system-ui;font-size:14px;';
  toast.innerHTML = `<strong>PisoHunter Albacete</strong><br>Enviando ${items.length} pisos a tu aplicación...`;
  document.body.appendChild(toast);

  fetch('http://localhost:8000/api/properties/bulk-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items)
  })
  .then(res => res.json())
  .then(data => {
    toast.style.borderColor = '#10b981';
    toast.innerHTML = `<strong>✅ ¡Completado!</strong><br>${data.count || items.length} pisos de Idealista importados en PisoHunter.`;
    setTimeout(() => toast.remove(), 4000);
  })
  .catch(err => {
    toast.style.borderColor = '#ef4444';
    toast.innerHTML = `<strong>⚠️ Error de conexión</strong><br>Asegúrate de que PisoHunter esté abierto en http://localhost:8000`;
    setTimeout(() => toast.remove(), 5000);
  });
})();
