import React, { useState, useEffect } from 'react';
import { 
  X, Check, Star, AlertTriangle, Droplets, Zap, 
  Volume2, Sun, Building, FileText, CheckCircle2, ThumbsUp, ThumbsDown 
} from 'lucide-react';

export default function VisitChecklistModal({ property, onClose, onSaveChecklist }) {
  const [checklist, setChecklist] = useState({
    property_id: property.id,
    visited_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    noise_level: 3,
    natural_light: 3,
    building_condition: 3,
    dampness_detected: false,
    water_pressure_good: true,
    electric_panel_updated: true,
    pending_derramas: 'ninguna',
    community_fee_confirmed: property.community_fee || '',
    ibi_annual: '',
    seller_motivation: '',
    notes: '',
    would_buy: null
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${property.id}/checklist`)
      .then(res => res.json())
      .then(data => {
        if (data && data.property_id) {
          setChecklist(prev => ({
            ...prev,
            ...data,
            community_fee_confirmed: data.community_fee_confirmed ?? property.community_fee ?? '',
            ibi_annual: data.ibi_annual ?? ''
          }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [property.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...checklist,
        community_fee_confirmed: checklist.community_fee_confirmed ? parseFloat(checklist.community_fee_confirmed) : null,
        ibi_annual: checklist.ibi_annual ? parseFloat(checklist.ibi_annual) : null,
      };
      await onSaveChecklist(property.id, payload);
      onClose();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90 sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋 Hoja de Visita Presencial</span>
            </h3>
            <p className="text-xs text-slate-400 truncate max-w-md">
              {property.title} • {property.neighborhood} ({property.price.toLocaleString()} €)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario móvil */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          
          {/* Calificaciones 1 a 5 con botones grandes táctiles */}
          <div className="space-y-4">
            {/* Silencio / Ruido */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Volume2 className="w-4 h-4 text-emerald-400" /> Aislamiento y Ruidos
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {checklist.noise_level === 5 ? 'Muy silencioso' : checklist.noise_level === 1 ? 'Muy ruidoso' : `${checklist.noise_level}/5`}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setChecklist({ ...checklist, noise_level: val })}
                    className={`py-2 rounded-xl font-bold text-xs transition ${
                      checklist.noise_level === val
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {val} ★
                  </button>
                ))}
              </div>
            </div>

            {/* Luz Natural */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Sun className="w-4 h-4 text-amber-400" /> Luminosidad Natural
                </span>
                <span className="text-xs font-bold text-amber-400">
                  {checklist.natural_light === 5 ? 'Muy luminoso' : checklist.natural_light === 1 ? 'Oscuro' : `${checklist.natural_light}/5`}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setChecklist({ ...checklist, natural_light: val })}
                    className={`py-2 rounded-xl font-bold text-xs transition ${
                      checklist.natural_light === val
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {val} ★
                  </button>
                ))}
              </div>
            </div>

            {/* Estado Edificio y Portal */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Building className="w-4 h-4 text-cyan-400" /> Conservación de la Finca / Portal
                </span>
                <span className="text-xs font-bold text-cyan-400">
                  {checklist.building_condition === 5 ? 'Excelente' : checklist.building_condition === 1 ? 'Muy degradado' : `${checklist.building_condition}/5`}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setChecklist({ ...checklist, building_condition: val })}
                    className={`py-2 rounded-xl font-bold text-xs transition ${
                      checklist.building_condition === val
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {val} ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comprobaciones Técnicas (Interruptores) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Comprobaciones Clave en la Vivienda
            </h4>

            {/* Humedades */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Droplets className={`w-4 h-4 ${checklist.dampness_detected ? 'text-rose-400' : 'text-slate-500'}`} />
                <span className="text-xs sm:text-sm text-slate-200">¿Humedades en techos/paredes?</span>
              </div>
              <button
                type="button"
                onClick={() => setChecklist({ ...checklist, dampness_detected: !checklist.dampness_detected })}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                  checklist.dampness_detected
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {checklist.dampness_detected ? '⚠️ SÍ DETECTADAS' : 'No'}
              </button>
            </div>

            {/* Presión de agua */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${checklist.water_pressure_good ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className="text-xs sm:text-sm text-slate-200">¿Buena presión de agua y desagües?</span>
              </div>
              <button
                type="button"
                onClick={() => setChecklist({ ...checklist, water_pressure_good: !checklist.water_pressure_good })}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                  checklist.water_pressure_good
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {checklist.water_pressure_good ? 'Correcto' : 'Poca presión'}
              </button>
            </div>

            {/* Cuadro Eléctrico */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${checklist.electric_panel_updated ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className="text-xs sm:text-sm text-slate-200">¿Cuadro eléctrico renovado?</span>
              </div>
              <button
                type="button"
                onClick={() => setChecklist({ ...checklist, electric_panel_updated: !checklist.electric_panel_updated })}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                  checklist.electric_panel_updated
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {checklist.electric_panel_updated ? 'Moderno' : 'Antiguo / Plomos'}
              </button>
            </div>
          </div>

          {/* Derramas y Gastos Fijos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block">¿Derramas comunitarias?</label>
              <select
                value={checklist.pending_derramas}
                onChange={(e) => setChecklist({ ...checklist, pending_derramas: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-emerald-500"
              >
                <option value="ninguna">Ninguna aprobada</option>
                <option value="posible">En estudio / discusión</option>
                <option value="aprobada">⚠️ Derrama aprobada</option>
              </select>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block">Comunidad real (€/mes)</label>
              <input
                type="number"
                placeholder="Ej: 50"
                value={checklist.community_fee_confirmed}
                onChange={(e) => setChecklist({ ...checklist, community_fee_confirmed: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Notas y Veredicto */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block">Notas de la visita / Preguntas al vendedor</label>
              <textarea
                rows="3"
                placeholder="¿Por qué venden? ¿Vecinos problemáticos? ¿Incluye trastero?..."
                value={checklist.notes || ''}
                onChange={(e) => setChecklist({ ...checklist, notes: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Veredicto de compra */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 block mb-2">Veredicto Final: ¿Comprarías este piso?</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChecklist({ ...checklist, would_buy: true })}
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    checklist.would_buy === true
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Sí, es muy buena opción</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChecklist({ ...checklist, would_buy: false })}
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                    checklist.would_buy === false
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>No, descartado</span>
                </button>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar y Marcar como Visitado'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
