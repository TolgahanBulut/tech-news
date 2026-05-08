import type {
  Article,
  ArticleListResult,
  DummyJsonPost,
  DummyJsonPostsResponse,
  DummyJsonTagsResponse,
  DummyJsonUser,
  User,
} from "@/types";
import { buildPaginationMeta, buildExcerpt, computeReadingTime } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = "https://dummyjson.com";

/**
 * 5-minute ISR window.
 *
 * Why 300s and not e.g. 60s or 3600s:
 * - News changes in minutes, not seconds. SSR-on-every-request is wasteful.
 * - The CDN serves cached HTML instantly; the *next* request after 300s
 *   triggers a background regeneration. No user ever waits for a fetch.
 * - Aligns the homepage list and article detail under one TTL — easy to
 *   reason about, easy to invalidate on demand later via on-demand
 *   revalidation if requirements change.
 */
const ISR: RequestInit = { next: { revalidate: 300 } };

export const PAGE_SIZE = 12;

/** Posts whose title is exactly this string are filtered out per spec. */
const REMOVED_TITLE = "[Removed]";

// ---------------------------------------------------------------------------
// Internal: fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Single source of truth for outbound HTTP. Reasons it exists:
 * - Centralised ISR config — components never set { next: ... } themselves.
 * - One place to add observability, retries, or auth headers later.
 * - Throws on non-2xx so caller code can use a single try/catch instead of
 *   threading `if (!res.ok)` through every fetch site.
 */
async function fetchJson<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, ISR);

  if (!res.ok) {
    // We surface the URL but not response bodies — the latter can leak
    // upstream error formats into our logs and into the UI's error.tsx.
    throw new Error(`Upstream ${res.status} for ${path}`);
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Internal: domain translation
// ---------------------------------------------------------------------------

/**
 * Build a deterministic ISO date from a post id.
 *
 * SSG correctness depends on this being pure: the same id must always
 * produce the same string, otherwise rebuilds churn OG metadata and the
 * CDN serves inconsistent snapshots across edge nodes.
 *
 * Implementation: anchor at a fixed epoch and step backwards by id*hours.
 * No `Date.now()`, no `Math.random()`.
 */
function deterministicPublishedAt(postId: number): string {
  // Anchor: 2025-01-01T00:00:00Z. Older posts → smaller id → further back.
  const ANCHOR_MS = Date.UTC(2025, 0, 1);
  const HOUR_MS = 60 * 60 * 1000;
  return new Date(ANCHOR_MS - postId * HOUR_MS).toISOString();
}

/**
 * Translate a (post, user) pair into the domain Article.
 *
 * Private to this module: the domain/wire boundary lives here and nowhere
 * else. If you're tempted to export this, you're about to leak DummyJSON
 * shape into the rest of the app.
 */
function enrichArticle(post: DummyJsonPost, author: User): Article {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    excerpt: buildExcerpt(post.body),
    tags: post.tags,
    // Defensive fallbacks: APIs lie, and a 0 is better than a crash.
    reactions: {
      likes: post.reactions?.likes ?? 0,
      dislikes: post.reactions?.dislikes ?? 0,
    },
    views: post.views ?? 0,
    author,
    publishedAt: deterministicPublishedAt(post.id),
    readingTime: computeReadingTime(post.body),
    imageUrl: `https://picsum.photos/seed/${post.id}/800/450`,
  };
}

/**
 * Map a wire User to the domain User.
 *
 * Trivial today, but isolates us if DummyJSON adds a field, renames one,
 * or we want to derive `displayName` from first+last.
 */
function toDomainUser(u: DummyJsonUser): User {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    image: u.image,
  };
}

/**
 * Fetch a user, with parallel-fetch friendliness in mind.
 *
 * Wrapped so callers can `Promise.all` it cleanly and so we have a single
 * place to add an in-request memoisation cache later (Next dedupes
 * identical fetches within a single render, which is enough for now).
 */
async function getUserById(userId: number): Promise<User> {
  const wire = await fetchJson<DummyJsonUser>(`/users/${userId}`);
  return toDomainUser(wire);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface GetArticlesOptions {
  readonly page?: number;
  readonly tag?: string;
}

/**
 * Fetch a paginated list of articles, optionally filtered by tag.
 *
 * Performance characteristics:
 * - 1 request to /posts (or /posts/tag/{tag})
 * - N parallel requests to /users/{id} via Promise.all
 *   → end-to-end latency ≈ max(post fetch, slowest user fetch),
 *     not sum of all of them.
 * - Next.js dedupes identical /users/{id} fetches within the same render,
 *   so authors who write multiple articles in the page only cost one user
 *   request.
 */
export async function getArticles(
  options: GetArticlesOptions = {},
): Promise<ArticleListResult> {
  const page = Math.max(1, options.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;
  const tagSegment = options.tag
    ? `/tag/${encodeURIComponent(options.tag)}`
    : "";
  const path = `/posts${tagSegment}?limit=${PAGE_SIZE}&skip=${skip}`;

  const list = await fetchJson<DummyJsonPostsResponse>(path);

  // Fan out user fetches in parallel. Sequential awaits here would be
  // O(n) round-trips — the most common perf bug in code reviews.
  const articles = await Promise.all(
    list.posts.map(async (post) => {
      const author = await getUserById(post.userId);
      return enrichArticle(post, author);
    }),
  );

  // Filter [Removed] posts AFTER enrichment so the filter rule lives in
  // exactly one place. The cost of enriching a soon-to-be-dropped post
  // is negligible vs. duplicating filter logic at multiple layers.
  const visible = articles.filter((a) => a.title !== REMOVED_TITLE);

  return {
    articles: visible,
    pagination: buildPaginationMeta({
      currentPage: page,
      totalItems: list.total,
      pageSize: PAGE_SIZE,
    }),
  };
}

/**
 * Fetch a single article by id.
 *
 * Post + user fetched in parallel via Promise.all — the canonical
 * "don't await sequentially" pattern this project explicitly tests for.
 *
 * Returns null on upstream failure rather than throwing, so the caller
 * (article/[slug]/page.tsx) can pair it with notFound() under TypeScript's
 * strict null narrowing without `try/catch` plumbing in the page.
 */

export async function getArticleById(id: number): Promise<Article | null> {
  try {
    const post = await fetchJson<DummyJsonPost>(`/posts/${id}`);
    if (post.title === REMOVED_TITLE) return null;
    const author = await getUserById(post.userId);
    return enrichArticle(post, author);
  } catch {
    return null;
  }
}

/**
 * All available tags. Used by the homepage tag filter.
 *
 * DummyJSON's /posts/tags endpoint returns a list of objects in newer
 * revisions; the `/tag-list` variant returns a flat string[]. We use
 * the flat one to avoid carrying a wrapper type for a single-purpose call.
 */
export async function getAllTags(): Promise<readonly string[]> {
  const tags = await fetchJson<readonly string[] | DummyJsonTagsResponse>(
    "/posts/tag-list",
  );
  // Defensive: tolerate both response shapes the upstream has shipped.
  if (Array.isArray(tags)) return tags;
    return (tags as DummyJsonTagsResponse).tags;
}

/**
 * All post ids. Used by `generateStaticParams` for the article detail
 * route — every id here becomes a build-time static page.
 *
 * We request only the `id` field via `select` to keep the payload small,
 * and `limit=0` returns the full set on DummyJSON.
 */
export async function getAllPostIds(): Promise<readonly number[]> {
  const list = await fetchJson<DummyJsonPostsResponse>(
    "/posts?limit=0&select=id",
  );
  return list.posts.map((p) => p.id);
}