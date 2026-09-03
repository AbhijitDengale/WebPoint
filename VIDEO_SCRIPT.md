# 3-minute demo video script — Waypoint × WebMCP

**Setup before recording:** screen recorder ready (Win+G or OBS), ChatGPT desktop app signed in with the Waypoint live URL open in its in-app browser, sample trip freshly reset (click "Reset demo"). Record at 1920×1080, speak clearly, don't rush.

---

### [0:00–0:20] — Hook (screen: the Waypoint board, cursor idle)

> "Trip planners are single-player, and AI travel agents that book through a backend leave your screen behind — you lose control and context. **Waypoint is the third model: an AI agent that works *inside the page* with you, through WebMCP.** Watch what that feels like."

### [0:20–0:50] — The human side (screen: drag an activity, lock one)

> "Here's my Lisbon weekend. Everything I can do, I do in the UI — I drag the flea market before brunch… and when something truly can't move, I lock it. This 🔒 on Belém Tower is a hard constraint: I'm telling the agent *plan around this, not through it.*"

### [0:50–1:40] — The agent works inside the page (screen: ChatGPT panel + board)

> "Now I ask my agent — which is running in the same browser as the page — to fix my schedule. Note the board's warning: Day 1 has an overlap, and I'm €26 under budget."
>
> **Type into ChatGPT:** *"My tram ride and Alfama tour overlap. Fix Day 1 around my locked items, and keep the whole trip under €120."*
>
> "It calls `get_itinerary` — one call gives it every activity, my locks, conflicts, and budget… then `update_activity` — and *look at the board* — the walking tour just moved to 11:30, live. The shared feed on the right logs every tool call, so I can audit exactly what my agent did."

### [1:40–2:20] — The contract (screen: try to break a lock, then conflicts)

> "Here's the part only WebMCP makes natural. Ask it to reorder the day any way it likes:"
>
> **Type:** *"Reorder Day 1 to group things geographically — even if it means moving my lunch."*
>
> "The `reorder_day` tool **refuses** — 'Position 4 is locked by the human.' The agent apologizes and reorders *around* it. The app enforces my constraints as part of the tool contract — not as a prompt suggestion."
>
> "And it's not just agent-controlled: `find_conflicts` runs the app's own deterministic audit. The app does math; the agent does judgment; I keep the pen."

### [2:20–2:50] — How it's built (screen: src/webmcp.ts briefly)

> "Under the hood it's one honest file: eight tools registered with `document.modelContext.registerTool` — JSON-Schema inputs, and every mutation *returns the new schedule, remaining conflicts, and budget* so the agent self-corrects without extra calls. Even the budget box is a real HTML form carrying the spec's declarative tool attributes — one app, both WebMCP APIs. No backend, no API keys — the agent in your browser IS the AI. There's even a simulator so you can try the same tools in any browser."

### [2:50–3:00] — Close

> "Waypoint: the web, where your agent works *with* you — on *your* screen. Built with WebMCP."

---

## Upload notes
- Title: **Waypoint — a trip planner where your AI agent works inside the page (WebMCP)**
- Description: 2 lines + live URL + repo URL. Public. Captions on if possible.
- Keep under 3:00 — Devpost hard requirement.
