import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, analyzeLot } from "../src/api";
import type { AnalyzeRequest } from "../src/types";

const REQUEST: AnalyzeRequest = {
  lot_title: "2017 VOLKSWAGEN POLO 1.0",
  damage_observations: [{ panel: "bonnet", damage_type: "dent" }],
  hammer_price: 1000,
  arv: 3000,
};

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analyzeLot", () => {
  it("posts the request as JSON and returns the parsed response", async () => {
    const fetchMock = stubFetch(Response.json({ profit_estimate: 1234 }));

    const result = await analyzeLot("http://localhost:8000/", REQUEST);

    expect(result).toEqual({ profit_estimate: 1234 });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/analyze",
      expect.objectContaining({ method: "POST", body: JSON.stringify(REQUEST) }),
    );
  });

  it("surfaces the server's error message", async () => {
    stubFetch(Response.json({ detail: "Could not identify the vehicle." }, { status: 400 }));

    await expect(analyzeLot("http://api", REQUEST)).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Could not identify the vehicle.",
    });
  });

  it("joins validation errors into one message", async () => {
    const detail = [{ msg: "Input should be 'scratch'" }, { msg: "Field required" }];
    stubFetch(Response.json({ detail }, { status: 422 }));

    await expect(analyzeLot("http://api", REQUEST)).rejects.toThrow(
      "Input should be 'scratch'; Field required",
    );
  });

  it("falls back to a generic message for non-JSON errors", async () => {
    stubFetch(new Response("Bad Gateway", { status: 502 }));

    await expect(analyzeLot("http://api", REQUEST)).rejects.toThrow("HTTP 502");
  });

  it("reports an unreachable server without a status", async () => {
    stubFetch(new TypeError("Network request failed"));

    const error = await analyzeLot("http://api", REQUEST).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBeUndefined();
    expect((error as ApiError).message).toContain("http://api");
  });
});
