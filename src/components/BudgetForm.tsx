import { useState } from "react";
import { useTrip } from "../store";
import { budgetSummary, fmtMoney } from "../utils";

/**
 * A REAL HTML <form> that is ALSO a WebMCP tool — Waypoint covers both APIs
 * of the WebMCP spec (github.com/webmachinelearning/webmcp):
 *
 *  1. Declarative: the form carries the spec's proposed `toolname` /
 *     `tooldescription` / `toolparamdescription` / `toolautosubmit`
 *     attributes, so WebMCP browsers that ship the declarative API expose
 *     it to agents automatically — no JS registration needed.
 *  2. Imperative (fallback, works in today's ChatGPT / Chrome 149): the same
 *     tool is registered via document.modelContext.registerTool() in
 *     src/webmcp.ts under the SAME name, calling the same logic.
 *
 * Either way, an agent filling this form changes the budget the human sees.
 */
export function BudgetForm() {
  const { state, dispatch, log } = useTrip();
  const [amount, setAmount] = useState(String(state.trip.budget));
  const [reason, setReason] = useState("");
  const b = budgetSummary(state);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value <= 0 || value === state.trip.budget) return;
    const prev = state.trip.budget;
    const why = reason.trim();
    dispatch({ type: "SET_BUDGET", budget: value });
    log(
      "human",
      "set_trip_budget",
      `changed budget ${fmtMoney(prev, state.trip.currency)} → ${fmtMoney(value, state.trip.currency)}${why ? ` — ${why}` : ""}`
    );
    setReason("");
  };

  return (
    <form
      {...{
        toolname: "set_trip_budget",
        tooldescription:
          "Update the total trip budget in EUR. The human sees the change instantly on their budget bar — always include a short reason, and confirm with the human before large changes.",
        toolautosubmit: "",
      }}
      onSubmit={submit}
      className="border-b border-slate-100 px-4 py-3"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-slate-800">Trip budget</h2>
        <span className={`text-[11px] font-semibold ${b.overBudget ? "text-rose-600" : "text-slate-500"}`}>
          {b.overBudget ? `${fmtMoney(Math.abs(b.remaining), b.currency)} over` : `${fmtMoney(b.remaining, b.currency)} left`}
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        <label className="flex-1 text-[11px] font-medium text-slate-500">
          Amount €
          <input
            {...{ toolparamdescription: "New total budget in EUR (positive number)." }}
            name="budget"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-0.5 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="mt-[18px] h-[34px] shrink-0 rounded-md bg-indigo-600 px-3 text-xs font-semibold text-white transition hover:bg-indigo-500"
        >
          Update
        </button>
      </div>
      <input
        {...{ toolparamdescription: "Short reason for the budget change, shown to the human." }}
        name="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (e.g. adding a Sintra day trip)"
        className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
      />
    </form>
  );
}
