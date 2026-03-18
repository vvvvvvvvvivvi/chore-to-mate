
import React, { useState } from 'react';
import { Check, ArrowLeft, Settings, ChevronRight } from 'lucide-react';
import { UserProfile } from '../types';
import { AVATAR_COLORS } from '../constants';

interface UserSettingsViewProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
  onNavigateToSetup: () => void;
}

const UserSettingsView: React.FC<UserSettingsViewProps> = ({ profile, onSave, onBack, onNavigateToSetup }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(profile);

  return (
    <div className="animate-in slide-in-from-left-4 duration-300 min-h-screen bg-[#F0EFF9]">
      {/* Header */}
      <div className="header-gradient text-white px-4 pt-14 pb-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={onNavigateToSetup}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-full text-[11px] font-bold"
          >
            <Settings size={13} /> Setup <ChevronRight size={11} />
          </button>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50 mb-1">Identity</p>
        <h1 className="text-2xl font-extrabold">Your Profile</h1>
      </div>

      <div className="px-4 py-5 space-y-4 pb-28">
        {/* Avatar card */}
        <div className="bg-white rounded-2xl p-6 card-shadow flex flex-col items-center">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-extrabold mb-5 transition-all duration-300"
            style={{
              backgroundColor: formData.color,
              boxShadow: `0 8px 28px ${formData.color}50, 0 0 0 4px ${formData.color}20`,
            }}
          >
            {formData.name.charAt(0).toUpperCase() || '?'}
          </div>

          <div className="w-full space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#9896C0] uppercase tracking-widest">Display Name</label>
              <input
                className="w-full bg-[#F8F7FF] border border-[#E8E6F4] rounded-xl p-3 text-sm font-semibold text-[#1C1A3A] focus:border-[#6466C8] focus:bg-white outline-none transition-all placeholder:text-[#C4C2DC]"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#9896C0] uppercase tracking-widest">Avatar Colour</label>
              <div className="flex justify-between items-center py-1">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                    style={{
                      backgroundColor: color,
                      transform: formData.color === color ? 'scale(1.2)' : 'scale(1)',
                      boxShadow: formData.color === color ? `0 4px 12px ${color}60, 0 0 0 3px white, 0 0 0 5px ${color}40` : 'none',
                    }}
                  >
                    {formData.color === color && <Check size={14} className="text-white drop-shadow" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
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
          {saved ? <><Check size={16} /> Saved</> : 'Save Profile'}
        </button>
      </div>
    </div>
  );
};

export default UserSettingsView;
