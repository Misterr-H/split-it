'use client';

import { useEffect } from 'react';

export default function ClarityInit() {
  useEffect(() => {
    import('clarity-js').then(({ clarity }) => {
      clarity.start({ projectId: 'vyq3ldq2kn' });
    });
  }, []);

  return null;
}
