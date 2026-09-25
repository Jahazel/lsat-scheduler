# Allow mandatory schedule work to exceed daily capacity

Status: accepted. This ADR supersedes ADR 0001 only where it says the full Saturday practice test is the only planned work that may exceed daily capacity.

Policy `adaptive-weekly-schedule-v2` schedules the practice test on the student's preferred practice-test day, reserves the next day as its practice-test review day, and gives every drilling day a daily minimum of 10 LR questions or one RC passage. A full section also remains mandatory when its placement rule applies. These activities can exceed the day's daily capacity, so allowing only the Saturday practice test to exceed it would silently omit tutor-required work. The policy records each affected day's capacity overage and shows the student the schedule reason. Drilling work above the daily minimum stays within the day's fill limit. The weekly schedule still saves its inputs and reasons once and never changes; ADR 0001's persistence decision remains in force.
