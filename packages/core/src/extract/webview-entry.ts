// Entry point for the script the mobile app injects into its WebView. Bundled into a
// self-contained string by scripts/build-webview-script.mjs; not imported directly.

import type { WebViewMessage } from "../types";
import { extractLotData } from "./extract";

interface ReactNativeWebViewWindow extends Window {
  ReactNativeWebView?: { postMessage(message: string): void };
}

function post(message: WebViewMessage): void {
  (window as ReactNativeWebViewWindow).ReactNativeWebView?.postMessage(JSON.stringify(message));
}

try {
  post({ type: "LOT_DATA", data: extractLotData(document) });
} catch (error) {
  post({ type: "ERROR", message: error instanceof Error ? error.message : String(error) });
}
