'use client';

import { FormEvent, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error } = await supabaseBrowser.auth.updateUser({
      password: password,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <form
          onSubmit={handleSubmit}
          className="bg-[#111111] border border-gray-800 rounded-2xl p-8 space-y-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
            <p className="text-gray-400">Enter your new password below</p>
          </div>

          {!success ? (
            <>
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                    placeholder="Enter new password (min. 6 characters)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="w-full rounded-lg bg-[#0a0a0a] border border-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4169E1] focus:ring-1 focus:ring-[#4169E1] transition-colors"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[#4169E1] hover:bg-[#3557c7] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating password…' : 'Update password'}
              </button>
            </>
          ) : (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4">
              <p className="text-green-400 text-center">
                ✓ Password updated successfully! Redirecting...
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
