
import React, { useRef, useEffect } from 'react';
import { FlatEvent, TaskStatus, Flatmate } from '../types';
import { format } from 'date-fns';
import { EVENT_COLORS, EVENT_INDICATOR_COLORS } from '../constants';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface TimeBlockedViewProps {
  events: FlatEvent[];
  flatmates: Flatmate[];
  onEventClick: (event: FlatEvent) => void;
}

const HOUR_HEIGHT = 64;
const START_HOUR = 6;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIME_COL_WIDTH = 52;
const COL_GAP = 3;

const formatHourLabel = (hour: number) => {
  if (hour === 0 || hour === 24) return '';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
};

interface LayoutItem { event: FlatEvent; col: number; totalCols: number; }

const overlaps = (a: FlatEvent, b: FlatEvent) =>
  new Date(a.startTime).getTime() < new Date(b.endTime).getTime() &&
  new Date(a.endTime).getTime() > new Date(b.startTime).getTime();

const computeColumns = (events: FlatEvent[]): LayoutItem[] => {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  const clusters: FlatEvent[][] = [];
  for (const event of sorted) {
    const idx = clusters.findIndex(c => c.some(e => overlaps(e, event)));
    if (idx >= 0) clusters[idx].push(event);
    else clusters.push([event]);
  }
  const result: LayoutItem[] = [];
  for (const cluster of clusters) {
    const laneEnds: number[] = [];
    const assign: { event: FlatEvent; col: number }[] = [];
    for (const event of cluster) {
      const start = new Date(event.startTime).getTime();
      const end = new Date(event.endTime).getTime();
      let placed = false;
      for (let c = 0; c < laneEnds.length; c++) {
        if (laneEnds[c] <= start) { laneEnds[c] = end; assign.push({ event, col: c }); placed = true; break; }
      }
      if (!placed) { laneEnds.push(new Date(event.endTime).getTime()); assign.push({ event, col: laneEnds.length - 1 }); }
    }
    const totalCols = laneEnds.length;
    for (const { event, col } of assign) result.push({ event, col, totalCols });
  }
  return result;
};

const TimeBlockedView: React.FC<TimeBlockedViewProps> = ({ events, flatmates, onEventClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (Math.max(currentHour - 2, START_HOUR) - START_HOUR) * HOUR_HEIGHT;
    }
  }, []);

  const getOwnerInitial = (id: string) => flatmates.find(f => f.id === id)?.name.charAt(0) || '?';
  const getOwnerName   = (id: string) => flatmates.find(f => f.id === id)?.name || 'Unknown';
  const getOwnerColor  = (id: string) => flatmates.find(f => f.id === id)?.color || '#6466C8';

  const getEventPosition = (event: FlatEvent) => {
    const start = new Date(event.startTime);
    const end   = new Date(event.endTime);
    const startDec = start.getHours() + start.getMinutes() / 60;
    const endDec   = end.getHours()   + end.getMinutes()   / 60;
    const clampStart = Math.max(startDec, START_HOUR);
    const clampEnd   = Math.min(endDec, END_HOUR);
    return {
      top:    (clampStart - START_HOUR) * HOUR_HEIGHT + 1,
      height: Math.max((clampEnd - clampStart) * HOUR_HEIGHT - 2, 22),
    };
  };

  const currentTimeTop =
    currentHour >= START_HOUR && currentHour < END_HOUR
      ? (currentHour + currentMinute / 60 - START_HOUR) * HOUR_HEIGHT
      : null;

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  const layoutItems = computeColumns(events);

  return (
    <div ref={scrollRef} className="overflow-y-auto" style={{ height: 'calc(100vh - 256px)' }}>
      <div style={{ position: 'relative', height: TOTAL_HOURS * HOUR_HEIGHT }}>

        {/* Hour rows */}
        {hours.map(hour => (
          <div
            key={hour}
            style={{ position: 'absolute', top: (hour - START_HOUR) * HOUR_HEIGHT, left: 0, right: 0, height: HOUR_HEIGHT }}
            className="flex items-start"
          >
            <div
              style={{ width: TIME_COL_WIDTH, minWidth: TIME_COL_WIDTH }}
              className="pr-3 -mt-[9px] text-right text-[10px] font-semibold text-[#A8A6C8] select-none leading-none"
            >
              {formatHourLabel(hour)}
            </div>
            <div className="flex-1 border-t border-[#EAE8F5] h-full" />
          </div>
        ))}

        {/* Half-hour dashes */}
        {hours.map(hour => (
          <div
            key={`h-${hour}`}
            style={{ position: 'absolute', top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2, left: TIME_COL_WIDTH, right: 0, height: 1 }}
            className="border-t border-dashed border-[#EEEDF8]"
          />
        ))}

        {/* Current time */}
        {currentTimeTop !== null && (
          <div
            style={{ position: 'absolute', top: currentTimeTop, left: TIME_COL_WIDTH - 6, right: 8, zIndex: 20 }}
            className="flex items-center pointer-events-none"
          >
            <div className="w-3 h-3 rounded-full bg-rose-500 shrink-0 shadow-sm" style={{ boxShadow: '0 0 0 3px rgba(244,63,94,0.2)' }} />
            <div className="flex-1 h-[2px] bg-gradient-to-r from-rose-500 to-rose-400 opacity-80" />
          </div>
        )}

        {/* Events */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: TIME_COL_WIDTH + 4, right: 8 }}>
          {layoutItems.map(({ event, col, totalCols }) => {
            const { top, height } = getEventPosition(event);
            const bg     = EVENT_COLORS[event.type];
            const accent = EVENT_INDICATOR_COLORS[event.type];
            const ownerColor = getOwnerColor(event.ownerId);
            const compact = height < 38;

            const totalGap = (totalCols - 1) * COL_GAP;
            const widthCalc = totalCols > 1 ? `calc(${100 / totalCols}% - ${totalGap / totalCols}px)` : '100%';
            const leftCalc  = col === 0 ? '0%' : `calc(${(col / totalCols) * 100}% + ${(col * COL_GAP) / totalCols}px)`;

            return (
              <div
                key={event.id}
                onClick={() => onEventClick(event)}
                style={{
                  position: 'absolute', top, height,
                  left: leftCalc, width: widthCalc,
                  backgroundColor: bg,
                  borderLeft: `3px solid ${accent}`,
                  zIndex: 10 + col,
                  boxShadow: `0 2px 8px rgba(79,82,160,0.10)`,
                }}
                className="rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all"
              >
                {compact ? (
                  <div className="px-2 h-full flex items-center gap-1.5 overflow-hidden">
                    <p className="text-[10px] font-bold text-[#1C1A3A] truncate leading-none">{event.title}</p>
                    <p className="text-[9px] shrink-0 leading-none" style={{ color: accent }}>
                      {format(new Date(event.startTime), 'HH:mm')}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 h-full flex flex-col justify-between overflow-hidden">
                    <div>
                      <p className="text-[11px] font-bold text-[#1C1A3A] leading-tight line-clamp-2">{event.title}</p>
                      {height > 48 && (
                        <p className="text-[9px] mt-0.5 leading-none font-medium" style={{ color: accent }}>
                          {format(new Date(event.startTime), 'HH:mm')}–{format(new Date(event.endTime), 'HH:mm')}
                        </p>
                      )}
                    </div>
                    {height > 58 && (
                      <div className="flex items-center gap-1 mt-1">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                          style={{ backgroundColor: ownerColor }}
                        >
                          {getOwnerInitial(event.ownerId)}
                        </div>
                        <span className="text-[9px] text-[#6B6991] truncate font-medium">{getOwnerName(event.ownerId)}</span>
                        <div className="ml-auto shrink-0">
                          {event.status === TaskStatus.VERIFIED    && <CheckCircle2 size={10} className="text-emerald-600" />}
                          {event.status === TaskStatus.OVERDUE     && <AlertCircle  size={10} className="text-rose-500" />}
                          {event.status === TaskStatus.CLAIMED_DONE && <Clock       size={10} className="text-[#9CA3AF]" />}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {events.length === 0 && (
          <div
            style={{ position: 'absolute', left: TIME_COL_WIDTH, right: 0, top: 0, bottom: 0 }}
            className="flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#EEEDF8] flex items-center justify-center mb-3">
              <Clock size={24} className="text-[#A8A6C8]" />
            </div>
            <p className="text-sm font-semibold text-[#A8A6C8]">Nothing scheduled</p>
            <p className="text-xs text-[#C4C2DC] mt-0.5">Tap + to add a task</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeBlockedView;
