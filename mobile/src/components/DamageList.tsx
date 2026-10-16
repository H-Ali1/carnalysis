import { colors, type DamageObservation, panelLabel } from "@carnalysis/core";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type DamageRow = DamageObservation & { id: number };
export type DamageField = "panel" | "damage_type";

interface Props {
  rows: readonly DamageRow[];
  onAdd: () => void;
  onRemove: (id: number) => void;
  /** Opens a picker for one field of one row; the parent renders the picker. */
  onEdit: (id: number, field: DamageField) => void;
}

export function DamageList({ rows, onAdd, onRemove, onEdit }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Damaged panels</Text>
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Text style={styles.addText}>+ Add</Text>
        </Pressable>
      </View>

      {rows.length === 0 && (
        <Text style={styles.hint}>
          Add each damaged panel; part prices come from live eBay UK listings.
        </Text>
      )}

      {rows.map((row) => (
        <View key={row.id} style={styles.row}>
          <Pressable style={[styles.select, styles.panel]} onPress={() => onEdit(row.id, "panel")}>
            <Text style={styles.selectText} numberOfLines={1}>
              {panelLabel(row.panel)}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.select, styles.damageType]}
            onPress={() => onEdit(row.id, "damage_type")}
          >
            <Text style={styles.selectText}>{row.damage_type}</Text>
          </Pressable>
          <Pressable onPress={() => onRemove(row.id)} hitSlop={8} accessibilityLabel="Remove panel">
            <Text style={styles.remove}>×</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.muted, fontSize: 12 },
  hint: { color: colors.muted, fontSize: 12 },
  addButton: {
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addText: { fontSize: 13, color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  select: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  panel: { flex: 1 },
  damageType: { width: 92 },
  selectText: { fontSize: 13, color: colors.text },
  remove: { color: colors.danger, fontSize: 22, paddingHorizontal: 4 },
});
