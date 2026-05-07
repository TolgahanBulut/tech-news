/**
 * Domain types for TechPulse.
 *
 * Two layers live in this file:
 *   1. Domain model — what our components consume. Stable contract.
 *   2. Wire types   — exact shape of DummyJSON responses. Translated to
 *                     the domain in lib/api.ts so the API can change
 *                     without rippling through the UI.
 *
 * Components must depend only on the domain types. If you find yourself
 * importing DummyJsonPost outside lib/api.ts, the boundary has leaked.
 */

// ---------------------------------------------------------------------------
// Domain model
// ---------------------------------------------------------------------------

export interface User {
  readonly id: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly username: string;
  readonly image: string;
}

export interface Reactions {
  readonly likes: number;
  readonly dislikes: number;
}

export interface Article {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  /** First 160 chars of body + "…" — used for cards, meta description, OG. */
  readonly excerpt: string;
  readonly tags: readonly string[];
  readonly reactions: Reactions;
  readonly views: number;
  readonly author: User;
  /** Deterministic ISO date derived from post id; not from DummyJSON. */
  readonly publishedAt: string;
  /** Math.ceil(wordCount / 200). */
  readonly readingTime: number;
  /** https://picsum.photos/seed/{id}/800/450 — stable per article. */
  readonly imageUrl: string;
}

export interface PaginationMeta {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalItems: number;
  readonly pageSize: number;
  readonly hasNextPage: boolean;
  readonly hasPrevPage: boolean;
}

/** Result envelope for list endpoints. Pairs articles with their pagination. */
export interface ArticleListResult {
  readonly articles: readonly Article[];
  readonly pagination: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Wire types — DummyJSON
//
// Only lib/api.ts should import these. Treat them as adapter-internal.
// Keep them faithful to the API; do not "improve" the shape here.
// ---------------------------------------------------------------------------

export interface DummyJsonPost {
  readonly id: number;
  readonly title: string;
  readonly body: string;
  readonly tags: readonly string[];
  readonly reactions: { readonly likes: number; readonly dislikes: number };
  readonly views: number;
  readonly userId: number;
}

export interface DummyJsonPostsResponse {
  readonly posts: readonly DummyJsonPost[];
  readonly total: number;
  readonly skip: number;
  readonly limit: number;
}

export interface DummyJsonUser {
  readonly id: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly username: string;
  readonly image: string;
}

export interface DummyJsonTagsResponse {
  readonly tags: readonly string[];
}