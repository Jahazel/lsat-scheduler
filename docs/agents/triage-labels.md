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

## Agent factory labels

The local agent factory uses these labels. A dispatcher thread starts one worker per issue. The labels show where each issue is.

| Label | Meaning |
| --- | --- |
| `agent:implement` | The owner wants an agent run to start on this issue. Only the owner adds it. |
| `agent:in-progress` | An agent has claimed this issue and is working on it. |
| `agent:blocked` | The agent is stuck. Its comment on the issue says why and what the owner must decide. |

`ready-for-agent` still means "the issue has enough detail for an agent to implement it." It does not start a run by itself.
