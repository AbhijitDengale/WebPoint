import type { Activity, TripState } from "./types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowStamp(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

export function fromMinutes(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function endTime(a: Activity): string {
  return fromMinutes(toMinutes(a.startTime) + a.durationMin);
}

export function fmtMoney(n: number, currency: string): string {
  return `${currency}${Math.round(n).toLocaleString("en-US")}`;
}

export interface Conflict {
  dayId: string;
  dayLabel: string;
  aId: string;
  bId: string;
  message: string;
}

/** Deterministic overlap detection inside a single day. */
export function findConflicts(state: TripState): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const day of state.trip.days) {
    const items = day.activityIds
      .map((id) => state.activities[id])
      .filter(Boolean)
      .sort((x, y) => toMinutes(x.startTime) - toMinutes(y.startTime));
    for (let i = 0; i < items.length - 1; i++) {
      const cur = items[i];
      const next = items[i + 1];
      const curEnd = toMinutes(cur.startTime) + cur.durationMin;
      if (curEnd > toMinutes(next.startTime)) {
        conflicts.push({
          dayId: day.id,
          dayLabel: day.label,
          aId: cur.id,
          bId: next.id,
          message: `“${cur.title}” (${cur.startTime}–${endTime(cur)}) overlaps “${next.title}” (${next.startTime}).`,
        });
      }
    }
  }
  return conflicts;
}

export interface BudgetSummary {
  currency: string;
  budget: number;
  plannedTotal: number;
  remaining: number;
  overBudget: boolean;
  perDay: { dayId: string; dayLabel: string; total: number; count: number }[];
  byCategory: Record<string, number>;
}

export function budgetSummary(state: TripState): BudgetSummary {
  const all = Object.values(state.activities);
  const plannedTotal = all.reduce((s, a) => s + a.cost, 0);
  const perDay = state.trip.days.map((d) => {
    const items = d.activityIds.map((id) => state.activities[id]).filter(Boolean);
    return {
      dayId: d.id,
      dayLabel: d.label,
      total: items.reduce((s, a) => s + a.cost, 0),
      count: items.length,
    };
  });
  const byCategory: Record<string, number> = {};
  for (const a of all) {
    byCategory[a.category] = (byCategory[a.category] ?? 0) + a.cost;
  }
  return {
    currency: state.trip.currency,
    budget: state.trip.budget,
    plannedTotal,
    remaining: state.trip.budget - plannedTotal,
    overBudget: plannedTotal > state.trip.budget,
    perDay,
    byCategory,
  };
}

/** Compact, agent-readable summary of one day's schedule. */
export function daySchedule(state: TripState, dayId: string) {
  const day = state.trip.days.find((d) => d.id === dayId);
  if (!day) return null;
  return {
    tripDayId: day.id,
    label: day.label,
    activities: day.activityIds.map((id) => {
      const a = state.activities[id];
      return {
        activityId: a.id,
        title: a.title,
        startTime: a.startTime,
        endTime: endTime(a),
        durationMin: a.durationMin,
        cost: a.cost,
        category: a.category,
        locked: a.locked,
        createdBy: a.createdBy,
        notes: a.notes ?? undefined,
      };
    }),
  };
}
