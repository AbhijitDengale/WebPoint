import { useState } from "react";
import { useTrip } from "../store";
import { findConflicts } from "../utils";
import type { Activity } from "../types";
import { ActivityCard } from "./ActivityCard";

/**
 * The human side of the collaboration: drag to reorder or move between days,
 * lock must-dos, edit inline. Locked items constrain the AGENT, not the human.
 */
export function DayBoard({ conflictedIds }: { conflictedIds: Set<string> }) {
  const { state, dispatch, log } = useTrip();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ dayId: string; index: number } | null>(null);

  const handleDrop = (dayId: string, index: number) => {
    if (!dragId) return;
    const act = state.activities[dragId];
    if (!act) return;
    setDropTarget(null);
    setDragId(null);

    const sourceDay = state.trip.days.find((d) => d.activityIds.includes(dragId));
    if (!sourceDay) return;

    if (sourceDay.id === dayId) {
      const ids = sourceDay.activityIds.filter((id) => id !== dragId);
      const insertAt = Math.max(0, Math.min(index > ids.length ? ids.length : index, ids.length));
      ids.splice(insertAt, 0, dragId);
      dispatch({ type: "REORDER_DAY", tripDayId: dayId, orderedIds: ids, actor: "human" });
      log("human", "reorder_day", `reordered ${sourceDay.label}`);
    } else {
      // move across days: remove + re-add preserving everything
      const preserved: Omit<Activity, "id" | "createdBy"> = {
        tripDayId: dayId, title: act.title, startTime: act.startTime, durationMin: act.durationMin,
        cost: act.cost, category: act.category, notes: act.notes, locked: act.locked,
      };
      dispatch({ type: "REMOVE_ACTIVITY", activityId: dragId, actor: "human" });
      dispatch({ type: "ADD_ACTIVITIES", activities: [preserved], createdBy: act.createdBy });
      log("human", "move_activity", `moved “${act.title}” to ${state.trip.days.find((d) => d.id === dayId)?.label}`);
    }
  };

  return (
    <div className="thin-scroll flex gap-4 overflow-x-auto px-4 pb-6 pt-5 sm:px-6">
      {state.trip.days.map((day) => {
        const items = day.activityIds.map((id) => state.activities[id]).filter(Boolean);
        const dayTotal = items.reduce((s, a) => s + a.cost, 0);
        const dayConflicts = items.filter((a) => conflictedIds.has(a.id)).length;
        return (
          <section
            key={day.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragId && !items.some((i) => i.id === dragId)) setDropTarget({ dayId: day.id, index: items.length });
            }}
            onDrop={() => handleDrop(day.id, dropTarget?.dayId === day.id ? dropTarget.index : items.length)}
            className={`flex w-[300px] shrink-0 flex-col rounded-2xl border p-3 transition ${
              dropTarget?.dayId === day.id ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200 bg-slate-50/60"
            }`}
          >
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h2 className="text-sm font-bold text-slate-800">{day.label}</h2>
              <div className="text-right text-[11px]">
                <span className="font-semibold text-slate-500">€{dayTotal}</span>
                {dayConflicts > 0 && (
                  <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-600">⚠ {dayConflicts}</span>
                )}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2.5">
              {items.map((a, i) => (
                <div
                  key={a.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dragId && dragId !== a.id) setDropTarget({ dayId: day.id, index: i });
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDrop(day.id, i);
                  }}
                  className={dropTarget?.dayId === day.id && dropTarget.index === i && dragId !== a.id ? "border-t-2 border-indigo-400" : ""}
                >
                  <ActivityCard
                    activity={a}
                    conflicted={conflictedIds.has(a.id)}
                    dragging={dragId === a.id}
                    onDragStart={setDragId}
                    onDragEnd={() => { setDragId(null); setDropTarget(null); }}
                  />
                </div>
              ))}

              {items.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  Empty day — drag activities here or ask your agent to fill it.
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function useConflictedIds(): Set<string> {
  const { state } = useTrip();
  return new Set(findConflicts(state).flatMap((c) => [c.aId, c.bId]));
}
