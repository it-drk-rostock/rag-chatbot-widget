"use client";

import { useChat } from "@ai-sdk/react";
import {
  Avatar,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";

import { botConfig } from "../../src/config/botConfig";
import styles from "./page.module.css";

const markdownLink = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function messageContent(content: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(markdownLink)) {
    const [full, label, href] = match;
    const index = match.index ?? 0;
    parts.push(content.slice(lastIndex, index));
    parts.push(
      <Button
        component="a"
        href={href}
        key={`${href}-${index}`}
        size="compact-xs"
        target="_blank"
        rel="noreferrer"
        variant="light"
      >
        {label}
      </Button>,
    );
    lastIndex = index + full.length;
  }

  parts.push(content.slice(lastIndex));
  return parts;
}

function getUIMessageText(
  message: UIMessage | { id: string; role: string; content?: string },
): string {
  if ("parts" in message && Array.isArray(message.parts) && message.parts.length > 0) {
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  }
  const raw = message as Record<string, unknown>;
  return typeof raw.content === "string" ? raw.content : "";
}

export function ChatMessages({
  messages,
  loading,
}: {
  messages: Array<UIMessage | { id: string; role: "assistant" | "user"; content: string }>;
  loading: boolean;
}) {
  return (
    <Stack gap="md">
      {messages.map((message) => {
        const text = getUIMessageText(message);
        return (
          <Group
            align="flex-start"
            className={message.role === "user" ? styles.userMessage : undefined}
            key={message.id}
            wrap="nowrap"
          >
            <Avatar color={message.role === "assistant" ? "blue" : "gray"} radius="xl">
              {message.role === "assistant" ? "AI" : "Du"}
            </Avatar>
            <Paper
              bg={message.role === "assistant" ? "gray.0" : "blue.0"}
              className={styles.message}
              p="sm"
              radius="md"
            >
              <Text component="div" style={{ whiteSpace: "pre-wrap" }}>
                {messageContent(text)}
              </Text>
            </Paper>
          </Group>
        );
      })}
      {loading && (
        <Group gap="xs" role="status">
          <Loader size="xs" />
          <Text c="dimmed" size="sm">Assistent schreibt…</Text>
        </Group>
      )}
    </Stack>
  );
}

export default function ChatWidget() {
  const { messages, sendMessage, status } = useChat({
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [{ type: "text", text: botConfig.welcomeMessage }],
      },
    ],
  });
  const [prompt, setPrompt] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);

  const loading = status === "submitted" || status === "streaming";

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight });
  }, [messages, loading]);

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;

    sendMessage({ text });
    setPrompt("");
  }

  return (
    <Box className={styles.page} p="md">
      <Paper className={styles.widget} radius="lg" shadow="md" withBorder>
        <Group className={styles.header} justify="space-between" p="md">
          <div>
            <Title order={1} size="h3">{botConfig.name}</Title>
            <Text c="dimmed" size="sm">Online und bereit zu helfen</Text>
          </div>
          <Avatar color="blue" radius="xl">AI</Avatar>
        </Group>

        <ScrollArea className={styles.feed} type="hover" viewportRef={viewportRef}>
          <ChatMessages loading={loading} messages={messages} />
        </ScrollArea>

        <Box className={styles.composer} component="form" onSubmit={handleSend} p="md">
          <Group align="flex-end" wrap="nowrap">
            <Textarea
              aria-label="Nachricht"
              autosize
              disabled={loading}
              maxRows={4}
              minRows={1}
              onChange={(event) => setPrompt(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Stellen Sie eine Frage…"
              value={prompt}
            />
            <Button disabled={!prompt.trim() || loading} type="submit">
              Senden
            </Button>
          </Group>
        </Box>
      </Paper>
    </Box>
  );
}
