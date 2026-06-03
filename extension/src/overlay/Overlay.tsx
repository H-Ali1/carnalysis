import { useEffect, useMemo, useState } from "react";
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
import { estimateTransport, isValidUKPostcode, YARD_POSTCODES } from "../content/transport";
import { type AutoTraderResult, buildSearchUrl } from "../api/autotrader";
import { analyzeLot } from "../api/client";

const POSTCODE_KEY = "carnalysis_user_postcode";
const FLAT_TRANSPORT = 150;

const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

type ArvSource = "copart" | "autotrader" | "manual";

interface BgResponse { ok: boolean; data: AutoTraderResult | null; error?: string }

export function Overlay({ onClose }: { onClose: () => void }) {
  const scraped = useMemo<LotData>(() => extractLotData(), []);

  const [hammerPrice, setHammerPrice] = useState(scraped.hammerPrice ?? 0);
  const [arvSource, setArvSource] = useState<ArvSource>("copart");
  const [manualArv, setManualArv] = useState(scraped.arv ?? 0);
  const [damage, setDamage] = useState<DamageObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  // AutoTrader ARV
  const [atResult, setAtResult] = useState<AutoTraderResult | null>(null);
  const [atLoading, setAtLoading] = useState(false);
  const [atError, setAtError] = useState<string | null>(null);

  // Transport
  const [userPostcode, setUserPostcode] = useState<string>(
    () => localStorage.getItem(POSTCODE_KEY) ?? ""
  );
  const [transport, setTransport] = useState<{ miles: number; cost: number } | null>(null);
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);

  const yardKnown = scraped.yardName ? scraped.yardName in YARD_POSTCODES : false;

  // Kick off AutoTrader fetch as soon as we have vehicle info
  useEffect(() => {
    const title = scraped.lotTitle;
    if (!title) return;
    // Parse make/model/year from scraped title via background worker
    // (we infer from the title the backend would parse — good enough for the search)
    const yearMatch = title.match(/^(\d{4})\s+(\S+)\s+(\S+)/);
    if (!yearMatch) return;
    const [, yearStr, make, model] = yearMatch;
    const year = parseInt(yearStr, 10);
    if (!make || !model || isNaN(year)) return;

    setAtLoading(true);
    setAtError(null);
    chrome.runtime.sendMessage(
      { type: "FETCH_AUTOTRADER", make, model, year, mileage: scraped.odometer ?? null },
      (resp: BgResponse) => {
        setAtLoading(false);
        if (!resp || !resp.ok || !resp.data) {
          setAtError(resp?.error ?? "No results found on AutoTrader.");
          return;
        }
        setAtResult(resp.data);
      },
    );
  }, [scraped.lotTitle, scraped.odometer]);

  // Transport calculation
  useEffect(() => {
    if (!isValidUKPostcode(userPostcode) || !scraped.yardName) {
      setTransport(null);
      return;
    }
    localStorage.setItem(POSTCODE_KEY, userPostcode);
    setTransportLoading(true);
    setTransportError(null);
    estimateTransport(userPostcode, scraped.yardName).then((est) => {
      setTransportLoading(false);
      if (!est) {
        setTransportError(
          yardKnown
            ? "Postcode lookup failed — check your postcode."
            : `Yard "${scraped.yardName}" not in our map, using £${FLAT_TRANSPORT} flat.`,
        );
        setTransport(null);
      } else {
        setTransport(est);
      }
    });
  }, [userPostcode, scraped.yardName, yardKnown]);

  const transportCost = transport?.cost ?? FLAT_TRANSPORT;

  // Resolved ARV based on user's selection
  const arv =
    arvSource === "copart"
      ? (scraped.arv ?? manualArv)
      : arvSource === "autotrader"
        ? (atResult?.median ?? manualArv)
        : manualArv;

  const COPART_FEE_RATE = 0.12;
  function maxBidFor(targetProfit: number): number | null {
    if (!result) return null;
    const fixedCosts = result.total_parts + result.transport;
    const max = (result.arv - fixedCosts - targetProfit) / (1 + COPART_FEE_RATE);
    return max > 0 ? Math.floor(max) : null;
  }
  function applyMaxBid(targetProfit: number) {
    const max = maxBidFor(targetProfit);
    if (max !== null) { setHammerPrice(max); setResult(null); }
  }

  const addDamage = () =>
    setDamage((d) => [...d, { panel: PANELS[0].value, damage_type: "dent" }]);
  const removeDamage = (i: number) =>
    setDamage((d) => d.filter((_, idx) => idx !== i));
  const updateDamage = (i: number, patch: Partial<DamageObservation>) =>
    setDamage((d) => d.map((obs, idx) => (idx === i ? { ...obs, ...patch } : obs)));

  async function calculate() {
    setError(null);
    setResult(null);
    if (!scraped.lotTitle) { setError("Could not read the lot title — is this a Copart lot page?"); return; }
    if (damage.length === 0) { setError("Add at least one damaged panel."); return; }
    setLoading(true);
    try {
      const res = await analyzeLot({
        lot_title: scraped.lotTitle,
        damage_observations: damage,
        images: [],
        hammer_price: hammerPrice,
        arv,
        transport: transportCost,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const profitColor = result
    ? result.profit_estimate >= 0 ? "#1a7f37" : "#cf222e"
    : undefined;

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.title}>Carnalysis — ROI</span>
        <button style={s.close} onClick={onClose} aria-label="Close">×</button>
      </div>

      <div style={s.body}>
        {/* Scraped summary */}
        <div style={s.scrapeBox}>
          <Row label="Vehicle" value={scraped.lotTitle || "—"} />
          <Row label="Lot" value={scraped.lotNumber ?? "—"} />
          <Row label="Yard" value={scraped.yardName ?? "—"} />
          <Row label="Odometer" value={scraped.odometer?.toLocaleString() ?? "—"} />
          <Row label="Colour" value={scraped.colour ?? "—"} />
          <Row
            label="Copart damage"
            value={[scraped.primaryDamage, scraped.secondaryDamage].filter(Boolean).join(" / ") || "—"}
          />
        </div>

        {/* ARV source selection */}
        <div style={s.sectionLabel}>After Repair Value — select source</div>
        <div style={s.arvCards}>
          {/* Copart */}
          <ArvCard
            label="Copart estimate"
            selected={arvSource === "copart"}
            onClick={() => { setArvSource("copart"); setResult(null); }}
            value={scraped.arv != null ? gbp(scraped.arv) : null}
            sub="From lot page"
            unavailable={scraped.arv == null}
          />
          {/* AutoTrader */}
          <ArvCard
            label="AutoTrader"
            selected={arvSource === "autotrader"}
            onClick={() => { if (atResult) { setArvSource("autotrader"); setResult(null); } }}
            value={atResult ? gbp(atResult.median) : null}
            sub={
              atLoading
                ? "Fetching…"
                : atResult
                  ? `${atResult.count} listings · ${gbp(atResult.low)}–${gbp(atResult.high)}`
                  : atError ?? "—"
            }
            loading={atLoading}
            unavailable={!atLoading && !atResult}
            link={atResult?.searchUrl ?? buildSearchUrl(
              scraped.lotTitle.split(" ")[1] ?? "",
              scraped.lotTitle.split(" ")[2] ?? "",
              parseInt(scraped.lotTitle.split(" ")[0] ?? "0", 10),
            )}
          />
        </div>
        {/* Manual override */}
        <label style={s.field}>
          <div style={s.manualArvHeader}>
            <span style={s.fieldLabel}>Manual ARV (£) — or type your own estimate</span>
            {arvSource !== "manual" && (
              <button style={s.useManualBtn} onClick={() => { setArvSource("manual"); setResult(null); }}>
                Use manual
              </button>
            )}
          </div>
          <input
            style={{ ...s.input, outline: arvSource === "manual" ? "2px solid #0b5fff" : undefined }}
            type="number"
            value={arvSource === "manual" ? manualArv : arv}
            onChange={(e) => { setManualArv(Number(e.target.value)); setArvSource("manual"); setResult(null); }}
          />
        </label>

        {/* Transport */}
        <div style={s.transportBox}>
          <div style={s.transportHeader}>
            <span style={s.fieldLabel}>Your postcode (transport estimate)</span>
            {transport && <span style={s.transportBadge}>~{transport.miles} mi</span>}
          </div>
          <input
            style={s.input}
            type="text"
            placeholder="e.g. LS1 1BA"
            value={userPostcode}
            onChange={(e) => setUserPostcode(e.target.value.toUpperCase())}
          />
          <div style={s.transportEstimate}>
            {transportLoading && <span style={{ color: "#656d76" }}>Calculating…</span>}
            {!transportLoading && transportError && <span style={{ color: "#9a6700" }}>{transportError}</span>}
            {!transportLoading && !transportError && transport && (
              <span style={{ color: "#1a7f37" }}>
                ~{transport.miles} miles → {gbp(transport.cost)}
                <span style={{ color: "#656d76" }}> (£1.50/mi × {transport.miles})</span>
              </span>
            )}
            {!transportLoading && !transportError && !transport && (
              <span style={{ color: "#656d76" }}>Using flat estimate: {gbp(FLAT_TRANSPORT)}</span>
            )}
          </div>
        </div>

        {/* Hammer */}
        <label style={s.field}>
          <span style={s.fieldLabel}>Hammer price (£)</span>
          <input
            style={s.input}
            type="number"
            value={hammerPrice}
            onChange={(e) => { setHammerPrice(Number(e.target.value)); setResult(null); }}
          />
        </label>

        {/* Damage */}
        <div style={s.damageHeader}>
          <span style={s.fieldLabel}>Damaged panels</span>
          <button style={s.addBtn} onClick={addDamage}>+ Add</button>
        </div>
        {damage.map((obs, i) => (
          <div key={i} style={s.damageRow}>
            <select style={s.select} value={obs.panel}
              onChange={(e) => updateDamage(i, { panel: e.target.value })}>
              {PANELS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select style={s.selectSmall} value={obs.damage_type}
              onChange={(e) => updateDamage(i, { damage_type: e.target.value as DamageType })}>
              {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button style={s.removeBtn} onClick={() => removeDamage(i)}>×</button>
          </div>
        ))}

        <button style={s.calcBtn} onClick={calculate} disabled={loading}>
          {loading ? "Calculating…" : "Calculate ROI"}
        </button>

        {error && <div style={s.error}>{error}</div>}

        {/* Result */}
        {result && (
          <div style={s.result}>
            <Row label="Hammer" value={gbp(result.hammer_price)} />
            <Row label="Copart fees" value={gbp(result.copart_fees)} />
            <Row label="Parts" value={gbp(result.total_parts)} />
            <Row
              label={transport ? `Transport (~${transport.miles} mi)` : "Transport (est.)"}
              value={gbp(result.transport)}
            />
            <Row label="Total cost" value={gbp(result.total_cost)} strong />
            <Row
              label={`ARV (${arvSource === "autotrader" ? "AutoTrader" : arvSource === "copart" ? "Copart" : "manual"})`}
              value={gbp(result.arv)}
            />
            <div style={{ ...s.profit, color: profitColor }}>
              <span>Profit</span>
              <span>{gbp(result.profit_estimate)} ({result.roi_percent}%)</span>
            </div>

            <div style={s.maxBidSection}>
              <span style={s.maxBidTitle}>Max bid to still make…</span>
              <div style={s.maxBidRow}>
                {([500, 1000] as const).map((target) => {
                  const max = maxBidFor(target);
                  return (
                    <button
                      key={target}
                      style={{ ...s.maxBidBtn, opacity: max === null ? 0.4 : 1, cursor: max === null ? "not-allowed" : "pointer" }}
                      disabled={max === null}
                      onClick={() => applyMaxBid(target)}
                      title={max === null ? "Not achievable at current ARV" : `Set hammer to ${gbp(max)}`}
                    >
                      <span style={s.maxBidLabel}>£{target >= 1000 ? "1k" : target} profit</span>
                      <span style={s.maxBidValue}>{max !== null ? `≤ ${gbp(max)}` : "N/A"}</span>
                    </button>
                  );
                })}
              </div>
              <span style={s.maxBidHint}>Click to set hammer price and recalculate</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ArvCard({
  label, selected, onClick, value, sub, loading, unavailable, link,
}: {
  label: string; selected: boolean; onClick: () => void;
  value: string | null; sub: string; loading?: boolean; unavailable?: boolean; link?: string;
}) {
  return (
    <div
      style={{
        ...s.arvCard,
        borderColor: selected ? "#0b5fff" : "#d0d7de",
        background: selected ? "#f0f5ff" : "#fff",
        opacity: unavailable && !loading ? 0.55 : 1,
        cursor: unavailable && !loading ? "not-allowed" : "pointer",
      }}
      onClick={onClick}
    >
      <div style={s.arvCardTop}>
        <span style={{ ...s.arvCardLabel, color: selected ? "#0b5fff" : "#656d76" }}>{label}</span>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            style={s.arvLink}
            onClick={(e) => e.stopPropagation()}
          >
            View ↗
          </a>
        )}
      </div>
      <div style={s.arvCardValue}>
        {loading ? <span style={{ color: "#656d76", fontSize: 12 }}>Fetching…</span>
          : value ? <strong>{value}</strong>
          : <span style={{ color: "#9198a1" }}>—</span>}
      </div>
      <div style={s.arvCardSub}>{sub}</div>
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
    position: "fixed", top: 16, right: 16, width: 360, maxHeight: "92vh",
    overflowY: "auto", background: "#fff", color: "#1f2328", borderRadius: 10,
    boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSize: 13, zIndex: 2147483647,
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px", background: "#0b5fff", color: "#fff",
    borderRadius: "10px 10px 0 0",
  },
  title: { fontWeight: 600 },
  close: { background: "transparent", border: "none", color: "#fff", fontSize: 20, lineHeight: 1, cursor: "pointer" },
  body: { padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  scrapeBox: {
    background: "#f6f8fa", borderRadius: 8, padding: "8px 10px",
    display: "flex", flexDirection: "column", gap: 3,
  },
  sectionLabel: { fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#656d76" },
  arvCards: { display: "flex", gap: 8 },
  arvCard: {
    flex: 1, border: "2px solid", borderRadius: 8, padding: "8px 10px",
    display: "flex", flexDirection: "column" as const, gap: 2, transition: "border-color 0.1s",
  },
  arvCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  arvCardLabel: { fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.04em" },
  arvCardValue: { fontSize: 16, fontWeight: 700, color: "#1f2328" },
  arvCardSub: { fontSize: 11, color: "#656d76" },
  arvLink: { fontSize: 11, color: "#0b5fff", textDecoration: "none" },
  manualArvHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  useManualBtn: {
    fontSize: 11, background: "transparent", border: "1px solid #d0d7de",
    borderRadius: 4, padding: "2px 6px", cursor: "pointer", color: "#656d76",
  },
  transportBox: {
    background: "#fff8e1", border: "1px solid #f0c040", borderRadius: 8,
    padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6,
  },
  transportHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  transportBadge: {
    background: "#1a7f37", color: "#fff", borderRadius: 10,
    padding: "1px 7px", fontSize: 11, fontWeight: 600,
  },
  transportEstimate: { fontSize: 12, minHeight: 16 },
  row: { display: "flex", justifyContent: "space-between", gap: 12 },
  rowLabel: { color: "#656d76" },
  rowValue: { textAlign: "right" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: { color: "#656d76", fontSize: 12 },
  input: { padding: "6px 8px", border: "1px solid #d0d7de", borderRadius: 6, fontSize: 13 },
  damageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  damageRow: { display: "flex", gap: 6, alignItems: "center" },
  select: { flex: 1, padding: "5px 6px", border: "1px solid #d0d7de", borderRadius: 6 },
  selectSmall: { width: 90, padding: "5px 6px", border: "1px solid #d0d7de", borderRadius: 6 },
  addBtn: { background: "#eaeef2", border: "1px solid #d0d7de", borderRadius: 6, padding: "3px 8px", cursor: "pointer" },
  removeBtn: { background: "transparent", border: "none", color: "#cf222e", fontSize: 18, cursor: "pointer" },
  calcBtn: {
    background: "#0b5fff", color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 12px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  error: {
    background: "#ffebe9", border: "1px solid #ffcecb", color: "#cf222e",
    borderRadius: 6, padding: "8px 10px", whiteSpace: "pre-wrap",
  },
  result: { borderTop: "1px solid #d0d7de", paddingTop: 10, display: "flex", flexDirection: "column", gap: 3 },
  profit: { display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, marginTop: 4 },
  maxBidSection: {
    marginTop: 10, paddingTop: 10, borderTop: "1px dashed #d0d7de",
    display: "flex", flexDirection: "column", gap: 6,
  },
  maxBidTitle: { fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "#656d76" },
  maxBidRow: { display: "flex", gap: 8 },
  maxBidBtn: {
    flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center",
    gap: 2, padding: "8px 6px", background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: 8,
  },
  maxBidLabel: { fontSize: 11, color: "#656d76" },
  maxBidValue: { fontSize: 14, fontWeight: 700, color: "#1a7f37" },
  maxBidHint: { fontSize: 11, color: "#9198a1", textAlign: "center" as const },
};
