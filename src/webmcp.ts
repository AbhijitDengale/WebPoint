/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Waypoint × WebMCP
 * ─────────────────────────────────────────────────────────────────────────────
 *  This file is the heart of Waypoint's human + agent collaboration model.
 *
 *  Every tool below is registered with `document.modelContext.registerTool()`
 *  (spec: https://github.com/webmachinelearning/webmcp) so an AI agent running
 *  in the SAME page — ChatGPT's in-app browser or a WebMCP-enabled browser —
 *  can read and modify the trip alongside the human.
 *
 *  Division of labor (the "better together" design):
 *    • The APP does deterministic math: overlap detection, budget totals.
 *      Tools RETURN that math as structured JSON so the agent can reason
 *      and self-correct without extra calls.
 *    • The AGENT does judgment: what to add, what to cut, how to fix
 *      conflicts, how to re-order a day geographically.
 *    • The HUMAN keeps control: activities locked with 🔒 in the UI are
 *      constraints — reorder_day() REFUSES to move them and says why.
 *
 *  The same implementations also power the in-app "agent simulator"
 *  (see SimPanel.tsx) so people without a WebMCP browser can experience
 *  the collaboration model.
 */
import type { Activity, Category, NewActivityInput, TripState } from "./types";
import { budgetSummary, daySchedule, endTime, findConflicts, fmtMoney, toMinutes } from "./utils";

export type { NewActivityInput };

// ── Bridge between React state and the tool layer ───────────────────────────

export interface Bridge {
  getState(): TripState;
  addActivities(inputs: NewActivityInput[], actor: "human" | "agent"): void;
  updateActivity(id: string, changes: Partial<Activity>, actor: "human" | "agent"): boolean;
  removeActivity(id: string, actor: "human" | "agent"): boolean;
  reorderDay(dayId: string, orderedIds: string[], actor: "human" | "agent"): void;
  setBudget(value: number): void;
  log(actor: "human" | "agent" | "system", tool: string, detail: string): void;
}

// ── Result shape every tool returns ──────────────────────────────────────────

interface ToolPayload {
  ok: boolean;
  message: string;
  [key: string]: unknown;
}

const budgetView = (state: TripState) => {
  const b = budgetSummary(state);
  return {
    budget: b.budget,
    plannedTotal: Math.round(b.plannedTotal),
    remaining: Math.round(b.remaining),
    overBudget: b.overBudget,
    currency: b.currency,
  };
};

const conflictsView = (state: TripState) =>
  findConflicts(state).map((c) => ({ tripDayId: c.dayId, day: c.dayLabel, conflict: c.message }));

// ── Input validation helpers ────────────────────────────────────────────────

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeActivityInput(raw: Record<string, unknown>, validDayIds: string[]): NewActivityInput | string {
  const tripDayId = String(raw.tripDayId ?? "");
  const title = String(raw.title ?? "").trim();
  const startTime = String(raw.startTime ?? "");
  if (!validDayIds.includes(tripDayId)) return `Unknown tripDayId "${tripDayId}". Valid ids: ${validDayIds.join(", ")}.`;
  if (!title) return "Activity title is required.";
  if (!TIME_RE.test(startTime)) return `startTime must be 24h "HH:MM" (got "${startTime}").`;
  const durationMin = raw.durationMin == null ? 60 : Number(raw.durationMin);
  if (!Number.isFinite(durationMin) || durationMin < 15 || durationMin > 720)
    return "durationMin must be between 15 and 720 minutes.";
  const cost = raw.cost == null ? 0 : Number(raw.cost);
  if (!Number.isFinite(cost) || cost < 0) return "cost must be a non-negative number.";
  const category = (raw.category ?? "other") as Category;
  return {
    tripDayId,
    title,
    startTime,
    durationMin: Math.round(durationMin),
    cost: Math.round(cost),
    category,
    notes: raw.notes ? String(raw.notes) : undefined,
    locked: false, // agents can never create locked items — locking is a human-only control
  };
}

// ── Tool implementations (shared by WebMCP and the simulator) ───────────────

type ToolImpl = (bridge: Bridge, input: Record<string, unknown>) => ToolPayload | Promise<ToolPayload>;

const impls: Record<string, ToolImpl> = {
  get_itinerary: (bridge) => {
    const state = bridge.getState();
    return {
      ok: true,
      message: `Itinerary “${state.trip.name}” (${state.trip.days.length} days) with ${Object.keys(state.activities).length} activities.`,
      trip: {
        name: state.trip.name,
        destination: state.trip.destination,
        currency: state.trip.currency,
      },
      days: state.trip.days.map((d) => daySchedule(state, d.id)),
      conflicts: conflictsView(state),
      budget: budgetView(state),
    };
  },

  add_activities: (bridge, input) => {
    const state = bridge.getState();
    const validDayIds = state.trip.days.map((d) => d.id);
    const rawList = Array.isArray(input.activities) ? (input.activities as Record<string, unknown>[]) : null;
    if (!rawList || rawList.length === 0) return { ok: false, message: "Provide an `activities` array (at least one activity)." };
    if (rawList.length > 8) return { ok: false, message: "Add at most 8 activities per call." };

    const normalized: NewActivityInput[] = [];
    for (const raw of rawList) {
      const n = normalizeActivityInput(raw, validDayIds);
      if (typeof n === "string") return { ok: false, message: n };
      normalized.push(n);
    }

    const before = findConflicts(state).length;
    bridge.addActivities(normalized, "agent");
    const after = bridge.getState();
    const addedTitles = normalized.map((n) => `“${n.title}”`);
    const touchedDays = [...new Set(normalized.map((n) => n.tripDayId))];

    bridge.log(
      "agent",
      "add_activities",
      `added ${normalized.map((n) => n.title).join(", ")} (${touchedDays.map((id) => after.trip.days.find((d) => d.id === id)?.label).join(", ")})`
    );

    const newConflicts = findConflicts(after);
    return {
      ok: true,
      message: `Added ${normalized.length} activity(ies): ${addedTitles.join(", ")}.`,
      added: normalized.map((n) => ({ title: n.title, tripDayId: n.tripDayId, startTime: n.startTime })),
      schedules: touchedDays.map((id) => daySchedule(after, id)),
      newConflicts: newConflicts.slice(before).map((c) => c.message),
      totalConflicts: newConflicts.length,
      budget: budgetView(after),
      hint:
        newConflicts.length > before
          ? "Your additions created time overlaps — consider find_conflicts then update_activity or reorder_day."
          : undefined,
    };
  },

  update_activity: (bridge, input) => {
    const state = bridge.getState();
    const id = String(input.activityId ?? "");
    const cur = state.activities[id];
    if (!cur) {
      const valid = Object.values(state.activities)
        .map((a) => `“${a.title}” (${a.id})`)
        .join(", ");
      return { ok: false, message: `No activity with id "${id}". Current activities: ${valid}.` };
    }

    const changes: Partial<Activity> = {};
    if (input.title != null) {
      const t = String(input.title).trim();
      if (!t) return { ok: false, message: "title cannot be empty." };
      changes.title = t;
    }
    if (input.startTime != null) {
      const s = String(input.startTime);
      if (!TIME_RE.test(s)) return { ok: false, message: `startTime must be 24h "HH:MM" (got "${s}").` };
      changes.startTime = s;
    }
    if (input.durationMin != null) {
      const d = Number(input.durationMin);
      if (!Number.isFinite(d) || d < 15 || d > 720) return { ok: false, message: "durationMin must be 15–720." };
      changes.durationMin = Math.round(d);
    }
    if (input.cost != null) {
      const c = Number(input.cost);
      if (!Number.isFinite(c) || c < 0) return { ok: false, message: "cost must be a non-negative number." };
      changes.cost = Math.round(c);
    }
    if (input.category != null) changes.category = input.category as Category;
    if (input.notes != null) changes.notes = String(input.notes);
    if (input.locked != null) {
      return {
        ok: false,
        message: "Locked state is a HUMAN control. Ask the person to lock or unlock the activity in the UI — agents cannot change it.",
      };
    }

    bridge.updateActivity(id, changes, "agent");
    const after = bridge.getState();
    bridge.log("agent", "update_activity", `updated “${changes.title ?? cur.title}” (${Object.keys(changes).join(", ")})`);

    return {
      ok: true,
      message: `Updated “${after.activities[id].title}” (now ${after.activities[id].startTime}–${endTime(after.activities[id])}).`,
      schedule: daySchedule(after, after.activities[id].tripDayId),
      conflicts: conflictsView(after),
      budget: budgetView(after),
    };
  },

  remove_activity: (bridge, input) => {
    const state = bridge.getState();
    const id = String(input.activityId ?? "");
    const cur = state.activities[id];
    if (!cur) return { ok: false, message: `No activity with id "${id}". Use get_itinerary to list ids.` };
    bridge.removeActivity(id, "agent");
    const after = bridge.getState();
    bridge.log("agent", "remove_activity", `removed “${cur.title}”`);
    return {
      ok: true,
      message: `Removed “${cur.title}”.`,
      schedule: daySchedule(after, cur.tripDayId),
      conflicts: conflictsView(after),
      budget: budgetView(after),
    };
  },

  reorder_day: (bridge, input) => {
    const state = bridge.getState();
    const dayId = String(input.tripDayId ?? "");
    const day = state.trip.days.find((d) => d.id === dayId);
    if (!day) return { ok: false, message: `Unknown tripDayId "${dayId}". Valid: ${state.trip.days.map((d) => d.id).join(", ")}.` };
    const proposed = Array.isArray(input.orderedActivityIds) ? (input.orderedActivityIds as unknown[]).map(String) : null;
    if (!proposed || proposed.length === 0) return { ok: false, message: "Provide orderedActivityIds — the full activity order for the day." };

    const current = day.activityIds;
    const sameSet = current.length === proposed.length && proposed.every((id) => current.includes(id));
    if (!sameSet) {
      const missing = current.filter((id) => !proposed.includes(id));
      const extra = proposed.filter((id) => !current.includes(id));
      return {
        ok: false,
        message: `orderedActivityIds must contain exactly the day's existing activities. Missing: [${missing.join(", ")}]. Unknown: [${extra.join(", ")}].`,
      };
    }

    // 🔒 HUMAN CONSTRAINT ENFORCEMENT — the collaboration contract:
    // locked activities must stay at their exact position in the order.
    for (let i = 0; i < current.length; i++) {
      const a = state.activities[current[i]];
      if (a.locked && proposed[i] !== current[i]) {
        return {
          ok: false,
          message: `Position ${i + 1} is LOCKED by the human: “${a.title}” (${a.startTime}) must stay there. Re-order the unlocked activities around it.`,
        };
      }
    }

    const moved = current.some((id, i) => proposed[i] !== id);
    if (!moved) return { ok: true, message: "Order unchanged — the proposed order matches the current one.", schedule: daySchedule(state, dayId) };

    bridge.reorderDay(dayId, proposed, "agent");
    const after = bridge.getState();
    const titles = proposed.map((id) => after.activities[id].title).join(" → ");
    bridge.log("agent", "reorder_day", `reordered ${day.label}: ${titles}`);

    return {
      ok: true,
      message: `Reordered ${day.label}. New order: ${titles}.`,
      schedule: daySchedule(after, dayId),
      conflicts: conflictsView(after),
    };
  },

  find_conflicts: (bridge) => {
    const state = bridge.getState();
    const conflicts = findConflicts(state);
    const b = budgetSummary(state);
    bridge.log("agent", "find_conflicts", `checked schedule — ${conflicts.length} conflict(s), budget ${b.overBudget ? "over" : "ok"}`);
    return {
      ok: true,
      message:
        conflicts.length === 0
          ? "No schedule conflicts found."
          : `${conflicts.length} schedule conflict(s) found. Fix with update_activity (change startTime/duration) or remove_activity.`,
      conflicts: conflicts.map((c) => ({ tripDayId: c.dayId, day: c.dayLabel, detail: c.message })),
      budget: { ...budgetView(state), note: b.overBudget ? `Planned spend ${fmtMoney(b.plannedTotal, b.currency)} exceeds the ${fmtMoney(b.budget, b.currency)} budget.` : undefined },
    };
  },

  get_budget_summary: (bridge) => {
    const state = bridge.getState();
    const b = budgetSummary(state);
    bridge.log("agent", "get_budget_summary", `checked budget — ${fmtMoney(b.plannedTotal, b.currency)} of ${fmtMoney(b.budget, b.currency)}`);
    return {
      ok: true,
      message: `Planned spend is ${fmtMoney(b.plannedTotal, b.currency)} of a ${fmtMoney(b.budget, b.currency)} budget (${b.overBudget ? "OVER" : "within"} budget).`,
      ...b,
    };
  },

  set_trip_budget: (bridge, input) => {
    const state = bridge.getState();
    const prev = state.trip.budget;
    const value = Math.round(Number(input.budget));
    if (!Number.isFinite(value) || value <= 0) return { ok: false, message: "budget must be a positive number." };
    const reason = input.reason ? String(input.reason) : "";
    if (value === prev) {
      return { ok: true, message: `Budget is already ${fmtMoney(value, state.trip.currency)}.`, budget: budgetView(state) };
    }
    bridge.setBudget(value);
    const after = bridge.getState();
    bridge.log(
      "agent",
      "set_trip_budget",
      `changed budget ${fmtMoney(prev, state.trip.currency)} → ${fmtMoney(value, state.trip.currency)}${reason ? ` — ${reason}` : ""}`
    );
    const b = budgetSummary(after);
    return {
      ok: true,
      message: `Budget set to ${fmtMoney(value, state.trip.currency)} (was ${fmtMoney(prev, state.trip.currency)}). Planned spend of ${fmtMoney(b.plannedTotal, b.currency)} is now ${b.overBudget ? "OVER budget" : "within budget"} with ${fmtMoney(b.remaining, b.currency)} left.`,
      previousBudget: prev,
      budget: budgetView(after),
    };
  },
};

export const TOOL_NAMES = Object.keys(impls);

export function runToolLogic(bridge: Bridge, name: string, input: Record<string, unknown>): Promise<ToolPayload> | ToolPayload {
  const fn = impls[name];
  if (!fn) return { ok: false, message: `Unknown tool "${name}".` };
  try {
    return fn(bridge, input ?? {});
  } catch (err) {
    return { ok: false, message: `Tool "${name}" failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Registration ─────────────────────────────────────────────────────────────

const inputSchema = (properties: object, required: string[]) => ({
  type: "object" as const,
  properties,
  required,
});

const HOUR_NOTE = '24-hour "HH:MM" format, e.g. "14:30".';

export function buildTools(bridge: Bridge): ModelContextTool[] {
  const dayIdProp = {
    tripDayId: { type: "string", description: "Target day id (see get_itinerary → days[].tripDayId)." },
  };

  return [
    {
      name: "get_itinerary",
      description:
        "Get the FULL current trip itinerary: every day's ordered activities (times, durations, costs, categories, notes, which ones the human locked), schedule conflicts, and budget status. Call this first to understand the trip before making changes.",
      inputSchema: inputSchema({}, []),
      execute: (input) => impls.get_itinerary(bridge, input),
    },
    {
      name: "add_activities",
      description:
        "Add one or more activities to the trip. The human sees them appear on their board instantly. Returns the updated day schedules, any NEW time conflicts your additions created, and the budget impact so you can self-correct. Agents cannot lock activities.",
      inputSchema: inputSchema(
        {
          activities: {
            type: "array",
            description: "1–8 activities to add.",
            items: {
              type: "object",
              properties: {
                tripDayId: dayIdProp.tripDayId,
                title: { type: "string", description: "Short display title, e.g. 'Belém Tower'." },
                startTime: { type: "string", description: `Start time, ${HOUR_NOTE}` },
                durationMin: { type: "number", description: "Duration in minutes (15–720). Default 60." },
                cost: { type: "number", description: "Estimated per-person cost. Default 0." },
                category: { type: "string", description: "One of: sight, food, nature, transport, shopping, other." },
                notes: { type: "string", description: "Short helpful note shown on the card." },
              },
              required: ["tripDayId", "title", "startTime"],
            },
          },
        },
        ["activities"]
      ),
      execute: (input) => impls.add_activities(bridge, input),
    },
    {
      name: "update_activity",
      description:
        "Update an existing activity's title, startTime, durationMin, cost, category or notes. Returns the updated day schedule, remaining conflicts and budget so you can verify your fix. Changing an activity's locked state is refused — that is a human-only control.",
      inputSchema: inputSchema(
        {
          activityId: { type: "string", description: "Id of the activity (from get_itinerary)." },
          title: { type: "string", description: "New title." },
          startTime: { type: "string", description: `New start time, ${HOUR_NOTE}` },
          durationMin: { type: "number", description: "New duration in minutes (15–720)." },
          cost: { type: "number", description: "New estimated cost." },
          category: { type: "string", description: "One of: sight, food, nature, transport, shopping, other." },
          notes: { type: "string", description: "New note." },
        },
        ["activityId"]
      ),
      execute: (input) => impls.update_activity(bridge, input),
    },
    {
      name: "remove_activity",
      description:
        "Remove an activity from the itinerary (e.g. to cut costs or resolve a conflict). Returns the updated schedule, remaining conflicts and freed-up budget.",
      inputSchema: inputSchema(
        {
          activityId: { type: "string", description: "Id of the activity to remove (from get_itinerary)." },
        },
        ["activityId"]
      ),
      execute: (input) => impls.remove_activity(bridge, input),
    },
    {
      name: "reorder_day",
      description:
        "Set the full activity order for one day (e.g. to group activities geographically). You must pass EVERY activity id of that day exactly once. IMPORTANT: activities the human locked with 🔒 are hard constraints — this tool REFUSES and explains if a locked item would move. Plan around locked items.",
      inputSchema: inputSchema(
        {
          tripDayId: dayIdProp.tripDayId,
          orderedActivityIds: {
            type: "array",
            description: "All activity ids for the day, in the desired visiting order.",
            items: { type: "string" },
          },
        },
        ["tripDayId", "orderedActivityIds"]
      ),
      execute: (input) => impls.reorder_day(bridge, input),
    },
    {
      name: "find_conflicts",
      description:
        "Run the app's deterministic schedule audit: returns every pair of overlapping activities in a day plus budget overage. Use it after changes, or when the human asks 'does everything fit?'. Fix reported conflicts with update_activity / remove_activity.",
      inputSchema: inputSchema({}, []),
      execute: (input) => impls.find_conflicts(bridge, input),
    },
    {
      name: "get_budget_summary",
      description:
        "Get the trip budget breakdown: total planned spend vs budget, remaining amount, per-day totals and spend by category. Use it when the human asks about money or before adding expensive activities.",
      inputSchema: inputSchema({}, []),
      execute: (input) => impls.get_budget_summary(bridge, input),
    },
    {
      name: "set_trip_budget",
      description:
        "Change the trip's total budget — the human sees the change instantly on their budget bar. Only use it when the human agrees, and ALWAYS include a short reason (shown to them). Returns the new budget status so you can confirm whether planned spend now fits.",
      inputSchema: inputSchema(
        {
          budget: { type: "number", description: "New total budget amount (positive number)." },
          reason: { type: "string", description: "Short reason for the change, shown to the human." },
        },
        ["budget"]
      ),
      execute: (input) => impls.set_trip_budget(bridge, input),
    },
  ];
}

export interface WebMCPStatus {
  supported: boolean;
  toolCount: number;
  error?: string;
}

/** Registers all Waypoint tools with the hosting agent. Safe to call once per page load. */
export async function setupWebMCP(bridge: Bridge): Promise<WebMCPStatus> {
  if (typeof document === "undefined" || !("modelContext" in document)) {
    return { supported: false, toolCount: 0 };
  }
  try {
    const tools = buildTools(bridge);
    let toolCount = 0;
    for (const tool of tools) {
      await document.modelContext.registerTool(tool);
      toolCount++;
    }
    return { supported: true, toolCount };
  } catch (err) {
    return { supported: false, toolCount: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

// Re-export for the simulator / UI helpers
export { endTime, toMinutes };
