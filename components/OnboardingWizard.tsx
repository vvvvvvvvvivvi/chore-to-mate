
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { AVATAR_COLORS } from '../constants';
import { Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { createFlatAndProfile, joinWithCode } from '../lib/db';

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState<Step>(1);

  // Profile
  const [name, setName] = useState('');
  const [color, setColor] = useState(AVATAR_COLORS[1]);

  // Flat setup
  const [isJoining, setIsJoining] = useState(false);
  const [flatName, setFlatName] = useState('');
  const [flatmateCount, setFlatmateCount] = useState(3);
  const [inviteCode, setInviteCode] = useState('');

  // Resolved flat name (after joining)
  const [resolvedFlatName, setResolvedFlatName] = useState('');

  // Async state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canAdvance1 = name.trim().length > 0;
  const canAdvance2 = isJoining ? inviteCode.trim().length > 0 : flatName.trim().length > 0;

  const profile: UserProfile = { name: name.trim(), color };

  const inputCls = 'w-full border-b-2 border-gray-200 bg-transparent py-2 text-2xl font-bold text-gray-800 outline-none placeholder:text-gray-300 focus:border-gray-400 transition-colors';
  const labelCls = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block';

  // Step 2 → 3: validate invite code or just advance
  const handleAdvanceFromStep2 = async () => {
    setError('');
    if (isJoining) {
      setSubmitting(true);
      try {
        const flat = await joinWithCode(userId, profile, inviteCode);
        setResolvedFlatName(flat.name);
        setStep(3);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setSubmitting(false);
      }
    } else {
      setResolvedFlatName(flatName.trim());
      setStep(3);
    }
  };

  // Step 3: create flat (if not already joined) and finish
  const handleEnter = async () => {
    setError('');
    setSubmitting(true);
    try {
      if (!isJoining) {
        await createFlatAndProfile(userId, profile, flatName.trim(), 7, new Date().toISOString().split('T')[0]);
      }
      onComplete();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-white">

      {/* Step indicator */}
      <div className="flex justify-center items-center gap-2 pt-14 pb-2">
        {([1, 2, 3] as Step[]).map(s => (
          <div
            key={s}
            className="rounded-full transition-all duration-300"
            style={{
              width: step === s ? 24 : 8,
              height: 8,
              backgroundColor: step >= s ? '#4F52A0' : '#E5E5E9',
            }}
          />
        ))}
      </div>

      {/* ── Step 1: Name & colour ─────────────────────────── */}
      {step === 1 && (
        <div className="flex-1 flex flex-col px-6 pt-8 pb-10 animate-in slide-in-from-right-4 duration-300">
          <p className={labelCls}>Step 1 of 3</p>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-1">What's your name?</h1>
          <p className="text-sm text-gray-400 mb-10">Your flatmates will see this.</p>

          <div className="flex justify-center mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-extrabold transition-all duration-300"
              style={{ backgroundColor: color, boxShadow: `0 4px 20px ${color}40` }}
            >
              {name.charAt(0).toUpperCase() || '?'}
            </div>
          </div>

          <input
            autoFocus
            className={`${inputCls} mb-8`}
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canAdvance1 && setStep(2)}
          />

          <div className="mb-10">
            <label className={labelCls}>Pick a colour</label>
            <div className="flex gap-3">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                  style={{
                    backgroundColor: c,
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: color === c ? `0 2px 10px ${c}60, 0 0 0 3px white, 0 0 0 4px ${c}40` : 'none',
                  }}
                >
                  {color === c && <Check size={14} className="text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto">
            <button
              onClick={() => setStep(2)}
              disabled={!canAdvance1}
              className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 btn-primary text-white"
            >
              Continue <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Create or join flat ───────────────────── */}
      {step === 2 && (
        <div className="flex-1 flex flex-col px-6 pt-8 pb-10 animate-in slide-in-from-right-4 duration-300">
          <p className={labelCls}>Step 2 of 3</p>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-1">
            {isJoining ? 'Join a flat.' : 'Name your flat.'}
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            {isJoining ? 'Enter the invite code from your flatmate.' : 'Give your household a name.'}
          </p>

          {/* Create / Join toggle */}
          <div className="flex gap-2 mb-8 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => { setIsJoining(false); setError(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
              style={!isJoining
                ? { background: 'white', color: '#4F52A0', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                : { color: '#9CA3AF' }}
            >
              Create flat
            </button>
            <button
              onClick={() => { setIsJoining(true); setError(''); }}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
              style={isJoining
                ? { background: 'white', color: '#4F52A0', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                : { color: '#9CA3AF' }}
            >
              Join with code
            </button>
          </div>

          {isJoining ? (
            <>
              <input
                autoFocus
                className={`${inputCls} mb-2 uppercase tracking-widest`}
                placeholder="e.g. BATCAV-X7K2"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canAdvance2 && handleAdvanceFromStep2()}
              />
              {error && <p className="text-sm text-rose-500 font-medium mt-2">{error}</p>}
            </>
          ) : (
            <>
              <input
                autoFocus
                className={`${inputCls} mb-8`}
                placeholder="e.g. The Batcave"
                value={flatName}
                onChange={e => setFlatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canAdvance2 && handleAdvanceFromStep2()}
              />
              <div className="mb-10">
                <label className={labelCls}>How many people live here?</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      onClick={() => setFlatmateCount(n)}
                      className="w-12 h-12 rounded-xl font-bold text-sm transition-all active:scale-90 border"
                      style={
                        flatmateCount === n
                          ? { background: '#4F52A0', color: 'white', borderColor: '#4F52A0' }
                          : { background: 'white', color: '#9CA3AF', borderColor: '#E5E7EB' }
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="mt-auto flex gap-3">
            <button
              onClick={() => { setStep(1); setError(''); }}
              className="px-5 py-3.5 rounded-2xl font-bold text-sm text-gray-400 border border-gray-200 bg-white active:scale-95 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={handleAdvanceFromStep2}
              disabled={!canAdvance2 || submitting}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30 btn-primary text-white"
            >
              {submitting ? 'Checking…' : <><span>Continue</span> <ChevronRight size={16} strokeWidth={2.5} /></>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Welcome ───────────────────────────────── */}
      {step === 3 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-10 animate-in zoom-in-95 duration-300">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-extrabold mb-6"
            style={{ backgroundColor: color, boxShadow: `0 6px 24px ${color}50` }}
          >
            {name.charAt(0).toUpperCase()}
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">All set</p>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Welcome, {name}.</h1>
          <p className="text-base text-gray-500 mb-1">
            <span className="font-semibold text-gray-700">{resolvedFlatName}</span> is ready to go.
          </p>
          <p className="text-sm text-gray-400 mb-14">Your flatmates will thank you. Probably.</p>

          {error && <p className="text-sm text-rose-500 font-medium mb-4">{error}</p>}

          <button
            onClick={handleEnter}
            disabled={submitting}
            className="w-full py-4 rounded-2xl font-bold text-sm btn-primary text-white active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? 'Setting up…' : 'Enter Chore-to-Mate →'}
          </button>
        </div>
      )}
    </div>
  );
};

export default OnboardingWizard;
