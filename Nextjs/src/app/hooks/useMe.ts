'use client';

import { useEffect, useState } from 'react';
import { meApi, Me } from '@/app/lib/authApi';

type MeState =
  | { loading: true; me?: undefined; error?: undefined }
  | { loading: false; me: Me; error?: undefined }
  | { loading: false; me?: undefined; error: string };

export function useMe(): MeState {
  const [state, setState] = useState<MeState>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await meApi();
        if (!cancelled) setState({ loading: false, me });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'failed';
        if (!cancelled) {
          setState({ loading: false, error: message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
