import { useState } from "react";
import type { Bridge } from "../webmcp";
import { runToolLogic, TOOL_NAMES } from "../webmcp";

interface Preset {
  label: string;
  tool: string;
  input: string;
}

const PRESETS: Preset[] = [
  {
    label: "🔍 Find conflicts",
    tool: "find_conflicts",
    input: "{}",
  },
  {
    label: "🛠️ Fix the Day 1 overlap",
    tool: "update_activity",
    input: '{ "activityId": "a3", "startTime": "11:30" }',
  },
  {
    label: " ➕ Add a food stop",
    tool: "add_activities",
    input:
      '{ "activities": [ { "tripDayId": "day-1", "title": "Ginjinha tasting stop", "startTime": "17:30", "durationMin": 30, "cost": 4, "category": "food", "notes": "Local sour-cherry liqueur, served standing at the counter." } ] }',
  },
  {
    label: "↕️ Reorder Day 3",
    tool: "reorder_day",
    input: '{ "tripDayId": "day-3", "orderedActivityIds": ["a11", "a10"] }',
  },
  {
    label: "💰 Budget check",
    tool: "get_budget_summary",
    input: "{}",
  },
];

/**
 * In-browser agent SIMULATOR.
 *
 * When the page isn't running inside a WebMCP agent (regular Chrome, Safari…),
 * this panel calls the exact same tool implementations an agent would invoke
 * through document.modelContext — so you can feel the collaboration model
 * anywhere. Inside a WebMCP agent, use your agent instead: these tools are live.
 */
export function SimPanel({ bridge, open, onClose }: { bridge: Bridge; open: boolean; onClose: () => void }) {
  const [tool, setTool] = useState("find_conflicts");
  const [input, setInput] = useState("{}");
  const [result, setResult] = useState<string>("");

  const run = async () => {
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(input || "{}");
    } catch {
      setResult("❌ Input is not valid JSON");
      return;
    }
    const res = await runToolLogic(bridge, tool, parsed);
    setResult(JSON.stringify(res, null, 2));
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-h-[75vh] w-[92vw] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div>
          <div className="text-sm font-bold text-slate-800">🤖 Agent simulator</div>
          <div className="text-[10px] text-slate-500">Runs the exact same WebMCP tool implementations</div>
        </div>
        <button onClick={onClose} className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600" title="Close">
          ✕
        </button>
      </div>

      <div className="thin-scroll flex-1 space-y-3 overflow-y-auto p-4">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                setTool(p.tool);
                setInput(p.input);
                setResult("");
              }}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="block text-[11px] font-semibold text-slate-500">
          Tool
          <select
            value={tool}
            onChange={(e) => setTool(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs text-slate-700"
          >
            {TOOL_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[11px] font-semibold text-slate-500">
          Input (JSON)
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            spellCheck={false}
            className="thin-scroll mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs"
          />
        </label>

        <button
          onClick={run}
          className="w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
        >
          ▶ Execute tool call
        </button>

        {result && (
          <div>
            <div className="mb-1 text-[11px] font-semibold text-slate-500">Result returned to the agent</div>
            <pre className="thin-scroll max-h-44 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[10px] leading-relaxed text-emerald-300">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
