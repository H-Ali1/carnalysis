/**
 * Backend base URL, from EXPO_PUBLIC_BACKEND_URL (see .env.example). On a physical phone
 * "localhost" is the phone itself, so point this at the backend machine's LAN address.
 */
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
