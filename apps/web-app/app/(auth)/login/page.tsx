'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/context/auth-context';
import { auth } from '@/lib/firebase';
import { AuthModeSwitch } from '@/components/auth-mode-switch';

function LoginContent() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  async function handleForgotPassword() {
    setForgotError('');
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim().toLowerCase());
      setForgotSent(true);
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.push(next ?? '/groups');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#1B998B] items-center justify-center mb-4 shadow-lg shadow-[#1B998B]/30">
            <span className="text-white text-3xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your Split-It account</p>
        </div>

        <AuthModeSwitch active="login" next={next} />

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B998B] focus:ring-2 focus:ring-[#1B998B]/20 transition"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <button
                type="button"
                onClick={() => { setShowForgot(!showForgot); setForgotSent(false); setForgotError(''); }}
                className="text-xs text-[#1B998B] font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B998B] focus:ring-2 focus:ring-[#1B998B]/20 transition"
              required
            />
          </div>

          {showForgot && (
            <div className="border border-gray-100 rounded-xl bg-gray-50 p-4">
              {forgotSent ? (
                <p className="text-sm font-semibold text-[#1B998B] text-center py-1">
                  Reset email sent! Check your inbox.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-medium">Enter your email to receive a reset link</p>
                  {forgotError && (
                    <p className="text-xs text-red-600">{forgotError}</p>
                  )}
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#1B998B] focus:ring-2 focus:ring-[#1B998B]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={forgotLoading}
                    className="w-full bg-[#1B998B] hover:bg-[#158a7d] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition"
                  >
                    {forgotLoading ? 'Sending…' : 'Send Reset Email'}
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1B998B] hover:bg-[#158a7d] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow-sm shadow-[#1B998B]/30 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-10 h-10 border-4 border-[#1B998B] border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
