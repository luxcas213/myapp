// Shared motion presets so timing/easing stay consistent across the app
// rather than each component picking its own numbers. Researched ranges
// (mobile micro-interaction guidelines): taps/toggles ~100ms, standard
// enter/exit transitions 200-300ms with an ease-out curve, modal/hero
// transitions 300-400ms — nothing under ~80ms (imperceptible) or over
// ~500ms (reads as sluggish on a phone).
import type { Transition } from "motion/react";

/** A snappy, slightly overshooting spring for tap/press feedback. */
export const TAP_SPRING: Transition = { type: "spring", stiffness: 500, damping: 30 };

/** Standard list-item / small-element enter-exit. */
export const EASE_OUT: Transition = { duration: 0.2, ease: "easeOut" };

/** Slightly longer, for whole-section or modal/overlay transitions. */
export const EASE_OUT_MODAL: Transition = { duration: 0.3, ease: "easeOut" };

/** Bouncy entrance for a single focal icon/checkmark. */
export const POP_SPRING: Transition = { type: "spring", stiffness: 400, damping: 20 };

export const TAP_SCALE = 0.96;
