import { describe, expect, it } from "vitest";
import { formatMonthInput, parseMonthInput, toMonthInput } from "./monthInput";

describe("formatMonthInput", () => {
  it("adds the slash after two digits", () => {
    expect(formatMonthInput("07")).toBe("07");
    expect(formatMonthInput("072")).toBe("07 / 2");
    expect(formatMonthInput("072023")).toBe("07 / 2023");
  });
  it("pads a one-digit month when she types a slash", () => {
    expect(formatMonthInput("7/")).toBe("07");
    expect(formatMonthInput("7/2023")).toBe("07 / 2023");
  });
  it("ignores letters and extra digits", () => {
    expect(formatMonthInput("07a/2023999")).toBe("07 / 2023");
  });
  it("lets her delete back through the slash", () => {
    expect(formatMonthInput("07 / ")).toBe("07");
    expect(formatMonthInput("07 /")).toBe("07");
  });
});

describe("parseMonthInput", () => {
  it("turns a valid entry into year-month", () => {
    expect(parseMonthInput("07 / 2023")).toEqual({ value: "2023-07" });
  });
  it("rejects impossible months and incomplete years", () => {
    expect(parseMonthInput("13 / 2023")).toHaveProperty("error");
    expect(parseMonthInput("00 / 2023")).toHaveProperty("error");
    expect(parseMonthInput("07 / 202")).toHaveProperty("error");
  });
});

it("shows a stored date in the typed format", () => {
  expect(toMonthInput("2023-07")).toBe("07 / 2023");
  expect(toMonthInput("")).toBe("");
});
