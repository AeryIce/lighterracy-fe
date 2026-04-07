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
  last_seen: string | null;
  created_at: string | null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function normalizeCapabilities(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, boolean> = {};

  for (const [key, raw] of Object.entries(value)) {
    result[key] = toBoolean(raw, false);
  }

  return result;
}

function normalizeMenus(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function normalizeAllowedModules(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeAuthMePayload(raw: unknown): AuthMeResponse | null {
  if (!isRecord(raw) || !isRecord(raw.user)) {
    return null;
  }

  const rawUser = raw.user;
  const rawSession = isRecord(raw.session) ? raw.session : null;
  const rawAuth = isRecord(raw.auth) ? raw.auth : {};
  const rawAccess = isRecord(raw.access) ? raw.access : {};

  const mustChangePassword = toBoolean(
    rawAuth.must_change_password ?? rawUser.must_change_password,
    false,
  );

  const isActive = toBoolean(rawAuth.is_active ?? rawUser.is_active, true);

  return {
    user: {
      id: toNumber(rawUser.id, 0),
      name: toStringValue(rawUser.name, "User"),
      email: toStringValue(rawUser.email, ""),
      role: toStringValue(rawUser.role, "user"),
      store_id:
        rawUser.store_id === null || rawUser.store_id === undefined
          ? null
          : toNumber(rawUser.store_id, 0),
      is_active: isActive,
      must_change_password: mustChangePassword,
    },
    session: rawSession
      ? {
          id: toNumber(rawSession.id, 0),
          device_id: toNullableString(rawSession.device_id),
          last_seen: toNullableString(rawSession.last_seen),
          created_at: toNullableString(rawSession.created_at),
        }
      : null,
    auth: {
      authenticated: toBoolean(rawAuth.authenticated, true),
      state: toStringValue(rawAuth.state, "AUTHORIZED"),
      must_change_password: mustChangePassword,
      is_active: isActive,
    },
    access: {
      contract_version: toNumber(rawAccess.contract_version, 1),
      allowed_modules: normalizeAllowedModules(rawAccess.allowed_modules),
      capabilities: normalizeCapabilities(rawAccess.capabilities),
      menus: normalizeMenus(rawAccess.menus),
    },
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

  let raw: unknown = null;

  try {
    raw = await response.json();
  } catch {
    raw = null;
  }

  if (!response.ok) {
    throw new Error("Gagal memuat session aktif.");
  }

  return normalizeAuthMePayload(raw);
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