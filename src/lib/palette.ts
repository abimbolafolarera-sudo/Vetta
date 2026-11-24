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
  // Vetta print: the sieve grid with adire motifs (Olokun ring, stripes, dots), tinted to the palette.
  const o = opacity, c = color;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><g fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='1.2'>`
    + `<rect x='6' y='6' width='36' height='36' rx='6'/><circle cx='24' cy='24' r='9'/><circle cx='24' cy='24' r='3' fill='${c}' fill-opacity='${o}'/>`
    + `<rect x='54' y='6' width='36' height='36' rx='6'/><path d='M61 17h22M61 24h22M61 31h22'/>`
    + `<rect x='6' y='54' width='36' height='36' rx='6'/><path d='M10 86l28-28M10 72l14-14M24 86l14-14'/>`
    + `<rect x='54' y='54' width='36' height='36' rx='6'/></g>`
    + `<g fill='none' stroke='${c}' stroke-opacity='${o}' stroke-width='1.2'><rect x='63' y='63' width='18' height='18' rx='3'/></g><circle cx='72' cy='72' r='2.4' fill='${c}' fill-opacity='${o * 1.3}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

let current: PaletteId = "coral";
export function applyPalette(_id?: string | null) {
  const p = PALETTES[0]; current = p.id;
  const dark = document.documentElement.dataset.theme === "dark";
  const t = dark ? p.dark : p.light;
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(t)) root.setProperty(k, v);
  root.setProperty("--print", printFor(dark ? "#FFFFFF" : "#141210", dark ? 0.045 : 0.06));
  root.setProperty("--print-on-brand", printFor("#FFFFFF", 0.065));
  root.setProperty("--feature", dark ? t["--surface"] : p.feature);
}
export const currentPalette = () => current;
export const cachedPalette = (): PaletteId => "coral";
