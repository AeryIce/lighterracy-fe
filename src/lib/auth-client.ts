import { getBackendUrl } from "./env";

const SESSION_TOKEN_KEY = "lighterracy_session_token";

export interface AuthMeUser {
  id: number;
  name: string;
  email: string;
  role: string;
  store_id: number | null;
  is_active: boolean;
  must_change_password: boolean;
}

export interface AuthMeSession {
  id: number;
  device_id: string | null;
  last_seen: string;
  created_at: string;
}

export interface AuthMeResponse {
  user: AuthMeUser;
  session: AuthMeSession | null;
  auth: {
    authenticated: boolean;
    state: string;
    must_change_password: boolean;
    is_active: boolean;
  };
  access: {
    contract_version: number;
    allowed_modules: string[];
    capabilities: Record<string, boolean>;
    menus: Array<Record<string, unknown>>;
  };
}

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

export function setSessionTokenInBrowser(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearSessionTokenFromBrowser(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_TOKEN_KEY);
}

export async function apiFetchWithAuth(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const backendUrl = getBackendUrl();
  const token = getSessionTokenFromBrowser();

  const url = `${backendUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(options.headers ?? {});
  headers.set("Accept", "application/json");

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function fetchAuthMe(): Promise<AuthMeResponse | null> {
  const response = await apiFetchWithAuth("/api/auth/me", {
    method: "GET",
  });

  if (response.status === 401) {
    clearSessionTokenFromBrowser();
    return null;
  }

  if (!response.ok) {
    throw new Error("Gagal memuat session aktif.");
  }

  return (await response.json()) as AuthMeResponse;
}

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
    console.error("Error while logging out:", error);
  } finally {
    clearSessionTokenFromBrowser();
  }
}