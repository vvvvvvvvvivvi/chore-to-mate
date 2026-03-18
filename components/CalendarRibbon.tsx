
import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { FlatEvent } from '../types';
import { EVENT_INDICATOR_COLORS } from '../constants';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarRibbonProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: FlatEvent[];
}

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const diff = d.getDate() - d.getDay();
  return new Date(d.setDate(diff));
};

const CalendarRibbon: React.FC<CalendarRibbonProps> = ({ selectedDate, onDateChange, events }) => {
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(selectedDate));

  useEffect(() => {
    setWeekStart(getStartOfWeek(selectedDate));
  }, [format(selectedDate, 'yyyy-MM-dd')]);

  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const getEventsForDate = (date: Date) => {
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
    return events.filter(e => {
      const s = new Date(e.startTime);
      const en = new Date(e.endTime);
      return s <= dayEnd && en >= dayStart;
    });
  };

  const prevWeek = () => setWeekStart(prev => addDays(prev, -7));
  const nextWeek = () => setWeekStart(prev => addDays(prev, 7));

  const lastDay = addDays(weekStart, 6);
  const monthLabel =
    format(weekStart, 'MMMM') === format(lastDay, 'MMMM')
      ? format(weekStart, 'MMMM yyyy')
      : `${format(weekStart, 'MMM')} – ${format(lastDay, 'MMM yyyy')}`;

  return (
    <div className="bg-white/95 border-b border-[#E8E6F4] fixed top-14 w-full z-40" style={{ boxShadow: '0 2px 12px rgba(79,82,160,0.06)' }}>
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
        <button
          onClick={prevWeek}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0EFF9] text-[#4F52A0] transition-colors active:scale-90"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <span className="text-[11px] font-bold text-[#4F52A0] uppercase tracking-[0.12em]">
          {monthLabel}
        </span>
        <button
          onClick={nextWeek}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F0EFF9] text-[#4F52A0] transition-colors active:scale-90"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Day cells */}
      <div className="flex justify-between pb-2.5 px-3 gap-1">
        {days.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const dayEvents = getEventsForDate(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateChange(day)}
              className={`flex flex-col items-center flex-1 py-2 rounded-xl transition-all duration-200 active:scale-95 ${
                isSelected ? 'text-white shadow-sm' : 'hover:bg-[#F0EFF9] text-[#1C1A3A]'
              }`}
              style={isSelected ? { background: 'linear-gradient(145deg, #4F52A0, #6466C8)', boxShadow: '0 3px 10px rgba(79,82,160,0.35)' } : {}}
            >
              <span className={`text-[10px] font-bold tracking-wide uppercase mb-0.5 ${isSelected ? 'opacity-80' : 'opacity-50'}`}>
                {format(day, 'EEE')}
              </span>
              <span className={`text-[17px] font-bold leading-none ${isToday && !isSelected ? 'text-[#5254A3]' : ''}`}>
                {format(day, 'd')}
              </span>

              {/* Event dots */}
              <div className="flex gap-[3px] mt-1.5 h-1">
                {dayEvents.slice(0, 3).map(e => (
                  <div
                    key={e.id}
                    className="w-[5px] h-[5px] rounded-full"
                    style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' : EVENT_INDICATOR_COLORS[e.type] }}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className={`w-[5px] h-[5px] rounded-full ${isSelected ? 'bg-white/50' : 'bg-[#9CA3AF]'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarRibbon;
