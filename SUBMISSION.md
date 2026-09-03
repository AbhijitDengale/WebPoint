# Devpost submission text — paste into the submission form

## Project name
Waypoint — plan trips with your agent, beside you

## Short pitch (tagline field)
A trip planner where your AI agent works INSIDE the page with you — visible, constrained by your 🔒 locks, and corrected by the app's own math.

## Description (main text)

### The problem
Trip planning is single-player. You shuffle tabs, copy opening hours into notes, and do the arithmetic yourself. Backend MCP integrations flip to the other extreme: the agent books things in a chat window, on a hidden copy of your data, while you stare at a spinner — no UI, no control, no shared context.

### What Waypoint does
Waypoint is a trip itinerary planner where the agent works *inside the same page*. It registers eight WebMCP tools (`get_itinerary`, `add_activities`, `update_activity`, `remove_activity`, `reorder_day`, `find_conflicts`, `get_budget_summary`, `set_trip_budget`), so an agent in ChatGPT's in-app browser (or a WebMCP-enabled browser) can read and modify the exact board you're looking at. Every agent action lands on your screen instantly, and every action from either side lands in one shared activity feed.

### Why is this use case a strong fit for WebMCP?
Because planning a trip is inherently a *negotiation* between human constraints and agent capabilities. WebMCP lets the app express that contract precisely:

- **Human constraints as data.** Items you lock with 🔒 in the UI are part of the itinerary state. `reorder_day` *refuses* to move a locked item and returns a human-readable explanation — the agent must plan around you, not through you.
- **The app does math, the agent does judgment.** Overlap detection and budget totals are computed deterministically by the app and *returned as JSON from every mutating tool*, so the agent can verify and self-correct its own changes in a single turn.
- **Structured, not scraped.** The agent never has to guess at DOM. The schema documents the domain (24h times, minute durations, categories, day ids), and `get_itinerary` gives complete situational awareness in one call.

### How does it improve the user experience?
You keep your normal UI — drag, edit, lock — and gain an agent that operates at conversation speed on the same state. No copy-pasting between a chat and the app; no "trust me" automation. The shared feed makes the agent's work *auditable*: every tool call is logged with a human-readable summary, and conflicts/budget warnings are visible badges on the board itself.

### What can people and agents do together that was difficult or impossible before?
Lock your must-do lunch at 13:30 and say: *"The tram and the Alfama tour overlap — fix Day 1, keep my locked lunch, and stay under €120."* The agent reads the itinerary, calls `update_activity` to slide the walking tour to 11:30, sees from the returned JSON that the schedule is now conflict-free and within budget, and you watch the card move on your board. Iterative, constraint-respecting, fully visible co-editing of a live product — that's the WebMCP difference.

### How did you implement WebMCP?
`src/webmcp.ts` registers each tool with `document.modelContext.registerTool({ name, description, inputSchema, execute })`, per the [WebMCP spec](https://github.com/webmachinelearning/webmcp). Tool `execute` functions dispatch actions into a pure reducer store (applied synchronously so returns reflect the change) and return compact agent-oriented JSON: post-change schedules, newly created conflicts, budget deltas, and actionable `hint` fields. Human-only controls (locking) are enforced in the tool layer: agents attempting to move locked items or change lock state get a refusal with an explanation. Waypoint also speaks the spec's **declarative API**: the visible budget form carries the proposed `toolname` / `tooldescription` / `toolparamdescription` / `toolautosubmit` attributes, so the same form is a WebMCP tool for browsers that ship declarative registration — no extra code. For visitors without a WebMCP browser, an in-app simulator executes the identical implementations, so nobody sees a dead page.

### Credits
Built by Abhijit Dengale in one sitting for The WebMCP Challenge. Stack: React + TypeScript + Vite + Tailwind. No backend. Spec: webmachinelearning/webmcp.

---

## Checklist before submitting (do these!)
- [ ] Deploy live URL (Netlify Drop — see DEPLOY_STEPS in chat)
- [ ] Put the live URL + YouTube link into README.md, commit, push
- [ ] Public GitHub repo with MIT LICENSE visible on the repo page ✅ (LICENSE file included)
- [ ] Upload <3-min video to YouTube (public, with audio) — script in VIDEO_SCRIPT.md
- [ ] Submit on Devpost BEFORE 1:30 PM IST · do not touch repo/site after submitting
