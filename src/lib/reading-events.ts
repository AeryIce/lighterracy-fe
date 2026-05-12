import { apiFetchWithAuth, getSessionTokenFromBrowser } from "@/lib/auth-client";

export interface ReadingEventPayload {
  event_type: string;
  isbn_13?: string | null;
  isbn?: string | null;
  book_id?: number | null;
  title?: string | null;
  author_text?: string | null;
  source_page?: string | null;
  metadata?: Record<string, unknown>;
}

export interface RecordReadingEventOptions {
  timeoutMs?: number;
}

export async function recordReadingEvent(
  payload: ReadingEventPayload,
  options: RecordReadingEventOptions = {},
): Promise<boolean> {
  if (!getSessionTokenFromBrowser()) {
    return false;
  }

  const timeoutMs = options.timeoutMs ?? 1200;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller
    ? window.setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await apiFetchWithAuth("/api/me/reading-events", {
      method: "POST",
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });

    return response.ok;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Lighterracy] Reading event was not recorded", error);
    }

    return false;
  } finally {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  }
}
