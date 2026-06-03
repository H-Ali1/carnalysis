import { fetchAutoTraderPrices } from "../api/autotrader";

interface FetchAutoTraderMsg {
  type: "FETCH_AUTOTRADER";
  make: string;
  model: string;
  year: number;
  mileage: number | null;
}

type Msg = FetchAutoTraderMsg;

chrome.runtime.onMessage.addListener(
  (message: Msg, _sender, sendResponse: (r: unknown) => void) => {
    if (message.type === "FETCH_AUTOTRADER") {
      console.log("[carnalysis] AutoTrader fetch →", message);
      fetchAutoTraderPrices(
        message.make,
        message.model,
        message.year,
        message.mileage,
      )
        .then((data) => {
          console.log("[carnalysis] AutoTrader result →", data);
          sendResponse({ ok: true, data });
        })
        .catch((err: unknown) => {
          console.error("[carnalysis] AutoTrader error →", err);
          sendResponse({ ok: false, error: String(err) });
        });
      return true;
    }
  },
);
