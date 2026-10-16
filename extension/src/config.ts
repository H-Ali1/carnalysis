/** Backend base URL. Override at build time with VITE_BACKEND_URL (see .env.example). */
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000";
