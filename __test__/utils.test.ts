import {
  buildExcerpt,
  buildPaginationMeta,
  clsx,
  computeReadingTime,
  formatDate,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("formats a valid ISO date as 'MMM d, yyyy'", () => {
    expect(formatDate("2025-01-15T10:30:00.000Z")).toBe("Jan 15, 2025");
  });

  it("returns the original input on an invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

// ---------------------------------------------------------------------------
// buildPaginationMeta
// ---------------------------------------------------------------------------

describe("buildPaginationMeta", () => {
  it("computes totalPages with ceiling for non-exact division", () => {
    const meta = buildPaginationMeta({
      currentPage: 1,
      totalItems: 25,
      pageSize: 12,
    });
    expect(meta.totalPages).toBe(3);
  });

  it("computes totalPages exactly on exact division", () => {
    const meta = buildPaginationMeta({
      currentPage: 1,
      totalItems: 24,
      pageSize: 12,
    });
    expect(meta.totalPages).toBe(2);
  });

  it("hasNextPage is false on the last page", () => {
    const meta = buildPaginationMeta({
      currentPage: 3,
      totalItems: 25,
      pageSize: 12,
    });
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(true);
  });

  it("hasPrevPage is false on the first page", () => {
    const meta = buildPaginationMeta({
      currentPage: 1,
      totalItems: 25,
      pageSize: 12,
    });
    expect(meta.hasPrevPage).toBe(false);
    expect(meta.hasNextPage).toBe(true);
  });

  it("clamps totalPages to 1 when totalItems is 0", () => {
    const meta = buildPaginationMeta({
      currentPage: 1,
      totalItems: 0,
      pageSize: 12,
    });
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(false);
  });

  it("clamps currentPage above totalPages back into range", () => {
    const meta = buildPaginationMeta({
      currentPage: 99,
      totalItems: 25,
      pageSize: 12,
    });
    expect(meta.currentPage).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// clsx
// ---------------------------------------------------------------------------

describe("clsx", () => {
  it("joins truthy strings with a single space", () => {
    expect(clsx("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(clsx("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns an empty string when all values are falsy", () => {
    expect(clsx(false, null, undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// buildExcerpt — defensive behavior we shipped, so we test
// ---------------------------------------------------------------------------

describe("buildExcerpt", () => {
  it("returns the body verbatim when shorter than the limit", () => {
    expect(buildExcerpt("Short body.")).toBe("Short body.");
  });

  it("truncates at the last word boundary with an ellipsis", () => {
    const long = "word ".repeat(60).trim();
    const out = buildExcerpt(long);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(161);
    expect(out).not.toMatch(/wor…$/);
  });

  it("collapses whitespace before measuring", () => {
    expect(buildExcerpt("a\n\nb   c")).toBe("a b c");
  });

  it("hard-cuts when the window contains no whitespace", () => {
    const giant = "x".repeat(300);
    const out = buildExcerpt(giant);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBe(161); // 160 chars + ellipsis
    });
});

// ---------------------------------------------------------------------------
// computeReadingTime
// ---------------------------------------------------------------------------

describe("computeReadingTime", () => {
  it("returns 1 for any non-empty body shorter than the wpm threshold", () => {
    expect(computeReadingTime("hello world")).toBe(1);
  });

  it("rounds up via Math.ceil", () => {
    const body = Array.from({ length: 201 }, () => "word").join(" ");
    expect(computeReadingTime(body)).toBe(2);
  });

  it("returns 0 for an empty body", () => {
    expect(computeReadingTime("")).toBe(0);
  });
});