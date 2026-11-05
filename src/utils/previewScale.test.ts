import { describe, expect, it } from "vitest";
import {
  RESUME_PAPER_WIDTH_PX,
  previewScale,
  scaledPreviewHeight,
  shouldScalePreview,
} from "./previewScale";

describe("previewScale", () => {
  it("scales paper down to the card on phone widths", () => {
    expect(previewScale(360)).toBeCloseTo(360 / RESUME_PAPER_WIDTH_PX);
    expect(previewScale(390)).toBeCloseTo(390 / RESUME_PAPER_WIDTH_PX);
    expect(previewScale(430)).toBeCloseTo(430 / RESUME_PAPER_WIDTH_PX);
  });

  it("scales a tablet card that is still narrower than paper", () => {
    expect(previewScale(768)).toBeCloseTo(768 / RESUME_PAPER_WIDTH_PX);
    expect(previewScale(768)).toBeLessThan(1);
  });

  it("leaves paper unscaled when the card is wide enough", () => {
    expect(previewScale(RESUME_PAPER_WIDTH_PX)).toBe(1);
    expect(previewScale(1024)).toBe(1);
    expect(previewScale(1280)).toBe(1);
  });

  it("ignores a width that cannot be measured yet", () => {
    expect(previewScale(0)).toBe(1);
    expect(previewScale(-20)).toBe(1);
    expect(previewScale(Number.NaN)).toBe(1);
  });
});

describe("shouldScalePreview", () => {
  it("scales when the card is narrower than the page", () => {
    expect(shouldScalePreview(320)).toBe(true);
    expect(shouldScalePreview(340)).toBe(true);
    expect(shouldScalePreview(380)).toBe(true);
    expect(shouldScalePreview(680)).toBe(true);
    expect(shouldScalePreview(560)).toBe(true);
    expect(shouldScalePreview(536)).toBe(true);
  });

  it("leaves the page unscaled when the card already fits", () => {
    expect(shouldScalePreview(RESUME_PAPER_WIDTH_PX)).toBe(false);
    expect(shouldScalePreview(900)).toBe(false);
  });
});

describe("scaledPreviewHeight", () => {
  it("shrinks the frame to the scaled paper height", () => {
    expect(scaledPreviewHeight(1600, 0.5)).toBe(800);
    expect(scaledPreviewHeight(794, previewScale(397))).toBeCloseTo(397);
  });

  it("returns 0 when there is nothing to show", () => {
    expect(scaledPreviewHeight(0, 0.5)).toBe(0);
    expect(scaledPreviewHeight(1200, 0)).toBe(0);
    expect(scaledPreviewHeight(Number.NaN, 0.5)).toBe(0);
  });
});
