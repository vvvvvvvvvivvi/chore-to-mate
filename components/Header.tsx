
import React, { useState } from 'react';
import { Search, Menu, CalendarDays, Calendar as CalendarIcon, ArrowLeft, X, Grid3x3 } from 'lucide-react';
import { CalendarViewMode } from '../types';

interface HeaderProps {
  viewMode: CalendarViewMode;
  onToggleViewMode: () => void;
  showToggle: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuClick: () => void;
  isSetup?: boolean;
  flatName?: string;
}

const Header: React.FC<HeaderProps> = ({
  viewMode,
  onToggleViewMode,
  showToggle,
  searchQuery,
  onSearchChange,
  onMenuClick,
  isSetup = false,
  flatName,
}) => {
  const [isSearching, setIsSearching] = useState(false);

  return (
    <div className="header-gradient text-white h-14 flex items-center justify-between px-4 fixed top-0 w-full z-50">
      {isSearching ? (
        <div className="flex items-center flex-1 gap-2 animate-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => { setIsSearching(false); onSearchChange(''); }}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 bg-white/15 rounded-xl flex items-center px-3 py-2 gap-2">
            <Search size={14} className="opacity-60 shrink-0" />
            <input
              autoFocus
              className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-white/50 font-medium"
              placeholder="Search tasks, people…"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="p-0.5 hover:bg-white/20 rounded-full">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 ml-10">
            <button
              onClick={!isSetup ? onMenuClick : undefined}
              className={`p-2 rounded-xl transition-colors ${isSetup ? 'opacity-20 cursor-default' : 'hover:bg-white/10'}`}
            >
              <Menu size={19} />
            </button>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-semibold tracking-widest uppercase opacity-50">Chore-to-Mate</span>
              <span className="text-sm font-bold tracking-tight truncate max-w-[140px]">{flatName || 'My Flat'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              onClick={() => setIsSearching(true)}
            >
              <Search size={18} />
            </button>

            {showToggle && (
              <button
                onClick={onToggleViewMode}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                {viewMode === 'week' ? <CalendarIcon size={18} /> : <CalendarDays size={18} />}
              </button>
            )}

            <button className="p-2 opacity-25 cursor-not-allowed">
              <Grid3x3 size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Header;
