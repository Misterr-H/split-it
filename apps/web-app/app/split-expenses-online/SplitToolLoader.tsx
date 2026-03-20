'use client';

import dynamic from 'next/dynamic';

const SplitTool = dynamic(() => import('./SplitTool'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center min-h-[300px]">
      <div className="w-10 h-10 border-4 border-[#1B998B] border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function SplitToolLoader() {
  return <SplitTool />;
}
