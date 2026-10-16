// The ROI analysis form, presented as a full-screen sheet over the browser. Mirrors the
// Chrome extension's overlay; the lot title is editable here because manual entry is
// also the fallback when a page can't be read.

import {
  type AnalyzeResponse,
  ApiError,
  analyzeLot,
  colors,
  DAMAGE_TYPES,
  type LotData,
  PANELS,
} from "@carnalysis/core";
import { type ReactNode, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type DamageField, DamageList, type DamageRow } from "../components/DamageList";
import { OptionPicker } from "../components/OptionPicker";
import { ResultCard } from "../components/ResultCard";
import { Row } from "../components/Row";
import { TransportField } from "../components/TransportField";
import { BACKEND_URL } from "../config";
import { useTransportQuote } from "../hooks/useTransportQuote";

const DAMAGE_OPTIONS = DAMAGE_TYPES.map((type) => ({ value: type, label: type }));

interface Analysis {
  result: AnalyzeResponse;
  transportMiles: number | null;
}

interface Props {
  visible: boolean;
  /** Data read from the lot page, or null for manual entry. */
  lot: LotData | null;
  lotUrl: string | null;
  onClose: () => void;
}

export function AnalysisSheet({ visible, lot, lotUrl, onClose }: Props) {
  const [title, setTitle] = useState(lot?.lotTitle ?? "");
  const [hammerPrice, setHammerPrice] = useState(lot?.hammerPrice?.toString() ?? "");
  const [arv, setArv] = useState(lot?.arv?.toString() ?? "");
  const [damage, setDamage] = useState<DamageRow[]>([]);
  const nextRowId = useRef(0);
  const [picker, setPicker] = useState<{ rowId: number; field: DamageField } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const transport = useTransportQuote(lot?.yardName ?? null);

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
  const removeDamage = (id: number) => edit(setDamage)(damage.filter((row) => row.id !== id));

  function pick(value: string) {
    if (!picker) return;
    const { rowId, field } = picker;
    edit(setDamage)(damage.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
    setPicker(null);
  }

  async function calculate() {
    setError(null);
    setAnalysis(null);
    if (!title.trim()) {
      setError('Enter the lot title, e.g. "2017 VOLKSWAGEN POLO 1.0 75 MATCH".');
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
        lot_title: title.trim(),
        damage_observations: damage.map(({ panel, damage_type }) => ({ panel, damage_type })),
        hammer_price: Number.parseFloat(hammerPrice) || 0,
        arv: Number.parseFloat(arv) || 0,
        transport: quote?.kind === "distance" ? quote.cost : undefined,
      });
      setAnalysis({ result, transportMiles: quote?.kind === "distance" ? quote.miles : null });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const unreachable = e instanceof ApiError && e.status === undefined;
      setError(
        unreachable
          ? `${message}\n\nIs the backend running with --host 0.0.0.0, and is this phone on the same network?`
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Carnalysis — ROI</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Text style={styles.headerClose}>×</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {lot && (
              <View style={styles.summary}>
                <Row label="Lot" value={lot.lotNumber ?? "—"} />
                <Row label="Yard" value={lot.yardName ?? "—"} />
                <Row label="Odometer" value={lot.odometer?.toLocaleString() ?? "—"} />
                <Row label="Colour" value={lot.colour ?? "—"} />
                <Row
                  label="Copart damage"
                  value={
                    [lot.primaryDamage, lot.secondaryDamage].filter(Boolean).join(" / ") || "—"
                  }
                />
              </View>
            )}

            <Field label={`Vehicle (lot title)${lot ? " — from Copart, edit if wrong" : ""}`}>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={edit(setTitle)}
                placeholder="2017 VOLKSWAGEN POLO 1.0 75 MATCH"
                autoCapitalize="characters"
              />
            </Field>
            <Field label="Hammer price (£)">
              <TextInput
                style={styles.input}
                value={hammerPrice}
                onChangeText={edit(setHammerPrice)}
                keyboardType="numeric"
                placeholder="0"
              />
            </Field>
            <Field
              label={`After-repair value (£)${
                lot?.arv == null
                  ? " — not found on the page, enter it"
                  : " — from Copart, edit if needed"
              }`}
            >
              <TextInput
                style={styles.input}
                value={arv}
                onChangeText={edit(setArv)}
                keyboardType="numeric"
                placeholder="0"
              />
            </Field>

            <TransportField
              postcode={transport.postcode}
              onChangePostcode={edit(transport.setPostcode)}
              quote={transport.quote}
            />

            <DamageList
              rows={damage}
              onAdd={addDamage}
              onRemove={removeDamage}
              onEdit={(rowId, field) => setPicker({ rowId, field })}
            />

            <Pressable
              style={[styles.calculate, loading && styles.disabled]}
              onPress={calculate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.calculateText}>Calculate ROI</Text>
              )}
            </Pressable>

            {error && <Text style={styles.error}>{error}</Text>}

            {analysis && (
              <ResultCard
                result={analysis.result}
                transportMiles={analysis.transportMiles}
                lotUrl={lotUrl}
                onApplyMaxBid={(bid) => edit(setHammerPrice)(String(bid))}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {picker && (
          <OptionPicker
            title={picker.field === "panel" ? "Panel" : "Damage type"}
            options={picker.field === "panel" ? PANELS : DAMAGE_OPTIONS}
            onSelect={pick}
            onDismiss={() => setPicker(null)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  headerTitle: { color: colors.background, fontWeight: "600", fontSize: 16 },
  headerClose: { color: colors.background, fontSize: 26, lineHeight: 26 },
  body: { padding: 16, gap: 12 },
  summary: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, gap: 4 },
  field: { gap: 4 },
  fieldLabel: { color: colors.muted, fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  calculate: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  calculateText: { color: colors.background, fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.45 },
  error: {
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    color: colors.danger,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
});
