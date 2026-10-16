// Copart UK in an embedded WebView. On a lot page, "Analyse ROI" injects the shared
// extraction script and opens the analysis sheet with whatever it read; elsewhere the
// button opens the sheet for manual entry.

import { colors, type LotData, type WebViewMessage } from "@carnalysis/core";
import { EXTRACT_LOT_DATA_SCRIPT } from "@carnalysis/core/webview";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { AnalysisSheet } from "./AnalysisSheet";

const COPART_HOME = "https://www.copart.co.uk/";
const LOT_PAGE_URL = /\/lot\/\d+/i;
const EXTRACTION_TIMEOUT_MS = 6000;

interface SheetState {
  /** Changes for every new analysis, remounting the sheet with fresh state. */
  key: number;
  visible: boolean;
  lot: LotData | null;
  lotUrl: string | null;
}

export function BrowserScreen() {
  const webView = useRef<WebView>(null);
  const extractionTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [page, setPage] = useState({ url: COPART_HOME, canGoBack: false });
  const [extracting, setExtracting] = useState(false);
  const [sheet, setSheet] = useState<SheetState>({
    key: 0,
    visible: false,
    lot: null,
    lotUrl: null,
  });

  const onLotPage = LOT_PAGE_URL.test(page.url);

  // Android's back button navigates the WebView before leaving the app.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!page.canGoBack) return false;
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [page.canGoBack]);

  useEffect(() => () => clearTimeout(extractionTimeout.current), []);

  function openSheet(lot: LotData | null, lotUrl: string | null) {
    setSheet((current) => ({ key: current.key + 1, visible: true, lot, lotUrl }));
  }

  function stopExtracting() {
    clearTimeout(extractionTimeout.current);
    setExtracting(false);
  }

  function handleMessage(event: WebViewMessageEvent) {
    const message = parseMessage(event.nativeEvent.data);
    if (!message) return;
    stopExtracting();
    if (message.type === "LOT_DATA") {
      openSheet(message.data, page.url);
    } else {
      Alert.alert(
        "Couldn't read this lot",
        `${message.message}\n\nUse "Manual ROI" from any other page to enter the details yourself.`,
      );
    }
  }

  function analyse() {
    if (!onLotPage) {
      openSheet(null, null);
      return;
    }
    setExtracting(true);
    webView.current?.injectJavaScript(EXTRACT_LOT_DATA_SCRIPT);
    extractionTimeout.current = setTimeout(() => {
      setExtracting(false);
      Alert.alert("Extraction timed out", "The page may still be loading. Try again in a moment.");
    }, EXTRACTION_TIMEOUT_MS);
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <WebView
        ref={webView}
        source={{ uri: COPART_HOME }}
        onNavigationStateChange={({ url, canGoBack }) => setPage({ url, canGoBack })}
        onMessage={handleMessage}
        allowsBackForwardNavigationGestures
        style={styles.web}
      />

      {page.canGoBack && (
        <Pressable
          style={styles.back}
          onPress={() => webView.current?.goBack()}
          accessibilityLabel="Back"
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.fab, !onLotPage && styles.fabManual]}
        onPress={analyse}
        disabled={extracting}
      >
        {extracting ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.fabText}>{onLotPage ? "Analyse ROI" : "Manual ROI"}</Text>
        )}
      </Pressable>

      <AnalysisSheet
        key={sheet.key}
        visible={sheet.visible}
        lot={sheet.lot}
        lotUrl={sheet.lotUrl}
        onClose={() => setSheet((current) => ({ ...current, visible: false }))}
      />
    </SafeAreaView>
  );
}

/** Accepts only messages posted by our injected script; the page could post others. */
function parseMessage(raw: string): WebViewMessage | null {
  try {
    const message = JSON.parse(raw) as Partial<WebViewMessage>;
    return message.type === "LOT_DATA" || message.type === "ERROR"
      ? (message as WebViewMessage)
      : null;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  web: { flex: 1 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 28,
    minWidth: 130,
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 13,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  fabManual: { backgroundColor: colors.muted },
  fabText: { color: colors.background, fontWeight: "700", fontSize: 14 },
  back: {
    position: "absolute",
    left: 16,
    bottom: 28,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(31,35,40,0.75)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  backText: { color: colors.background, fontSize: 26, lineHeight: 28, marginTop: -2 },
});
