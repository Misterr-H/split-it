'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { AuthModeSwitch } from '@/components/auth-mode-switch';

function SignupForm({ next }: { next?: string | null }) {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim());
      router.push(next ?? '/groups');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B998B] focus:ring-2 focus:ring-[#1B998B]/20 transition"
          required
        />
      </div>

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
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 6 characters"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#1B998B] focus:ring-2 focus:ring-[#1B998B]/20 transition"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#1B998B] hover:bg-[#158a7d] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition shadow-sm shadow-[#1B998B]/30 mt-2"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  );
}

function SignupContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#1B998B] items-center justify-center mb-4 shadow-lg shadow-[#1B998B]/30">
            <span className="text-white text-3xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Join Split-It and start splitting expenses</p>
        </div>

        <AuthModeSwitch active="signup" next={next} />
        <SignupForm next={next} />
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-10 h-10 border-4 border-[#1B998B] border-t-transparent rounded-full animate-spin" /></div>}>
      <SignupContent />
    </Suspense>
  );
}
