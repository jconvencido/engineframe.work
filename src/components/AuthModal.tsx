'use client';

import { FormEvent, useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'signup' | 'reset-password';
  onSwitchMode: () => void;
}

export default function AuthModal({ isOpen, onClose, mode, onSwitchMode }: AuthModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    setLoading(false);
    
    if (error) {
      setError(error.message);
    }
  };

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
    
    // Close modal and redirect
    onClose();
    
    // Check if there's a redirect URL in query params
    const redirectTo = searchParams.get('redirectTo');
    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.push('/');
    }
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
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
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
                className="text-sm text-[#4169E1] hover:text-[#3557c7] transition-colors cursor-pointer"
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
            className="w-full py-3 rounded-lg bg-[#4169E1] hover:bg-[#3557c7] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading 
              ? (mode === 'reset-password' ? 'Sending...' : mode === 'login' ? 'Signing in…' : 'Creating account…')
              : (mode === 'reset-password' ? 'Send Reset Link' : mode === 'login' ? 'Sign in' : 'Create account')
            }
          </button>

          {mode !== 'reset-password' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#111111] text-gray-400">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-white hover:bg-gray-100 text-gray-900 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
            </>
          )}

          {mode !== 'reset-password' && (
            <div className="text-center text-sm text-gray-400">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={onSwitchMode}
                className="text-[#4169E1] hover:text-[#3557c7] font-medium transition-colors cursor-pointer"
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
                className="text-[#4169E1] hover:text-[#3557c7] font-medium transition-colors cursor-pointer"
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
