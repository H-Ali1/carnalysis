import { colors, formatGBP, type TransportQuote } from "@carnalysis/core";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface Props {
  postcode: string;
  onChangePostcode: (postcode: string) => void;
  quote: TransportQuote | null;
}

export function TransportField({ postcode, onChangePostcode, quote }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <Text style={styles.label}>Your postcode (for the transport quote)</Text>
        {quote?.kind === "distance" && <Text style={styles.badge}>~{quote.miles} mi</Text>}
      </View>
      <TextInput
        style={styles.input}
        value={postcode}
        onChangeText={(text) => onChangePostcode(text.toUpperCase())}
        placeholder="e.g. LS1 1BA"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <QuoteStatus quote={quote} />
    </View>
  );
}

function QuoteStatus({ quote }: { quote: TransportQuote | null }) {
  if (quote === null) return <Text style={styles.muted}>Calculating…</Text>;
  if (quote.kind === "distance") {
    return (
      <Text style={styles.good}>
        ~{quote.miles} miles → {formatGBP(quote.cost)}
      </Text>
    );
  }
  return (
    <Text style={quote.severity === "warning" ? styles.warning : styles.muted}>
      {quote.reason} Using the flat-rate estimate.
    </Text>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.highlightSurface,
    borderWidth: 1,
    borderColor: colors.highlightBorder,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.muted, fontSize: 12 },
  badge: {
    backgroundColor: colors.success,
    color: colors.background,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  muted: { color: colors.muted, fontSize: 12 },
  warning: { color: colors.warning, fontSize: 12 },
  good: { color: colors.success, fontSize: 12 },
});
