import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  DAMAGE_TYPES,
  PANELS,
  type AnalyzeResponse,
  type DamageObservation,
  type DamageType,
  type LotData,
} from "../types";
import { extractLotData } from "../content/extract";
import { analyzeLot } from "../api/client";

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

export function Overlay({ onClose }: { onClose: () => void }) {
  // Scrape once when the overlay opens.
  const scraped = useMemo<LotData>(() => extractLotData(), []);

  const [hammerPrice, setHammerPrice] = useState(scraped.hammerPrice ?? 0);
  const [arv, setArv] = useState(scraped.arv ?? 0);
  const [damage, setDamage] = useState<DamageObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const addDamage = () =>
    setDamage((d) => [...d, { panel: PANELS[0].value, damage_type: "dent" }]);
  const removeDamage = (i: number) =>
    setDamage((d) => d.filter((_, idx) => idx !== i));
  const updateDamage = (i: number, patch: Partial<DamageObservation>) =>
    setDamage((d) => d.map((obs, idx) => (idx === i ? { ...obs, ...patch } : obs)));

  async function calculate() {
    setError(null);
    setResult(null);
    if (!scraped.lotTitle) {
      setError("Could not read the lot title — is this a Copart lot page?");
      return;
    }
    if (damage.length === 0) {
      setError("Add at least one damaged panel.");
      return;
    }
    setLoading(true);
    try {
      const res = await analyzeLot({
        lot_title: scraped.lotTitle,
        damage_observations: damage,
        images: [],
        hammer_price: hammerPrice,
        arv,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const profitColor = result
    ? result.profit_estimate >= 0
      ? "#1a7f37"
      : "#cf222e"
    : undefined;

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.title}>Carnalysis — ROI</span>
        <button style={s.close} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div style={s.body}>
        <div style={s.scrapeBox}>
          <Row label="Vehicle" value={scraped.lotTitle || "—"} />
          <Row label="Lot" value={scraped.lotNumber ?? "—"} />
          <Row label="Odometer" value={scraped.odometer?.toLocaleString() ?? "—"} />
          <Row label="Colour" value={scraped.colour ?? "—"} />
          <Row
            label="Copart damage"
            value={[scraped.primaryDamage, scraped.secondaryDamage]
              .filter(Boolean)
              .join(" / ") || "—"}
          />
          <Row label="Images found" value={String(scraped.images.length)} />
        </div>

        <label style={s.field}>
          <span style={s.fieldLabel}>Hammer price (£)</span>
          <input
            style={s.input}
            type="number"
            value={hammerPrice}
            onChange={(e) => setHammerPrice(Number(e.target.value))}
          />
        </label>
        <label style={s.field}>
          <span style={s.fieldLabel}>
            After Repair Value (£){scraped.arv == null && " — not found, enter manually"}
          </span>
          <input
            style={s.input}
            type="number"
            value={arv}
            onChange={(e) => setArv(Number(e.target.value))}
          />
        </label>

        <div style={s.damageHeader}>
          <span style={s.fieldLabel}>Damaged panels</span>
          <button style={s.addBtn} onClick={addDamage}>
            + Add
          </button>
        </div>
        {damage.map((obs, i) => (
          <div key={i} style={s.damageRow}>
            <select
              style={s.select}
              value={obs.panel}
              onChange={(e) => updateDamage(i, { panel: e.target.value })}
            >
              {PANELS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              style={s.selectSmall}
              value={obs.damage_type}
              onChange={(e) =>
                updateDamage(i, { damage_type: e.target.value as DamageType })
              }
            >
              {DAMAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button style={s.removeBtn} onClick={() => removeDamage(i)}>
              ×
            </button>
          </div>
        ))}

        <button style={s.calcBtn} onClick={calculate} disabled={loading}>
          {loading ? "Calculating…" : "Calculate ROI"}
        </button>

        {error && <div style={s.error}>{error}</div>}

        {result && (
          <div style={s.result}>
            <Row label="Hammer" value={gbp(result.hammer_price)} />
            <Row label="Copart fees" value={gbp(result.copart_fees)} />
            <Row label="Parts" value={gbp(result.total_parts)} />
            <Row label="Labour" value={gbp(result.total_labor)} />
            <Row label="Transport" value={gbp(result.transport)} />
            <Row label="Total cost" value={gbp(result.total_cost)} strong />
            <Row label="ARV" value={gbp(result.arv)} />
            <div style={{ ...s.profit, color: profitColor }}>
              <span>Profit</span>
              <span>
                {gbp(result.profit_estimate)} ({result.roi_percent}%)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ ...s.row, fontWeight: strong ? 600 : 400 }}>
      <span style={s.rowLabel}>{label}</span>
      <span style={s.rowValue}>{value}</span>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  panel: {
    position: "fixed",
    top: 16,
    right: 16,
    width: 340,
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    color: "#1f2328",
    borderRadius: 10,
    boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: 13,
    zIndex: 2147483647,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "#0b5fff",
    color: "#fff",
    borderRadius: "10px 10px 0 0",
  },
  title: { fontWeight: 600 },
  close: {
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: 20,
    lineHeight: 1,
    cursor: "pointer",
  },
  body: { padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  scrapeBox: {
    background: "#f6f8fa",
    borderRadius: 8,
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  row: { display: "flex", justifyContent: "space-between", gap: 12 },
  rowLabel: { color: "#656d76" },
  rowValue: { textAlign: "right" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: { color: "#656d76", fontSize: 12 },
  input: {
    padding: "6px 8px",
    border: "1px solid #d0d7de",
    borderRadius: 6,
    fontSize: 13,
  },
  damageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  damageRow: { display: "flex", gap: 6, alignItems: "center" },
  select: { flex: 1, padding: "5px 6px", border: "1px solid #d0d7de", borderRadius: 6 },
  selectSmall: { width: 90, padding: "5px 6px", border: "1px solid #d0d7de", borderRadius: 6 },
  addBtn: {
    background: "#eaeef2",
    border: "1px solid #d0d7de",
    borderRadius: 6,
    padding: "3px 8px",
    cursor: "pointer",
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "#cf222e",
    fontSize: 18,
    cursor: "pointer",
  },
  calcBtn: {
    background: "#0b5fff",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    background: "#ffebe9",
    border: "1px solid #ffcecb",
    color: "#cf222e",
    borderRadius: 6,
    padding: "8px 10px",
    whiteSpace: "pre-wrap",
  },
  result: {
    borderTop: "1px solid #d0d7de",
    paddingTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  profit: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 700,
    fontSize: 15,
    marginTop: 4,
  },
};
