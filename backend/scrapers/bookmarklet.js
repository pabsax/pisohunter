// Bookmarklet para importar pisos desde Idealista, Fotocasa o cualquier portal con 1 clic
// Para usarlo: Crea un marcador en tu navegador y pega este código en la URL:
javascript:(function(){
  try {
    const url = window.location.href;
    const title = document.querySelector('h1')?.innerText?.trim() || document.title;
    
    // Extraer precio
    let price = 0;
    const priceEl = document.querySelector('.info-data-price, .re-DetailHeader-price, .price, [data-testid="price"]');
    if (priceEl) {
      const match = priceEl.innerText.replace(/\./g, '').replace(/,/g, '.').match(/(\d+)/);
      if (match) price = parseFloat(match[1]);
    }
    if (!price) {
      const text = document.body.innerText;
      const m = text.match(/(\d{2,3}(?:\.\d{3})*)\s*€/);
      if (m) price = parseFloat(m[1].replace(/\./g, ''));
    }

    // Extraer imágenes
    const imgs = Array.from(document.querySelectorAll('img'))
      .map(i => i.src || i.dataset.src)
      .filter(s => s && s.startsWith('http') && !s.includes('logo') && !s.includes('icon') && !s.includes('avatar'))
      .slice(0, 6);

    const bodyText = document.body.innerText.toLowerCase();
    const hasElevator = !bodyText.includes('sin ascensor') && (bodyText.includes('con ascensor') || bodyText.includes('ascensor'));
    const hasGarage = bodyText.includes('garaje') || bodyText.includes('parking') || bodyText.includes('cochera');
    
    const payload = {
      title: title.slice(0, 100),
      url: url,
      price: price || 135000,
      has_elevator: hasElevator,
      has_garage: hasGarage,
      photos: imgs,
      description: document.querySelector('.comment, .description, .re-DetailDescription')?.innerText?.slice(0, 500) || title
    };

    // Enviar a la API local de PisoHunter
    fetch('http://localhost:8000/api/properties/quick-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(data => {
      alert(`✅ ¡Piso importado con éxito a PisoHunter!\n\nPuntuación: ${data.score}/100\nPrecio: ${data.price.toLocaleString()} €\nAscensor: ${data.has_elevator ? 'Sí' : 'No'}`);
    })
    .catch(err => {
      alert(`⚠️ Guardado en portapapeles. Abre PisoHunter y pulsa 'Añadir por URL' o 'Pegar datos'.`);
      navigator.clipboard.writeText(JSON.stringify(payload));
    });
  } catch(e) {
    alert('Error al capturar datos: ' + e.message);
  }
})();
