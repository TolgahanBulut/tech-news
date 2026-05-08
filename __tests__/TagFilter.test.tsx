import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LinkProps } from "next/link";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TagFilter } from "@/components/ui/TagFilter";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
const mockPathname = "/";
const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: (props: LinkProps & { children: ReactNode }) => (
    <a href={typeof props.href === "string" ? props.href : "#"}>
      {props.children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TAGS = ["technology", "science", "health"];

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("<TagFilter />", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders All pill and all provided tags", () => {
    renderWithQuery(<TagFilter initialTags={TAGS} />);
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /technology/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /science/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /health/i })).toBeInTheDocument();
  });

  it("clicking a tag calls router.push with correct ?tag param", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TagFilter initialTags={TAGS} />);

    await user.click(screen.getByRole("button", { name: /technology/i }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url: string = mockPush.mock.calls[0][0];
    expect(url).toContain("tag=technology");
  });

  it("clicking a tag resets ?page param", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TagFilter initialTags={TAGS} />);

    await user.click(screen.getByRole("button", { name: /science/i }));

    const url: string = mockPush.mock.calls[0][0];
    expect(url).not.toContain("page=");
  });

  it("clicking All removes ?tag from URL", async () => {
    const user = userEvent.setup();
    renderWithQuery(<TagFilter initialTags={TAGS} activeTag="technology" />);

    await user.click(screen.getByRole("button", { name: /all/i }));

    const url: string = mockPush.mock.calls[0][0];
    expect(url).not.toContain("tag=");
  });

  it("active tag pill has aria-pressed=true", () => {
    renderWithQuery(<TagFilter initialTags={TAGS} activeTag="health" />);
    expect(
      screen.getByRole("button", { name: /health/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("All pill has aria-pressed=true when no active tag", () => {
    renderWithQuery(<TagFilter initialTags={TAGS} />);
    expect(
      screen.getByRole("button", { name: /all/i })
    ).toHaveAttribute("aria-pressed", "true");
  });
});