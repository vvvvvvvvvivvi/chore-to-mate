
import React from 'react';
import { CalendarDays, Bell, BarChart2 } from 'lucide-react';
import { ViewType } from '../types';

interface BottomNavProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  notificationCount?: number;
}

const tabs: { id: ViewType; label: string; Icon: React.FC<{ size: number; strokeWidth: number }> }[] = [
  { id: 'activity', label: 'Activity', Icon: Bell },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'stats',    label: 'Insights', Icon: BarChart2 },
];

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange, notificationCount = 0 }) => {
  const isSetup = currentView === 'setup' || currentView === 'profile';

  return (
    <div
      className={`fixed bottom-4 inset-x-4 z-50 transition-all duration-300 ${
        isSetup ? 'opacity-0 pointer-events-none translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="glass card-shadow-lg rounded-2xl border border-white/70 flex items-center justify-around px-2 py-2">
        {tabs.map(({ id, label, Icon }) => {
          const active = currentView === id;
          const showBadge = id === 'activity' && notificationCount > 0;
          return (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className="flex-1 flex flex-col items-center"
            >
              <div
                className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all duration-200 w-full ${
                  active
                    ? 'btn-primary text-white'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/60'
                }`}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  {showBadge && (
                    <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center font-bold border-2 border-white leading-none">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </div>
                  )}
                </div>
                <span className={`text-[10px] font-semibold tracking-wide leading-none ${active ? 'opacity-100' : 'opacity-60'}`}>
                  {label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
