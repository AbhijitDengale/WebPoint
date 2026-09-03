import { useState } from "react";
import type { Activity } from "../types";
import { CATEGORY_EMOJI } from "../types";
import { useTrip } from "../store";
import { endTime } from "../utils";

interface Props {
  activity: Activity;
  conflicted: boolean;
  dragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

export function ActivityCard({ activity: a, conflicted, dragging, onDragStart, onDragEnd }: Props) {
  const { dispatch, log } = useTrip();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: a.title, startTime: a.startTime, durationMin: String(a.durationMin), cost: String(a.cost), notes: a.notes ?? "" });

  const save = () => {
    const duration = parseInt(form.durationMin, 10);
    const cost = parseFloat(form.cost);
    dispatch({
      type: "UPDATE_ACTIVITY",
      activityId: a.id,
      changes: {
        title: form.title.trim() || a.title,
        startTime: form.startTime,
        durationMin: Number.isFinite(duration) ? duration : a.durationMin,
        cost: Number.isFinite(cost) ? cost : a.cost,
        notes: form.notes.trim() || undefined,
      },
      actor: "human",
    });
    log("human", "edit", `edited “${form.title.trim() || a.title}”`);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-xl border-2 border-indigo-400 bg-white p-3 shadow-sm">
        <input
          className="mb-2 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm font-medium"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title"
        />
        <div className="mb-2 grid grid-cols-3 gap-2">
          <label className="text-[11px] font-medium text-slate-500">
            Start
            <input
              type="time"
              className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </label>
          <label className="text-[11px] font-medium text-slate-500">
            Min
            <input
              type="number" min={15} max={720} step={15}
              className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
            />
          </label>
          <label className="text-[11px] font-medium text-slate-500">
            Cost €
            <input
              type="number" min={0} step={1}
              className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </label>
        </div>
        <input
          className="mb-2 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Note (optional)"
        />
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 rounded-md bg-indigo-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/waypoint-activity", a.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(a.id);
      }}
      onDragEnd={onDragEnd}
      className={`group relative cursor-grab rounded-xl border bg-white p-3 shadow-sm transition active:cursor-grabbing ${
        conflicted ? "border-rose-300 ring-2 ring-rose-100" : "border-slate-200 hover:border-indigo-300 hover:shadow"
      } ${dragging ? "card-dragging" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-indigo-600">
            {a.startTime}–{endTime(a)}
            <span className="font-sans">{CATEGORY_EMOJI[a.category]}</span>
            {a.createdBy === "agent" && (
              <span className="rounded bg-violet-100 px-1 font-sans text-[10px] font-bold text-violet-700" title="Added by the agent">
                agent
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-800" title={a.title}>
            {a.title}
          </div>
          {a.notes && <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{a.notes}</div>}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-slate-700">{a.cost === 0 ? "free" : `€${a.cost}`}</div>
          <div className="text-[10px] text-slate-400">{a.durationMin} min</div>
        </div>
      </div>

      {/* hover controls */}
      <div className="absolute -top-2 right-2 hidden gap-1 group-hover:flex">
        <button
          title={a.locked ? "Unlock — agent may move this again" : "Lock — agent must NOT move this"}
          onClick={() => {
            dispatch({ type: "TOGGLE_LOCK", activityId: a.id });
            log("human", "lock", `${a.locked ? "unlocked" : "LOCKED"} “${a.title}”${a.locked ? "" : " — the agent cannot move it"}`);
          }}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] shadow ring-1 transition ${
            a.locked ? "bg-amber-100 ring-amber-300" : "bg-white ring-slate-200 hover:bg-amber-50"
          }`}
        >
          {a.locked ? "🔒" : "🔓"}
        </button>
        <button
          title="Edit"
          onClick={() => {
            setForm({ title: a.title, startTime: a.startTime, durationMin: String(a.durationMin), cost: String(a.cost), notes: a.notes ?? "" });
            setEditing(true);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] shadow ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          ✏️
        </button>
        <button
          title="Remove"
          onClick={() => {
            dispatch({ type: "REMOVE_ACTIVITY", activityId: a.id, actor: "human" });
            log("human", "remove_activity", `removed “${a.title}”`);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] shadow ring-1 ring-slate-200 transition hover:bg-rose-50"
        >
          ✕
        </button>
      </div>

      {a.locked && (
        <div className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] shadow" title="Locked by you — the agent must plan around this">
          🔒
        </div>
      )}
      {conflicted && (
        <div className="mt-1.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600" title="This activity overlaps another — ask the agent to fix it">
          ⚠ schedule conflict
        </div>
      )}
    </div>
  );
}
