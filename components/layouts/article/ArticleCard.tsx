import Image from "next/image";
import Link from "next/link";
import { ClockIcon, EyeIcon } from "@heroicons/react/24/outline";
import type { Article } from "@/types";
import { formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ArticleCardProps {
  readonly article: Article;
  // First 3 cards are above-the-fold LCP candidates; rest lazy-load.
  readonly priority?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArticleCard({ article, priority = false }: ArticleCardProps) {
  const authorName = `${article.author.firstName} ${article.author.lastName}`;
  const firstTag = article.tags[0];

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] transition-shadow hover:shadow-md">
      <Link
        href={`/article/${article.id}`}
        prefetch={false}
        className="flex flex-1 flex-col"
        aria-label={article.title}
      >
        {/* fixed aspect ratio prevents CLS while image loads */}
        <div className="relative aspect-video w-full overflow-hidden bg-[color:var(--color-muted)]">
          <Image
            src={article.imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          {firstTag && (
            <span className="w-fit rounded-full bg-[color:var(--color-muted)] px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted-foreground)]">
              {firstTag}
            </span>
          )}

          <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-[color:var(--color-foreground)] group-hover:text-[color:var(--color-accent)]">
            {article.title}
          </h2>

          <p className="line-clamp-3 text-sm text-[color:var(--color-muted-foreground)]">
            {article.excerpt}
          </p>

          <div className="mt-auto flex items-center justify-between text-xs text-[color:var(--color-muted-foreground)]">
            <span className="truncate">
              By <span className="font-medium">{authorName}</span>
            </span>
            <time dateTime={article.publishedAt}>
              {formatDate(article.publishedAt)}
            </time>
          </div>

          <div className="flex items-center gap-4 border-t border-[color:var(--color-border)] pt-3 text-xs text-[color:var(--color-muted-foreground)]">
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {article.readingTime} min read
            </span>
            <span className="inline-flex items-center gap-1">
              <EyeIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {article.views.toLocaleString()}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}