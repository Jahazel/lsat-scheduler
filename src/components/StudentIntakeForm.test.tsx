import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mockStudent } from "@/lib/mockData";
import StudentIntakeForm from "./StudentIntakeForm";

describe("StudentIntakeForm", () => {
  it("says profile changes apply to the next weekly schedule created", () => {
    const markup = renderToStaticMarkup(
      <StudentIntakeForm
        mode="edit"
        initialValues={mockStudent}
        submitLabel="Save changes"
        onSubmit={async () => {}}
      />
    );

    expect(markup).toContain(
      "Changes to daily capacity and your preferred practice-test day apply to the next weekly schedule created."
    );
  });
});
