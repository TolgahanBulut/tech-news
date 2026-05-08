import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeftIcon, ClockIcon, EyeIcon } from "@heroicons/react/24/outline";
import { getAllPostIds, getArticleById } from "@/lib/api";
import { formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Rendering strategy
// ---------------------------------------------------------------------------

export const revalidate = 300;

// ---------------------------------------------------------------------------
// Static params — every known id pre-rendered at build time
// ---------------------------------------------------------------------------

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const ids = await getAllPostIds();
  // Pre-render the first 20 articles at build time; remaining pages
  // are generated on first visit via ISR (revalidate: 300).
  return ids.slice(0, 20).map((id) => ({ slug: String(id) }));
}

// ---------------------------------------------------------------------------
// Params parsing
// ---------------------------------------------------------------------------

interface PageProps {
  readonly params: Promise<{ slug: string }>;
}

function parseId(slug: string): number | null {
  const n = Number(slug);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 1 ? n : null;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const id = parseId(slug);
  if (id === null) return {};

  // .catch(() => null) here is intentional: a metadata failure should
  // never crash the page — fall back to empty metadata silently.
  const article = await getArticleById(id).catch(() => null);
  if (!article) return {};

  const authorName = `${article.author.firstName} ${article.author.lastName}`;

  return {
    title: article.title,
    description: article.excerpt,
    authors: [{ name: authorName }],
    keywords: [...article.tags],
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      images: [{ url: article.imageUrl, width: 800, height: 450 }],
      publishedTime: article.publishedAt,
      authors: [authorName],
      tags: [...article.tags],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [article.imageUrl],
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const id = parseId(slug);
  if (id === null) notFound();

  // No .catch() here — getArticleById now distinguishes 404 (returns null)
  // from 5xx (throws). null → notFound(), thrown error → error.tsx.
  const article = await getArticleById(id);
  if (!article) notFound();

  const authorName = `${article.author.firstName} ${article.author.lastName}`;
  const paragraphs = article.body
    .split(/\n+/)
    .filter((p) => p.trim().length > 0);

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[color:var(--color-muted-foreground)] hover:text-[color:var(--color-accent)]"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        Back to articles
      </Link>

      <header className="mb-6 flex flex-col gap-4">
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[color:var(--color-muted)] px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-[color:var(--color-muted-foreground)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-3xl font-bold tracking-tight text-[color:var(--color-foreground)] sm:text-4xl">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-[color:var(--color-muted-foreground)]">
          <div className="flex items-center gap-2">
            <Image
              src={article.author.image}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full bg-[color:var(--color-muted)] object-cover"
            />
            <span className="font-medium text-[color:var(--color-foreground)]">
              {authorName}
            </span>
          </div>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>
            {formatDate(article.publishedAt)}
          </time>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="h-4 w-4" aria-hidden="true" />
            {article.readingTime} min read
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <EyeIcon className="h-4 w-4" aria-hidden="true" />
            {article.views.toLocaleString()} views
          </span>
        </div>
      </header>

      <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-lg bg-[color:var(--color-muted)]">
        <Image
          src={article.imageUrl}
          alt=""
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          priority
          className="object-cover"
        />
      </div>

      <div className="flex flex-col gap-4 text-base leading-relaxed text-[color:var(--color-foreground)]">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <footer className="mt-10 flex items-center justify-between border-t border-[color:var(--color-border)] pt-6 text-sm text-[color:var(--color-muted-foreground)]">
        <span>
          {article.reactions.likes.toLocaleString()} likes ·{" "}
          {article.reactions.dislikes.toLocaleString()} dislikes
        </span>
        <Link
          href="/"
          className="font-medium text-[color:var(--color-accent)] hover:underline"
        >
          More articles →
        </Link>
      </footer>
    </article>
  );
}