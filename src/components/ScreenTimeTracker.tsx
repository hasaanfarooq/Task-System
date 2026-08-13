"use client";

import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL_MS = 15000; // 15 seconds

export function ScreenTimeTracker() {
  const isTabActiveRef = useRef(true);
  const lastUserActivityRef = useRef(Date.now());

  useEffect(() => {
    // 1. Visibility & Focus change handlers
    const handleVisibilityChange = () => {
      isTabActiveRef.current = document.visibilityState === "visible";
    };

    const handleFocus = () => {
      isTabActiveRef.current = true;
      lastUserActivityRef.current = Date.now();
    };

    const handleBlur = () => {
      isTabActiveRef.current = false;
    };

    // 2. User Activity Handlers (mouse, key, scroll, click)
    const handleUserActivity = () => {
      lastUserActivityRef.current = Date.now();
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    window.addEventListener("mousemove", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });
    window.addEventListener("click", handleUserActivity, { passive: true });
    window.addEventListener("scroll", handleUserActivity, { passive: true });

    // 3. Heartbeat Timer
    const intervalId = setInterval(async () => {
      const now = Date.now();
      const timeSinceActivity = now - lastUserActivityRef.current;
      const isUserEngaged = timeSinceActivity < 60000; // Active within last 60 seconds

      if (isTabActiveRef.current && isUserEngaged) {
        try {
          await fetch("/api/user/heartbeat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ duration: 15 }),
          });
        } catch {
          // Ignore network errors silently
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);

      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);

      clearInterval(intervalId);
    };
  }, []);

  return null;
}
