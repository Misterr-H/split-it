'use client';

import { useEffect } from 'react';
import Clarity from 'clarity-js';

export default function ClarityInit() {
  useEffect(() => {
    Clarity.init('vyq3ldq2kn');
  }, []);

  return null;
}
