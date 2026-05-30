import { createRoot, type Root } from "react-dom/client";
import { Overlay } from "../overlay/Overlay";

// The button and overlay live in a shadow root so Copart's CSS can't bleed in
// (and ours can't leak out).
const HOST_ID = "carnalysis-host";
const TRIGGER_ID = "carnalysis-trigger";

let root: Root | null = null;

function unmount(host: HTMLElement) {
  root?.unmount();
  root = null;
  host.remove();
}

function openOverlay() {
  if (document.getElementById(HOST_ID)) return; // already open
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const mount = document.createElement("div");
  shadow.appendChild(mount);
  root = createRoot(mount);
  root.render(<Overlay onClose={() => unmount(host)} />);
}

function injectTrigger() {
  if (document.getElementById(TRIGGER_ID)) return;
  const btn = document.createElement("button");
  btn.id = TRIGGER_ID;
  btn.textContent = "Calculate ROI";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "2147483646",
    background: "#0b5fff",
    color: "#fff",
    border: "none",
    borderRadius: "24px",
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    cursor: "pointer",
  } satisfies Partial<CSSStyleDeclaration>);
  btn.addEventListener("click", openOverlay);
  document.body.appendChild(btn);
}

// Copart is a single-page app — re-inject the trigger after client-side nav.
injectTrigger();
const observer = new MutationObserver(() => injectTrigger());
observer.observe(document.body, { childList: true, subtree: true });
