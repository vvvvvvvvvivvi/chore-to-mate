
import React, { useState } from 'react';
import { X, Check, RotateCcw, UserPlus } from 'lucide-react';
import { EventType, TaskStatus, FlatEvent, Flatmate, Attendee } from '../types';
import { format, formatISO } from 'date-fns';

interface AddTaskModalProps {
  onClose: () => void;
  onAdd: (event: FlatEvent) => void;
  flatmates: Flatmate[];
  selectedDate: Date;
  currentUserId: string;
}

const inputCls = 'w-full bg-[#F8F7FF] border border-[#E8E6F4] rounded-xl p-3 text-sm font-medium text-[#1C1A3A] focus:border-[#6466C8] focus:bg-white outline-none transition-all placeholder:text-[#C4C2DC]';
const labelCls = 'text-[10px] font-bold text-[#9896C0] uppercase tracking-widest';

const selectCls = 'bg-[#F8F7FF] border border-[#E8E6F4] rounded-xl p-3 text-sm font-medium text-[#1C1A3A] focus:border-[#6466C8] focus:bg-white outline-none transition-all appearance-none text-center';

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const TimePicker: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [h, m] = value.split(':');
  return (
    <div className="flex gap-1 items-center bg-[#F8F7FF] border border-[#E8E6F4] rounded-xl overflow-hidden focus-within:border-[#6466C8] transition-colors">
      <select
        className={`${selectCls} flex-1 border-none rounded-none bg-transparent`}
        value={h}
        onChange={e => onChange(`${e.target.value}:${m}`)}
      >
        {HOURS.map(hh => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span className="text-[#9896C0] font-bold text-sm shrink-0">:</span>
      <select
        className={`${selectCls} flex-1 border-none rounded-none bg-transparent`}
        value={m}
        onChange={e => onChange(`${h}:${e.target.value}`)}
      >
        {MINUTES.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  );
};

const AddTaskModal: React.FC<AddTaskModalProps> = ({ onClose, onAdd, flatmates, selectedDate, currentUserId }) => {
  const defaultDate = format(selectedDate, 'yyyy-MM-dd');

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>(EventType.CHORE);
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState(defaultDate);
  const [endTime, setEndTime] = useState('10:00');
  const [recurrence, setRecurrence] = useState('Does not repeat');
  const [customInterval, setCustomInterval] = useState('14');
  const [isInviteMode, setIsInviteMode] = useState(false);
  const [invitedMateIds, setInvitedMateIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const toggleInvite = (id: string) =>
    setInvitedMateIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val > endDate) setEndDate(val);
  };

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    if (startDate === endDate) {
      const [h, m] = val.split(':').map(Number);
      setEndTime(`${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const newStart = new Date(`${startDate}T${startTime}:00`);
    const newEnd   = new Date(`${endDate}T${endTime}:00`);
    if (newEnd <= newStart) { setError('End must be after start.'); return; }

    const finalRecurrence = recurrence === 'Custom' ? `Every ${customInterval} days` : recurrence;
    const attendees: Attendee[] | undefined = invitedMateIds.length > 0
      ? invitedMateIds.map(mid => ({ mateId: mid, status: 'pending' })) : undefined;

    onAdd({
      id: `e-${Date.now()}`,
      title: title.trim() || 'New Task',
      type, ownerId,
      startTime: formatISO(newStart),
      endTime: formatISO(newEnd),
      status: TaskStatus.SCHEDULED,
      description,
      recurrence: finalRecurrence === 'Does not repeat' ? undefined : finalRecurrence,
      attendees,
    });
    onClose();
  };

  const otherMates = flatmates.filter(m => m.id !== currentUserId);
  const isMultiDay = startDate !== endDate;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[92vh] card-shadow-lg">

        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-[#E8E6F4] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0EFF9]">
          <h2 className="text-base font-bold text-[#1C1A3A]">New Task</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-[#F0EFF9] hover:bg-[#E8E6F4] rounded-full transition-colors">
            <X size={16} className="text-[#6B6991]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto">

            {/* Title */}
            <div className="space-y-1.5">
              <label className={labelCls}>Title</label>
              <input required autoFocus className={inputCls} placeholder="e.g. Kitchen deep clean" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            {/* Type + Owner */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Type</label>
                <select className={inputCls} value={type} onChange={e => setType(e.target.value as EventType)}>
                  {Object.values(EventType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Owner</label>
                <select className={inputCls} value={ownerId} onChange={e => setOwnerId(e.target.value)}>
                  {flatmates.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {/* Start */}
            <div className="space-y-1.5">
              <label className={labelCls}>Start</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" className={inputCls} value={startDate} onChange={e => handleStartDateChange(e.target.value)} />
                <TimePicker value={startTime} onChange={handleStartTimeChange} />
              </div>
            </div>

            {/* End */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={labelCls}>End</label>
                {isMultiDay && (
                  <span className="text-[10px] font-bold text-[#6466C8] bg-[#EEEDF8] px-2 py-0.5 rounded-full">Multi-day</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" min={startDate} className={inputCls} value={endDate} onChange={e => setEndDate(e.target.value)} />
                <TimePicker value={endTime} onChange={setEndTime} />
              </div>
              {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
            </div>

            {/* Repeat */}
            <div className="space-y-1.5">
              <label className={labelCls}>Repeat</label>
              <div className="relative">
                <RotateCcw className="absolute left-3 top-3.5 text-[#C4C2DC]" size={13} />
                <select className={`${inputCls} pl-8`} value={recurrence} onChange={e => setRecurrence(e.target.value)}>
                  <option>Does not repeat</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Custom</option>
                </select>
              </div>
              {recurrence === 'Custom' && (
                <div className="flex items-center gap-2 p-3 bg-[#F8F7FF] border border-[#E8E6F4] rounded-xl animate-in fade-in duration-150">
                  <span className={`${labelCls} shrink-0`}>Every</span>
                  <input type="number" min={1} className="w-16 bg-white border border-[#E8E6F4] rounded-lg p-1.5 text-sm font-medium outline-none focus:border-[#6466C8] text-[#1C1A3A]" value={customInterval} onChange={e => setCustomInterval(e.target.value)} />
                  <span className={labelCls}>days</span>
                </div>
              )}
            </div>

            {/* Invite */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setIsInviteMode(!isInviteMode)}
                className={`flex items-center justify-between w-full p-3 rounded-xl transition-colors ${isInviteMode ? 'bg-[#EEEDF8] text-[#4F52A0]' : 'bg-[#F8F7FF] text-[#6B6991]'}`}
              >
                <div className="flex items-center gap-2">
                  <UserPlus size={15} />
                  <span className="text-xs font-bold">Invite flatmates</span>
                </div>
                {invitedMateIds.length > 0 && (
                  <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #4F52A0, #6466C8)' }}>
                    {invitedMateIds.length}
                  </span>
                )}
              </button>

              {isInviteMode && (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-150">
                  {otherMates.map(mate => (
                    <button
                      key={mate.id}
                      type="button"
                      onClick={() => toggleInvite(mate.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${invitedMateIds.includes(mate.id) ? 'border-[#6466C8] bg-[#F8F7FF] shadow-sm' : 'border-[#E8E6F4] bg-white opacity-60'}`}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ backgroundColor: mate.color || '#6466C8' }}>
                        {mate.name.charAt(0)}
                      </div>
                      <span className="text-xs font-semibold truncate text-[#1C1A3A]">{mate.name}</span>
                      {invitedMateIds.includes(mate.id) && <Check size={12} className="ml-auto text-[#6466C8] shrink-0" strokeWidth={2.5} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className={labelCls}>Notes</label>
              <textarea className={`${inputCls} h-20 resize-none`} placeholder="Any additional details…" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Submit */}
          <div className="px-5 py-4 border-t border-[#F0EFF9]">
            <button type="submit" className="btn-primary w-full text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
              <Check size={16} strokeWidth={2.5} /> Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
