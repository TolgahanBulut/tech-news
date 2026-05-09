# TechPulse — Tech News

A production-grade news application built with Next.js, TypeScript, and Tailwind CSS v4. Demonstrates SSG + ISR rendering, dynamic imports tuned for Core Web Vitals, a strict Server/Client component split, and end-to-end SEO discipline.

---

## Quick start

````bash
npm install
npm run dev
````

App runs on `http://localhost:3000`.

> **Heads up on next build output:** the homepage classifies as `ƒ` (Dynamic), not `●` (SSG). This is correct ISR-via-Data-Cache behavior because the route reads `searchParams` — see Architecture §1.

### Other scripts

````bash
npm run build          # production build (verifies SSG output)
npm run start          # serve the production build
npm run lint           # eslint .
npm run typecheck      # tsc --noEmit
npm test               # Jest + React Testing Library
npm run test:watch     # Jest in watch mode
npm run test:coverage  # coverage report
````

---

## Tech stack

| Concern         | Choice                          | Why                                                                |
| --------------- | ------------------------------- | ------------------------------------------------------------------ |
| Framework       | Next.js (App Router)            | RSC, ISR, build-time SSG, segment-level loading/error boundaries   |
| Language        | TypeScript (strict)             | `noUncheckedIndexedAccess`, zero `any`, readonly domain types      |
| Styling         | Tailwind CSS v4                 | Token-driven theming via CSS variables, dark mode via class        |
| API             | DummyJSON                       | No-auth public REST API                                            |
| Testing         | Jest 29 + React Testing Library | `next/jest` SWC transform, jsdom, role-based queries               |

### A note on the Next.js 16 toolchain

This project was scoped to Next.js 15 in the brief but built with the toolchain currently shipped by `create-next-app`, which is Next 16. The architectural patterns are identical — RSC, ISR, App Router, `generateStaticParams`, `generateMetadata` — but two things differ in the build/lint surface:

- **`next lint` was removed.** Lint now runs as `eslint .` via the native flat config (`eslint.config.mjs`).
- **`next build` does not auto-detect native flat-config ESLint plugins.** Running lint twice (once at build, once in CI) is redundant, so `next.config.ts` sets `eslint.ignoreDuringBuilds: true`. Lint runs as its own quality gate via `npm run lint`.

---

## Architecture decisions

### 1. Rendering: SSG + ISR over SSR

**Decision.** Both the homepage and the article detail page declare `export const revalidate = 300`. There is no `force-dynamic` and no `cache: "no-store"` anywhere in the codebase.

**Rationale.** News content changes in minutes, not seconds. The relevant axis is *staleness tolerance*, not *freshness*. Three options were on the table:

- **SSR on every request.** Correct freshness, but every visitor pays the upstream-fetch latency. The CDN serves nothing reusable. For a high-traffic news site this is the wrong default — it scales with users instead of with content.
- **SSG without revalidation.** CDN-perfect, but stale until the next deploy. Wrong for any content that updates outside deploy cadence.
- **SSG + ISR (chosen).** Build-time static HTML serves instantly from the CDN. After the revalidation window, the *next* request triggers a background regeneration; no user ever waits for a fetch. The tail-latency profile is flat and the origin sees `requests / revalidate_window` traffic instead of `requests / second`.

A 5-minute window is the trade-off knob: small enough that a breaking story isn't visibly stale, large enough that origin load is negligible. If editorial requires faster propagation later, on-demand revalidation (`revalidatePath`) plugs in without re-architecting.

**A note on the homepage classification.** The build output shows `/` as `ƒ` (Dynamic) rather than `●` (SSG). This is correct, expected behavior in Next.js 15+, not a misconfiguration — and it's worth understanding why.

The homepage reads `searchParams` to drive `?tag` and `?page` filtering. Any Server Component that awaits `searchParams` is opted into dynamic rendering at the route level: there is no way for the build to statically generate a page whose output depends on a query string the build doesn't see. The alternative would be to encode filters as route params (`/tag/[tag]/page/[page]`), pre-render every combination, and re-classify as `●` — but that breaks the shareable, refresh-safe `?tag=…&page=…` URL contract the brief specifies and inflates the static-generation time without practical benefit.

What `ƒ` actually means here. With `export const revalidate = 300`, the route still uses ISR via the **Data Cache**: every fetch inside `lib/api.ts` is cached for the revalidation window, so every render of `/?tag=history` after the first hits the in-memory data cache rather than DummyJSON. The user-perceived behavior — instant pages, background revalidation, origin sees a request per filter combination per 5 minutes — is identical to a `●` route. The classification reflects *where the cache lives* (Data Cache vs Full Route Cache), not whether caching exists.

The `/article/[slug]` route is correctly `●`: the first 20 articles are pre-rendered at build time via `generateStaticParams`, with ISR layered on top so the remaining ids hydrate into the Full Route Cache on first request. Pre-rendering only the top slice keeps the build fast and avoids hammering DummyJSON with ~250 sequential fetches during `next build` — the public sandbox has soft rate limits and a hot rebuild loop trips them. Cold-cache requests for an unbuilt id pay one ISR miss (a few hundred ms) and every subsequent request is CDN-fast for the next 5 minutes. This is where SSG actually pays off — content with stable URLs that doesn't depend on per-request input.

---

### 2. Server vs Client Component split

**Default: Server Component.** Anything that can render on the server, does. `"use client"` is a deliberate opt-in, not a starting point.

| Component             | Why client                                          |
| --------------------- | --------------------------------------------------- |
| `ThemeProvider`       | `localStorage`, `matchMedia` — browser-only APIs    |
| `ThemeProviderClient` | Hosts `next/dynamic({ ssr: false })` call           |
| `Navbar`              | Consumes `useTheme()`, handles toggle click         |
| `TagFilter`           | `useRouter`, `usePathname`, `useSearchParams`       |
| `Pagination`          | Same as above                                       |
| `error.tsx` files     | Next's error-boundary contract requires it          |

Everything else — `ArticleCard`, `ArticleGrid`, `Skeleton`, page components — is a Server Component. The card grid is the bulk of the homepage payload; keeping it server-rendered eliminates the largest hydration cost we'd otherwise carry.

---

### 3. Dynamic imports — what and why

Two components use `next/dynamic`. Both decisions are tied to specific Core Web Vitals goals.

#### `Pagination` — `next/dynamic({ ssr: false })`

The paginator sits below the article grid, well outside the LCP fold on every viewport. Excluding it from the initial JS bundle and from the SSR HTML keeps two metrics moving in the right direction:

- **LCP.** Less script to parse before the largest image renders.
- **TBT / hydration cost.** No event handlers attached above the fold for a control no one is about to use.

The trade-off is a brief pop-in shortly after hydration. A stable-height `loading` placeholder reserves the paginator's vertical space, so the lazy mount produces zero CLS — the user sees the bar appear in place, not the page jump.

#### `ThemeProvider` — `next/dynamic({ ssr: false })`

The provider's initial state depends on browser-only APIs (`matchMedia`, `localStorage`) that don't exist on the server. SSR-rendering a default theme and correcting on the client produces a hydration mismatch and a brief flash of the wrong theme — the classic dark-mode FOUC.

`ssr: false` skips the server render for this subtree entirely. The cost is one extra client-only render frame; the benefit is zero hydration warnings and the entire HTML stays CDN-cacheable.

**Trade-off acknowledged.** The "perfect" fix is the inline `<head>` script pattern (à la `next-themes`) that sets the `.dark` class before React hydrates, which would close the one-frame mount window completely. The brief specifies the dynamic-import approach, so this implementation honors it. `<html suppressHydrationWarning>` keeps the console clean during the resolve window, and the `Navbar` toggle renders a fixed-size placeholder until `theme` resolves to prevent CLS.

#### A nuance on the dynamic call site

`next/dynamic` with `ssr: false` cannot be invoked from a Server Component in App Router — Next throws at build time. Both dynamic imports therefore live in tiny `"use client"` shells (`ThemeProviderClient`, `PaginationDynamic`) whose only job is to host the `dynamic()` call. The provider/component itself remains its own module, importable directly elsewhere.

---

### 4. Data fetching

Server (Next runtime)
┌──────────────────────────┐
│ lib/api.ts               │
│   fetchJson + ISR        │
│   Promise.all enrichment │
│   domain translation     │
└──────────────┬───────────┘
│
└─── single contract ───→ (Article, ArticleListResult)

- **Components never call `fetch` directly.** Every outbound HTTP call is funnelled through `lib/api.ts`'s `fetchJson` helper, which centralises the ISR options (`{ next: { revalidate: 300 } }`), error handling, and JSON parsing. No call site can misconfigure cache.
- **Post + user enrichment via `Promise.all`.** Sequential `await` would double end-to-end latency. The list endpoint fans out N parallel `/users/{id}` requests; total latency is `max(post fetch, slowest user fetch)`, not the sum. Next dedupes identical fetches within a request, so authors with multiple articles cost one request per render.
- **Wire / domain boundary.** `DummyJsonPost` and `DummyJsonUser` are adapter-internal types; only `lib/api.ts` may import them. A private `enrichArticle(post, user)` translator builds the domain `Article`. If DummyJSON's response shape changes, the blast radius is one file.

- **`getArticleById` distinguishes 404 from 5xx.** A 404 returns `null` so the caller can invoke `notFound()` and render the custom not-found page. A 5xx or network error rethrows so `error.tsx` catches it. These are different failure modes — a missing article and a broken upstream should produce different UI.

- **Deterministic `publishedAt`.** The fake date is derived from the post id (`anchor − id × 1h`). `Math.random` would break SSG: each rebuild would emit different OG metadata and the CDN would serve inconsistent snapshots across edge nodes. Determinism is correctness here, not aesthetics.

#### React Query's role

Server fetches via `lib/api.ts` drive the *initial render* — that's what gets statically generated and ISR-cached. React Query handles one specific client-side concern: the **tag list in `TagFilter`**.

On first render, the server passes the tag list as `initialTags` (fetched via RSC). React Query uses this as `placeholderData` and revalidates in the background after 5 minutes via `getAllTags()` from `lib/api.ts` — keeping the "components never call fetch directly" boundary intact. This means the tag list stays fresh without a server round-trip on every client navigation, while remaining consistent with the server's ISR cache TTL.

The `staleTime: 5 * 60 * 1000` in `TagFilter` intentionally matches the ISR `revalidate: 300` window. If the ISR window changes, both update together.

The provider uses `useState(makeQueryClient)` so the client is created exactly once per browser session, and a fresh instance per server render — preventing cross-request cache bleed.

---

### 5. SEO

- **Site-wide metadata** in `app/layout.tsx`: `metadataBase`, default + template title, description, OpenGraph (`type: website`, `siteName`), Twitter card, robots.
- **Per-article `generateMetadata`**: title, description (the excerpt), authors, keywords, OpenGraph (`type: article`, image with explicit 800×450 dimensions, `publishedTime`, `authors`, `tags`), Twitter `summary_large_image`.
- **`generateMetadata` shares fetches with the page render.** Next dedupes identical fetches within a request, so the article is fetched once per render even though metadata and the page body both ask for it.
- **Semantic markup.** `<article>`, `<header>`, `<footer>`, `<time dateTime>`. The HTML5 sectioning model carries SEO weight and accessibility wins simultaneously.

---

### 6. Performance

| Lever                            | Implementation                                          |
| -------------------------------- | ------------------------------------------------------- |
| LCP                              | `priority` on first 3 cards + article hero only         |
| Lazy loading                     | Default `loading="lazy"` for non-priority `next/image`  |
| Bandwidth                        | `sizes` attribute matches the responsive grid math      |
| CLS                              | Aspect-ratio containers, `line-clamp`, fixed-size placeholders for skeletons + theme toggle |
| Bundle                           | Card grid is RSC-only, paginator deferred via dynamic import |
| Font                             | `next/font` self-hosts Inter, `display: swap`           |
| Prefetch hygiene                 | `prefetch={false}` on card links — 12 cards otherwise mean 12 RSC payload fetches per homepage render |
| URL canonicalisation             | `?page=1` dropped to one URL → one CDN cache entry      |

---

### 7. Dark mode

- System preference read from `matchMedia("(prefers-color-scheme: dark)")` on mount.
- User override persisted to `localStorage` (`techpulse:theme`).
- OS theme changes are honoured *only* when the user hasn't picked one — explicit choice wins permanently.
- Theme applied via `.dark` class on `<html>` (Tailwind v4 `@custom-variant`) and `style.colorScheme` so native form controls and scrollbars match.
- `<html suppressHydrationWarning>` quiets the console during the post-mount theme resolve window.

---

### 8. Accessibility

- `aria-label` on all icon-only buttons; `aria-pressed` on toggle controls; `aria-current="page"` on the active paginator button.
- `role="status"` + `aria-live="polite"` on skeleton wrappers — one announcement per loading region, not per skeleton.
- Decorative images use `alt=""` (the title link already announces the article); ellipsis glyphs are `aria-hidden` with `sr-only` descriptive text.
- `:focus-visible` outline (defined in `globals.css`) — invisible to mouse users, prominent for keyboard navigation.
- Semantic HTML over `div` soup: `<nav aria-label="Pagination">`, `<article>`, `<header>`, `<time dateTime>`.

---

## Project structure

tech-news/
├── app/
│   ├── layout.tsx                    # ThemeProvider + Navbar shell
│   ├── page.tsx                      # ISR via Data Cache (revalidate: 300)
│   ├── loading.tsx
│   ├── error.tsx
│   └── article/[slug]/
│       ├── page.tsx                  # SSG via generateStaticParams + ISR
│       ├── loading.tsx
│       ├── error.tsx
│       └── not-found.tsx
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx                # client — useTheme()
│   │   ├── ThemeProvider.tsx         # client — localStorage + matchMedia
│   │   └── ThemeProviderClient.tsx   # client — hosts next/dynamic({ ssr:false })
│   ├── article/
│   │   ├── ArticleCard.tsx           # server — image optimisation
│   │   └── ArticleGrid.tsx           # server
│   └── ui/
│       ├── Skeleton.tsx              # server — primitive + composed skeletons
│       ├── Pagination.tsx            # client — ellipsis paginator
│       ├── PaginationDynamic.tsx     # client — next/dynamic shell
│       ├── TagFilter.tsx             # client — URL-driven filter
│       └── ErrorMessage.tsx          # client — error boundary UI
├── lib/
│   ├── api.ts                        # the fetch boundary
│   └── utils.ts                      # buildExcerpt, computeReadingTime, …
├── types/
│   └── index.ts                      # Domain + wire types
└── tests/
├── utils.test.ts
├── Pagination.test.ts
└── ArticleCard.test.tsx

---

## Testing strategy

Tests cover the surfaces with the highest defect-cost-per-line: pure utilities and the most-rendered component.

- **`TagFilter.test.tsx`** — URL navigation behavior: tag selection updates the URL with correct params and resets pagination.
- **`utils.test.ts`** — `formatDate`, `buildPaginationMeta`, `clsx`, `buildExcerpt`, `computeReadingTime`. Every defensive branch we shipped (clamps, fallbacks, ceiling rounding, no-whitespace hard-cut) has a corresponding case. `lib/utils.ts` is at 100% branch coverage.
- **`Pagination.test.ts`** — `buildPageList` page-list assembly: short-sequence short-circuit, both-ellipsis interior case, and the asymmetric near-start / near-end boundary cases where one ellipsis collapses.
- **`ArticleCard.test.tsx`** — title, author full name, reading time, first tag, link href, excerpt. `next/image` and `next/link` are locally mocked to plain elements. Queries use `getByRole` over `getByText` where semantic, so tests pass through wrapper changes and fail on a11y regressions.

Integration paths (homepage ISR flow, error boundaries, article SSG generation) are exercised by `npm run build` and runtime smoke checks; mocking them in unit tests would cost more than it pays.

---

## Feature checklist

- [x] Next.js App Router + TypeScript strict mode (`noUncheckedIndexedAccess`, zero `any`)
- [x] ISR on all routes (`revalidate: 300`); article detail is SSG (`●`), homepage uses Data Cache ISR (`ƒ`) due to `searchParams` — see "A note on the homepage classification" above
- [x] No `force-dynamic`, no `cache: "no-store"` anywhere
- [x] `generateStaticParams` for article detail — first 20 articles pre-rendered at build, remainder served via ISR fallback to avoid rate-limiting DummyJSON during build
- [x] `generateMetadata` with full OG + Twitter cards
- [x] Site-wide metadata with `metadataBase`
- [x] Centralised API layer (`lib/api.ts`) with ISR fetch options
- [x] `Promise.all` for post+user parallel enrichment
- [x] Wire/domain type boundary (`DummyJsonPost` → `Article`)
- [x] `next/dynamic` for `Pagination` and `ThemeProvider` (justified above)
- [x] `next/image` with `priority` discipline, `sizes`, aspect-ratio containers
- [x] `next/font` self-hosted Inter
- [x] Dark mode: system preference + `localStorage` override + system-change listener
- [x] React Query evaluated and deliberately removed — server-side ISR Data Cache covers the use case (see Architecture §4)
- [x] Tag filter and pagination as URL state (shareable, refresh-safe)
- [x] `loading.tsx` + `error.tsx` for both routes
- [x] `not-found.tsx` for article detail
- [x] CLS-safe skeletons matching real component geometry
- [x] Accessibility: `aria-label`, `aria-pressed`, `aria-current`, `role="status"`, `:focus-visible`
- [x] Jest + React Testing Library, role-based queries, 100% util branch coverage
- [x] Zero `npx tsc --noEmit` errors
- [x] Zero ESLint warnings (`npm run lint`)
- [x] Clean production build (`npm run build`)

---

## License

This is a technical assessment project. Not licensed for redistribution.
````