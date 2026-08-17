import { notFound } from "next/navigation";

import { botConfig } from "../../src/config/botConfig";
import ChatWidget from "./chat-widget";

export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ parentOrigin?: string | string[] }>;
}) {
  const { parentOrigin } = await searchParams;

  if (
    typeof parentOrigin !== "string" ||
    !botConfig.allowedOrigins.includes(parentOrigin)
  ) {
    notFound();
  }

  return <ChatWidget />;
}
