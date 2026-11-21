import { PALETTES, applyPalette } from "../lib/palette";

export function PalettePicker({ value, onPick }: { value: string; onPick: (id: string) => void }) {
  return (
    <div className="palettes" role="radiogroup" aria-label="Site colour">
      {PALETTES.map((p) => (
        <button key={p.id} type="button" role="radio" aria-checked={value === p.id} className={`pal ${value === p.id ? "is-on" : ""}`}
          onClick={() => { applyPalette(p.id); onPick(p.id); }}>
          <span className="pal__sw">{p.swatch.map((c) => <span key={c} style={{ background: c }} />)}</span>
          {p.name}
        </button>
      ))}
    </div>
  );
}
