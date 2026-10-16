import {
  type AnalyzeResponse,
  colors,
  formatGBP,
  formatGBPShort,
  maxBidForProfit,
  PROFIT_TARGETS_GBP,
  panelLabel,
} from "@carnalysis/core";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Row } from "./Row";

interface Props {
  result: AnalyzeResponse;
  /** Road miles behind the transport figure, or null if the flat rate was used. */
  transportMiles: number | null;
  /** The Copart lot page, for the bid handoff; null in manual mode. */
  lotUrl: string | null;
  onApplyMaxBid: (bid: number) => void;
}

export function ResultCard({ result, transportMiles, lotUrl, onApplyMaxBid }: Props) {
  const { vehicle } = result;
  const profitStyle = result.profit_estimate >= 0 ? styles.profitGood : styles.profitBad;

  function openOnCopart() {
    if (!lotUrl) return;
    // Opens in the Copart app if it handles copart.co.uk links, otherwise the browser.
    Linking.openURL(lotUrl).catch(() =>
      Alert.alert("Could not open Copart", "No app or browser could open the lot page."),
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.vehicle}>
        Parts priced for a {vehicle.year} {vehicle.make} {vehicle.model}
      </Text>
      <Row label="Hammer" value={formatGBP(result.hammer_price)} />
      <Row
        label={`Copart fees (${Math.round(result.copart_fee_rate * 100)}%)`}
        value={formatGBP(result.copart_fees)}
      />
      <Row label="Parts" value={formatGBP(result.total_parts)} />
      {result.observations.map((obs) => (
        <Row
          key={obs.panel}
          label={`· ${panelLabel(obs.panel)} (${obs.damage_type})`}
          value={
            !obs.part_required
              ? "repair only"
              : obs.parts_cost === null
                ? "no price found"
                : formatGBP(obs.parts_cost)
          }
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
      <View style={styles.profitRow}>
        <Text style={[styles.profit, profitStyle]}>Profit</Text>
        <Text style={[styles.profit, profitStyle]}>
          {formatGBP(result.profit_estimate)} ({result.roi_percent}%)
        </Text>
      </View>
      {result.warnings.map((warning) => (
        <Text key={warning} style={styles.warning}>
          {warning}
        </Text>
      ))}

      <View style={styles.maxBid}>
        <Text style={styles.maxBidTitle}>Max bid to still make…</Text>
        <View style={styles.maxBidRow}>
          {PROFIT_TARGETS_GBP.map((target) => {
            const bid = maxBidForProfit(result, target);
            return (
              <Pressable
                key={target}
                style={[styles.maxBidButton, bid === null && styles.disabled]}
                disabled={bid === null}
                onPress={() => bid !== null && onApplyMaxBid(bid)}
              >
                <Text style={styles.maxBidLabel}>{formatGBPShort(target)} profit</Text>
                <Text style={styles.maxBidValue}>
                  {bid === null ? "N/A" : `≤ ${formatGBP(bid)}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>Tap to set the hammer price, then recalculate</Text>
      </View>

      {lotUrl && (
        <Pressable style={styles.bidButton} onPress={openOnCopart}>
          <Text style={styles.bidText}>Place bid on Copart →</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 4 },
  vehicle: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  profitRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  profit: { fontWeight: "700", fontSize: 16 },
  profitGood: { color: colors.success },
  profitBad: { color: colors.danger },
  warning: { color: colors.warning, fontSize: 12, marginTop: 4 },
  maxBid: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  maxBidTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: colors.muted,
  },
  maxBidRow: { flexDirection: "row", gap: 10 },
  maxBidButton: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  disabled: { opacity: 0.45 },
  maxBidLabel: { fontSize: 11, color: colors.muted },
  maxBidValue: { fontSize: 15, fontWeight: "700", color: colors.success },
  hint: { fontSize: 11, color: colors.subtle, textAlign: "center" },
  bidButton: {
    marginTop: 12,
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  bidText: { color: colors.background, fontSize: 15, fontWeight: "700" },
});
