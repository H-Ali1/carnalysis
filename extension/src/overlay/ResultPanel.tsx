import {
  type AnalyzeResponse,
  colors,
  formatGBP,
  formatGBPShort,
  maxBidForProfit,
  PROFIT_TARGETS_GBP,
  panelLabel,
} from "@carnalysis/core";
import { styles } from "./styles";

interface Props {
  result: AnalyzeResponse;
  /** Road miles behind the transport figure, or null if the flat rate was used. */
  transportMiles: number | null;
  onApplyMaxBid: (bid: number) => void;
}

export function ResultPanel({ result, transportMiles, onApplyMaxBid }: Props) {
  const { vehicle } = result;
  const profitColor = result.profit_estimate >= 0 ? colors.success : colors.danger;

  return (
    <div style={styles.result}>
      <p style={styles.vehicleLine}>
        Parts priced for a {vehicle.year} {vehicle.make} {vehicle.model}
      </p>
      <Row label="Hammer" value={formatGBP(result.hammer_price)} />
      <Row
        label={`Copart fees (${Math.round(result.copart_fee_rate * 100)}%)`}
        value={formatGBP(result.copart_fees)}
      />
      <Row label="Parts" value={formatGBP(result.total_parts)} />
      {result.observations
        .filter((obs) => obs.part_required)
        .map((obs) => (
          <Row
            key={obs.panel}
            label={`· ${panelLabel(obs.panel)}`}
            value={obs.parts_cost === null ? "no price found" : formatGBP(obs.parts_cost)}
            muted
          />
        ))}
      <Row
        label={
          transportMiles === null ? "Transport (flat rate)" : `Transport (~${transportMiles} mi)`
        }
        value={formatGBP(result.transport)}
      />
      <Row label="Total cost" value={formatGBP(result.total_cost)} strong />
      <Row label="ARV (Copart)" value={formatGBP(result.arv)} />
      <div style={{ ...styles.profit, color: profitColor }}>
        <span>Profit</span>
        <span>
          {formatGBP(result.profit_estimate)} ({result.roi_percent}%)
        </span>
      </div>
      {result.warnings.map((warning) => (
        <p key={warning} style={styles.warning}>
          {warning}
        </p>
      ))}

      <div style={styles.maxBidSection}>
        <span style={styles.maxBidTitle}>Max bid to still make…</span>
        <div style={styles.maxBidRow}>
          {PROFIT_TARGETS_GBP.map((target) => {
            const bid = maxBidForProfit(result, target);
            return (
              <button
                key={target}
                type="button"
                style={{ ...styles.maxBidButton, opacity: bid === null ? 0.4 : 1 }}
                disabled={bid === null}
                onClick={() => bid !== null && onApplyMaxBid(bid)}
                title={
                  bid === null ? "Not achievable at this ARV" : `Set hammer to ${formatGBP(bid)}`
                }
              >
                <span style={styles.maxBidLabel}>{formatGBPShort(target)} profit</span>
                <span style={styles.maxBidValue}>
                  {bid === null ? "N/A" : `≤ ${formatGBP(bid)}`}
                </span>
              </button>
            );
          })}
        </div>
        <span style={styles.hint}>Click to set the hammer price, then recalculate</span>
      </div>
    </div>
  );
}

export function Row({
  label,
  value,
  strong = false,
  muted = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div style={{ ...styles.row, fontWeight: strong ? 600 : 400 }}>
      <span style={muted ? styles.rowMuted : styles.rowLabel}>{label}</span>
      <span style={{ ...styles.rowValue, ...(muted ? styles.rowMuted : {}) }}>{value}</span>
    </div>
  );
}
