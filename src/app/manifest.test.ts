import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  it("opens home-screen launches in a normal browser tab under a white browser bar", () => {
    expect(manifest()).toMatchObject({ name: "DrillMap", display: "browser", theme_color: "#FFFFFF", background_color: "#0B0B0B" });
  });

  it("lists the 192 px, 512 px, and maskable 512 px icons, each served from public/", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map(({ sizes, purpose }) => [sizes, purpose ?? "any"])).toEqual([
      ["192x192", "any"],
      ["512x512", "any"],
      ["512x512", "maskable"],
    ]);
    for (const { src } of icons) expect(existsSync(path.join(__dirname, "../../public", src)), src).toBe(true);
  });
});
