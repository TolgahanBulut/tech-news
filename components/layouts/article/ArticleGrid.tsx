import type { Article } from "@/types";
import { ArticleCard } from "./ArticleCard";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ArticleGridProps {
  readonly articles: readonly Article[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArticleGrid({ articles }: ArticleGridProps) {
  if (articles.length === 0) {
    return (
      <p className="py-16 text-center text-[color:var(--color-muted-foreground)]">
        No articles match this filter.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          priority={index < 3}
        />
      ))}
    </div>
  );
}