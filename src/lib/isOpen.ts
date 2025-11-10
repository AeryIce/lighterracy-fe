import type { Store } from "@/types/store";

const dayMap = ["sun","mon","tue","wed","thu","fri","sat"] as const;

export function isStoreOpen(store: Store, now = new Date()): boolean {
  try {
    const day = dayMap[now.getDay()];
    const slots = store.hours?.[day] ?? [];
    if (!Array.isArray(slots) || slots.length === 0) return false;

    const pad = (n: number) => n.toString().padStart(2, "0");
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const toMinutes = (s: string) => {
      const [h, m] = s.split(":").map(Number);
      return h * 60 + (m || 0);
    };
    const cur = toMinutes(hhmm);

    // support multi-slot (e.g., "10:00-15:00", "16:00-22:00")
    return slots.some((range) => {
      const [start, end] = range.split("-");
      if (!start || !end) return false;
      const s = toMinutes(start), e = toMinutes(end);
      // handle cross-midnight as well
      return s <= e ? cur >= s && cur <= e : cur >= s || cur <= e;
    });
  } catch {
    return false;
  }
}
