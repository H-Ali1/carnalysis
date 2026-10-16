import { colors } from "@carnalysis/core";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  title: string;
  options: readonly Option<T>[];
  onSelect: (value: T) => void;
  onDismiss: () => void;
}

/**
 * A full-screen list picker drawn as an overlay rather than a nested Modal, which iOS
 * handles poorly when another Modal is already presented. Render it last in its parent.
 */
export function OptionPicker<T extends string>({ title, options, onSelect, onDismiss }: Props<T>) {
  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Close picker" />
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <ScrollView style={styles.list}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              style={styles.option}
              onPress={() => onSelect(option.value)}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const fill = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } as const;

const styles = StyleSheet.create({
  overlay: { ...fill, alignItems: "center", justifyContent: "center" },
  backdrop: { ...fill, backgroundColor: "rgba(0,0,0,0.35)" },
  card: {
    width: "80%",
    maxHeight: "70%",
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 8,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  list: { flexGrow: 0 },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surfaceStrong,
  },
  optionText: { fontSize: 14, color: colors.text },
});
