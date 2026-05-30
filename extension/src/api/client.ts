import type { AnalyzeRequest, AnalyzeResponse } from "../types";

// Defaults to the locally-running FastAPI backend; override at build time with
// VITE_BACKEND_URL (see .env.example).
const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "http://localhost:8000";

export async function analyzeLot(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const resp = await fetch(`${BACKEND_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Backend ${resp.status}: ${detail || resp.statusText}`);
  }
  return (await resp.json()) as AnalyzeResponse;
}
