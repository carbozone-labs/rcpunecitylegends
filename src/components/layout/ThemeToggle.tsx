"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemePreference = "light" | "dark" | "system";
const cycle: ThemePreference[] = ["light", "dark", "system"];
function applyTheme(preference: ThemePreference) {
  const resolved = preference === "system"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
}
export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const initial: ThemePreference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setPreference(initial); applyTheme(initial);
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const update = () => { if (document.documentElement.dataset.themePreference === "system") applyTheme("system"); };
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  const next = () => {
    const value = cycle[(cycle.indexOf(preference) + 1) % cycle.length];
    setPreference(value); try { localStorage.setItem("theme", value); } catch { /* preference remains active for this page */ } applyTheme(value);
  };
  const Icon = preference === "light" ? Sun : preference === "dark" ? Moon : Monitor;
  return <button type="button" onClick={next} title={`Current theme: ${preference}. Click to change.`} aria-label={`Current theme: ${preference}. Change theme.`} className="inline-flex items-center justify-center h-11 w-11 rounded-full border border-amber-300/30 bg-slate-900/70 p-0 text-amber-200 transition hover:border-amber-300/60">
    <Icon aria-hidden className="size-5" />
  </button>;
}

