"use client";

import { useEffect } from "react";
import { initFromSaved } from "@/lib/i18n/engine";

/**
 * Headless: applies the reader's saved language on every page load, including
 * routes that don't render the TopBar (e.g. the marketing home). Idempotent with
 * the header picker's own init — whichever runs first wins, the other no-ops.
 */
export function LanguageBoot() {
  useEffect(() => {
    void initFromSaved();
  }, []);
  return null;
}
