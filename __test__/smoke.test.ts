describe("toolchain smoke test", () => {
  it("runs jest with jest-dom matchers loaded", () => {
    const el = document.createElement("div");
    el.textContent = "hello";
    document.body.append(el);
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent("hello");
    el.remove();
  });
});