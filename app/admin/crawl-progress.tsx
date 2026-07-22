"use client";

import { useState, useTransition } from "react";
import { Button, Card, Group, Loader, Stack, Text, ThemeIcon } from "@mantine/core";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { triggerCrawl } from "./actions";

export const STAGES = [
  { id: "crawling", label: "Scraping" },
  { id: "embedding", label: "Generating Embeddings" },
  { id: "upserting", label: "Upserting to Vector Store" },
  { id: "completed", label: "Completed" },
] as const;

export type RunState = {
  runId: string;
  publicToken: string;
};

export function CrawlProgress({
  initialRun,
}: {
  initialRun?: RunState | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [activeRun, setActiveRun] = useState<RunState | null>(initialRun ?? null);

  const { run } = useRealtimeRun(activeRun?.runId, {
    accessToken: activeRun?.publicToken,
    enabled: !!activeRun?.runId && !!activeRun?.publicToken,
  });

  const handleTrigger = () => {
    startTransition(async () => {
      try {
        const result = await triggerCrawl();
        setActiveRun(result);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const metadataStatus = (run?.metadata as { status?: string } | undefined)?.status;
  const isRunCompleted = run?.status === "COMPLETED" || metadataStatus === "completed";
  const isRunFailed =
    run?.status === "FAILED" ||
    run?.status === "CRASHED" ||
    run?.status === "CANCELED";

  const getStageState = (stageId: string, index: number) => {
    if (isRunCompleted) return "completed";
    const stageOrder = ["crawling", "embedding", "upserting", "completed"];
    const currentStageIndex = metadataStatus ? stageOrder.indexOf(metadataStatus) : 0;

    if (currentStageIndex > index) return "completed";
    if (currentStageIndex === index) return "active";
    return "pending";
  };

  const isExecuting = Boolean(activeRun && !isRunCompleted && !isRunFailed);

  return (
    <Stack gap="md">
      <Button
        onClick={handleTrigger}
        loading={isPending}
        disabled={isExecuting}
        aria-label="Website jetzt neu indexieren"
      >
        Website jetzt neu indexieren
      </Button>

      {activeRun && (
        <Card withBorder padding="md" radius="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={500}>
                Indexierungsfortschritt
              </Text>
              {isExecuting && <Loader size="xs" aria-label="Indexierung läuft" />}
            </Group>

            <Stack gap="xs" mt="xs" data-testid="progress-checklist">
              {STAGES.map((stage, idx) => {
                const state = getStageState(stage.id, idx);
                return (
                  <Group key={stage.id} gap="sm" data-testid={`stage-${stage.id}`} data-state={state}>
                    {state === "completed" ? (
                      <ThemeIcon color="green" size="xs" radius="xl" data-testid={`icon-completed-${stage.id}`}>
                        ✓
                      </ThemeIcon>
                    ) : state === "active" ? (
                      <Loader size="12px" color="blue" data-testid={`icon-active-${stage.id}`} />
                    ) : (
                      <ThemeIcon color="gray" size="xs" radius="xl" variant="outline" data-testid={`icon-pending-${stage.id}`}>
                        ○
                      </ThemeIcon>
                    )}
                    <Text
                      size="sm"
                      fw={state === "active" ? 600 : 400}
                      c={state === "pending" ? "dimmed" : undefined}
                    >
                      {stage.label}
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
