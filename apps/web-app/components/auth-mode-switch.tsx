import Link from 'next/link';

type AuthMode = 'login' | 'signup';

function authHref(path: '/login' | '/signup', next?: string | null) {
  if (!next) return path;
  const params = new URLSearchParams({ next });
  return `${path}?${params.toString()}`;
}

export function AuthModeSwitch({
  active,
  next,
}: {
  active: AuthMode;
  next?: string | null;
}) {
  const options: { mode: AuthMode; label: string; href: '/login' | '/signup' }[] = [
    { mode: 'login', label: 'Sign in', href: '/login' },
    { mode: 'signup', label: 'Create account', href: '/signup' },
  ];

  return (
    <div className="mb-4 grid grid-cols-2 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
      {options.map((option) => {
        const isActive = active === option.mode;
        return (
          <Link
            key={option.mode}
            href={authHref(option.href, next)}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
              isActive
                ? 'bg-[#1B998B] text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
