import type { AnalyzeRequest, AnalyzeResponse } from "./types";

export class ApiError extends Error {
  /** HTTP status, or undefined when the server couldn't be reached at all. */
  readonly status: number | undefined;

  constructor(message: string, status?: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function analyzeLot(
  baseUrl: string,
  request: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    throw new ApiError(`Could not reach the Carnalysis backend at ${baseUrl}.`, undefined, {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new ApiError(await describeError(response), response.status);
  }
  return (await response.json()) as AnalyzeResponse;
}

/** FastAPI reports `detail` as a message, or as a list of validation errors. */
async function describeError(response: Response): Promise<string> {
  const fallback = `The backend returned an error (HTTP ${response.status}).`;
  try {
    const { detail } = (await response.json()) as { detail?: unknown };
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item: { msg?: unknown }) => item.msg)
        .filter((m) => typeof m === "string");
      if (messages.length > 0) return messages.join("; ");
    }
  } catch {
    // Not a JSON body; fall through.
  }
  return fallback;
}
