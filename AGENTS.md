<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git workflow

- Work directly in the project's existing checkout. Do not create Git worktrees or
  branches unless the user asks.
- Do not commit, push, open a pull request, or merge until the user has reviewed the
  changes and given explicit approval.

## Shared workspace memory

- The outer workspace's long-term memory starts at `../wiki/index.md`.
- Read it only when relevant cross-project or durable context is needed, then follow
  only relevant links.
- For durable facts, decisions, or relationships learned while working here, follow
  the write workflow in `../wiki/index.md`.
- This project's files remain authoritative for its current code and behavior. Do not
  copy wiki content into this project.
