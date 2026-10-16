// Content script: shows a "Calculate ROI" button on Copart lot pages and mounts the overlay.
//
// Copart is a single-page app, so this runs on every copart.co.uk page and follows
// client-side navigation: the button appears on lot pages only, and an open overlay
// closes when the user moves to a different page.

import { colors } from "@carnalysis/core";
import { createRoot, type Root } from "react-dom/client";
import { Overlay } from "../overlay/Overlay";

const HOST_ID = "carnalysis-host";
const TRIGGER_ID = "carnalysis-trigger";
const LOT_PAGE_PATH = /^\/lot\/\d+/;

let overlay: Root | null = null;
let currentPath = location.pathname;

function openOverlay() {
  if (document.getElementById(HOST_ID)) return;
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);
  // A shadow root keeps Copart's CSS out of the overlay (and ours out of the page).
  const mountPoint = document.createElement("div");
  host.attachShadow({ mode: "open" }).appendChild(mountPoint);
  overlay = createRoot(mountPoint);
  overlay.render(<Overlay onClose={closeOverlay} />);
}

function closeOverlay() {
  overlay?.unmount();
  overlay = null;
  document.getElementById(HOST_ID)?.remove();
}

function createTrigger(): HTMLButtonElement {
  const button = document.createElement("button");
  button.id = TRIGGER_ID;
  button.type = "button";
  button.textContent = "Calculate ROI";
  Object.assign(button.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "2147483646",
    background: colors.primary,
    color: colors.background,
    border: "none",
    borderRadius: "24px",
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    cursor: "pointer",
  } satisfies Partial<CSSStyleDeclaration>);
  button.addEventListener("click", openOverlay);
  return button;
}

function syncWithPage() {
  if (location.pathname !== currentPath) {
    currentPath = location.pathname;
    closeOverlay();
  }
  const trigger = document.getElementById(TRIGGER_ID);
  const onLotPage = LOT_PAGE_PATH.test(location.pathname);
  if (onLotPage && !trigger) document.body.appendChild(createTrigger());
  if (!onLotPage) trigger?.remove();
}

syncWithPage();
new MutationObserver(syncWithPage).observe(document.body, { childList: true, subtree: true });
