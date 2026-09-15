// PisoHunter Albacete - Chrome Extension Content Script
console.log('PisoHunter Sync activo en Idealista.');

function extractAndSyncIdealista() {
  const articles = document.querySelectorAll('article.item, div.item-multimedia-container');
  if (!articles || articles.length === 0) {
    alert('No se han detectado inmuebles en esta página.');
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

      const priceEl = art.querySelector('.item-price') || art.querySelector('.price');
      let price = 0;
      if (priceEl) {
        const cleanPrice = priceEl.innerText.replace(/\./g, '').replace(/[^\d]/g, '');
        price = parseFloat(cleanPrice) || 0;
      }

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

      const photos = [];
      const imgs = art.querySelectorAll('img');
      imgs.forEach(img => {
        const src = img.getAttribute('data-ondemand-img') || img.src;
        if (src && src.startsWith('http') && !src.includes('data:image') && !photos.includes(src)) {
          photos.push(src);
        }
      });

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
      console.error('Error parseando inmueble:', e);
    }
  });

  const btn = document.getElementById('pisohunter-sync-btn');
  if (btn) btn.innerText = `⏳ Enviando ${items.length} pisos...`;

  fetch('http://localhost:8000/api/properties/bulk-import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items)
  })
  .then(res => res.json())
  .then(data => {
    if (btn) {
      btn.innerText = `✅ ¡${data.count || items.length} pisos sincronizados!`;
      btn.style.background = '#059669';
      setTimeout(() => {
        btn.innerText = '⚡ Sincronizar búsqueda con PisoHunter';
        btn.style.background = '#090a0f';
      }, 3500);
    }
  })
  .catch(err => {
    if (btn) {
      btn.innerText = '⚠️ PisoHunter no responde (¿está abierto?)';
      btn.style.background = '#dc2626';
    }
  });
}

function injectSyncButton() {
  if (document.getElementById('pisohunter-sync-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'pisohunter-sync-btn';
  btn.innerText = '⚡ Sincronizar búsqueda con PisoHunter';
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: #090a0f;
    color: #ffffff;
    font-weight: 600;
    font-size: 13px;
    padding: 12px 20px;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  btn.onmouseover = () => { btn.style.transform = 'scale(1.04)'; };
  btn.onmouseout = () => { btn.style.transform = 'scale(1)'; };
  btn.onclick = extractAndSyncIdealista;

  document.body.appendChild(btn);
}

// Inyectar botón flotante cuando cargue la página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSyncButton);
} else {
  injectSyncButton();
}
