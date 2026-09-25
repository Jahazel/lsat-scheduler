# Allow mandatory schedule work to exceed daily capacity

Status: accepted. This ADR supersedes ADR 0001 only where it says the full Saturday practice test is the sole planned-work capacity exception.

Policy `adaptive-weekly-schedule-v2` schedules the practice test on the student's preferred day, reserves the next day for its full-length review, and gives every drilling day a minimum of 10 LR questions or one RC passage. A full section also remains mandatory when its placement rule applies. These activities can exceed the day's stated capacity, so limiting the exception to Saturday would silently omit tutor-required work. V2 records each affected day's overage and shows the student the reason. Capacity remains a hard limit for drilling work above the daily minimum, after any skip reduction. The weekly schedule still saves its inputs and reasons once and never changes; ADR 0001's persistence decision remains in force.
