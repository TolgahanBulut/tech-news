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
 */
function deterministicPublishedAt(postId: number): string {
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
 * Fetch a user by id.
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
 * - 1 request to /posts (or /posts/tag/{tag})
 * - N parallel requests to /users/{id} via Promise.all
 *   → latency ≈ max(post fetch, slowest user fetch), not sum.
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

  // Fan out user fetches in parallel — sequential awaits would be O(n) round-trips.
  const articles = await Promise.all(
    list.posts.map(async (post) => {
      const author = await getUserById(post.userId);
      return enrichArticle(post, author);
    }),
  );

  // DummyJSON does not currently emit "[Removed]" titles; this filter is
  // defensive. Note: filtering after pagination means a hypothetical
  // removed item would shrink the visible page by one without adjusting
  // totalItems. Acceptable because the upstream behaviour does not occur
  // in practice; revisit if DummyJSON's contract changes.
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
 * Sequential by necessity: userId comes from the post response so the
 * user fetch can't start until the post resolves.
 *
 * 404 → returns null so the caller can invoke notFound().
 * 5xx / network error → rethrows so error.tsx catches it.
 * This distinction matters: a missing article and a broken upstream
 * are different failure modes and should produce different UI.
 */
export async function getArticleById(id: number): Promise<Article | null> {
  let post: DummyJsonPost;

  try {
    post = await fetchJson<DummyJsonPost>(`/posts/${id}`);
  } catch (err) {
    // 404 → article doesn't exist, trigger not-found UI
    if (err instanceof Error && err.message.includes(" 404 ")) return null;
    // 5xx / network → let error.tsx handle it
    throw err;
  }

  if (post.title === REMOVED_TITLE) return null;

  // getUserById failure is always unexpected — rethrow to error boundary.
  const author = await getUserById(post.userId);
  return enrichArticle(post, author);
}

/**
 * All available tags. Used by the homepage tag filter.
 */
export async function getAllTags(): Promise<readonly string[]> {
  const tags = await fetchJson<readonly string[] | DummyJsonTagsResponse>(
    "/posts/tag-list",
  );
  if (Array.isArray(tags)) return tags;
  return (tags as DummyJsonTagsResponse).tags;
}

/**
 * All post ids for generateStaticParams.
 *
 * Uses limit=0 which DummyJSON treats as "return all". Defensive check:
 * if the upstream ever changes this behaviour and returns 0 posts, we
 * fail loudly at build time rather than silently generating 0 pages.
 */
export async function getAllPostIds(): Promise<readonly number[]> {
  const list = await fetchJson<DummyJsonPostsResponse>(
    "/posts?limit=0&select=id",
  );

  if (list.posts.length === 0) {
    throw new Error(
      "getAllPostIds returned 0 posts — DummyJSON may have changed limit=0 behaviour. Build aborted.",
    );
  }

  return list.posts.map((p) => p.id);
}