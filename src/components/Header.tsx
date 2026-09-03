import type { WebMCPStatus } from "../webmcp";
import { useTrip } from "../store";
import { budgetSummary } from "../utils";

function StatusChip({ status }: { status: WebMCPStatus | null }) {
  if (status == null) {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
        Connecting to agent…
      </span>
    );
  }
  if (status.supported) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"
        title="document.modelContext is live — your agent can see and use these tools"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        WebMCP live · {status.toolCount} tools
      </span>
    );
  }
  return (
    <span
      className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200"
      title="Open in ChatGPT's in-app browser or Chrome 149+ with chrome://flags/#enable-webmcp-testing"
    >
      Preview mode — no WebMCP in this browser
    </span>
  );
}

export function Header({ status, onToggleSim }: { status: WebMCPStatus | null; onToggleSim: () => void }) {
  const { state, dispatch, log } = useTrip();
  const b = budgetSummary(state);
  const pct = Math.min(100, Math.round((b.plannedTotal / Math.max(b.budget, 1)) * 100));

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl shadow-sm">
            🧭
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-slate-900">Waypoint</div>
            <div className="text-xs text-slate-500">{state.trip.destination}</div>
          </div>
        </div>

        <div className="hidden min-w-[180px] flex-1 sm:block">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-slate-600">
              Budget {b.currency}
              {Math.round(b.plannedTotal).toLocaleString("en-US")} of {b.currency}
              {b.budget.toLocaleString("en-US")}
            </span>
            <span className={b.overBudget ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
              {b.overBudget ? `over by ${b.currency}${Math.abs(Math.round(b.remaining)).toLocaleString("en-US")}` : `${b.currency}${Math.round(b.remaining).toLocaleString("en-US")} left`}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${b.overBudget ? "bg-rose-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <StatusChip status={status} />
          <button
            onClick={() => {
              dispatch({ type: "RESET" });
              log("system", "reset", "trip reset to the sample Lisbon plan");
            }}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Reset demo
          </button>
          <button
            onClick={onToggleSim}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            🤖 Agent simulator
          </button>
        </div>
      </div>
    </header>
  );
}
