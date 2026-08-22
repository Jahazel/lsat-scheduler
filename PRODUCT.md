# Product

## Register

product

## Users

The primary user is [partner], who runs the tutoring business this tool serves. v1 is single-user — no student accounts yet. [Partner] opens the tool on a weekly cadence to:

- Upload a student's 7Sage analytics screenshot and review the AI-extracted data before it's trusted
- Check or regenerate a student's Monday-Sunday study schedule for the coming week
- Manage the student roster (intake, per-student view)

The job to be done is fast, low-friction weekly review, not deep daily use. Every screen should let [partner] verify data and confirm a schedule quickly, then get out.

## Product Purpose

Automates weekly LSAT study schedule generation, replacing a manual process [partner] used to do by hand. The scheduling logic itself is deterministic (not LLM-generated); AI's only role is extracting structured data from uploaded 7Sage screenshots, which a human then reviews before it's trusted. Success looks like: [partner] can process a student's weekly update and trust the resulting schedule in under a minute, with clear visibility into what the AI extracted versus what's been human-confirmed.

## Brand Personality

Calm and professional. Understated, trustworthy, gets out of the way. This is a weekly tool, not a daily obsession — it should never feel like it demands attention or adds friction. Confidence comes from clarity (clean hierarchy, legible data, obvious next action), not from decoration.

Reference: the Claude Console dashboard (platform.claude.com), specifically:
- Colorful solid icon tiles anchoring each card
- Generous whitespace and minimal chrome (thin borders, no heavy shadows)
- Small rounded pill/tag badges for quick-scan metadata
- Flat, simple left sidebar navigation

Explicitly the **light** variant of that aesthetic, not dark mode.

## Anti-references

Dense spreadsheet/admin-panel look: cramped tables, tiny text, no visual hierarchy, pure data density. This tool handles a small number of students and a weekly cadence — it should never look or feel like an ops dashboard drowning in rows.

## Design Principles

1. **Calm over dense** — every screen reads as a handful of at-a-glance moments, not a table to parse.
2. **Weekly ritual, not daily grind** — optimize for fast orientation on a cold open, not for a power user living in the tool all day.
3. **Make AI-extracted data verifiable, not opaque** — since analytics come from AI vision extraction reviewed by a human, the UI should make it obvious what's extracted versus confirmed, and easy to correct.
4. **Single-user today, built to grow** — v1 serves one partner, but the structure should tolerate future multi-user/self-serve access without a redesign.
5. **Status without relying on color alone** — schedule/data states (extracted, confirmed, needs review) should be legible via icon, label, or shape, not color alone.

## Accessibility & Inclusion

Standard WCAG AA: solid color contrast, full keyboard support, no reliance on color alone to convey state.
