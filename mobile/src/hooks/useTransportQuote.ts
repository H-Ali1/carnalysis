import { isValidUKPostcode, quoteTransport, type TransportQuote } from "@carnalysis/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const POSTCODE_KEY = "carnalysis:userPostcode";

/** The user's (remembered) postcode and the transport quote from it to the lot's yard. */
export function useTransportQuote(yardName: string | null) {
  const [postcode, setPostcodeState] = useState("");
  const [quote, setQuote] = useState<TransportQuote | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(POSTCODE_KEY)
      // Don't clobber anything the user typed before storage responded.
      .then((saved) => saved && setPostcodeState((current) => current || saved))
      .catch(() => {});
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
    if (isValidUKPostcode(value)) AsyncStorage.setItem(POSTCODE_KEY, value).catch(() => {});
  }

  return { postcode, setPostcode, quote };
}
