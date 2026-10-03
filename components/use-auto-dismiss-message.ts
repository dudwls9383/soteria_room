"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Each notification gets a fresh five seconds, even when its text repeats.
// Cancel the old timer on replacement, manual dismissal and unmount.
export function useAutoDismissMessage() {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((next: string) => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setMessage(next);
    if (next) timer.current = setTimeout(() => {
      timer.current = null;
      setMessage("");
    }, 5000);
  }, []);
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);
  return [message, show] as const;
}
