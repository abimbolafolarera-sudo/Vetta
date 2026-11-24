// Vetta's colour: Ink and Coral, fixed for everyone. Light and dark mode still apply.
export type PaletteId = "coral";
type Tokens = Record<string, string>;
type Palette = { id: PaletteId; name: string; light: Tokens; dark: Tokens; feature: string; swatch: string[] };

const base = (t: Partial<Tokens>, d: boolean): Tokens => ({
  "--like": d ? "#FF6B5E" : "#D9473A", "--ok": d ? "#4CC38A" : "#1F7A4D", "--warn": d ? "#F0B54A" : "#9A6200", "--err": d ? "#FF6B5E" : "#C0392B",
  "--shadow": d ? "0 20px 50px -20px rgba(0,0,0,.8)" : "0 20px 50px -24px rgba(30,20,10,.35)", ...t,
} as Tokens);

export const PALETTES: Palette[] = [
  {
    id: "coral", name: "Ink and Coral", swatch: ["#141210", "#FF6F59", "#FBFAF8"], feature: "#141210",
    light: base({ "--bg": "#FBFAF8", "--bg-2": "#FFFFFF", "--surface": "#F1EFEC", "--surface-2": "#E7E4E0", "--hover": "#DDD9D4", "--line": "rgba(20,18,16,.09)", "--line-2": "rgba(20,18,16,.17)",
      "--text": "#141210", "--text-2": "#3A3734", "--text-3": "#75706B", "--brand": "#141210", "--brand-hi": "#2B2825", "--brand-soft": "rgba(255,111,89,.14)", "--on-brand": "#FBFAF8", "--accent": "#FF6F59", "--accent-ink": "#141210" }, false),
    dark: base({ "--bg": "#0E0D0C", "--bg-2": "#141312", "--surface": "#1C1A18", "--surface-2": "#262321", "--hover": "#2F2C29", "--line": "rgba(251,250,248,.08)", "--line-2": "rgba(251,250,248,.16)",
      "--text": "#FBFAF8", "--text-2": "#D7D3CE", "--text-3": "#9B958F", "--brand": "#FF6F59", "--brand-hi": "#FF846F", "--brand-soft": "rgba(255,111,89,.16)", "--on-brand": "#0E0D0C", "--accent": "#FF6F59", "--accent-ink": "#0E0D0C" }, true),
  },
];

export const getPalette = (id?: string | null) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

function printFor(color: string, opacity: number) {
  // Fine geometric linework: small arcs, dots and dashes. Tinted to the palette.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='${color}' stroke-opacity='${opacity}' stroke-width='1.3' stroke-linecap='round'><path d='M10 30 a12 12 0 0 1 24 0'/><path d='M70 90 a12 12 0 0 1 24 0'/><path d='M60 20 h18 M86 54 h14 M14 78 h14'/><circle cx='100' cy='16' r='1.8'/><circle cx='40' cy='104' r='1.8'/><circle cx='48' cy='60' r='1.8'/><path d='M4 112 l8 -8 M108 104 l8 -8'/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

let current: PaletteId = "coral";
export function applyPalette(_id?: string | null) {
  const p = PALETTES[0]; current = p.id;
  const dark = document.documentElement.dataset.theme === "dark";
  const t = dark ? p.dark : p.light;
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(t)) root.setProperty(k, v);
  root.setProperty("--print", printFor(dark ? "#FFFFFF" : t["--brand"], dark ? 0.07 : 0.14));
  root.setProperty("--print-on-brand", printFor("#FFFFFF", 0.13));
  root.setProperty("--feature", dark ? t["--surface"] : p.feature);
}
export const currentPalette = () => current;
export const cachedPalette = (): PaletteId => "coral";
