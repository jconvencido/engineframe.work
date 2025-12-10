'use client';

import { FormEvent, useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup' | 'reset-password';
  onSwitchMode: () => void;
}

export default function AuthModal({ isOpen, onClose, mode, onSwitchMode }: AuthModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset form when modal closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setName('');
      setCountryCode('+1');
      setMobileNumber('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
    setConfirmPassword('');
  }, [mode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === 'reset-password') {
      if (!email) {
        setError('Please enter your email address');
        return;
      }
      setLoading(true);
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setSuccess('Password reset email sent! Check your inbox.');
      setTimeout(() => {
        onClose();
      }, 2000);
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name');
        return;
      }
      if (!mobileNumber.trim()) {
        setError('Please enter your mobile number');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);
    
    if (mode === 'login') {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        // Log failed attempt (could be done via API route for better security)
        return;
      }
    } else {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
          data: {
            full_name: name,
            mobile_number: `${countryCode}${mobileNumber}`,
          },
        },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      
      // Profile entry is automatically created by database trigger
      setSuccess('Account created! Please check your email to verify your account.');
      setTimeout(() => {
        onClose();
      }, 3000);
      return;
    }
    
    onClose();
    router.push('/');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111111] border border-gray-800 rounded-2xl p-8 space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {mode === 'reset-password' 
                ? 'Reset Password' 
                : mode === 'login' 
                ? 'Welcome back' 
                : 'Create account'}
            </h1>
            <p className="text-gray-400">
              {mode === 'reset-password'
                ? 'Enter your email to receive a password reset link'
                : mode === 'login' 
                ? 'Sign in to your account to continue' 
                : 'Get started with Business Engine Advisor'}
            </p>
          </div>

          <div className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="mobile" className="block text-sm font-medium text-gray-300 mb-2">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      className="w-32 rounded-lg bg-[#0a0a0a] border border-gray-800 px-3 py-3 text-white focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                    >
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+86">🇨🇳 +86</option>
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+55">🇧🇷 +55</option>
                      <option value="+7">🇷🇺 +7</option>
                      <option value="+82">🇰🇷 +82</option>
                      <option value="+65">🇸🇬 +65</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+27">🇿🇦 +27</option>
                      <option value="+63">🇵🇭 +63</option>
                      <option value="+66">🇹🇭 +66</option>
                      <option value="+84">🇻🇳 +84</option>
                    </select>
                    <input
                      id="mobile"
                      type="tel"
                      className="flex-1 rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                      placeholder="555 123 4567"
                      value={mobileNumber}
                      onChange={e => setMobileNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== 'reset-password' && (
              <>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                    placeholder={mode === 'signup' ? 'Create a password (min. 6 characters)' : 'Enter your password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                {mode === 'signup' && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  // This will be handled by parent to switch to reset-password mode
                  setError(null);
                }}
                className="text-sm text-[#4169E1] hover:text-[#3557c7] transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
              <p className="text-sm text-green-400">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[#4169E1] hover:bg-[#3557c7] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading 
              ? (mode === 'reset-password' ? 'Sending...' : mode === 'login' ? 'Signing in…' : 'Creating account…')
              : (mode === 'reset-password' ? 'Send Reset Link' : mode === 'login' ? 'Sign in' : 'Create account')
            }
          </button>

          {mode !== 'reset-password' && (
            <div className="text-center text-sm text-gray-400">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={onSwitchMode}
                className="text-[#4169E1] hover:text-[#3557c7] font-medium transition-colors"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          )}

          {mode === 'reset-password' && (
            <div className="text-center text-sm text-gray-400">
              Remember your password?{' '}
              <button
                type="button"
                onClick={onSwitchMode}
                className="text-[#4169E1] hover:text-[#3557c7] font-medium transition-colors"
              >
                Sign in
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
