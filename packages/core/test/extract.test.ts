import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { extractLotData } from "../src/extract/extract";
import { EXTRACT_LOT_DATA_SCRIPT } from "../src/extract/webview-script.generated";
import type { LotData, WebViewMessage } from "../src/types";

const FIXTURE = readFileSync(new URL("./fixtures/copart-lot.html", import.meta.url), "utf8");
const PHOTO_BASE = "https://cs.copart.com/v1/AUTH_svc.pdoc00001/lpp/1024";

const EXPECTED: LotData = {
  lotTitle: "2017 VOLKSWAGEN POLO 1.0 75 MATCH EDITION 5DR",
  lotNumber: "41861706",
  hammerPrice: 1225,
  arv: 6500,
  primaryDamage: "FRONT END",
  secondaryDamage: "SIDE",
  odometer: 63118,
  colour: "SILVER",
  fuel: "PETROL",
  bodyStyle: "HATCHBACK",
  yardName: "YORK",
  images: [`${PHOTO_BASE}/abc123_ful.jpg`, `${PHOTO_BASE}/def456_ful.jpg`],
};

/** Runs the injected WebView script in an isolated page, as react-native-webview would. */
function runInjectedScript(dom: JSDOM): WebViewMessage[] {
  const messages: WebViewMessage[] = [];
  Object.assign(dom.window, {
    ReactNativeWebView: { postMessage: (raw: string) => messages.push(JSON.parse(raw)) },
  });
  dom.window.eval(EXTRACT_LOT_DATA_SCRIPT);
  return messages;
}

describe("extractLotData", () => {
  it("reads every field from a lot page", () => {
    const { document } = new JSDOM(FIXTURE).window;

    expect(extractLotData(document)).toEqual(EXPECTED);
  });

  it("returns nulls for fields missing from the page", () => {
    const { document } = new JSDOM("<h1>2019 FORD FIESTA</h1>").window;

    expect(extractLotData(document)).toEqual({
      lotTitle: "2019 FORD FIESTA",
      lotNumber: null,
      hammerPrice: null,
      arv: null,
      primaryDamage: null,
      secondaryDamage: null,
      odometer: null,
      colour: null,
      fuel: null,
      bodyStyle: null,
      yardName: null,
      images: [],
    });
  });

  it("prefers the first matching label in document order", () => {
    const { document } = new JSDOM(
      "<div><span>Colour</span><span>BLUE</span></div><div><span>Color</span><span>RED</span></div>",
    ).window;

    expect(extractLotData(document).colour).toBe("BLUE");
  });
});

describe("injected WebView script", () => {
  it("posts exactly what extractLotData returns", () => {
    const dom = new JSDOM(FIXTURE, { runScripts: "outside-only" });

    expect(runInjectedScript(dom)).toEqual([{ type: "LOT_DATA", data: EXPECTED }]);
  });

  it("reports failures instead of throwing inside the page", () => {
    const dom = new JSDOM("<h1>x</h1>", { runScripts: "outside-only" });
    dom.window.document.body.remove();

    const messages = runInjectedScript(dom);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.type).toBe("ERROR");
  });
});
