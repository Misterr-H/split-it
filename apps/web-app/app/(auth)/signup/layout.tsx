import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create a Free Account — Split-It',
  description:
    'Create your free Split-It account in seconds. Start splitting bills and tracking shared expenses with friends and groups today.',
  alternates: {
    canonical: 'https://split-it.xyz/signup',
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
