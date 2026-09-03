import type { Activity, TripState } from "./types";

/**
 * A sample 3-day Lisbon trip so the app is immediately explorable.
 * It intentionally contains:
 *  - a time conflict on Day 1 (perfect for the find_conflicts tool demo)
 *  - a locked "must-do" item the agent has to plan around
 *  - a mix of human-added activities
 */
export function makeSeedState(): TripState {
  const d1 = "day-1";
  const d2 = "day-2";
  const d3 = "day-3";

  const acts: Activity[] = [
    // ---------- Day 1 (has an intentional conflict: Tram 28 vs Alfama walk) ----------
    { id: "a1", tripDayId: d1, title: "Breakfast at Confeitaria Nacional", startTime: "09:00", durationMin: 60, cost: 8, category: "food", notes: "Open since 1829 — try the bolo rei.", locked: false, createdBy: "human" },
    { id: "a2", tripDayId: d1, title: "Tram 28 ride through Graça", startTime: "10:00", durationMin: 90, cost: 3, category: "transport", locked: false, createdBy: "human" },
    { id: "a3", tripDayId: d1, title: "Alfama walking tour", startTime: "10:30", durationMin: 120, cost: 15, category: "sight", notes: "Conflicts with the tram ride — one has to give.", locked: false, createdBy: "human" },
    { id: "a4", tripDayId: d1, title: "Lunch at Time Out Market", startTime: "13:30", durationMin: 90, cost: 18, category: "food", locked: true, createdBy: "human" },
    { id: "a5", tripDayId: d1, title: "Sunset at Miradouro da Senhora do Monte", startTime: "19:30", durationMin: 60, cost: 0, category: "nature", locked: false, createdBy: "human" },

    // ---------- Day 2 (Belém day — locked must-do) ----------
    { id: "a6", tripDayId: d2, title: "Belém Tower", startTime: "09:30", durationMin: 90, cost: 8, category: "sight", notes: "Must-do — book the early slot.", locked: true, createdBy: "human" },
    { id: "a7", tripDayId: d2, title: "Jerónimos Monastery", startTime: "11:30", durationMin: 90, cost: 10, category: "sight", locked: false, createdBy: "human" },
    { id: "a8", tripDayId: d2, title: "Pastéis de Belém", startTime: "13:00", durationMin: 45, cost: 6, category: "food", notes: "The original 1837 bakery.", locked: false, createdBy: "human" },
    { id: "a9", tripDayId: d2, title: "MAAT riverside walk", startTime: "15:00", durationMin: 120, cost: 0, category: "nature", locked: false, createdBy: "human" },

    // ---------- Day 3 ----------
    { id: "a10", tripDayId: d3, title: "LX Factory brunch", startTime: "10:30", durationMin: 90, cost: 16, category: "food", locked: false, createdBy: "human" },
    { id: "a11", tripDayId: d3, title: "Flea market at Feira da Ladra", startTime: "14:00", durationMin: 120, cost: 10, category: "shopping", locked: false, createdBy: "human" },
  ];

  const activities: Record<string, Activity> = {};
  for (const a of acts) activities[a.id] = a;

  return {
    trip: {
      name: "Lisbon Long Weekend",
      destination: "Lisbon, Portugal",
      currency: "€",
      budget: 120,
      days: [
        { id: d1, label: "Day 1 — Thu", activityIds: ["a1", "a2", "a3", "a4", "a5"] },
        { id: d2, label: "Day 2 — Fri", activityIds: ["a6", "a7", "a8", "a9"] },
        { id: d3, label: "Day 3 — Sat", activityIds: ["a10", "a11"] },
      ],
    },
    activities,
    feed: [
      {
        id: "feed-seed",
        actor: "system",
        tool: "trip_loaded",
        detail: "Sample Lisbon trip loaded. Ask your agent to fix the Day 1 conflict!",
        at: "00:00:00",
      },
    ],
  };
}
