# 🧭 Waypoint — plan trips with your agent, beside you

**Waypoint is a collaborative trip itinerary planner built for [The WebMCP Challenge](https://webmcp.devpost.com).**
You plan in the UI. Your AI agent works **inside the same page** through [WebMCP](https://github.com/webmachinelearning/webmcp) tools — adding activities, fixing schedule conflicts, re-ordering days geographically, auditing your budget — while you watch every change land on your board in real time.

> **Live demo:** [https://abhijitdengale.github.io/WebPoint/](https://abhijitdengale.github.io/WebPoint/) · **Demo video:** [https://youtu.be/-OMYh8iioiI](https://youtu.be/-OMYh8iioiI)

---

## Why "better together"?

Existing trip planners are single-player. Backend MCP integrations bypass the product's UI entirely — the agent works in a chat window on a hidden copy of your data. WebMCP enables a third model, and Waypoint is built around it:

| | Role in Waypoint |
|---|---|
| 🙋 **Human** | Drags, edits, and — crucially — **locks** must-do activities with 🔒. Locks are hard constraints. |
| 🤖 **Agent** | Does the judgment work: researches and adds activities, resolves conflicts, optimizes a day's order around locked items, trims budget. |
| 🧮 **The app** | Does the deterministic math — overlap detection, budget totals — and **returns it to the agent as structured JSON** after every mutation, so the agent can self-correct without extra round-trips. |
| 📡 **Shared feed** | Every action from either side lands in one visible activity log. You *see* your agent working beside you. |

**The moment that was impossible before WebMCP:** you lock your ✈️-arrived-late lunch at 13:30, tell your agent *"the tram and the walking tour overlap, fix Day 1 around my locked lunch"* — and the agent reads the schedule through `get_itinerary`, calls `update_activity`, and you watch the card slide to 11:30 on your screen. Neither a form nor a chatbot-alone can do that.

## The eight WebMCP tools — imperative *and* declarative

Registered from `src/webmcp.ts` via `document.modelContext.registerTool()`:

| Tool | What the agent can do | Agent-friendly returns |
|---|---|---|
| `get_itinerary` | Read the full trip: ordered days, times, costs, **which items are locked**, conflicts, budget | complete JSON state |
| `add_activities` | Add up to 8 activities at once | added items + updated schedules + **new conflicts created** + budget impact |
| `update_activity` | Change any activity's time, duration, cost, notes… | updated schedule + remaining conflicts + budget |
| `remove_activity` | Cut an activity | updated schedule + freed budget |
| `reorder_day` | Re-order a day (e.g. geographically) — **refuses to move 🔒 locked items and explains why** | final order + conflicts |
| `find_conflicts` | Run the app's deterministic schedule audit | conflict pairs + budget overage |
| `get_budget_summary` | Full money picture | totals, per-day, by category, remaining |
| `set_trip_budget` | Change the total budget (with a reason, shown to the human) | previous/new budget + over/under status |

Design notes:
- **Both WebMCP APIs in one app.** `set_trip_budget` is also a real HTML `<form>` carrying the spec's proposed **declarative** attributes (`toolname`, `tooldescription`, `toolparamdescription`, `toolautosubmit`) — see `src/components/BudgetForm.tsx`. Today's agents get it via the imperative registration; browsers that ship the declarative API expose the same form to agents automatically.
- **Agents cannot lock or unlock.** Locking is a human-only control — the collaboration contract. `reorder_day` validates locked positions and returns a human-readable refusal.
- **Every mutating tool returns the post-state** (schedule, conflicts, budget), so one agent turn = one verified change.
- **No backend, no API keys.** The browsing agent *is* the AI. Waypoint is a static site — the whole intelligence comes from the agent in the loop.

## Try it with a real agent

1. **ChatGPT desktop app** — open the live URL in ChatGPT's in-app browser (WebMCP is supported there out of the box). Then just ask: *"Fix the schedule conflicts in my Lisbon trip, keep everything under €120, and don't touch my locked items."*
2. **Chrome 149+** — enable `chrome://flags/#enable-webmcp-testing`, open the live URL, and drive it from any WebMCP-capable agent.
3. **No WebMCP browser?** Waypoint ships with an in-app **agent simulator** that executes the exact same tool implementations, so you can feel the interaction model anywhere.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/
```

## Architecture (for judges in a hurry)

- `src/webmcp.ts` — **the file that matters.** Tool definitions, JSON-Schema `inputSchema`s, lock enforcement, and the shared implementations (also used by the simulator).
- `src/components/BudgetForm.tsx` — the **declarative-API** form: a real `<form>` with the spec's proposed tool attributes, doubling as the visible budget control.
- `src/store.tsx` — pure reducer trip state + localStorage. The tool layer applies actions synchronously so a tool's return value always reflects its own change.
- `src/utils.ts` — deterministic conflict detection & budget math (the "app does math" half).
- `src/components/` — the human's board: drag-and-drop day columns, inline editing, lock toggles, conflict badges, and the shared activity feed.

## License

[MIT](LICENSE) — built by Abhijit Dengale for The WebMCP Challenge.
