'use client';

import { useEffect } from 'react';
import { clarity } from 'clarity-js';

export default function ClarityInit() {
  useEffect(() => {
    clarity.start({ projectId: 'vyq3ldq2kn' });
  }, []);

  return null;
}
