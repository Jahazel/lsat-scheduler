// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AdminTestProvider, CurrentWeekReport, useAdminTest } from "./AdminTestContext";

afterEach(cleanup);

function CurrentWeekStatus() {
  const { currentWeek } = useAdminTest();
  return <output>{currentWeek ? `${currentWeek.week}:${currentWeek.exists}` : "none"}</output>;
}

it("keeps This week's weekly schedule status when This week closes", () => {
  const view = render(
    <AdminTestProvider>
      <CurrentWeekReport week="2026-10-05" hasSchedule />
      <CurrentWeekStatus />
    </AdminTestProvider>,
  );
  expect(screen.getByRole("status").textContent).toBe("2026-10-05:true");

  view.rerender(
    <AdminTestProvider>
      <CurrentWeekStatus />
    </AdminTestProvider>,
  );
  expect(screen.getByRole("status").textContent).toBe("2026-10-05:true");
});
