import { useEffect, useMemo, useRef, useState } from "react";
import { TripProvider, reducer, useTrip } from "./store";
import type { Action } from "./types";
import { findConflicts } from "./utils";
import type { Bridge, WebMCPStatus } from "./webmcp";
import { setupWebMCP } from "./webmcp";
import { Header } from "./components/Header";
import { DayBoard, useConflictedIds } from "./components/DayBoard";
import { AgentFeed } from "./components/AgentFeed";
import { SimPanel } from "./components/SimPanel";

export default function App() {
  return (
    <TripProvider>
      <TripApp />
    </TripProvider>
  );
}

function TripApp() {
  const { state, dispatch, log } = useTrip();
  const [status, setStatus] = useState<WebMCPStatus | null>(null);
  const [simOpen, setSimOpen] = useState(false);

  // The tool layer reads state through a ref so tool calls always see the
  // latest board, and mutations are applied synchronously (reducer is pure)
  // so a tool's return value reflects its own change.
  const stateRef = useRef(state);
  stateRef.current = state;

  const bridge = useMemo<Bridge>(() => {
    const apply = (action: Action): typeof state => {
      const next = reducer(stateRef.current, action);
      stateRef.current = next;
      dispatch(action);
      return next;
    };
    return {
      getState: () => stateRef.current,
      addActivities: (inputs, actor) => {
        apply({ type: "ADD_ACTIVITIES", activities: inputs, createdBy: actor });
      },
      updateActivity: (id, changes, actor) => {
        apply({ type: "UPDATE_ACTIVITY", activityId: id, changes, actor });
        return true;
      },
      removeActivity: (id, actor) => {
        apply({ type: "REMOVE_ACTIVITY", activityId: id, actor });
        return true;
      },
      reorderDay: (dayId, orderedIds, actor) => {
        apply({ type: "REORDER_DAY", tripDayId: dayId, orderedIds, actor });
      },
      log: (actor, tool, detail) => dispatch({ type: "LOG", entry: { actor, tool, detail } }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const bridgeRef = useRef(bridge);

  useEffect(() => {
    let cancelled = false;
    setupWebMCP(bridgeRef.current).then((s) => {
      if (cancelled) return;
      setStatus(s);
      if (!s.supported) setSimOpen(true);
      log(
        "system",
        "webmcp",
        s.supported
          ? `registered ${s.toolCount} tools with document.modelContext — your agent is live`
          : "no WebMCP agent detected — running in preview mode"
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conflictedIds = useConflictedIds();
  const conflictCount = findConflicts(state).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <Header status={status} onToggleSim={() => setSimOpen((v) => !v)} />

      {status && !status.supported && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 sm:px-6">
          <span className="font-semibold">Preview mode.</span>{" "}
          Open Waypoint inside <span className="font-semibold">ChatGPT's in-app browser</span> or{" "}
          <span className="font-semibold">Chrome 149+</span> with{" "}
          <code className="rounded bg-amber-100 px-1">chrome://flags/#enable-webmcp-testing</code> to let a real AI agent
          drive this board — or{" "}
          <button onClick={() => setSimOpen(true)} className="font-semibold underline underline-offset-2 hover:text-amber-950">
            try the agent simulator
          </button>
          .
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row">
        <main className="min-w-0 flex-1">
          <div className="px-4 pt-5 sm:px-6">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{state.trip.name}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Plan it yourself — or tell your agent to.{" "}
              {conflictCount > 0 ? (
                <span className="font-semibold text-rose-600">
                  {conflictCount} schedule conflict{conflictCount > 1 ? "s" : ""} to resolve.
                </span>
              ) : (
                <span className="font-semibold text-emerald-600">Schedule is conflict-free.</span>
              )}
            </p>
          </div>
          <DayBoard conflictedIds={conflictedIds} />
        </main>
        <div className="lg:h-[calc(100vh-65px)]">
          <AgentFeed />
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white px-4 py-2.5 text-center text-[11px] text-slate-400 sm:px-6">
        Waypoint · built for The WebMCP Challenge · tools registered with{" "}
        <code className="rounded bg-slate-100 px-1">document.modelContext.registerTool()</code> · spec:{" "}
        <a className="underline underline-offset-2 hover:text-slate-600" href="https://github.com/webmachinelearning/webmcp" target="_blank" rel="noreferrer">
          webmachinelearning/webmcp
        </a>
      </footer>

      <SimPanel bridge={bridge} open={simOpen} onClose={() => setSimOpen(false)} />
    </div>
  );
}
