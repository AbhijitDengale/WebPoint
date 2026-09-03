import { useTrip } from "../store";

const ACTOR_STYLE = {
  human: { dot: "bg-sky-500", label: "You", emoji: "🙋" },
  agent: { dot: "bg-violet-500", label: "Agent", emoji: "🤖" },
  system: { dot: "bg-slate-400", label: "Waypoint", emoji: "🧭" },
} as const;

/**
 * The shared activity log — the "you can SEE the agent working beside you"
 * half of the collaboration. Every tool call from either side lands here.
 */
export function AgentFeed() {
  const { state } = useTrip();
  const entries = [...state.feed].reverse().slice(0, 14);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-slate-200 bg-white lg:w-[320px]">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-bold text-slate-800">Shared activity</h2>
        <p className="text-[11px] text-slate-500">Human and agent actions on the same board, live.</p>
      </div>
      <div className="thin-scroll flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {entries.map((e) => {
          const s = ACTOR_STYLE[e.actor];
          return (
            <div key={e.id} className="flex gap-2.5">
              <div className="flex flex-col items-center pt-1">
                <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <span className="mt-1 w-px flex-1 bg-slate-100" />
              </div>
              <div className="min-w-0 pb-0.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] font-bold text-slate-700">
                    {s.emoji} {s.label}
                  </span>
                  <span className="rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-500">{e.tool}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-400">{e.at}</span>
                </div>
                <p className="text-[12px] leading-snug text-slate-600">{e.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
