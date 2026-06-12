"use client";

import { useEffect } from "react";

/**
 * Press "/" anywhere (outside a text field) to jump to the page's search box.
 * A small power-user nicety borrowed from GitHub/Slack/etc.
 */
export function SearchHotkey() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) {
        return;
      }
      const input = document.querySelector<HTMLInputElement>('input[name="q"]');
      if (input) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
