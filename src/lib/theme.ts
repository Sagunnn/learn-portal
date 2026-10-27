import type { ThemeName } from "../types/content";

// Full class names are spelled out so Tailwind can see them at build time.
export interface Theme {
  solid: string;
  soft: string;
  text: string;
  border: string;
  bar: string;
  ring: string;
  gradient: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  emerald: {
    solid: "bg-emerald-600 hover:bg-emerald-700 text-white",
    soft: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    bar: "bg-emerald-500",
    ring: "focus-visible:ring-emerald-400",
    gradient: "from-emerald-500 to-teal-500",
  },
  indigo: {
    solid: "bg-indigo-600 hover:bg-indigo-700 text-white",
    soft: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    bar: "bg-indigo-500",
    ring: "focus-visible:ring-indigo-400",
    gradient: "from-indigo-500 to-violet-500",
  },
  rose: {
    solid: "bg-rose-600 hover:bg-rose-700 text-white",
    soft: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    bar: "bg-rose-500",
    ring: "focus-visible:ring-rose-400",
    gradient: "from-rose-500 to-orange-400",
  },
  amber: {
    solid: "bg-amber-500 hover:bg-amber-600 text-white",
    soft: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    bar: "bg-amber-500",
    ring: "focus-visible:ring-amber-400",
    gradient: "from-amber-400 to-orange-500",
  },
  sky: {
    solid: "bg-sky-600 hover:bg-sky-700 text-white",
    soft: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    bar: "bg-sky-500",
    ring: "focus-visible:ring-sky-400",
    gradient: "from-sky-500 to-cyan-500",
  },
  violet: {
    solid: "bg-violet-600 hover:bg-violet-700 text-white",
    soft: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    bar: "bg-violet-500",
    ring: "focus-visible:ring-violet-400",
    gradient: "from-violet-500 to-fuchsia-500",
  },
};

export const themeFor = (name: ThemeName | undefined) => THEMES[name ?? "indigo"] ?? THEMES.indigo;
