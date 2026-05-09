import { buildPageList } from "@/components/ui/Pagination";

// ---------------------------------------------------------------------------
// buildPageList
// ---------------------------------------------------------------------------

describe("buildPageList", () => {
  it("returns the full sequence with no ellipses when total <= 7", () => {
    // page 1 of 5 — fits inside the 7-slot window
    expect(buildPageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("renders both ellipses when current is in the interior", () => {
    // page 5 of 10 — left and right ellipses, current ± 1 visible
    expect(buildPageList(5, 10)).toEqual([
      1,
      "ellipsis-left",
      4,
      5,
      6,
      "ellipsis-right",
      10,
    ]);
  });

  it("omits the left ellipsis near the start", () => {
    // page 2 of 10 — leftBoundary collapses to 2, so no left ellipsis
    expect(buildPageList(2, 10)).toEqual([
      1,
      2,
      3,
      "ellipsis-right",
      10,
    ]);
  });

  it("omits the right ellipsis near the end", () => {
    // page 9 of 10 — rightBoundary collapses to total-1, so no right ellipsis
    expect(buildPageList(9, 10)).toEqual([
      1,
      "ellipsis-left",
      8,
      9,
      10,
    ]);
  });
});