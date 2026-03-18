
import React, { useState } from 'react';
import {
  format,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
} from 'date-fns';
import { FlatEvent } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EVENT_INDICATOR_COLORS } from '../constants';

interface MonthlyViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  events: FlatEvent[];
}

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
};
const subMonths = (date: Date, n: number) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - n);
  return d;
};

const MonthlyView: React.FC<MonthlyViewProps> = ({ selectedDate, onDateChange, events }) => {
  const [viewMonth, setViewMonth] = useState(selectedDate);

  const monthStart = getStartOfMonth(viewMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = getStartOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const numWeeks = calendarDays.length / 7;

  const getEventsForDate = (date: Date) =>
    events.filter(e => {
      const start = new Date(e.startTime);
      const end = new Date(e.endTime);
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
      return start <= dayEnd && end >= dayStart;
    });

  return (
    /* Root: flex-col on desktop so grid can flex-1 to fill the square panel */
    <div className="bg-white border-b border-gray-100 md:border-b-0 md:border-r md:flex md:flex-col md:h-full">

      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h2 className="text-sm font-bold text-gray-800">{format(viewMonth, 'MMMM yyyy')}</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMonth(m => subMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setViewMonth(m => addMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 shrink-0 border-b border-gray-50">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-semibold text-gray-400 tracking-wide uppercase">
            {d}
          </div>
        ))}
      </div>

      {/*
        Day grid:
        - Mobile:  aspect-square cells, grid height auto (no flex-1)
        - Desktop: flex-1 fills remaining panel height; gridTemplateRows splits evenly
      */}
      <div
        className="grid grid-cols-7 md:flex-1 md:min-h-0"
        style={{ gridTemplateRows: `repeat(${numWeeks}, 1fr)` }}
      >
        {calendarDays.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, monthStart);
          const dayEvents = getEventsForDate(day);

          return (
            <button
              key={idx}
              onClick={() => { onDateChange(day); setViewMonth(day); }}
              className={`
                aspect-square md:aspect-auto
                flex flex-col items-center justify-center gap-0.5
                border-t border-gray-50 transition-colors
                ${isSelected
                  ? 'bg-[#4F52A0]'
                  : inMonth
                  ? 'hover:bg-gray-50'
                  : 'bg-gray-50/40'}
              `}
            >
              <span
                className={`text-xs font-semibold leading-none
                  ${isSelected ? 'text-white'
                    : isToday ? 'text-[#4F52A0] font-bold'
                    : inMonth ? 'text-gray-700'
                    : 'text-gray-300'}
                `}
              >
                {format(day, 'd')}
              </span>
              {dayEvents.length > 0 && (
                <div className="flex gap-[2px] mt-0.5">
                  {dayEvents.slice(0, 3).map(e => (
                    <div
                      key={e.id}
                      className="w-1 h-1 rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(255,255,255,0.65)'
                          : EVENT_INDICATOR_COLORS[e.type],
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyView;
