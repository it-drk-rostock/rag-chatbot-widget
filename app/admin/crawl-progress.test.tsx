import { renderToStaticMarkup } from "react-dom/server";
import { MantineProvider } from "@mantine/core";
import { describe, expect, it, vi } from "vitest";

const { useRealtimeRunMock, triggerCrawlMock } = vi.hoisted(() => ({
  useRealtimeRunMock: vi.fn(),
  triggerCrawlMock: vi.fn(),
}));

vi.mock("@trigger.dev/react-hooks", () => ({
  useRealtimeRun: useRealtimeRunMock,
}));

vi.mock("./actions", () => ({
  triggerCrawl: triggerCrawlMock,
}));

import { CrawlProgress } from "./crawl-progress";

describe("CrawlProgress Component", () => {
  it("renders trigger button when no run is active", () => {
    useRealtimeRunMock.mockReturnValue({ run: undefined });

    const html = renderToStaticMarkup(
      <MantineProvider>
        <CrawlProgress />
      </MantineProvider>,
    );

    expect(html).toContain("Website jetzt neu indexieren");
    expect(html).not.toContain("Indexierungsfortschritt");
  });

  it("displays progress checklist with Scraping active during crawling stage", () => {
    useRealtimeRunMock.mockReturnValue({
      run: {
        status: "EXECUTING",
        metadata: { status: "crawling" },
      },
    });

    const html = renderToStaticMarkup(
      <MantineProvider>
        <CrawlProgress initialRun={{ runId: "run_123", publicToken: "pk_123" }} />
      </MantineProvider>,
    );

    expect(html).toContain("Indexierungsfortschritt");
    expect(html).toContain("Scraping");
    expect(html).toContain("Generating Embeddings");
    expect(html).toContain("Upserting to Vector Store");
    expect(html).toContain("Completed");
    expect(html).toContain('data-testid="stage-crawling" data-state="active"');
    expect(html).toContain('data-testid="stage-embedding" data-state="pending"');
  });

  it("updates checklist stages as task transitions to embedding and upserting", () => {
    useRealtimeRunMock.mockReturnValue({
      run: {
        status: "EXECUTING",
        metadata: { status: "upserting" },
      },
    });

    const html = renderToStaticMarkup(
      <MantineProvider>
        <CrawlProgress initialRun={{ runId: "run_123", publicToken: "pk_123" }} />
      </MantineProvider>,
    );

    expect(html).toContain('data-testid="stage-crawling" data-state="completed"');
    expect(html).toContain('data-testid="stage-embedding" data-state="completed"');
    expect(html).toContain('data-testid="stage-upserting" data-state="active"');
    expect(html).toContain('data-testid="stage-completed" data-state="pending"');
  });

  it("marks all stages as completed when task status is COMPLETED", () => {
    useRealtimeRunMock.mockReturnValue({
      run: {
        status: "COMPLETED",
        metadata: { status: "completed" },
      },
    });

    const html = renderToStaticMarkup(
      <MantineProvider>
        <CrawlProgress initialRun={{ runId: "run_123", publicToken: "pk_123" }} />
      </MantineProvider>,
    );

    expect(html).toContain('data-testid="stage-crawling" data-state="completed"');
    expect(html).toContain('data-testid="stage-embedding" data-state="completed"');
    expect(html).toContain('data-testid="stage-upserting" data-state="completed"');
    expect(html).toContain('data-testid="stage-completed" data-state="completed"');
  });
});
