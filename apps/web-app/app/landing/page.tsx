import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Split-It — Free Bill Splitter App for Friends & Groups',
  description:
    'The free bill splitter app for friends, roommates, and travel groups. Track shared expenses, split bills instantly, and settle up — completely free, forever. Best Splitwise alternative.',
  alternates: {
    canonical: 'https://split-it.xyz/landing',
  },
  openGraph: {
    url: 'https://split-it.xyz/landing',
    title: 'Split-It — Free Bill Splitter App for Friends & Groups',
    description:
      'Track shared expenses, split bills with friends, and settle up easily. Forever free — no ads, no subscriptions. The best free Splitwise alternative.',
  },
};

const FEATURES = [
  {
    icon: '📋',
    title: 'Smart Groups',
    description: 'Create groups for trips, home, couples, or anything else. Keep expenses neatly organized.',
  },
  {
    icon: '⚡',
    title: 'Instant Splits',
    description: 'Add expenses in seconds and Split-It automatically calculates who owes what.',
  },
  {
    icon: '👥',
    title: 'Easy Invites',
    description: 'Invite friends with a single link — no app download or sign-up friction required.',
  },
  {
    icon: '💱',
    title: 'Multi-Currency',
    description: 'Travel internationally? We support INR, USD, EUR, GBP, JPY and more out of the box.',
  },
  {
    icon: '✅',
    title: 'Settle Up',
    description: 'Mark debts as settled with one tap. See at a glance who still owes you money.',
  },
  {
    icon: '📊',
    title: 'Activity Feed',
    description: 'A full history of expenses and settlements so nothing ever gets lost or forgotten.',
  },
];

const STEPS = [
  { step: '01', title: 'Create a Group', description: 'Name your group, pick a category and currency.' },
  { step: '02', title: 'Add Expenses', description: 'Log what you paid and who was involved.' },
  { step: '03', title: 'Invite Friends', description: 'Share a magic link — they join instantly.' },
  { step: '04', title: 'Settle Up', description: 'See net balances and mark debts as paid.' },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': 'https://split-it.xyz/#app',
      name: 'Split-It',
      url: 'https://split-it.xyz',
      description:
        'Free bill splitter app for friends, roommates and travel groups. Track shared expenses, split bills instantly, and settle up with one tap.',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web, iOS, Android',
      browserRequirements: 'Requires JavaScript',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
      featureList: [
        'Group expense tracking',
        'Multi-currency support',
        'Invite friends via link',
        'Settle up with one tap',
        'Offline PWA support',
        'Activity feed',
      ],
    },
    {
      '@type': 'Organization',
      '@id': 'https://split-it.xyz/#org',
      name: 'Split-It',
      url: 'https://split-it.xyz',
      logo: 'https://split-it.xyz/favicon.png',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://split-it.xyz/#website',
      url: 'https://split-it.xyz',
      name: 'Split-It',
      publisher: { '@id': 'https://split-it.xyz/#org' },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://split-it.xyz/groups?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is Split-It free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Split-It is completely free with no ads and no subscriptions — forever.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does Split-It compare to Splitwise?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Split-It offers all the core features of Splitwise — group expenses, multi-currency, invite links, settle up — but is completely free with no ads, and works as a PWA offline.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I split bills internationally with Split-It?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Split-It supports INR, USD, EUR, GBP, JPY, AUD, CAD and more out of the box.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do my friends need to download an app to join?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. You can invite friends with a single link — they join instantly without downloading anything.',
          },
        },
      ],
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ── Navbar ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
              style={{ background: '#1B998B', boxShadow: '0 4px 14px #1B998B33' }}
            >
              <span className="text-white font-bold text-base">S</span>
            </div>
            <span className="font-bold text-gray-900 text-xl tracking-tight">Split-It</span>
          </div>
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

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Subtle teal gradient background blobs */}
        <div
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #1B998B 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-20 -right-32 w-[380px] h-[380px] rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #1B998B 0%, transparent 70%)' }}
        />

        <div className="max-w-5xl mx-auto px-5 pt-24 pb-20 text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#E8F8F6] text-[#1B998B] text-xs font-semibold px-4 py-1.5 rounded-full mb-7 border border-[#1B998B]/20">
            <span>✨</span>
            Free alternative to Splitwise
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
            Split bills,<br />
            <span style={{ color: '#1B998B' }}>not friendships.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
            The simplest way to track shared expenses with friends and groups — completely free, forever.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 hover:shadow-xl shadow-lg"
              style={{ background: '#1B998B', boxShadow: '0 8px 32px #1B998B40' }}
            >
              Start Splitting for Free
              <span className="text-lg">→</span>
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-gray-700 font-semibold px-8 py-4 rounded-2xl text-base border border-gray-200 bg-white hover:bg-gray-50 transition"
            >
              See How It Works
            </a>
          </div>

          {/* Mini app screenshot mockup */}
          <div className="max-w-sm mx-auto">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden" style={{ boxShadow: '0 32px 80px #1B998B18, 0 4px 24px #00000012' }}>
              {/* Fake app header */}
              <div className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1B998B] flex items-center justify-center">
                    <span className="text-white font-bold text-xs">S</span>
                  </div>
                  <span className="font-bold text-gray-900 text-sm">Split-It</span>
                </div>
                <span className="text-xs text-[#1B998B] font-semibold bg-[#E8F8F6] px-2.5 py-1 rounded-full">+ New Group</span>
              </div>
              {/* Fake group cards */}
              <div className="p-4 space-y-3 bg-gray-50">
                {[
                  { icon: '✈️', name: 'Goa Trip 2025', members: 4, owed: true, amount: '₹1,240' },
                  { icon: '🏠', name: 'House Expenses', members: 3, owed: false, amount: '₹860' },
                  { icon: '❤️', name: 'Weekend Getaway', members: 2, owed: true, amount: '₹340' },
                ].map((g) => (
                  <div key={g.name} className="bg-white rounded-2xl p-3.5 border border-gray-100 flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {g.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{g.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{g.members} members · INR</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-gray-400">{g.owed ? 'you are owed' : 'you owe'}</p>
                      <p className={`font-bold text-sm ${g.owed ? 'text-[#1B998B]' : 'text-[#E84545]'}`}>{g.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof strip ── */}
      <section className="border-y border-gray-100 bg-white py-6">
        <div className="max-w-5xl mx-auto px-5 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500 font-medium">
          {[
            { emoji: '🆓', label: 'Always Free' },
            { emoji: '🔒', label: 'No Ads, Ever' },
            { emoji: '⚡', label: 'Works Offline (PWA)' },
            { emoji: '🌍', label: '7+ Currencies' },
            { emoji: '📱', label: 'Works on Any Device' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Everything you need to split expenses and settle up
            </h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">
              No bloat. No subscriptions. Just simple, powerful bill splitting for groups.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-xl bg-[#E8F8F6] flex items-center justify-center text-2xl mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Up and running in minutes
            </h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">
              No tutorials needed. Split-It is designed to be obvious from the start.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gray-100 -translate-x-4 z-0" />
                )}
                <div className="relative z-10">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm mb-4 shadow"
                    style={{ background: '#1B998B', boxShadow: '0 4px 16px #1B998B33' }}
                  >
                    {s.step}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison Strip ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-2xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
              Split-It vs Splitwise
            </h2>
            <p className="text-gray-500 text-base max-w-md mx-auto">
              Looking for a free Splitwise alternative? Here&apos;s how Split-It compares.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 font-semibold text-gray-500">Feature</th>
                  <th className="px-4 py-4 font-bold text-[#1B998B]">Split-It</th>
                  <th className="px-4 py-4 font-semibold text-gray-400">Splitwise</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Completely Free', true, false],
                  ['No Ads', true, false],
                  ['Works as PWA (offline)', true, false],
                  ['Multi-Currency', true, true],
                  ['Group Expenses', true, true],
                  ['Invite via Link', true, true],
                  ['Activity Feed', true, true],
                ].map(([label, splitIt, splitwise]) => (
                  <tr key={String(label)} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3.5 text-gray-700 font-medium">{String(label)}</td>
                    <td className="px-4 py-3.5 text-center">
                      {splitIt ? (
                        <span className="text-[#1B998B] font-bold text-base">✓</span>
                      ) : (
                        <span className="text-gray-300 text-base">✗</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {splitwise ? (
                        <span className="text-gray-400 text-base">✓</span>
                      ) : (
                        <span className="text-gray-300 text-base">✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 bg-white border-y border-gray-100">
        <div className="max-w-2xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
              Frequently asked questions
            </h2>
            <p className="text-gray-500 text-base">Everything you need to know about Split-It.</p>
          </div>
          <dl className="space-y-6">
            {[
              {
                question: 'Is Split-It free to use?',
                answer:
                  'Yes. Split-It is completely free — no ads, no premium tier, no subscriptions. Every feature is available to every user, forever.',
              },
              {
                question: 'How does Split-It compare to Splitwise?',
                answer:
                  'Split-It offers all the core features of Splitwise — group expenses, multi-currency, invite links, activity feed, and settle up — but is completely free with no ads and works as a PWA so it loads offline.',
              },
              {
                question: 'Can I split bills internationally with multiple currencies?',
                answer:
                  'Yes. Split-It supports INR, USD, EUR, GBP, JPY, AUD, CAD and more. Each group can have its own currency, making it perfect for international trips.',
              },
              {
                question: 'Do my friends need to download an app or sign up?',
                answer:
                  'Inviting friends is frictionless — you share a single link and they join the group instantly. Only the person creating the group needs a Split-It account.',
              },
            ].map(({ question, answer }) => (
              <div key={question} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <dt className="font-bold text-gray-900 mb-2 text-base">{question}</dt>
                <dd className="text-gray-500 text-sm leading-relaxed">{answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <div
            className="rounded-3xl p-12 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1B998B 0%, #13776c 100%)' }}
          >
            <div
              className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
            />
            <div
              className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
            />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-extrabold text-2xl">S</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Ready to stop chasing IOUs?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
                Join thousands of friends already splitting smarter with Split-It. Free, always.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white font-bold px-8 py-4 rounded-2xl text-base transition-all hover:scale-105 hover:shadow-xl shadow-lg"
                style={{ color: '#1B998B' }}
              >
                Create Free Account
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="max-w-5xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1B998B] flex items-center justify-center">
              <span className="text-white font-bold text-xs">S</span>
            </div>
            <span className="font-semibold text-gray-600">Split-It</span>
          </div>
          <p>© {new Date().getFullYear()} Split-It · Free &amp; Open. Made with ❤️</p>
          <Link href="/login" className="text-[#1B998B] font-medium hover:underline">
            Sign In →
          </Link>
        </div>
      </footer>
    </div>
  );
}
