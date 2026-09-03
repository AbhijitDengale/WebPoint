import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { Action, Activity, FeedEntry, NewActivityInput, TripState } from "./types";
import { makeSeedState } from "./seed";
import { nowStamp, uid } from "./utils";

const STORAGE_KEY = "waypoint-trip-v1";

function loadInitial(): TripState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TripState;
      if (parsed?.trip?.days && parsed?.activities) return parsed;
    }
  } catch {
    /* corrupted storage → fall through to seed */
  }
  return makeSeedState();
}

export function reducer(state: TripState, action: Action): TripState {
  switch (action.type) {
    case "ADD_ACTIVITIES": {
      const activities = { ...state.activities };
      const trip = { ...state.trip, days: state.trip.days.map((d) => ({ ...d, activityIds: [...d.activityIds] })) };
      for (const partial of action.activities) {
        const activity: Activity = {
          id: uid(),
          createdBy: action.createdBy,
          durationMin: 60,
          cost: 0,
          category: "other",
          locked: false,
          ...partial,
        };
        activities[activity.id] = activity;
        const day = trip.days.find((d) => d.id === activity.tripDayId);
        if (day) day.activityIds.push(activity.id);
      }
      return { trip, activities, feed: state.feed };
    }
    case "UPDATE_ACTIVITY": {
      const cur = state.activities[action.activityId];
      if (!cur) return state;
      return {
        ...state,
        activities: { ...state.activities, [action.activityId]: { ...cur, ...action.changes } },
      };
    }
    case "REMOVE_ACTIVITY": {
      if (!state.activities[action.activityId]) return state;
      const activities = { ...state.activities };
      delete activities[action.activityId];
      return {
        ...state,
        activities,
        trip: {
          ...state.trip,
          days: state.trip.days.map((d) => ({
            ...d,
            activityIds: d.activityIds.filter((id) => id !== action.activityId),
          })),
        },
      };
    }
    case "REORDER_DAY": {
      const day = state.trip.days.find((d) => d.id === action.tripDayId);
      if (!day) return state;
      const current = new Set(day.activityIds);
      const next = action.orderedIds.filter((id) => current.has(id));
      // keep any ids the caller dropped (defensive)
      for (const id of day.activityIds) if (!next.includes(id)) next.push(id);
      return {
        ...state,
        trip: {
          ...state.trip,
          days: state.trip.days.map((d) => (d.id === action.tripDayId ? { ...d, activityIds: next } : d)),
        },
      };
    }
    case "TOGGLE_LOCK": {
      const cur = state.activities[action.activityId];
      if (!cur) return state;
      return {
        ...state,
        activities: { ...state.activities, [action.activityId]: { ...cur, locked: !cur.locked } },
      };
    }
    case "SET_BUDGET":
      return { ...state, trip: { ...state.trip, budget: action.budget } };
    case "LOG": {
      const entry: FeedEntry = { id: uid(), at: nowStamp(), ...action.entry };
      const feed = [...state.feed, entry].slice(-50);
      return { ...state, feed };
    }
    case "RESET":
      return makeSeedState();
    default:
      return state;
  }
}

interface TripStore {
  state: TripState;
  dispatch: React.Dispatch<Action>;
  log: (actor: FeedEntry["actor"], tool: string, detail: string) => void;
}

const TripContext = createContext<TripStore | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / private mode — non-fatal */
    }
  }, [state]);

  const store = useMemo<TripStore>(
    () => ({
      state,
      dispatch,
      log: (actor, tool, detail) => dispatch({ type: "LOG", entry: { actor, tool, detail } }),
    }),
    [state]
  );

  return <TripContext.Provider value={store}>{children}</TripContext.Provider>;
}

export function useTrip(): TripStore {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used inside <TripProvider>");
  return ctx;
}
