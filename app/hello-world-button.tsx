"use client";

import { useState, useTransition } from "react";
import { triggerHelloWorld } from "./actions";

export function HelloWorldButton() {
  const [runId, setRunId] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function trigger() {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await triggerHelloWorld();
        setRunId(result.runId);
      } catch {
        setError("Could not start task.");
      }
    });
  }

  return (
    <div>
      <button type="button" onClick={trigger} disabled={isPending}>
        {isPending ? "Starting…" : "Run hello-world"}
      </button>
      {runId && <p>Run ID: {runId}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
