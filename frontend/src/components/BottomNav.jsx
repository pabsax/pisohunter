import React from 'react';
import { Compass, Bookmark, Calculator, SlidersHorizontal } from 'lucide-react';

export default function BottomNav({ currentTab, setCurrentTab, favoritesCount }) {
  const tabs = [
    { id: 'catalogo', label: 'Explorar', icon: Compass },
    { id: 'favoritos', label: 'Guardados', icon: Bookmark, badge: favoritesCount > 0 ? favoritesCount : null },
    { id: 'calculator', label: 'Calculadora', icon: Calculator },
    { id: 'settings', label: 'Ajustes', icon: SlidersHorizontal },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090a0f]/90 backdrop-blur-2xl border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)] px-4 pt-1.5 shadow-2xl">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center py-2 px-3 transition-colors relative ${
                isActive ? 'text-white font-medium' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-white text-zinc-950 text-[10px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
