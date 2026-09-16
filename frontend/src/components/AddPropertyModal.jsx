import React, { useState, useEffect } from 'react';
import { X, Link2, Sparkles, Building2, Car, Bed, Bath, Plus, Image } from 'lucide-react';

export default function AddPropertyModal({ onClose, onAddProperty }) {
  const [mode, setMode] = useState('url'); // 'url' o 'manual'
  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [formData, setFormData] = useState({
    title: '',
    price: 135000,
    neighborhood: 'Ensanche',
    address: '',
    rooms: 2,
    bathrooms: 1,
    area_m2: 80,
    floor: 2,
    has_elevator: true,
    has_garage: false,
    has_balcony: false,
    has_terrace: false,
    has_ac: false,
    is_exterior: true,
    condition: 'para_entrar_a_vivir',
    heating_type: 'gas_natural',
    description: '',
    contact_phone: '',
    agency: '',
    url: '',
    photos: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80']
  });

  const handleParseUrl = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setParsing(true);
    setWarningMsg('');
    try {
      const res = await fetch('/api/properties/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      const data = await res.json();
      
      if (data.warning) {
        setWarningMsg(data.warning);
      }

      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title || 'Piso en Albacete',
        price: data.price || prev.price,
        neighborhood: data.neighborhood || prev.neighborhood,
        rooms: data.rooms || prev.rooms,
        bathrooms: data.bathrooms || prev.bathrooms,
        area_m2: data.area_m2 || prev.area_m2,
        has_elevator: data.has_elevator !== undefined ? data.has_elevator : prev.has_elevator,
        has_garage: data.has_garage !== undefined ? data.has_garage : prev.has_garage,
        has_terrace: data.has_terrace !== undefined ? data.has_terrace : prev.has_terrace,
        has_balcony: data.has_balcony !== undefined ? data.has_balcony : prev.has_balcony,
        description: data.description || prev.description,
        photos: data.photos && data.photos.length > 0 ? data.photos : prev.photos,
        url: url.trim()
      }));

      setMode('manual'); // Pasar a modo revisión / edición antes de guardar
    } catch (err) {
      setWarningMsg('No se pudo extraer automáticamente el portal. Introduce los datos manualmente a continuación.');
      setMode('manual');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await onAddProperty(formData);
    onClose();
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90 sticky top-0 z-10">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
              <Plus className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Añadir Inmueble a PisoHunter</span>
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Pega el enlace de Idealista/Fotocasa o escribe los datos del piso
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0 active:scale-95 touch-manipulation"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Selector de modo */}
        <div className="flex border-b border-slate-800 p-2 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'url' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Pegar Enlace (Auto-extraer)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Formulario Manual</span>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {mode === 'url' ? (
            <form onSubmit={handleParseUrl} className="space-y-4 py-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Enlace del anuncio (Idealista, Fotocasa, Pisos.com, Habitaclia...)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://www.idealista.com/inmueble/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={parsing}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{parsing ? 'Extrayendo...' : 'Procesar'}</span>
                  </button>
                </div>
              </div>

              {warningMsg && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  {warningMsg}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
                <span className="font-bold text-slate-300 block">💡 Consejo para portales con protección:</span>
                <p>
                  Si el portal bloquea la petición automática, se abrirá el formulario para que solo tengas que revisar o poner el precio y barrio. O bien usa el Bookmarklet de 1-clic desde la pestaña "Ajustes".
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Título */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Título o referencia</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Piso luminoso reformado en Ensanche con ascensor"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              {/* Precio y Barrio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Precio (€)</label>
                  <input
                    type="number"
                    required
                    min="10000"
                    max="500000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Barrio / Zona de Albacete</label>
                  <input
                    type="text"
                    required
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Ej: Ensanche, Franciscanos, Feria, Centro..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Habitaciones, Baños, Metros y Planta */}
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Habitaciones</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={formData.rooms}
                    onChange={(e) => setFormData({ ...formData, rooms: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Baños</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Metros (m²)</label>
                  <input
                    type="number"
                    min="20"
                    max="400"
                    value={formData.area_m2}
                    onChange={(e) => setFormData({ ...formData, area_m2: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Planta</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Toggles de Ascensor y Garaje */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, has_elevator: !formData.has_elevator })}
                  className={`p-3 rounded-xl border flex items-center justify-between font-bold transition ${
                    formData.has_elevator
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>🛗 Ascensor</span>
                  <span>{formData.has_elevator ? 'SÍ' : 'NO'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, has_garage: !formData.has_garage })}
                  className={`p-3 rounded-xl border flex items-center justify-between font-bold transition ${
                    formData.has_garage
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>🚗 Garaje incluido</span>
                  <span>{formData.has_garage ? 'SÍ' : 'NO'}</span>
                </button>
              </div>

              {/* Toggles secundarios: Balcón, Terraza, Exterior */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_exterior: !formData.is_exterior })}
                  className={`py-2 px-3 rounded-xl border text-center font-semibold transition ${
                    formData.is_exterior
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  Exterior: {formData.is_exterior ? 'Sí' : 'No'}
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, has_balcony: !formData.has_balcony })}
                  className={`py-2 px-3 rounded-xl border text-center font-semibold transition ${
                    formData.has_balcony
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  Balcón: {formData.has_balcony ? 'Sí' : 'No'}
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, has_terrace: !formData.has_terrace })}
                  className={`py-2 px-3 rounded-xl border text-center font-semibold transition ${
                    formData.has_terrace
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  Terraza: {formData.has_terrace ? 'Sí' : 'No'}
                </button>
              </div>

              {/* Estado y Calefacción */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Estado de la vivienda</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="para_entrar_a_vivir">Para entrar a vivir</option>
                    <option value="buen_estado">Buen estado</option>
                    <option value="a_reformar">A reformar</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block">Calefacción</label>
                  <select
                    value={formData.heating_type}
                    onChange={(e) => setFormData({ ...formData, heating_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    <option value="gas_natural">Gas Natural Individual</option>
                    <option value="central">Central comunitaria</option>
                    <option value="electrica">Eléctrica / Bomba</option>
                    <option value="ninguna">Sin calefacción</option>
                  </select>
                </div>
              </div>

              {/* Botón de Guardar */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 transition"
                >
                  Guardar y Puntuar Inmueble
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
