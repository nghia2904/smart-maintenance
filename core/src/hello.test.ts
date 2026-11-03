import { expect, test } from "vitest";
import { nextDueKm } from "./hello";

test("mốc đến hạn tiếp theo", () => {
  expect(nextDueKm(1000, 2000)).toBe(3000);
});