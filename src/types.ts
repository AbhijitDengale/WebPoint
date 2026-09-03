export type Category =
  | "sight"
  | "food"
  | "nature"
  | "transport"
  | "shopping"
  | "other";

export const CATEGORY_EMOJI: Record<Category, string> = {
  sight: "🏛️",
  food: "🍽️",
  nature: "🌿",
  transport: "🚋",
  shopping: "🛍️",
  other: "📌",
};

export interface Activity {
  id: string;
  tripDayId: string;
  title: string;
  /** 24h "HH:MM" — when the activity starts */
  startTime: string;
  /** minutes */
  durationMin: number;
  /** per-person estimated cost */
  cost: number;
  category: Category;
  notes?: string;
  /**
   * Locked activities are HUMAN constraints: the person pinned this item and
   * the agent must not move it (tools enforce this). Humans can still edit
   * or drag their own locked items in the UI.
   */
  locked: boolean;
  createdBy: "human" | "agent";
}

export interface TripDay {
  id: string;
  label: string;
  activityIds: string[];
}

export interface Trip {
  name: string;
  destination: string;
  currency: string;
  budget: number;
  days: TripDay[];
}

export interface FeedEntry {
  id: string;
  actor: "human" | "agent" | "system";
  tool: string; // action name, e.g. "add_activities" or "drag"
  detail: string;
  at: string; // HH:MM:SS
}

/** Activity input with optional fields (defaults applied by the reducer). */
export interface NewActivityInput {
  tripDayId: string;
  title: string;
  startTime: string;
  durationMin?: number;
  cost?: number;
  category?: Category;
  notes?: string;
  locked?: boolean;
}

export interface TripState {
  trip: Trip;
  activities: Record<string, Activity>;
  feed: FeedEntry[];
}

export type Action =
  | { type: "ADD_ACTIVITIES"; activities: NewActivityInput[]; createdBy: "human" | "agent" }
  | { type: "UPDATE_ACTIVITY"; activityId: string; changes: Partial<Omit<Activity, "id" | "tripDayId">>; actor: "human" | "agent" }
  | { type: "REMOVE_ACTIVITY"; activityId: string; actor: "human" | "agent" }
  | { type: "REORDER_DAY"; tripDayId: string; orderedIds: string[]; actor: "human" | "agent" }
  | { type: "TOGGLE_LOCK"; activityId: string }
  | { type: "SET_BUDGET"; budget: number }
  | { type: "LOG"; entry: Omit<FeedEntry, "id" | "at"> }
  | { type: "RESET" };
