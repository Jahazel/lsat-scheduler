import { describe, expect, it } from "vitest";
import { PLAN_PRICES, planPriceText } from "./planPrices";

describe("planPriceText", () => {
  it("shows today's prices and the Monthly saving worked out from them", () => {
    expect(planPriceText(PLAN_PRICES)).toEqual({
      weekly: "$7.99",
      monthly: "$25",
      monthlySaving: "about 28% less",
      monthOnWeekly: "About $34.60 a month on Weekly",
    });
  });

  it("follows a price change", () => {
    expect(planPriceText({ weeklyCents: 1299, monthlyCents: 3999 })).toEqual({
      weekly: "$12.99",
      monthly: "$39.99",
      monthlySaving: "about 29% less",
      monthOnWeekly: "About $56.30 a month on Weekly",
    });
  });

  it("drops the saving line when Monthly saves less than 1%", () => {
    expect(planPriceText({ weeklyCents: 1000, monthlyCents: 4500 }).monthlySaving).toBeNull();
    expect(planPriceText({ weeklyCents: 1000, monthlyCents: 4300 }).monthlySaving).toBeNull();
    expect(planPriceText({ weeklyCents: 1000, monthlyCents: 4280 }).monthlySaving).toBe("about 1% less");
  });
});
