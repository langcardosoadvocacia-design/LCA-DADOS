import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook to track if a component is still mounted.
 * Useful for preventing state updates on unmounted components after async calls.
 */
export function useIsMounted() {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const check = useCallback(() => isMounted.current, []);
  return check;
}
