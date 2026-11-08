import { describe, expect, it } from "vitest";
import { distanceBetweenMeters } from "./gps";

describe("distanceBetweenMeters", () => {
  it("returns zero for the same point", () => {
    const point = { latitude: 10.77, longitude: 106.69 };
    expect(distanceBetweenMeters(point, point)).toBe(0);
  });

  it("calculates a realistic distance", () => {
    const first = { latitude: 0, longitude: 0 };
    const second = { latitude: 0, longitude: 0.001 };
    expect(distanceBetweenMeters(first, second)).toBeCloseTo(111.2, 0);
  });
});
