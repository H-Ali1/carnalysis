// Scraping layer: reads raw values out of the Copart lot DOM.
//
// IMPORTANT: Copart's details panel is rendered with build-hashed, obfuscated CSS
// class names that change between deploys, so selecting by class is brittle. We
// instead locate each value by its human-readable LABEL text (e.g. "Odometer"),
// which is stable across deploys. Every getter has fallbacks so one DOM change
// doesn't break the whole extraction.
//
// TODO: the label strings and image-host patterns below are best-effort and should
// be confirmed against a live Copart UK lot page (right-click a field -> Inspect).

import type { LotData } from "../types";
import { normalize, parseLotNumber, parseMoney, parseOdometer } from "./parse";

/**
 * Find the value paired with a label in a label/value layout.
 *
 * Strategy, in order:
 *   (a) find a leaf element whose text equals the label, return its next sibling's text
 *   (b) ...or the last child of the label's parent row
 *   (c) fallback: a single element containing "Label: value"
 */
function getFieldByLabel(labels: string[]): string | null {
  const wanted = labels.map((l) => l.toLowerCase().replace(/[:\s]+$/, ""));
  const elements = Array.from(document.querySelectorAll<HTMLElement>("body *"));

  for (const el of elements) {
    if (el.children.length > 1) continue; // skip large containers
    const text = normalize(el.textContent).toLowerCase().replace(/[:\s]+$/, "");
    if (!wanted.includes(text)) continue;

    const sibling = el.nextElementSibling as HTMLElement | null;
    if (sibling && normalize(sibling.textContent)) {
      return normalize(sibling.textContent);
    }
    const parent = el.parentElement;
    const last = parent?.lastElementChild as HTMLElement | null;
    if (last && last !== el && normalize(last.textContent)) {
      return normalize(last.textContent);
    }
  }

  for (const el of elements) {
    if (el.children.length > 0) continue;
    const text = normalize(el.textContent);
    for (const label of labels) {
      const match = text.match(new RegExp(`^${label}\\s*[:\\-]\\s*(.+)$`, "i"));
      if (match) return normalize(match[1]);
    }
  }
  return null;
}

function getTitle(): string {
  return normalize(document.querySelector("h1")?.textContent) || "";
}

function getLotNumber(): string | null {
  const labelled = getFieldByLabel(["Lot number", "Lot #", "Lot"]);
  if (labelled) return parseLotNumber(`lot ${labelled}`) ?? labelled;
  return parseLotNumber(normalize(document.body.textContent).slice(0, 4000));
}

function getImages(): string[] {
  const urls = new Set<string>();
  document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    const src = img.currentSrc || img.src;
    if (!src) return;
    // Lot photos are served from Copart's image CDN; filter out UI icons/sprites.
    if (/(copart|vehicle|azureedge|cloudfront)/i.test(src) && /\.(jpe?g|png|webp)/i.test(src)) {
      // Many Copart thumbnail URLs encode a size token; nudge toward the full-res one.
      urls.add(src.replace(/_thb|thumb/gi, "_ful"));
    }
  });
  return Array.from(urls).slice(0, 14);
}

function getYardName(): string | null {
  // "Sale name: YORK" and "Location: YORK" both appear on lot pages.
  const raw =
    getFieldByLabel(["Sale name", "Location"]) ??
    // Fallback: scan for the bold blue yard link text Copart renders near the top.
    normalize(document.querySelector<HTMLElement>("[data-uname='lotDetailsLocation']")?.textContent);
  return raw ? raw.toUpperCase().trim() || null : null;
}

export function extractLotData(): LotData {
  const arvRaw = getFieldByLabel([
    "Estimated retail value",
    "Est. retail value",
    "Estimated Retail Value",
    "Retail value",
  ]);
  const bidRaw = getFieldByLabel([
    "Current bid",
    "Buy It Now",
    "Sale price",
  ]);

  return {
    lotTitle: getTitle(),
    lotNumber: getLotNumber(),
    hammerPrice: parseMoney(bidRaw),
    arv: parseMoney(arvRaw),
    primaryDamage: getFieldByLabel(["Primary damage"]),
    secondaryDamage: getFieldByLabel(["Secondary damage"]),
    odometer: parseOdometer(getFieldByLabel(["Odometer"])),
    colour: getFieldByLabel(["Colour", "Color"]),
    fuel: getFieldByLabel(["Fuel", "Fuel type"]),
    bodyStyle: getFieldByLabel(["Body style"]),
    yardName: getYardName(),
    images: getImages(),
  };
}
