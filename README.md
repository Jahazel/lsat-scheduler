# LSAT Scheduler

A web app that automates weekly LSAT study schedule generation for [partner]'s tutoring business, replacing a manual process. Students get a Monday–Sunday day-by-day study plan that regenerates every week based on their latest 7Sage performance data.

## Status: Design phase complete, no code written yet

All the business rules, the data model, and the scheduling engine's logic have been worked out and written up as three reference docs — not yet built. Nothing in this repo executes anything yet.

## The Docs

Three companion documents, meant to be read in order. Each is a private Claude Artifact — use the share menu on each link if you want [partner] to be able to open them.

1. **[The LSAT Rulebook](https://claude.ai/code/artifact/fb4b1da9-115a-43bc-90e4-3fef792cef03)** — plain-English explainer of the LSAT concepts the rules depend on (LR vs. RC, the PT-130 split, difficulty bands, etc.). No LSAT background assumed.
2. **[The Engine Blueprint](https://claude.ai/code/artifact/2bb4992b-32cb-4d81-b08b-676e57350096)** — the data model (Student, Analytics Snapshot, Rules Config, Weekly Schedule) and the step-by-step scheduling logic, in plain sentences plus reference pseudocode.

## Key decisions made so far

- **Data source:** 7Sage has no API or export. Analytics come in via screenshot/PDF upload, extracted by AI vision, and reviewed by a human before they're trusted — no credential sharing or scraping.
- **Engine output is a shopping list, not real questions.** The engine names a question type, count, difficulty ceiling, and PT-130 side — not actual question numbers. No tagged LSAT question bank needs to be built or licensed.
- **Rest day is fixed at Wednesday** for every student (not chosen at intake) — splits the four drilling days evenly across the week.
- **Sunday's review time is capped by weekend capacity**, the same way weekday drilling is capped by weekday capacity.
- **Scheduling logic is deterministic, not LLM-generated.** AI's role is limited to screenshot extraction and surfacing override patterns — it never decides the schedule or edits the rules itself.

## Next steps

- [ ] Pick a tech stack
- [ ] Scaffold the actual repo (init, project structure, tooling)
- [ ] Implement the data model
- [ ] Implement the scheduling engine from the Engine Blueprint pseudocode
- [ ] Build the screenshot → analytics extraction pipeline
- [ ] Build the data-entry UI (partner side) and schedule view (student side)
- [ ] Build the override-logging + pattern-flagging piece from the Feedback Loop

This list lives here for now because there's no codebase yet. Once real development starts, ongoing task tracking moves to GitHub Issues (created via `/plan` per the usual workflow) — this section will shrink to just "what's not started yet" at that point.
