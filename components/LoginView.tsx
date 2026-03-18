
import React, { useState } from 'react';
import { signIn, signUp } from '../lib/db';

interface LoginViewProps {
  onAuth: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onAuth }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-800 outline-none focus:border-[#4F52A0] focus:bg-white transition-all placeholder:text-gray-300';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        setError(error.message);
      } else {
        onAuth();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">Chore-to-Mate</p>
          <h1 className="text-3xl font-extrabold text-gray-900">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {isSignUp ? 'Set up your account to get started.' : 'Sign in to your household.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            autoFocus
            placeholder="Email"
            className={inputCls}
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            placeholder="Password"
            className={inputCls}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-xs text-rose-500 font-medium px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-white py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 mt-2"
          >
            {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {/* Toggle */}
        <button
          onClick={() => { setIsSignUp(s => !s); setError(''); }}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {isSignUp
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
};

export default LoginView;
