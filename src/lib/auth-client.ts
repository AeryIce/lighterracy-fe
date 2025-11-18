// src/lib/auth-client.ts
// Helper khusus client-side untuk auth di Lighterracy (Lightcy).

import { getBackendUrl } from "./env";

const SESSION_TOKEN_KEY = "lighterracy_session_token";

export function getSessionTokenFromBrowser(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(SESSION_TOKEN_KEY);
  if (!token || token.trim().length === 0) {
    return null;
  }

  return token;
}

export function clearSessionTokenFromBrowser(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_TOKEN_KEY);
}

/**
 * Wrapper fetch ke backend yang otomatis menyertakan Authorization: Bearer {token}.
 * Hanya dipakai di client component (karena pakai localStorage).
 */
export async function apiFetchWithAuth(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const backendUrl = getBackendUrl();
  const token = getSessionTokenFromBrowser();

  const url = `${backendUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

/**
 * Logout session saat ini:
 *  - tembak /api/auth/logout (kalau ada token)
 *  - apapun hasilnya, token di browser dibersihkan.
 */
export async function logoutCurrentSession(): Promise<void> {
  const token = getSessionTokenFromBrowser();
  const backendUrl = getBackendUrl();

  if (!token) {
    clearSessionTokenFromBrowser();
    return;
  }

  try {
    const url = `${backendUrl}/api/auth/logout`;

    const headers = new Headers();
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");
    headers.set("Authorization", `Bearer ${token}`);

    await fetch(url, {
      method: "POST",
      headers,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error while logging out:", error);
  } finally {
    clearSessionTokenFromBrowser();
  }
}
