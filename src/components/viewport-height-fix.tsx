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
 * removed). Instead, once mounted, this measures the real
 * `visualViewport.height` and writes it as an inline pixel height
 * directly on `documentElement` — an enhancement layered on top of the
 * working baseline, never a replacement for it.
 */
export function ViewportHeightFix() {
  useEffect(() => {
    const setHeight = () => {
      const height = window.visualViewport?.height;
      if (!height) return;
      document.documentElement.style.height = `${height}px`;
    };

    setHeight();
    window.visualViewport?.addEventListener("resize", setHeight);
    window.addEventListener("orientationchange", setHeight);

    return () => {
      window.visualViewport?.removeEventListener("resize", setHeight);
      window.removeEventListener("orientationchange", setHeight);
    };
  }, []);

  return null;
}
