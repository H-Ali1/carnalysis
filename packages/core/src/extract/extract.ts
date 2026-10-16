// Reads a Copart lot page's DOM into LotData.
//
// Copart renders its details panel with build-hashed CSS class names that change between
// deploys, so selecting by class is brittle. Each field is instead found by its
// human-readable label ("Odometer", "Primary damage"), which stays stable.
//
// This module runs in two places: directly in the Chrome extension's content script,
// and — bundled by scripts/build-webview-script.mjs — inside the mobile app's WebView.
// If a field comes back empty, confirm its label against a live lot page.

import { normalize, parseLotNumber, parseMoney, parseOdometer } from "../parse";
import type { LotData } from "../types";

const LABELS = {
  lotNumber: ["Lot number", "Lot #", "Lot"],
  currentBid: ["Current bid", "Buy It Now", "Sale price"],
  retailValue: ["Estimated retail value", "Est. retail value", "Retail value"],
  primaryDamage: ["Primary damage"],
  secondaryDamage: ["Secondary damage"],
  odometer: ["Odometer"],
  colour: ["Colour", "Color"],
  fuel: ["Fuel", "Fuel type"],
  bodyStyle: ["Body style"],
  yard: ["Sale name", "Location"],
} as const;

const MAX_IMAGES = 14;
// Labels are short. Skipping long text (generous, to allow for markup whitespace) keeps
// large wrapper elements out of the index.
const MAX_LABEL_TEXT_LENGTH = 200;
// Lot photos come from Copart's image CDNs; anything else is UI chrome.
const LOT_IMAGE_HOST = /(copart|vehicle|azureedge|cloudfront)/i;
const IMAGE_EXTENSION = /\.(jpe?g|png|webp)/i;
// Copart encodes the image size in the file name; ask for the full-size variant.
const THUMBNAIL_TOKEN = /_thb|thumb/gi;

export function extractLotData(doc: Document = document): LotData {
  const fields = new LabelledFields(doc);
  const yard =
    fields.get(LABELS.yard) ??
    normalize(doc.querySelector("[data-uname='lotDetailsLocation']")?.textContent);

  return {
    lotTitle: normalize(doc.querySelector("h1")?.textContent),
    lotNumber: findLotNumber(doc, fields),
    hammerPrice: parseMoney(fields.get(LABELS.currentBid)),
    arv: parseMoney(fields.get(LABELS.retailValue)),
    primaryDamage: fields.get(LABELS.primaryDamage),
    secondaryDamage: fields.get(LABELS.secondaryDamage),
    odometer: parseOdometer(fields.get(LABELS.odometer)),
    colour: fields.get(LABELS.colour),
    fuel: fields.get(LABELS.fuel),
    bodyStyle: fields.get(LABELS.bodyStyle),
    yardName: yard ? yard.toUpperCase() : null,
    images: findLotImages(doc),
  };
}

/**
 * Indexes the page's label-like elements in one pass, then answers "what value sits next
 * to this label?" for any field. Lookups try, in order:
 *   1. the label element's next sibling (`<dt>Odometer</dt><dd>63,118</dd>`)
 *   2. the last element in the label's parent row
 *   3. a single element of the form "Label: value"
 */
class LabelledFields {
  private readonly labelsByKey = new Map<string, { element: Element; order: number }[]>();
  private readonly leafTexts: string[] = [];

  constructor(doc: Document) {
    let order = 0;
    for (const element of Array.from(doc.body.querySelectorAll("*"))) {
      if (element.children.length > 1) continue; // containers, not labels
      const text = element.textContent ?? "";
      if (element.children.length === 0) this.leafTexts.push(normalize(text));
      if (text.length > MAX_LABEL_TEXT_LENGTH) continue;

      const key = labelKey(text);
      const entries = this.labelsByKey.get(key) ?? [];
      entries.push({ element, order: order++ });
      this.labelsByKey.set(key, entries);
    }
  }

  get(labels: readonly string[]): string | null {
    const candidates = labels
      .flatMap((label) => this.labelsByKey.get(labelKey(label)) ?? [])
      .sort((a, b) => a.order - b.order);

    for (const { element } of candidates) {
      const sibling = normalize(element.nextElementSibling?.textContent);
      if (sibling) return sibling;
      const last = element.parentElement?.lastElementChild;
      if (last && last !== element) {
        const value = normalize(last.textContent);
        if (value) return value;
      }
    }
    return this.inlineValue(labels);
  }

  private inlineValue(labels: readonly string[]): string | null {
    const patterns = labels.map(
      (label) => new RegExp(`^${escapeRegExp(label)}\\s*[:\\-]\\s*(.+)$`, "i"),
    );
    for (const text of this.leafTexts) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]) return normalize(match[1]);
      }
    }
    return null;
  }
}

function findLotNumber(doc: Document, fields: LabelledFields): string | null {
  const labelled = fields.get(LABELS.lotNumber);
  if (labelled) return parseLotNumber(`lot ${labelled}`) ?? labelled;
  // Fall back to the page header, where Copart prints "Lot number: 12345678".
  return parseLotNumber(normalize(doc.body.textContent).slice(0, 4000));
}

function findLotImages(doc: Document): string[] {
  const urls = new Set<string>();
  for (const img of Array.from(doc.querySelectorAll("img"))) {
    const src = img.currentSrc || img.src;
    if (src && LOT_IMAGE_HOST.test(src) && IMAGE_EXTENSION.test(src)) {
      urls.add(src.replace(THUMBNAIL_TOKEN, "_ful"));
    }
  }
  return Array.from(urls).slice(0, MAX_IMAGES);
}

function labelKey(text: string): string {
  return normalize(text)
    .toLowerCase()
    .replace(/[:\s]+$/, "");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
