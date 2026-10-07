<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Shared workspace memory

- The outer workspace's long-term memory starts at `../wiki/index.md`.
- Read it only when relevant cross-project or durable context is needed, then follow
  only relevant links.
- For durable facts, decisions, or relationships learned while working here, follow
  the write workflow in `../wiki/index.md`.
- This project's files remain authoritative for its current code and behavior. Do not
  copy wiki content into this project.

## Agent skills

Read `docs/agents/issue-tracker.md` before issue or pull-request work.
Read `docs/agents/triage-labels.md` before sorting or labeling issues.
Read `docs/agents/domain.md` before exploring domain concepts.
