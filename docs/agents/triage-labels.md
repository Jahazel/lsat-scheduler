# Triage labels

Use these labels when a skill sorts issues by the next action they need.

| Role in Matt's skills | Label in this tracker | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | An admin must evaluate the issue. |
| `needs-info` | `needs-info` | The issue needs more information from its author. |
| `ready-for-agent` | `ready-for-agent` | The issue has enough detail for an agent to implement it. |
| `ready-for-human` | `ready-for-human` | A person must implement the issue. |
| `wontfix` | `wontfix` | The project will not act on the issue. |

Use the label in this tracker when a skill names its corresponding role.
This file records the local mapping. It does not create labels on GitHub.

## Every open issue gets one ready label

Give every open issue exactly one of `ready-for-agent` or `ready-for-human`, unless it is a parent issue. Add the label when you create the issue, with `gh issue create --label`. Do this even though `ready-for-agent` starts a factory run: that run is the point of the label. Use the first row that matches.

| Issue | Ready label |
| --- | --- |
| Has sub-issues (a parent issue). It closes when its sub-issues close. When you add the first sub-issue, remove its ready label. | none |
| Has an open question for the owner, or needs a step only a person can do | `ready-for-human` |
| A spec that tickets split into work | `ready-for-human` |
| Has the `design` label | `ready-for-human` |
| Has the `bug` label | `ready-for-agent`, next to `bug` |
| All other issues | `ready-for-agent` |

Find open issues with no ready label, parent issues left out:

```sh
gh api --paginate 'repos/{owner}/{repo}/issues?state=open&per_page=100' --jq '.[] | select(.pull_request | not) | select((.sub_issues_summary.total // 0) == 0) | select([.labels[].name] | (index("ready-for-agent") or index("ready-for-human")) | not) | .number'
```

The ready label check (`.github/workflows/ready-label-check.yml`) catches a missed label. Ten minutes after an issue opens, it adds `ready-for-human` and a comment to an open issue that has no ready label and no sub-issues. Its label does not start the factory. The owner changes it to `ready-for-agent` when an agent can do the work.

The `/triage` skill is optional. The owner runs it only to sort many issues at once or to examine one issue closely. Labels do not depend on it.

## Agent factory labels

The agent factory (`.github/workflows/factory-orchestrator.yml`) uses these labels. It starts one worker per issue. The labels show where each issue is.

| Label | Meaning |
| --- | --- |
| `agent:in-progress` | An agent has claimed this issue and is working on it. |
| `agent:blocked` | The factory stopped work on this issue. Its comment says why. To retry, the owner removes the label. |

The factory pushes only to `factory/issue-<n>-<slug>-<run>` branches. Keep your own branches on `issue-<n>-*`. When you close a factory PR without merging it, the factory blocks its issue and starts no new run on it until you remove `agent:blocked`.

## Gardening labels

The weekly gardener (`.github/workflows/factory-gardener.yml`) uses these labels.

| Label | Meaning |
| --- | --- |
| `gardening:report` | One weekly gardening pass. The issue holds its report. The orchestrator starts no implement worker on it; a resolve worker may update its PR. |
| `gardening:lesson` | The owner fixed an agent mistake by hand. The next pass handles it first. |
| `gardening:cleanup` | Finishes a gardening PR. The owner adds `ready-for-agent` after that PR merges. |
| `gardening:refactor-idea` | A deeper module the gardener suggests. The owner adds `ready-for-agent` to start it, or leaves it open. |

`ready-for-agent` starts a factory run when the owner adds it. The factory skips an issue that has sub-issues, waits on an open "Blocked by" issue, or already has an open PR.
