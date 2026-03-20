import type { Metadata } from 'next';
import Link from 'next/link';
import SplitToolLoader from './SplitToolLoader';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Split Expenses Online — No Account Needed | Split It',
  description:
    'Split group expenses online instantly. No signup, no account required. Export your expense summary to PDF or Excel for free. Perfect for trips, dinners, rent, and events.',
  alternates: {
    canonical: 'https://split-it.xyz/split-expenses-online',
  },
  openGraph: {
    url: 'https://split-it.xyz/split-expenses-online',
    title: 'Split Expenses Online — No Account Needed | Split It',
    description:
      'Split group expenses online instantly. No signup, no account required. Export your expense summary to PDF or Excel for free.',
  },
};

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

const jsonLdApp = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Split Expenses Online — Split It',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description:
    'Free online tool to split group expenses without creating an account. Export to PDF and Excel.',
};

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do I need an account to split expenses online?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Split It requires zero registration. Just add your group and expenses and share the link.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I export the expense split to PDF?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can download a clean PDF summary of who paid what and who owes whom, completely free.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I share the expense split with my group?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Every expense session generates a shareable link your group can open without signing up.',
      },
    },
  ],
};

// ─── Static sections data ─────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '👥',
    title: 'Add your group and expenses',
    description: 'Enter the event name, add participants, and log each expense with who paid and who was involved.',
  },
  {
    step: '02',
    icon: '⚡',
    title: 'See who owes what instantly',
    description: 'Our algorithm calculates net balances and the minimum number of transactions to settle all debts.',
  },
  {
    step: '03',
    icon: '📤',
    title: 'Export to PDF or Excel and share',
    description: 'Download a clean expense report or copy a shareable link — no account needed for any of it.',
  },
];

const FEATURES = [
  {
    icon: '🆓',
    title: 'No account needed',
    description: 'Start splitting in seconds, no signup required.',
  },
  {
    icon: '📄',
    title: 'Free PDF & Excel export',
    description: 'Download a clean expense report, completely free.',
  },
  {
    icon: '🔗',
    title: 'Shareable link',
    description: "Share your expense session with anyone, they don\u2019t need an account.",
  },
  {
    icon: '🧮',
    title: 'Fair splitting algorithm',
    description: 'We calculate the minimum number of transactions to settle all debts.',
  },
];

const FAQ = [
  {
    q: 'Do I need an account to split expenses online?',
    a: 'No. Split It requires zero registration. Just add your group and expenses and share the link.',
  },
  {
    q: 'Can I export the expense split to PDF?',
    a: 'Yes. You can download a clean PDF summary of who paid what and who owes whom, completely free.',
  },
  {
    q: 'Can I share the expense split with my group?',
    a: 'Yes. Every expense session generates a shareable link your group can open without signing up.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SplitExpensesOnlinePage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
              style={{ background: '#1B998B', boxShadow: '0 4px 14px #1B998B33' }}
            >
              <span className="text-white font-bold text-base">S</span>
            </div>
            <span className="font-bold text-gray-900 text-xl tracking-tight">Split-It</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold text-white px-5 py-2 rounded-xl transition"
              style={{ background: '#1B998B' }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero + Tool ── */}
      <section className="relative overflow-hidden">
        {/* Background blobs */}
        <div
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #1B998B 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-20 -right-32 w-[380px] h-[380px] rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #1B998B 0%, transparent 70%)' }}
        />

        <div className="max-w-2xl mx-auto px-5 pt-10 pb-4 text-center relative">
          <div className="inline-flex items-center gap-2 bg-[#E8F8F6] text-[#1B998B] text-xs font-semibold px-4 py-1.5 rounded-full mb-5 border border-[#1B998B]/20">
            <span>✨</span>
            Free — No account required
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight mb-3">
            Split Expenses Online
          </h1>
          <h2 className="text-lg sm:text-xl text-gray-500 max-w-lg mx-auto mb-8 font-normal">
            No account needed. Calculate who owes what and export instantly.
          </h2>
        </div>

        {/* Tool */}
        <div className="max-w-2xl mx-auto px-4 pb-16 relative">
          <SplitToolLoader />
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 bg-white border-t border-gray-100" id="how-it-works">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              How it works
            </h2>
            <p className="text-gray-500 text-lg">Three steps to a settled group.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-[#E8F8F6] rounded-2xl flex items-center justify-center text-3xl mb-4">
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-[#1B998B] mb-1 tracking-widest uppercase">
                  Step {item.step}
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why use Split It ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
              Why use Split It
            </h2>
            <p className="text-gray-500 text-lg">Built for the moment you need to split, not for everything else.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 text-base mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-gray-50 border-t border-gray-100">
        <div className="max-w-xl mx-auto px-5 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
            Want to track expenses across multiple trips?
          </h2>
          <p className="text-gray-500 mb-8 text-base">
            Create a free account to save groups, invite friends, and access your expense history anytime.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 hover:shadow-xl shadow-lg"
            style={{ background: '#1B998B', boxShadow: '0 8px 32px #1B998B40' }}
          >
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© {new Date().getFullYear()} Split-It · split-it.xyz</span>
          <div className="flex gap-6">
            <Link href="/landing" className="hover:text-gray-600 transition">Home</Link>
            <Link href="/login" className="hover:text-gray-600 transition">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── FAQ Accordion (server-renderable, CSS-only) ───────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group bg-white rounded-2xl border border-gray-100 shadow-sm">
      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-semibold text-gray-900 text-sm gap-3">
        {q}
        <span className="text-[#1B998B] shrink-0 transition-transform group-open:rotate-45 text-lg font-bold">+</span>
      </summary>
      <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-50 pt-3">
        {a}
      </div>
    </details>
  );
}
