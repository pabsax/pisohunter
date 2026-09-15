import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Zap } from 'lucide-react';

export default function IdealistaSyncModal({ isOpen, onClose, onImportSuccess }) {
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  if (!isOpen) return null;

  const bookmarkletCode = `javascript:(function(){const a=document.querySelectorAll('article.item,div.item-multimedia-container');if(!a||!a.length){alert('PisoHunter: No se detectaron anuncios en esta página de Idealista.');return;}const items=[];a.forEach(art=>{try{const linkEl=art.querySelector('a.item-link')||art.querySelector('a[href*="/inmueble/"]');if(!linkEl)return;const title=(linkEl.getAttribute('title')||linkEl.innerText||'').trim();const href=linkEl.href;if(!href||items.some(i=>i.url===href))return;const priceEl=art.querySelector('.item-price')||art.querySelector('.price');let price=0;if(priceEl){price=parseFloat(priceEl.innerText.replace(/\\./g,'').replace(/[^\\d]/g,''))||0;}const allText=(art.innerText||'').toLowerCase();let rooms=2,area_m2=80,floor=null,has_elevator=!allText.includes('sin ascensor'),has_garage=allText.includes('garaje')||allText.includes('parking');art.querySelectorAll('.item-detail').forEach(d=>{const t=d.innerText.toLowerCase();const mHab=t.match(/(\\d+)\\s*hab/);if(mHab)rooms=parseInt(mHab[1]);const mM2=t.match(/(\\d+)\\s*m/);if(mM2)area_m2=parseFloat(mM2[1]);const mFloor=t.match(/(\\d+)ª/);if(mFloor)floor=parseInt(mFloor[1]);if(t.includes('bajo'))floor=0;});const photos=[];art.querySelectorAll('img').forEach(img=>{const src=img.getAttribute('data-ondemand-img')||img.src;if(src&&src.startsWith('http')&&!src.includes('data:image')&&!photos.includes(src))photos.push(src);});items.push({title:title||'Piso en Albacete',url:href,source:'idealista',price:price,rooms:rooms,bathrooms:1,area_m2:area_m2,floor:floor,has_elevator:has_elevator,has_garage:has_garage,neighborhood:'Albacete Capital',photos:photos.slice(0,8),description:title});}catch(e){}});if(!items.length){alert('PisoHunter: No se pudieron extraer datos.');return;}const t=document.createElement('div');t.style.cssText='position:fixed;top:20px;right:20px;z-index:999999;background:#090a0f;color:#fff;padding:16px 24px;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2);font-family:system-ui;font-size:14px;';t.innerHTML='<strong>PisoHunter</strong><br>Enviando '+items.length+' pisos...';document.body.appendChild(t);fetch('http://localhost:8000/api/properties/bulk-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(items)}).then(r=>r.json()).then(d=>{t.style.borderColor='#10b981';t.innerHTML='<strong>✅ ¡Completado!</strong><br>'+(d.count||items.length)+' pisos de Idealista importados.';setTimeout(()=>t.remove(),4000);}).catch(()=>{t.style.borderColor='#ef4444';t.innerHTML='<strong>⚠️ Error</strong><br>Asegúrate de tener PisoHunter abierto.';setTimeout(()=>t.remove(),5000);});})();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleManualImport = async (e) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;

    setIsImporting(true);
    setImportStatus(null);
    try {
      const res = await fetch('/api/properties/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: manualUrl.trim() })
      });
      const data = await res.json();
      
      // Guardar piso
      const saveRes = await fetch('/api/properties/quick-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          source: 'idealista',
          url: manualUrl.trim()
        })
      });
      const savedData = await saveRes.json();
      setImportStatus({ success: true, message: `Piso "${savedData.title}" importado con éxito.` });
      setManualUrl('');
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setImportStatus({ success: false, message: 'No se pudo importar automáticamente. Revisa la URL.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#111217] border border-white/10 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
              ⚡
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Sincronización con Idealista
              </h3>
              <p className="text-xs text-zinc-400">
                Importa 30 pisos de golpe sin meterlos uno a uno
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Why this works */}
        <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.06] text-xs text-zinc-300 leading-relaxed space-y-1">
          <p className="text-zinc-200 font-medium">¿Por qué este método es 100% infalible?</p>
          <p className="text-zinc-400">
            Idealista bloquea a los servidores con captchas de DataDome, pero <strong>cuando tú navegas en tu navegador real estás autenticado</strong>. Con el extractor en 1-clic o la extensión, capturas la página entera de búsqueda y la vuelcas a PisoHunter al instante.
          </p>
        </div>

        {/* Method 1: Bookmarklet en 1-Clic (Recomendado) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-semibold text-white">Método 1</span>
            <span className="text-xs font-semibold text-white">Extractor de Búsqueda 1-Clic (Bookmarklet)</span>
          </div>

          <div className="space-y-2 text-xs text-zinc-400">
            <p>1. Pulsa el botón para copiar el código del extractor.</p>
            <p>2. Guárdalo como marcador/favorito en tu navegador (Chrome o Safari en Mac/iPhone).</p>
            <p>3. Abre la búsqueda de Albacete en Idealista y pulsa el marcador: <strong>extraerá todos los 30 pisos de la página de una sola vez</strong>.</p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCopy}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                copied 
                  ? 'bg-emerald-500 text-black shadow-sm' 
                  : 'bg-white hover:bg-zinc-200 text-zinc-950 font-bold'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  ¡Código copiado al portapapeles!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copiar Código del Bookmarklet
                </>
              )}
            </button>

            <a
              href="https://www.idealista.com/venta-viviendas/albacete-albacete/?precio-hasta_170000"
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium flex items-center gap-1.5 transition"
            >
              <span>Abrir Idealista</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Method 2: Extensión de Chrome */}
        <div className="space-y-2.5 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-semibold text-white">Método 2</span>
            <span className="text-xs font-semibold text-white">Extensión de Chrome de Fondo</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ya hemos creado la extensión en la carpeta <code className="text-zinc-200 bg-zinc-950 px-1.5 py-0.5 rounded">chrome_extension/</code>. En Chrome abre <code className="text-zinc-200 bg-zinc-950 px-1.5 py-0.5 rounded">chrome://extensions</code>, activa <strong>Modo Desarrollador</strong> y dale a <strong>"Cargar descomprimida"</strong>. Te añadirá un botón flotante automático cada vez que abras Idealista.
          </p>
        </div>

        {/* Method 3: Pegar enlace individual */}
        <div className="space-y-2.5 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-semibold text-white">Método 3</span>
            <span className="text-xs font-semibold text-white">Importar un piso suelto por enlace</span>
          </div>

          <form onSubmit={handleManualImport} className="flex gap-2">
            <input
              type="url"
              placeholder="https://www.idealista.com/inmueble/..."
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-white/30"
            />
            <button
              type="submit"
              disabled={isImporting || !manualUrl.trim()}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium transition disabled:opacity-50"
            >
              {isImporting ? 'Importando...' : 'Importar'}
            </button>
          </form>

          {importStatus && (
            <p className={`text-xs ${importStatus.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {importStatus.message}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
