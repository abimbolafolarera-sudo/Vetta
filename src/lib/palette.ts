// Site-wide colour palettes. The admin picks one in Admin > Settings; it applies for every visitor.
export type PaletteId = "clay" | "cocoa" | "persimmon" | "coral" | "burgundy";
type Tokens = Record<string, string>;
type Palette = { id: PaletteId; name: string; light: Tokens; dark: Tokens; feature: string; swatch: string[] };

const base = (t: Partial<Tokens>, d: boolean): Tokens => ({
  "--like": d ? "#FF6B5E" : "#D9473A", "--ok": d ? "#4CC38A" : "#1F7A4D", "--warn": d ? "#F0B54A" : "#9A6200", "--err": d ? "#FF6B5E" : "#C0392B",
  "--shadow": d ? "0 20px 50px -20px rgba(0,0,0,.8)" : "0 20px 50px -24px rgba(30,20,10,.35)", ...t,
} as Tokens);

export const PALETTES: Palette[] = [
  {
    id: "clay", name: "Clay", swatch: ["#A8461F", "#F7EFE6", "#D9A35B", "#24160F"], feature: "#7A2F12",
    light: base({ "--bg": "#F7EFE6", "--bg-2": "#FBF6F0", "--surface": "#EFE3D6", "--surface-2": "#E6D7C6", "--hover": "#DDCBB7", "--line": "rgba(36,22,15,.10)", "--line-2": "rgba(36,22,15,.18)",
      "--text": "#24160F", "--text-2": "#4A3426", "--text-3": "#7D6656", "--brand": "#A8461F", "--brand-hi": "#8E3A18", "--brand-soft": "rgba(168,70,31,.12)", "--on-brand": "#FBF6F0", "--accent": "#D9A35B", "--accent-ink": "#24160F" }, false),
    dark: base({ "--bg": "#170F0B", "--bg-2": "#1D140F", "--surface": "#251A14", "--surface-2": "#30221A", "--hover": "#3A2A20", "--line": "rgba(246,237,227,.08)", "--line-2": "rgba(246,237,227,.16)",
      "--text": "#F6EDE3", "--text-2": "#D9C9BA", "--text-3": "#A08C7C", "--brand": "#D1663A", "--brand-hi": "#E07A4E", "--brand-soft": "rgba(209,102,58,.18)", "--on-brand": "#170F0B", "--accent": "#D9A35B", "--accent-ink": "#170F0B" }, true),
  },
  {
    id: "cocoa", name: "Cocoa and Saffron", swatch: ["#3B2418", "#E08A1E", "#FAF4EC"], feature: "#2A1910",
    light: base({ "--bg": "#FAF4EC", "--bg-2": "#FDF9F4", "--surface": "#F1E7DA", "--surface-2": "#E8DAC9", "--hover": "#DFCDB8", "--line": "rgba(42,26,18,.10)", "--line-2": "rgba(42,26,18,.18)",
      "--text": "#2A1A12", "--text-2": "#4D3729", "--text-3": "#7E6A5C", "--brand": "#3B2418", "--brand-hi": "#2A1910", "--brand-soft": "rgba(59,36,24,.10)", "--on-brand": "#FAF4EC", "--accent": "#E08A1E", "--accent-ink": "#2A1A12" }, false),
    dark: base({ "--bg": "#140D09", "--bg-2": "#1A120D", "--surface": "#231811", "--surface-2": "#2E2017", "--hover": "#38281D", "--line": "rgba(250,244,236,.08)", "--line-2": "rgba(250,244,236,.16)",
      "--text": "#FAF4EC", "--text-2": "#DCCDBE", "--text-3": "#A3907F", "--brand": "#E08A1E", "--brand-hi": "#EE9C33", "--brand-soft": "rgba(224,138,30,.16)", "--on-brand": "#140D09", "--accent": "#E08A1E", "--accent-ink": "#140D09" }, true),
  },
  {
    id: "persimmon", name: "Persimmon", swatch: ["#E0482A", "#FBF7F2", "#141210"], feature: "#B8361C",
    light: base({ "--bg": "#FBF7F2", "--bg-2": "#FFFCF8", "--surface": "#F2ECE4", "--surface-2": "#E9E1D7", "--hover": "#E0D6CA", "--line": "rgba(20,18,16,.09)", "--line-2": "rgba(20,18,16,.17)",
      "--text": "#141210", "--text-2": "#3A3531", "--text-3": "#736B64", "--brand": "#D9401F", "--brand-hi": "#BE3618", "--brand-soft": "rgba(217,64,31,.10)", "--on-brand": "#FFFCF8", "--accent": "#141210", "--accent-ink": "#FBF7F2" }, false),
    dark: base({ "--bg": "#0F0D0C", "--bg-2": "#151210", "--surface": "#1D1916", "--surface-2": "#27221E", "--hover": "#302A25", "--line": "rgba(251,247,242,.08)", "--line-2": "rgba(251,247,242,.16)",
      "--text": "#FBF7F2", "--text-2": "#D8D0C7", "--text-3": "#9C928A", "--brand": "#FF5A38", "--brand-hi": "#FF6F51", "--brand-soft": "rgba(255,90,56,.16)", "--on-brand": "#0F0D0C", "--accent": "#FBF7F2", "--accent-ink": "#0F0D0C" }, true),
  },
  {
    id: "coral", name: "Ink and Coral", swatch: ["#141210", "#FF6F59", "#FBFAF8"], feature: "#141210",
    light: base({ "--bg": "#FBFAF8", "--bg-2": "#FFFFFF", "--surface": "#F1EFEC", "--surface-2": "#E7E4E0", "--hover": "#DDD9D4", "--line": "rgba(20,18,16,.09)", "--line-2": "rgba(20,18,16,.17)",
      "--text": "#141210", "--text-2": "#3A3734", "--text-3": "#75706B", "--brand": "#141210", "--brand-hi": "#2B2825", "--brand-soft": "rgba(255,111,89,.14)", "--on-brand": "#FBFAF8", "--accent": "#FF6F59", "--accent-ink": "#141210" }, false),
    dark: base({ "--bg": "#0E0D0C", "--bg-2": "#141312", "--surface": "#1C1A18", "--surface-2": "#262321", "--hover": "#2F2C29", "--line": "rgba(251,250,248,.08)", "--line-2": "rgba(251,250,248,.16)",
      "--text": "#FBFAF8", "--text-2": "#D7D3CE", "--text-3": "#9B958F", "--brand": "#FF6F59", "--brand-hi": "#FF846F", "--brand-soft": "rgba(255,111,89,.16)", "--on-brand": "#0E0D0C", "--accent": "#FF6F59", "--accent-ink": "#0E0D0C" }, true),
  },
  {
    id: "burgundy", name: "Burgundy", swatch: ["#6E1E2E", "#F6EFE8", "#C9A15B"], feature: "#4E1420",
    light: base({ "--bg": "#F6EFE8", "--bg-2": "#FBF7F2", "--surface": "#EDE2D8", "--surface-2": "#E3D4C8", "--hover": "#D9C7B9", "--line": "rgba(42,14,20,.10)", "--line-2": "rgba(42,14,20,.18)",
      "--text": "#2A0E14", "--text-2": "#4E2E34", "--text-3": "#806369", "--brand": "#6E1E2E", "--brand-hi": "#581624", "--brand-soft": "rgba(110,30,46,.10)", "--on-brand": "#FBF7F2", "--accent": "#C9A15B", "--accent-ink": "#2A0E14" }, false),
    dark: base({ "--bg": "#140A0C", "--bg-2": "#1A0E11", "--surface": "#241317", "--surface-2": "#2F1A1F", "--hover": "#3A2127", "--line": "rgba(246,239,232,.08)", "--line-2": "rgba(246,239,232,.16)",
      "--text": "#F6EFE8", "--text-2": "#DCCBC6", "--text-3": "#A48C8E", "--brand": "#B24357", "--brand-hi": "#C45569", "--brand-soft": "rgba(178,67,87,.18)", "--on-brand": "#F6EFE8", "--accent": "#C9A15B", "--accent-ink": "#140A0C" }, true),
  },
];

export const getPalette = (id?: string | null) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

function printFor(color: string, opacity: number) {
  // Fine geometric linework: small arcs, dots and dashes. Tinted to the palette.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='${color}' stroke-opacity='${opacity}' stroke-width='1.3' stroke-linecap='round'><path d='M10 30 a12 12 0 0 1 24 0'/><path d='M70 90 a12 12 0 0 1 24 0'/><path d='M60 20 h18 M86 54 h14 M14 78 h14'/><circle cx='100' cy='16' r='1.8'/><circle cx='40' cy='104' r='1.8'/><circle cx='48' cy='60' r='1.8'/><path d='M4 112 l8 -8 M108 104 l8 -8'/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

let current: PaletteId = "clay";
export function applyPalette(id?: string | null) {
  const p = getPalette(id); current = p.id;
  const dark = document.documentElement.dataset.theme === "dark";
  const t = dark ? p.dark : p.light;
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(t)) root.setProperty(k, v);
  root.setProperty("--print", printFor(dark ? "#FFFFFF" : t["--brand"], dark ? 0.07 : 0.14));
  root.setProperty("--print-on-brand", printFor("#FFFFFF", 0.13));
  root.setProperty("--feature", dark ? t["--surface"] : p.feature);
  try { localStorage.setItem("vetta-palette", p.id); } catch {}
}
export const currentPalette = () => current;
export function cachedPalette(): PaletteId { try { return (localStorage.getItem("vetta-palette") as PaletteId) || "clay"; } catch { return "clay"; } }
