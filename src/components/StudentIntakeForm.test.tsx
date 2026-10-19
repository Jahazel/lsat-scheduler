import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mockStudent } from "@/lib/mockData";
import { upcomingTestMonths } from "@/lib/studentProfile";
import StudentIntakeForm from "./StudentIntakeForm";

function settingsMarkup(initialValues = mockStudent, today = "2026-10-18") {
  return renderToStaticMarkup(
    <StudentIntakeForm
      initialValues={initialValues}
      goalTestDateOptions={upcomingTestMonths(today)}
      submitLabel="Save changes"
      onSubmit={async () => {}}
    />
  );
}

describe("StudentIntakeForm", () => {
  it("says profile changes apply to the next weekly schedule created", () => {
    expect(settingsMarkup()).toContain(
      "Changes to daily capacity and your preferred practice-test day apply to the next weekly schedule created."
    );
  });

  it("has no platform field", () => {
    const markup = settingsMarkup();

    expect(markup).not.toContain("Platform");
    expect(markup).not.toContain("LSAT Demon");
  });

  it("shows the goal message under the goal score when the goal is not above the current score", () => {
    const markup = settingsMarkup({ ...mockStudent, currentScore: 165, goalScore: 160 });

    expect(markup).toContain('aria-describedby="goal-score-error"');
    expect(markup).toContain("Your goal must be higher than your current score, 165.");
  });

  it("offers only the given test months and clears a saved goal test date that has passed", () => {
    const markup = settingsMarkup({ ...mockStudent, goalTestDate: "2026-10-01" }, "2026-12-05");

    expect(markup).not.toContain("October 2026");
    expect(markup).not.toContain("November 2026");
    expect(markup).toContain('<option value="2027-01-01">January 2027</option>');
    expect(markup).toContain('<option value="" disabled="" selected="">Select a test date</option>');
  });

  it("states the practice-test length for the saved Accommodation", () => {
    expect(settingsMarkup({ ...mockStudent, accommodationMultiplier: 1.5 })).toContain(
      "A full practice test takes 3 h 8 min with 1.5× time. Pick a day with that much time."
    );
    expect(settingsMarkup()).not.toContain("about 3 hours");
  });
});
