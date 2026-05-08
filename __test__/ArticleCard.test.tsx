import { render, screen } from "@testing-library/react";
import type { ImageProps } from "next/image";
import type { LinkProps } from "next/link";
import type { ReactNode } from "react";
import { ArticleCard } from "@/components/article/ArticleCard";
import type { Article } from "@/types";

// ---------------------------------------------------------------------------
// Mocks — Next primitives reduced to plain elements
// ---------------------------------------------------------------------------

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: ImageProps) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img src={typeof src === "string" ? src : ""} alt={alt} />
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: LinkProps & { children: ReactNode; "aria-label"?: string }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const mockArticle: Article = {
  id: 1,
  title: "The Future of Edge Computing",
  body: "Edge computing is reshaping the cloud.",
  excerpt: "Edge computing is reshaping the cloud.",
  tags: ["technology", "cloud"],
  reactions: { likes: 42, dislikes: 3 },
  views: 1234,
  author: {
    id: 7,
    firstName: "Ada",
    lastName: "Lovelace",
    username: "ada",
    image: "https://example.com/ada.jpg",
  },
  publishedAt: "2025-01-15T10:30:00.000Z",
  readingTime: 3,
  imageUrl: "https://picsum.photos/seed/1/800/450",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("<ArticleCard />", () => {
  it("renders the article title", () => {
    render(<ArticleCard article={mockArticle} />);
    expect(
      screen.getByRole("heading", { name: /the future of edge computing/i }),
    ).toBeInTheDocument();
  });

  it("renders the author's full name", () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
  });

  it("renders the reading time", () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText(/3 min read/i)).toBeInTheDocument();
  });

  it("renders the first tag", () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText("technology")).toBeInTheDocument();
  });

  it("links to the article detail page with the correct href", () => {
    render(<ArticleCard article={mockArticle} />);
    expect(
      screen.getByRole("link", { name: /the future of edge computing/i }),
    ).toHaveAttribute("href", "/article/1");
  });

  it("renders the excerpt text", () => {
    render(<ArticleCard article={mockArticle} />);
    expect(
      screen.getByText(/edge computing is reshaping the cloud/i),
    ).toBeInTheDocument();
  });
});