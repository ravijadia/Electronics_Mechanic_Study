import React, {useEffect, useRef, useState} from 'react';

/**
 * useState that is mirrored to localStorage. Renders with `initial` first
 * (so server and client markup match), then loads the saved value. Storage
 * failures (private mode, blocked site data) are ignored.
 */
export default function useStoredState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const skipFirstSave = useRef(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded];
}
