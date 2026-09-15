import React from 'react';
import { RefreshCw, Bookmark, SlidersHorizontal, Calculator, Compass } from 'lucide-react';

export default function Header({ 
  currentTab, 
  setCurrentTab, 
  onRefreshClick, 
  isRefreshing, 
  onIdealistaClick,
  propertiesCount,
  favoritesCount
}) {
  return (
    <header className="sticky top-0 z-30 bg-[#090a0f]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3.5 sm:px-8 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        
        {/* Brand & Location */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-100 to-zinc-400 flex items-center justify-center shadow-sm">
            <span className="text-black font-black text-sm tracking-tighter">P</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight">PisoHunter</h1>
            <span className="text-xs text-zinc-400 font-medium hidden sm:inline">Albacete</span>
          </div>
        </div>

        {/* Desktop Navigation - Clean pill tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-white/[0.06]">
          <button
            onClick={() => setCurrentTab('catalogo')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'catalogo'
                ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Explorar ({propertiesCount})
          </button>

          <button
            onClick={() => setCurrentTab('favoritos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'favoritos'
                ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Guardados {favoritesCount > 0 ? `(${favoritesCount})` : ''}
          </button>

          <button
            onClick={() => setCurrentTab('calculator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'calculator'
                ? 'bg-white text-zinc-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Calculadora Fiscal
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Active criteria pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/40 border border-white/[0.06] text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-zinc-400">Filtro:</span>
            <span className="font-semibold text-white">Albacete Capital · ≤ 170.000 €</span>
          </div>

          <button
            onClick={onIdealistaClick}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 transition"
            title="Sincronizar búsquedas completas de Idealista"
          >
            <span className="text-amber-400">⚡</span>
            <span className="hidden sm:inline">Idealista Sync</span>
          </button>

          <button
            onClick={onRefreshClick}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium flex items-center gap-2 transition disabled:opacity-50"
            title="Rastrear novedades en Fotocasa y Pisos.com"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
            <span className="hidden sm:inline">Rastrear</span>
          </button>
        </div>

      </div>
    </header>
  );
}
