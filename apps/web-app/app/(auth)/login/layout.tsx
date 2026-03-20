import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In to Split-It',
  description:
    'Sign in to your Split-It account to track shared expenses, split bills with friends, and settle up easily.',
  alternates: {
    canonical: 'https://split-it.xyz/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
