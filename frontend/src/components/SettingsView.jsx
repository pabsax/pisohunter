import React, { useState, useEffect } from 'react';
import { 
  Sliders, Smartphone, Bookmark, ShieldAlert, 
  Save, CheckCircle2, Copy, Check, Share2, PlusSquare 
} from 'lucide-react';

export default function SettingsView({ onCriteriaUpdated }) {
  const [criteria, setCriteria] = useState({
    max_budget: 170000,
    savings_available: 65000,
    clm_itp_percent: 9.0,
    min_rooms: 1,
    preferred_rooms: 2,
    blacklisted_neighborhoods: ["las 600", "la milagrosa", "el congo", "churruca", "sector 3"],
    require_elevator: true,
    desire_garage: true,
    prefer_ready_to_move: true,
    interest_rate_percent: 2.75,
    mortgage_term_years: 30,
    mortgage_percentage: 80.0
  });

  const [newBannedZone, setNewBannedZone] = useState('');
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/criteria')
      .then(res => res.json())
      .then(data => {
        if (data && data.max_budget) {
          setCriteria(data);
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria)
      });
      if (res.ok) {
        setSavedSuccess(true);
        if (onCriteriaUpdated) onCriteriaUpdated();
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert('Error guardando criterios: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addBannedZone = () => {
    if (newBannedZone.trim() && !criteria.blacklisted_neighborhoods.includes(newBannedZone.trim().toLowerCase())) {
      setCriteria(prev => ({
        ...prev,
        blacklisted_neighborhoods: [...prev.blacklisted_neighborhoods, newBannedZone.trim().toLowerCase()]
      }));
      setNewBannedZone('');
    }
  };

  const removeBannedZone = (zone) => {
    setCriteria(prev => ({
      ...prev,
      blacklisted_neighborhoods: prev.blacklisted_neighborhoods.filter(z => z !== zone)
    }));
  };

  const bookmarkletCode = `javascript:(function(){try{const u=window.location.href,t=document.querySelector('h1')?.innerText?.trim()||document.title,pEl=document.querySelector('.info-data-price,.re-DetailHeader-price,.price,[data-testid="price"]');let p=0;if(pEl){const m=pEl.innerText.replace(/\\./g,'').replace(/,/g,'.').match(/(\\d+)/);if(m)p=parseFloat(m[1]);}if(!p){const m=document.body.innerText.match(/(\\d{2,3}(?:\\.\\d{3})*)\\s*€/);if(m)p=parseFloat(m[1].replace(/\\./g,''));}const b=document.body.innerText.toLowerCase(),hasE=!b.includes('sin ascensor')&&(b.includes('con ascensor')||b.includes('ascensor')),hasG=b.includes('garaje')||b.includes('parking')||b.includes('cochera'),imgs=Array.from(document.querySelectorAll('img')).map(i=>i.src||i.dataset.src).filter(s=>s&&s.startsWith('http')&&!s.includes('logo')&&!s.includes('icon')).slice(0,6);fetch('http://localhost:8000/api/properties/quick-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t.slice(0,100),url:u,price:p||135000,has_elevator:hasE,has_garage:hasG,photos:imgs})}).then(r=>r.json()).then(d=>alert('✅ ¡Piso importado a PisoHunter con puntuación '+d.score+'/100!')).catch(()=>alert('⚠️ No se pudo conectar con el servidor local'));}catch(e){alert('Error:'+e.message);}})();`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Guía de Instalación en iPhone PWA */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Instalar PisoHunter en tu iPhone
            </h2>
            <p className="text-xs sm:text-sm text-emerald-400/90 font-medium">
              Añádelo a la pantalla de inicio para usarlo a pantalla completa como una App nativa
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs">
              1
            </div>
            <h4 className="font-bold text-white text-sm">Abre Safari en el iPhone</h4>
            <p className="text-slate-400">
              Abre la dirección IP de tu ordenador en la misma red WiFi o accede al puerto 5173.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs">
              2
            </div>
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-emerald-400" /> Pulsa "Compartir"
            </h4>
            <p className="text-slate-400">
              Toca el botón cuadrado con la flecha hacia arriba en la barra inferior de Safari.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs">
              3
            </div>
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <PlusSquare className="w-4 h-4 text-emerald-400" /> "Añadir a Inicio"
            </h4>
            <p className="text-slate-400">
              Desplaza hacia abajo, elige <strong>Añadir a pantalla de inicio</strong> y pulsa Añadir.
            </p>
          </div>
        </div>
      </div>

      {/* Bookmarklet de 1-Clic para Portales */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Bookmarklet "Guardar con 1-Clic" desde Idealista o Fotocasa
            </h3>
            <p className="text-xs text-slate-400">
              Evita bloqueos de captchas importando cualquier anuncio directamente desde tu navegador
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <div className="text-xs text-slate-300">
            <span className="font-bold text-emerald-400 block mb-1">¿Cómo instalarlo en 20 segundos?</span>
            <p className="text-slate-400 leading-relaxed">
              Copia el código, crea un marcador cualquiera en tu navegador (ej. Chrome o Safari) y en la URL pega el código. Cuando estés viendo un piso en Idealista, haz clic en el marcador y ¡listo!
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition flex-shrink-0"
          >
            {copiedBookmarklet ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
            <span>{copiedBookmarklet ? '¡Código Copiado!' : 'Copiar Código Bookmarklet'}</span>
          </button>
        </div>
      </div>

      {/* Formulario de Criterios del Algoritmo */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Sliders className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Parámetros del Motor de Scoring</h3>
              <p className="text-slate-400">Al guardar, se recalculan los puntos de todos los pisos automáticamente</p>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Recalculando...' : 'Guardar y Recalcular'}</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Criterios actualizados y puntuaciones recalculadas con éxito!</span>
          </div>
        )}

        {/* Presupuesto y Ahorros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <label className="font-bold text-slate-200 block">Presupuesto Máximo de Compra (€)</label>
            <input
              type="number"
              value={criteria.max_budget}
              onChange={(e) => setCriteria({ ...criteria, max_budget: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:border-emerald-500"
            />
            <span className="text-[11px] text-slate-500 block">Tu tope actual fijado: 170.000 €</span>
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <label className="font-bold text-slate-200 block">Ahorros Disponibles (€)</label>
            <input
              type="number"
              value={criteria.savings_available}
              onChange={(e) => setCriteria({ ...criteria, savings_available: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:border-emerald-500"
            />
            <span className="text-[11px] text-slate-500 block">Para entrada (20%) + impuestos y notaría</span>
          </div>
        </div>

        {/* Zonas Vetadas (Blacklist Estricta) */}
        <div className="space-y-3 p-5 rounded-2xl bg-slate-950 border border-rose-500/30">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <label className="font-bold text-white text-sm">Zonas y Barrios Vetados (Descarte 100%)</label>
          </div>
          <p className="text-slate-400 text-[11px]">
            Cualquier piso que mencione estas zonas en su dirección o texto recibirá puntuación 0 y será descartado.
          </p>

          <div className="flex flex-wrap gap-2">
            {criteria.blacklisted_neighborhoods.map((zone) => (
              <span 
                key={zone}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-semibold flex items-center gap-1.5"
              >
                <span>{zone}</span>
                <button
                  type="button"
                  onClick={() => removeBannedZone(zone)}
                  className="hover:text-white transition"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Añadir otra zona a descartar..."
              value={newBannedZone}
              onChange={(e) => setNewBannedZone(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBannedZone(); } }}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-rose-500"
            />
            <button
              type="button"
              onClick={addBannedZone}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700"
            >
              Añadir
            </button>
          </div>
        </div>

        {/* Preferencias de Ascensor y Garaje */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-200 block text-sm">🛗 Ascensor Casi Imprescindible</span>
              <span className="text-[11px] text-slate-500">Penaliza fuertemente plantas sin ascensor</span>
            </div>
            <button
              type="button"
              onClick={() => setCriteria({ ...criteria, require_elevator: !criteria.require_elevator })}
              className={`px-4 py-2 rounded-xl font-bold transition ${
                criteria.require_elevator ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {criteria.require_elevator ? 'Activado' : 'Desactivado'}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-200 block text-sm">🚗 Garaje Deseable</span>
              <span className="text-[11px] text-slate-500">Otorga bonus de puntuación si incluye cochera</span>
            </div>
            <button
              type="button"
              onClick={() => setCriteria({ ...criteria, desire_garage: !criteria.desire_garage })}
              className={`px-4 py-2 rounded-xl font-bold transition ${
                criteria.desire_garage ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {criteria.desire_garage ? 'Activado' : 'Desactivado'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
