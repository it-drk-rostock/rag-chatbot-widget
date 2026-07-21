import { logger, task } from "@trigger.dev/sdk";

export const helloWorldTask = task({
  id: "hello-world",
  run: async () => {
    logger.log("Hello, world!");

    return { message: "Hello, world!" };
  },
});