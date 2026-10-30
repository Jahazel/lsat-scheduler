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

Give every open issue exactly one of `ready-for-agent` or `ready-for-human`. Add it when you create the issue.

| Issue | Ready label |
| --- | --- |
| Has the `bug` label | `ready-for-agent`, next to `bug` |
| Has the `design` label | `ready-for-human` |
| Any other task that a person must do | `ready-for-human` |
| All other issues | `ready-for-agent` |

Find open issues with no ready label:

```sh
gh issue list --state open --limit 200 --json number,labels --jq '.[] | select([.labels[].name] | (index("ready-for-agent") or index("ready-for-human")) | not) | .number'
```

## Agent factory labels

The local agent factory uses these labels. A dispatcher thread starts one worker per issue. The labels show where each issue is.

| Label | Meaning |
| --- | --- |
| `agent:implement` | The owner wants an agent run to start on this issue. Only the owner adds it. One exception: the weekly gardener adds it to its own report issue after its PR opens, so the factory keeps that PR up to date. |
| `agent:in-progress` | An agent has claimed this issue and is working on it. |
| `agent:blocked` | The agent is stuck. Its comment on the issue says why and what the owner must decide. |

## Gardening labels

The weekly gardener (`.github/workflows/factory-gardener.yml`) uses these labels.

| Label | Meaning |
| --- | --- |
| `gardening:report` | One weekly gardening pass. The issue holds its report. The orchestrator never starts a worker on it. |
| `gardening:lesson` | The owner fixed an agent mistake by hand. The next pass handles it first. |
| `gardening:cleanup` | Finishes a gardening PR. The owner adds `agent:implement` after that PR merges. |
| `gardening:refactor-idea` | A deeper module the gardener suggests. The owner adds `agent:implement` to start it, or leaves it open. |

`ready-for-agent` still means "the issue has enough detail for an agent to implement it." It does not start a run by itself.
