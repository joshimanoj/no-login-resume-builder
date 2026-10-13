import { expect, it } from "vitest";
import { MONTHS, joinMonth, splitMonth } from "./monthInput";

it("joins a month and year into year-month", () => {
  expect(joinMonth("07", "2023")).toEqual({ value: "2023-07" });
});

it("asks for a month and a full, sensible year", () => {
  expect(joinMonth("", "2023")).toHaveProperty("error");
  expect(joinMonth("07", "23")).toHaveProperty("error");
  expect(joinMonth("07", "1800")).toHaveProperty("error");
});

it("splits a stored date back into the two boxes", () => {
  expect(splitMonth("2023-07")).toEqual({ month: "07", year: "2023" });
  expect(splitMonth("")).toEqual({ month: "", year: "" });
});

it("lists twelve months", () => {
  expect(MONTHS).toHaveLength(12);
});
