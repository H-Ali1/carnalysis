import {
  type AnalyzeResponse,
  analyzeLot,
  colors,
  DAMAGE_TYPES,
  type DamageObservation,
  type DamageType,
  formatGBP,
  PANELS,
  type Panel,
  type TransportQuote,
} from "@carnalysis/core";
import { extractLotData } from "@carnalysis/core/extract";
import { useMemo, useRef, useState } from "react";
import { BACKEND_URL } from "../config";
import { ResultPanel, Row } from "./ResultPanel";
import { styles } from "./styles";
import { useTransportQuote } from "./useTransportQuote";

interface Analysis {
  result: AnalyzeResponse;
  transportMiles: number | null;
}

type DamageRow = DamageObservation & { id: number };

export function Overlay({ onClose }: { onClose: () => void }) {
  const lot = useMemo(() => extractLotData(), []);
  const [hammerPrice, setHammerPrice] = useState(lot.hammerPrice?.toString() ?? "");
  const [arv, setArv] = useState(lot.arv?.toString() ?? "");
  const [damage, setDamage] = useState<DamageRow[]>([]);
  const nextRowId = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const transport = useTransportQuote(lot.yardName);

  // Any input change makes the current result stale.
  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setAnalysis(null);
    };
  }
  const addDamage = () =>
    edit(setDamage)([
      ...damage,
      { id: nextRowId.current++, panel: "front_bumper", damage_type: "dent" },
    ]);
  const updateDamage = (id: number, patch: Partial<DamageObservation>) =>
    edit(setDamage)(damage.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const removeDamage = (id: number) => edit(setDamage)(damage.filter((row) => row.id !== id));

  async function calculate() {
    setError(null);
    setAnalysis(null);
    if (!lot.lotTitle) {
      setError("Could not read the lot title. Is this a Copart lot page?");
      return;
    }
    if (damage.length === 0) {
      setError("Add at least one damaged panel.");
      return;
    }

    const quote = transport.quote;
    setLoading(true);
    try {
      const result = await analyzeLot(BACKEND_URL, {
        lot_title: lot.lotTitle,
        damage_observations: damage.map(({ panel, damage_type }) => ({ panel, damage_type })),
        hammer_price: Number.parseFloat(hammerPrice) || 0,
        arv: Number.parseFloat(arv) || 0,
        transport: quote?.kind === "distance" ? quote.cost : undefined,
      });
      setAnalysis({ result, transportMiles: quote?.kind === "distance" ? quote.miles : null });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Carnalysis — ROI</span>
        <button type="button" style={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div style={styles.body}>
        <div style={styles.summary}>
          <Row label="Vehicle" value={lot.lotTitle || "—"} />
          <Row label="Lot" value={lot.lotNumber ?? "—"} />
          <Row label="Yard" value={lot.yardName ?? "—"} />
          <Row label="Odometer" value={lot.odometer?.toLocaleString() ?? "—"} />
          <Row label="Colour" value={lot.colour ?? "—"} />
          <Row
            label="Copart damage"
            value={[lot.primaryDamage, lot.secondaryDamage].filter(Boolean).join(" / ") || "—"}
          />
        </div>

        <label style={styles.field}>
          <span style={styles.fieldLabel}>Hammer price (£)</span>
          <input
            style={styles.input}
            type="number"
            min={0}
            value={hammerPrice}
            onChange={(e) => edit(setHammerPrice)(e.target.value)}
          />
        </label>

        <label style={styles.field}>
          <span style={styles.fieldLabel}>
            After-repair value (£){" "}
            {lot.arv === null
              ? "— not found on the page, enter it"
              : "— from Copart, edit if needed"}
          </span>
          <input
            style={styles.input}
            type="number"
            min={0}
            value={arv}
            onChange={(e) => edit(setArv)(e.target.value)}
          />
        </label>

        <div style={styles.transportBox}>
          <span style={styles.fieldLabel}>Your postcode (for the transport quote)</span>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. LS1 1BA"
            value={transport.postcode}
            onChange={(e) => edit(transport.setPostcode)(e.target.value.toUpperCase())}
          />
          <div style={styles.transportStatus}>
            <TransportStatus quote={transport.quote} />
          </div>
        </div>

        <div style={styles.sectionHeader}>
          <span style={styles.fieldLabel}>Damaged panels</span>
          <button type="button" style={styles.addButton} onClick={addDamage}>
            + Add
          </button>
        </div>
        {damage.map((row) => (
          <div key={row.id} style={styles.damageRow}>
            <select
              style={styles.select}
              value={row.panel}
              onChange={(e) => updateDamage(row.id, { panel: e.target.value as Panel })}
            >
              {PANELS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              style={styles.selectNarrow}
              value={row.damage_type}
              onChange={(e) => updateDamage(row.id, { damage_type: e.target.value as DamageType })}
            >
              {DAMAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={styles.removeButton}
              aria-label="Remove panel"
              onClick={() => removeDamage(row.id)}
            >
              ×
            </button>
          </div>
        ))}

        <button type="button" style={styles.primaryButton} onClick={calculate} disabled={loading}>
          {loading ? "Calculating…" : "Calculate ROI"}
        </button>

        {error && <div style={styles.error}>{error}</div>}

        {analysis && (
          <ResultPanel
            result={analysis.result}
            transportMiles={analysis.transportMiles}
            onApplyMaxBid={(bid) => edit(setHammerPrice)(String(bid))}
          />
        )}
      </div>
    </div>
  );
}

function TransportStatus({ quote }: { quote: TransportQuote | null }) {
  if (quote === null) return <span style={{ color: colors.muted }}>Calculating…</span>;
  if (quote.kind === "distance") {
    return (
      <span style={{ color: colors.success }}>
        ~{quote.miles} miles → {formatGBP(quote.cost)}
      </span>
    );
  }
  const color = quote.severity === "warning" ? colors.warning : colors.muted;
  return <span style={{ color }}>{quote.reason} Using the flat-rate estimate.</span>;
}
