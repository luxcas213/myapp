"use client";

import { useEffect } from "react";

/**
 * iOS 26 WebKit bug (fixed in Safari 26.1 beta, not yet shipped): in
 * standalone PWA mode, `html`/`body` at 100% (and `dvh`) sometimes resolve
 * taller than the real visual viewport, leaving a phantom gap at the
 * bottom. Measuring `visualViewport.height` directly and writing it as a
 * pixel value sidesteps WebKit's broken layout-viewport math entirely.
 */
export function ViewportHeightFix() {
  useEffect(() => {
    const setHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    };

    setHeight();
    window.visualViewport?.addEventListener("resize", setHeight);
    window.addEventListener("resize", setHeight);
    window.addEventListener("orientationchange", setHeight);

    return () => {
      window.visualViewport?.removeEventListener("resize", setHeight);
      window.removeEventListener("resize", setHeight);
      window.removeEventListener("orientationchange", setHeight);
    };
  }, []);

  return null;
}
