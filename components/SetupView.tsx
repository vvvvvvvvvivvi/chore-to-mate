
import React, { useState } from 'react';
import { Info, Share2, Users, Calendar, Settings, Check, Copy, ChevronRight, ArrowLeft, Repeat, LogOut } from 'lucide-react';
import { FlatSettings, UserProfile } from '../types';

interface SetupViewProps {
  settings: FlatSettings;
  onSave: (settings: FlatSettings) => void;
  profile: UserProfile;
  inviteCode?: string | null;
  onNavigateToProfile: () => void;
  onBack: () => void;
  onSignOut?: () => void;
}

const inputCls = 'w-full bg-[#F8F7FF] border border-[#E8E6F4] rounded-xl p-3 text-sm font-medium text-[#1C1A3A] focus:border-[#6466C8] focus:bg-white outline-none transition-all placeholder:text-[#C4C2DC]';

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white rounded-2xl overflow-hidden card-shadow">
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#F0EFF9]">
      <div className="w-7 h-7 rounded-lg bg-[#EEEDF8] flex items-center justify-center text-[#6466C8]">{icon}</div>
      <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6B6991]">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const SetupView: React.FC<SetupViewProps> = ({ settings, onSave, profile, inviteCode, onNavigateToProfile, onBack, onSignOut }) => {
  const [formData, setFormData] = useState<FlatSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleCopy = () => {
    const text = inviteCode ?? formData.flatName.replace(/\s+/g, '-').toLowerCase();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);

  return (
    <div className="animate-in slide-in-from-left-4 duration-300 min-h-screen bg-[#F0EFF9]">
      {/* Header */}
      <div className="header-gradient text-white px-4 pt-14 pb-5">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors mb-4">
          <ArrowLeft size={20} />
        </button>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-1">Administrative Protocols</p>
        <h1 className="text-2xl font-extrabold">Household Setup</h1>
      </div>

      <div className="px-4 py-5 space-y-4 pb-28">

        {/* Profile summary */}
        <button
          onClick={onNavigateToProfile}
          className="w-full bg-white rounded-2xl p-4 flex items-center gap-4 card-shadow active:scale-[0.99] transition-all group text-left"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-extrabold shrink-0"
            style={{ backgroundColor: profile.color, boxShadow: `0 4px 14px ${profile.color}50` }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#6B6991] mb-0.5">Your Profile</p>
            <p className="text-sm font-bold text-[#1C1A3A] truncate">{profile.name}</p>
            <p className="text-xs text-[#B8B6D4]">Tap to edit name & colour</p>
          </div>
          <ChevronRight size={16} className="text-[#C4C2DC] group-hover:text-[#6466C8] transition-colors shrink-0" />
        </button>

        {/* Flat details */}
        <SectionCard icon={<Settings size={14} />} title="Flat Details">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#9896C0] uppercase tracking-widest">Flat Name</label>
              <input className={inputCls} value={formData.flatName} onChange={e => setFormData({ ...formData, flatName: e.target.value })} placeholder="e.g. The Batcave" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9896C0] uppercase tracking-widest flex items-center gap-1">
                  <Users size={10} /> Residents
                </label>
                <div className="flex items-center bg-[#F8F7FF] border border-[#E8E6F4] rounded-xl overflow-hidden focus-within:border-[#6466C8] transition-colors">
                  <input type="number" min={2} max={10} className="w-full bg-transparent p-3 text-sm font-medium text-[#1C1A3A] outline-none" value={formData.flatmateCount} onChange={e => setFormData({ ...formData, flatmateCount: parseInt(e.target.value) || 2 })} />
                  <span className="pr-3 text-[10px] font-bold text-[#C4C2DC] uppercase">ppl</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#9896C0] uppercase tracking-widest flex items-center gap-1">
                  <Repeat size={10} /> Chore Cycle
                  <div className="relative">
                    <Info size={10} className="cursor-help text-[#C4C2DC]" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)} />
                    {showTooltip && (
                      <div className="absolute z-50 bottom-full left-0 mb-2 w-44 p-2.5 bg-[#1C1A3A] text-white text-[10px] rounded-xl shadow-xl leading-relaxed">
                        How many days before recurring chores reset.
                      </div>
                    )}
                  </div>
                </label>
                <div className="flex items-center bg-[#F8F7FF] border border-[#E8E6F4] rounded-xl overflow-hidden focus-within:border-[#6466C8] transition-colors">
                  <input type="number" min={1} className="w-full bg-transparent p-3 text-sm font-medium text-[#1C1A3A] outline-none" value={formData.sprintCycleDays} onChange={e => setFormData({ ...formData, sprintCycleDays: parseInt(e.target.value) || 7 })} />
                  <span className="pr-3 text-[10px] font-bold text-[#C4C2DC] uppercase">days</span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Tenancy */}
        <SectionCard icon={<Calendar size={14} />} title="Tenancy Dates">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#9896C0] uppercase tracking-widest">Move-in Date</label>
            <input type="date" className={inputCls} value={formData.tenancyStart} onChange={e => setFormData({ ...formData, tenancyStart: e.target.value })} />
            <p className="text-[11px] text-[#B8B6D4] pt-0.5">Used to calculate your current sprint number.</p>
          </div>
        </SectionCard>

        {/* Invite code */}
        <div className="bg-gradient-to-br from-[#EEEDF8] to-[#E8E6F4] rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Share2 size={14} className="text-[#6466C8]" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#4F52A0]">Invite Flatmates</h3>
          </div>
          <p className="text-[11px] text-[#6B6991]">Share this code — flatmates enter it when signing up.</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-white border border-[#E8E6F4] rounded-xl p-2.5 text-[13px] truncate text-[#4F52A0] font-bold tracking-widest select-all">
              {inviteCode ?? '—'}
            </div>
            <button
              onClick={handleCopy}
              disabled={!inviteCode}
              className="px-3 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #4F52A0, #6466C8)', boxShadow: '0 4px 12px rgba(79,82,160,0.3)' }}
            >
              {copied ? <Check size={14} className="text-white" /> : <Copy size={14} className="text-white" />}
            </button>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!hasChanges && !saved}
          className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          style={
            saved
              ? { background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)', color: 'white' }
              : hasChanges
              ? { background: 'linear-gradient(135deg, #4F52A0, #6466C8)', boxShadow: '0 4px 14px rgba(79,82,160,0.35)', color: 'white' }
              : { background: '#EEEDF8', color: '#C4C2DC' }
          }
        >
          {saved ? <><Check size={16} /> Saved</> : 'Save Changes'}
        </button>

        {/* Sign out */}
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-[#E8E6F4] bg-white text-[#9896C0] transition-all active:scale-95 hover:border-rose-200 hover:text-rose-400"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
};

export default SetupView;
