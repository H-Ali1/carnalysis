import { colors } from "@carnalysis/core";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}

/** A label on the left, its value right-aligned. */
export function Row({ label, value, strong = false, muted = false }: Props) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, muted && styles.muted]}>{label}</Text>
      <Text style={[styles.value, strong && styles.strong, muted && styles.muted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  label: { color: colors.muted, fontSize: 13, flexShrink: 1 },
  value: { color: colors.text, fontSize: 13, textAlign: "right", flexShrink: 1 },
  strong: { fontWeight: "600" },
  muted: { color: colors.subtle, fontSize: 12 },
});
