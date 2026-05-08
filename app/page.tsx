import { getAllTags, getArticles } from "@/lib/api";
import { ArticleGrid } from "@/components/article/ArticleGrid";
import { TagFilter } from "@/components/ui/TagFilter";
import { PaginationDynamic } from "@/components/ui/PaginationDynamic";

// ---------------------------------------------------------------------------
// Rendering strategy: ISR via Data Cache — see README for trade-off rationale
// ---------------------------------------------------------------------------

export const revalidate = 300;

// ---------------------------------------------------------------------------
// Search-param parsing
// ---------------------------------------------------------------------------

interface HomePageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function parseTag(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || typeof value !== "string") return undefined;
  // tag is rendered as text and used in URL paths only; keep it simple
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const tag = parseTag(params.tag);

  // Fetch list + tags in parallel — neither depends on the other.
  // Tags are passed as initialTags to TagFilter; React Query revalidates
  // them client-side after the ISR window without a server round-trip.
  const [listResult, tags] = await Promise.all([
    getArticles({ page, tag }),
    getAllTags(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-[color:var(--color-foreground)] sm:text-4xl">
          Latest in tech
        </h1>
        <p className="text-[color:var(--color-muted-foreground)]">
          Curated stories, refreshed every five minutes.
        </p>
      </header>

      <TagFilter initialTags={tags} activeTag={tag} />

      <section
        // remount on filter change to drop stale grid state cleanly
        key={`${tag ?? "all"}-${page}`}
        aria-label="Articles"
      >
        <ArticleGrid articles={listResult.articles} />
      </section>

      <PaginationDynamic meta={listResult.pagination} />
    </div>
  );
}