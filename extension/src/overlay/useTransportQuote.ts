import { isValidUKPostcode, quoteTransport, type TransportQuote } from "@carnalysis/core";
import { useEffect, useState } from "react";

// Kept in extension storage rather than the page's localStorage, which Copart's own
// scripts can read.
const POSTCODE_KEY = "userPostcode";

/** The user's (remembered) postcode and the transport quote from it to the lot's yard. */
export function useTransportQuote(yardName: string | null) {
  const [postcode, setPostcodeState] = useState("");
  const [quote, setQuote] = useState<TransportQuote | null>(null);

  useEffect(() => {
    void chrome.storage.local.get(POSTCODE_KEY).then((items) => {
      const saved = items[POSTCODE_KEY];
      // Don't clobber anything the user typed before storage responded.
      if (typeof saved === "string") setPostcodeState((current) => current || saved);
    });
  }, []);

  useEffect(() => {
    // Abort superseded lookups so a slow response can't overwrite a newer quote.
    const controller = new AbortController();
    setQuote(null);
    void quoteTransport(postcode, yardName, controller.signal).then((next) => {
      if (!controller.signal.aborted) setQuote(next);
    });
    return () => controller.abort();
  }, [postcode, yardName]);

  function setPostcode(value: string) {
    setPostcodeState(value);
    if (isValidUKPostcode(value)) void chrome.storage.local.set({ [POSTCODE_KEY]: value });
  }

  return { postcode, setPostcode, quote };
}
