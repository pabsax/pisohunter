import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import PropertyCard from './components/PropertyCard';
import PropertyModal from './components/PropertyModal';
import FinanceCalculator from './components/FinanceCalculator';
import SettingsView from './components/SettingsView';
import IdealistaSyncModal from './components/IdealistaSyncModal';
import { Search, SlidersHorizontal, Check, Building2, Car } from 'lucide-react';

export default function App() {
  const [properties, setProperties] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pisohunter_cached_props') || '[]');
    } catch {
      return [];
    }
  });
  const [lastSynced, setLastSynced] = useState(() => {
    return localStorage.getItem('pisohunter_last_synced') || '';
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('pisohunter_cached_props');
      return !(cached && JSON.parse(cached).length > 0);
    } catch {
      return true;
    }
  });
  const [currentTab, setCurrentTab] = useState('catalogo');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showIdealistaModal, setShowIdealistaModal] = useState(false);

  // Favorites stored in localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pisohunter_favs') || '[]');
    } catch {
      return [];
    }
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [locationScope, setLocationScope] = useState('capital'); // 'capital', 'aguas_nuevas', 'todos'
  const [filterElevatorOnly, setFilterElevatorOnly] = useState(false);
  const [filterGarageOnly, setFilterGarageOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(170000);
  const [sortBy, setSortBy] = useState('score'); // 'score', 'price_asc', 'm2_desc'

  // Modal
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const toggleFavorite = async (propertyId) => {
    const isFavNow = favorites.includes(propertyId);
    const nextFav = !isFavNow;

    setFavorites(prev => {
      const next = nextFav
        ? [...prev, propertyId]
        : prev.filter(id => id !== propertyId);
      localStorage.setItem('pisohunter_favs', JSON.stringify(next));
      return next;
    });

    setProperties(prev =>
      prev.map(p => p.id === propertyId ? { ...p, is_favorite: nextFav } : p)
    );

    if (selectedProperty && selectedProperty.id === propertyId) {
      setSelectedProperty(prev => ({ ...prev, is_favorite: nextFav }));
    }

    showToast(nextFav ? 'Guardado en favoritos (online)' : 'Eliminado de guardados');

    try {
      await fetch(`/api/properties/${propertyId}/favorite?is_favorite=${nextFav}`, {
        method: 'PATCH'
      });
    } catch (err) {
      console.error('Error toggling favorite online:', err);
    }
  };

  const handleUpdateNotes = async (propertyId, notes) => {
    setProperties(prev =>
      prev.map(p => p.id === propertyId ? { ...p, user_notes: notes } : p)
    );

    if (selectedProperty && selectedProperty.id === propertyId) {
      setSelectedProperty(prev => ({ ...prev, user_notes: notes }));
    }

    showToast('Notas guardadas online');

    try {
      const res = await fetch(`/api/properties/${propertyId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      return res.ok;
    } catch (err) {
      console.error('Error saving notes online:', err);
      return false;
    }
  };

  const fetchProperties = async (silent = false) => {
    try {
      if (!silent && properties.length === 0) setLoading(true);
      const res = await fetch('/api/properties');
      const data = await res.json();
      setProperties(data);

      // Sincronizar favoritos desde el servidor online
      const serverFavs = data.filter(p => p.is_favorite).map(p => p.id);
      setFavorites(prev => {
        const merged = Array.from(new Set([...prev, ...serverFavs]));
        localStorage.setItem('pisohunter_favs', JSON.stringify(merged));
        return merged;
      });

      const now = new Date();
      const timeStr = now.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      setLastSynced(timeStr);
      localStorage.setItem('pisohunter_cached_props', JSON.stringify(data));
      localStorage.setItem('pisohunter_last_synced', timeStr);
    } catch (err) {
      console.error('Error fetching flats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(properties.length > 0);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/scraper/run-batch', { method: 'POST' });
      const data = await res.json();
      await fetchProperties(true);
      showToast(data.message || 'Catálogo actualizado');
    } catch (err) {
      showToast('Error al actualizar');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filtered & Sorted Properties
  const filteredProperties = useMemo(() => {
    return properties
      .filter((p) => {
        // Price filter
        if (p.price > maxPrice) return false;

        // Elevator filter
        if (filterElevatorOnly && !p.has_elevator) return false;

        // Garage filter
        if (filterGarageOnly && !p.has_garage) return false;

        // Favorites tab filter
        if (currentTab === 'favoritos' && !favorites.includes(p.id)) return false;

        // Auto-descarte de pisos con okupas, nuda propiedad, alquilados o precio trampa
        if (p.score_breakdown?.is_blacklisted || p.status === 'descartado') return false;

        // Location Scope
        const norm = (p.neighborhood + ' ' + (p.address || '') + ' ' + p.title).toLowerCase();
        const isDistant = norm.includes('pedanías') || norm.includes('salobral') || 
                          norm.includes('tinajeros') || norm.includes('santa ana') || 
                          norm.includes('chinchilla') || norm.includes('gineta');
        const isAguasNuevas = norm.includes('aguas nuevas');

        if (locationScope === 'capital' && (isDistant || isAguasNuevas)) {
          return false;
        }
        if (locationScope === 'aguas_nuevas' && isDistant && !isAguasNuevas) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchNeigh = p.neighborhood.toLowerCase().includes(q);
          if (!matchTitle && !matchNeigh) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'm2_desc') return b.area_m2 - a.area_m2;
        return (b.score || 0) - (a.score || 0);
      });
  }, [properties, currentTab, favorites, locationScope, filterElevatorOnly, filterGarageOnly, maxPrice, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col selection:bg-white selection:text-zinc-950 pb-20 md:pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl bg-white text-zinc-950 font-medium text-xs shadow-xl animate-in slide-in-from-top-2 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onRefreshClick={handleRefresh}
        isRefreshing={isRefreshing}
        onIdealistaClick={() => setShowIdealistaModal(true)}
        propertiesCount={properties.length}
        favoritesCount={favorites.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-8">
        
        {/* Catálogo or Favoritos */}
        {(currentTab === 'catalogo' || currentTab === 'favoritos') && (
          <div className="space-y-6">
            
            {/* Status & Cache indicator */}
            {lastSynced && (
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Caché local instantánea · Sincronizado: {lastSynced}</span>
                </div>
                <span>{filteredProperties.length} pisos disponibles</span>
              </div>
            )}

            {/* Minimalist Filter Bar */}
            <div className="space-y-3">
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por barrio, calle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-white/[0.08] hover:border-white/20 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-white/40 transition-colors"
                  />
                </div>

                {/* Scope: Capital vs Alrededores */}
                <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-white/[0.08]">
                  <button
                    onClick={() => setLocationScope('capital')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      locationScope === 'capital'
                        ? 'bg-white text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Albacete Capital
                  </button>
                  <button
                    onClick={() => setLocationScope('aguas_nuevas')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      locationScope === 'aguas_nuevas'
                        ? 'bg-white text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Hasta Aguas Nuevas (+8km)
                  </button>
                  <button
                    onClick={() => setLocationScope('todos')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      locationScope === 'todos'
                        ? 'bg-white text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todos
                  </button>
                </div>
              </div>

              {/* Toggles and Sorters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilterElevatorOnly(!filterElevatorOnly)}
                    className={`px-3 py-1.5 rounded-xl font-medium border transition-colors ${
                      filterElevatorOnly
                        ? 'bg-white text-zinc-950 border-white font-semibold'
                        : 'bg-zinc-900/40 text-zinc-400 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    Con ascensor
                  </button>

                  <button
                    onClick={() => setFilterGarageOnly(!filterGarageOnly)}
                    className={`px-3 py-1.5 rounded-xl font-medium border transition-colors ${
                      filterGarageOnly
                        ? 'bg-white text-zinc-950 border-white font-semibold'
                        : 'bg-zinc-900/40 text-zinc-400 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    Con garaje
                  </button>

                  {(filterElevatorOnly || filterGarageOnly || locationScope !== 'capital' || searchQuery) && (
                    <button
                      onClick={() => {
                        setFilterElevatorOnly(false);
                        setFilterGarageOnly(false);
                        setLocationScope('capital');
                        setSearchQuery('');
                      }}
                      className="text-zinc-500 hover:text-zinc-300 px-2 py-1 transition-colors"
                    >
                      Restablecer
                    </button>
                  )}
                </div>

                {/* Sorter */}
                <div className="flex items-center gap-2 text-zinc-400">
                  <span>Ordenar por:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-zinc-900/60 border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-white/40"
                  >
                    <option value="score">Mayor afinidad</option>
                    <option value="price_asc">Más económicos</option>
                    <option value="m2_desc">Más metros cuadrados</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Results Grid */}
            {loading ? (
              <div className="py-24 text-center text-zinc-500">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs">Cargando anuncios reales de Albacete...</p>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="py-20 rounded-3xl border border-white/[0.06] bg-[#111217] text-center p-8 space-y-2">
                <p className="text-sm font-semibold text-white">
                  {currentTab === 'favoritos' ? 'No tienes pisos guardados aún' : 'No hay pisos con estos filtros'}
                </p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  {currentTab === 'favoritos' 
                    ? 'Pulsa el icono de marcador en cualquier piso para guardarlo aquí.' 
                    : 'Prueba a cambiar a "Hasta Aguas Nuevas" o quitar el filtro de ascensor.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    onSelect={setSelectedProperty}
                    isFavorite={favorites.includes(p.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}

          </div>
        )}

        {/* Financial Calculator */}
        {currentTab === 'calculator' && (
          <FinanceCalculator defaultPrice={140000} defaultSavings={65000} />
        )}

        {/* Settings & PWA Guide */}
        {currentTab === 'settings' && (
          <SettingsView onCriteriaUpdated={fetchProperties} />
        )}

      </main>

      {/* iOS Bottom Navigation */}
      <BottomNav 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        favoritesCount={favorites.length} 
      />

      {/* Property Detail Modal */}
      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          isFavorite={favorites.includes(selectedProperty.id)}
          onToggleFavorite={toggleFavorite}
          onUpdateNotes={handleUpdateNotes}
        />
      )}

      {/* Idealista Bulk Sync Modal */}
      <IdealistaSyncModal
        isOpen={showIdealistaModal}
        onClose={() => setShowIdealistaModal(false)}
        onImportSuccess={() => fetchProperties(true)}
      />

    </div>
  );
}
