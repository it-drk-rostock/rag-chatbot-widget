"use server";

import { tasks } from "@trigger.dev/sdk";
import type { helloWorldTask } from "@/trigger/hello-world";
import { isAdminAuthenticated } from "./admin/actions";

export async function triggerHelloWorld() {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");
  if (process.env.NODE_ENV === "production") {
    throw new Error("hello-world is only available in development");
  }

  const handle = await tasks.trigger<typeof helloWorldTask>("hello-world", undefined);

  return { runId: handle.id };
}
