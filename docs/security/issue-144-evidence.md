# Issue 144 evidence

Recorded with a one-off local wizard, 2026-10-19 01:33 UTC to 2026-10-19 23:05 UTC.
These are live observations by the owner, except where a row names a workflow run the agent started.
This file holds no key, ping URL, password, or connection string.

## Production backups

| Check | State | Note |
| --- | --- | --- |
| Daily backups, kept 14 days | passed | Set to 00:00 UTC at 18:45 UTC, then moved to 22:00 UTC at 20:51 UTC so the first backup came sooner. Weekly and monthly retention stay off: they would exceed the 30-day limit. |
| Restore window of 1 day | passed | Read back 2026-10-19 18:45 UTC |
| First scheduled backup no more than 24 hours old | passed | [Run 39339260468](https://github.com/Jahazel/lsat-scheduler/actions/runs/39339260468): `fresh`, newest backup 1.0 hours old (about 22:04 UTC). |

## Production checker access

| Check | State | Note |
| --- | --- | --- |
| Separate monitoring account with Viewer on `drillmap-production` only | passed | Neon org Collaborator. Its console shows 1 project. Its own org is empty. Two-factor sign-in on (owner, 2026-10-19 20:45 UTC). |
| Key stored only in the `backup-checker-production` environment | passed | Not a repo-level secret |
| Production key refused on the copy project | passed | [Run 39312880982](https://github.com/Jahazel/lsat-scheduler/actions/runs/39312880982): `checker-failed`. Owner received both DOWN emails at 19:40 UTC. |
| Copy key refused on the production project | passed | [Run 39302444922](https://github.com/Jahazel/lsat-scheduler/actions/runs/39302444922): `checker-failed`. Owner received both DOWN emails at 18:26 UTC. Recovery [run 39302778864](https://github.com/Jahazel/lsat-scheduler/actions/runs/39302778864): `fresh`, both UP emails at 18:28 UTC. |

Permissions model: a Neon personal key reads every project its account can see. Each checker therefore uses its own account, which sees one project.

## Production alerts

The two production Healthchecks checks were replaced on 2026-10-19 because earlier screenshots exposed their ping URLs. The new checks use Cron `37 10 * * *`, UTC, 2-hour grace, POST only, body filter off, and email on. The environment secrets were updated at 20:38:42 and 20:39:30 UTC. The owner deleted the old checks at 20:44 UTC.

| Check | State | Note |
| --- | --- | --- |
| Missing backup alerts | passed | [Run 39321216001](https://github.com/Jahazel/lsat-scheduler/actions/runs/39321216001): `no-snapshots`, `expired: []`. Backup check DOWN, retention check UP. Owner received the DOWN email at 20:40 UTC. |
| Recovery after the first backup | passed | [Run 39339260468](https://github.com/Jahazel/lsat-scheduler/actions/runs/39339260468): `fresh`, `expired: []`. Backup check UP. Owner received the UP email at 23:05 UTC. |

```text
2026-10-19 20:40 UTC  run 39321216001  {"ok":false,"status":"no-snapshots","newestAgeHours":null,"expired":[]}
2026-10-19 23:05 UTC  run 39339260468  {"ok":true,"status":"fresh","newestAgeHours":1.01,"expired":[]}
```

## Copy alerts

| Check | State | Note |
| --- | --- | --- |
| A missing run alerts | passed | Copy switch off from 01:15 UTC. Both copy checks briefly set to `0 2 * * *`, 1-minute grace. Owner received both DOWN emails at 02:01 UTC. Schedule restored to `37 10 * * *`, 2-hour grace, at 18:22 UTC. |
| Recovery after the missed run | passed | [Run 39301969236](https://github.com/Jahazel/lsat-scheduler/actions/runs/39301969236): `fresh`, `expired: []`. Owner received both UP emails at 18:23 UTC. |

## Restore rehearsal on the copy

| Check | State | Note |
| --- | --- | --- |
| Restore to a new isolated branch | passed | Backup from 2026-10-19 00:00 UTC. Restore ran 19:55:29 to 19:57:58 UTC, under 3 minutes. New branch `branch_from_snapshot_Oct 19, 2026 2:56 PM CDT` (`br-fancy-lab-b4deyalf`). |
| One-day data-loss target | passed | Data age at restore start: 1195 minutes (under 24 hours) |
| Six table counts match | passed | Source and restored: `accounts=1 students=0 leads=0 analytics_snapshots=0 weekly_schedules=0 activity_check_ins=0`. Owner screenshots of the Neon SQL Editor, 20:03 and 20:04 UTC. |
| Restored branch deleted with owner approval | passed | 20:09 UTC. The copy has 1 branch, `production`. Neon's restore left no `_old_` branch. |

Limitation: the copy holds almost no data, so matching counts prove the restore path, not restore speed at real size.

## Not proven here

- Deletion replay is not claimed. Stage 6 provides it and Stage 7 reruns the full restore check.
- The no-backup risk acceptance in #137 ends 2026-11-01.

These checks need calendar time and moved to #148. Each must still pass there:

- Stale backup: `stale` plus owner receipt, on a branch whose newest actual backup is older than 24 hours.
- 30-day age: `retention-overdue` on or after 2026-11-17 18:34 UTC, with the retention check alerting and freshness healthy.
- The first `schedule`-event run of each checker at 10:37 UTC, with its matching Healthchecks event. On 2026-10-18 GitHub started the schedule about 3.5 hours late.
