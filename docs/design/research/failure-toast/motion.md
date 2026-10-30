# Motion spec: failure toast

The owner approved this motion in the prototype on 2026-10-30 (`prototype/index.html`).

Durations are the design-system tokens: fast 120 ms, base 200 ms. The 320 ms overlay token is for modals and drawers, not toasts. Easings: standard `cubic-bezier(0.2, 0, 0, 1)` for the entrance; strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)` for the exit. The project's exit curve `cubic-bezier(0.4, 0, 1, 1)` is an ease-in, which the `animate` rules forbid on UI, so the toast does not use it. Reduced motion follows the design system: drop movement, keep 120 ms fades.

Only `opacity` and `transform` animate, through CSS transitions, not keyframes. A rapid second failure retargets the running transition instead of restarting it. The alert node exists at once with `role="alert"`, so motion never delays the screen-reader announcement.

| Element | Trigger | Motion | Duration token | Reduced motion |
| --- | --- | --- | --- | --- |
| Failure toast | An action has an unexpected failure (form submit, check-off, redirect button) | Rises 12 px from the bottom and fades in, standard curve | Base, 200 ms | Fades in without movement, 120 ms |
| Failure toast | Student presses the close control | Fades out and drops 4 px, strong ease-out | Fast, 120 ms | Fades out without movement, 120 ms |
| Failure toast | Student leaves the screen (nav link, tab bar, browser back) | Same as close | Fast, 120 ms | Same as close |
| Failure toast | The same action is retried and succeeds | Same as close | Fast, 120 ms | Same as close |
| Failure toast | A second failure arrives while a toast shows | Old card ends at once; new card fades in with no rise, code changes in place | Fast, 120 ms | Same |
| Failure toast | Identical code arrives within the same second (double press) | No motion; the toast stays as it is | None | None |
| Close control | Hover, fine pointer only | Background to Vellum | Fast, 120 ms | Same |
| Page content | Any of the above | Nothing moves; the toast never shifts layout | None | None |
