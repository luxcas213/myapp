"use client";

import { useEffect } from "react";

/**
 * iOS 26 WebKit bug (fixed in Safari 26.1 beta, not yet shipped): in
 * standalone PWA mode, `html`/`body` can resolve taller than the real
 * visual viewport, leaving a phantom gap at the bottom. This does NOT
 * touch the default CSS at all — `html`/`body` keep the plain `h-full`/
 * `min-h-full` flex chain that already renders correctly (see
 * 5838ead: reintroducing a viewport-unit-based height, even just as a
 * pre-JS fallback, reproduces the exact first-paint bug that commit
 * removed).
 *
 * `visualViewport.height` itself misreports on first launch — it only
 * becomes accurate once WebKit recalculates internally, which normally
 * only happens after an actual scroll/touch gesture (matches the
 * reported "gap on open, gone after one swipe" symptom). So on mount
 * this nudges the scroll position programmatically to force that same
 * recalculation without waiting for the user, re-measures on the next
 * frame, and also keeps listening for a real gesture (scroll/touchmove)
 * as a fallback in case the programmatic nudge doesn't trigger it on a
 * given device/iOS version.
 */
export function ViewportHeightFix() {
  useEffect(() => {
    const setHeight = () => {
      const height = window.visualViewport?.height;
      if (!height) return;
      document.documentElement.style.height = `${height}px`;
    };

    setHeight();

    window.scrollTo(0, 1);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      requestAnimationFrame(setHeight);
    });

    window.visualViewport?.addEventListener("resize", setHeight);
    window.addEventListener("orientationchange", setHeight);
    document.addEventListener("scroll", setHeight, { passive: true, capture: true });
    document.addEventListener("touchmove", setHeight, { passive: true, capture: true });

    return () => {
      window.visualViewport?.removeEventListener("resize", setHeight);
      window.removeEventListener("orientationchange", setHeight);
      document.removeEventListener("scroll", setHeight, true);
      document.removeEventListener("touchmove", setHeight, true);
    };
  }, []);

  return null;
}
