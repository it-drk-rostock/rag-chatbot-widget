"use client";

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
import { useEffect, useRef, useState } from "react";

import { botConfig } from "../../src/config/botConfig";
import styles from "./page.module.css";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

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

export function ChatMessages({
  messages,
  loading,
}: {
  messages: Message[];
  loading: boolean;
}) {
  return (
    <Stack gap="md">
      {messages.map((message) => (
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
              {messageContent(message.content)}
            </Text>
          </Paper>
        </Group>
      ))}
      {loading && (
        <Group gap="xs" role="status">
          <Loader size="xs" />
          <Text c="dimmed" size="sm">Assistent schreibt…</Text>
        </Group>
      )}
    </Stack>
  );
}

export default function WidgetPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: botConfig.welcomeMessage },
  ]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight });
  }, [messages, loading]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || loading) return;

    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: text },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setPrompt("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      if (!response.ok || !response.body) {
        const { error = "Anfrage fehlgeschlagen" } = await response.json().catch(() => ({}));
        throw new Error(error);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          if (event === "event: done\ndata: [DONE]") {
            done = true;
            break;
          }
          if (event.startsWith("event: error")) {
            throw new Error(JSON.parse(event.split("\n")[1].slice(6)).error);
          }
          const data = event.split("\n").find((line) => line.startsWith("data: "));
          if (!data) continue;
          const { text: token } = JSON.parse(data.slice(6)) as { text?: string };
          if (token) {
            setMessages((current) => current.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + token }
                : message,
            ));
          }
        }
      }
    } catch (error) {
      const content = error instanceof Error ? error.message : "Anfrage fehlgeschlagen";
      setMessages((current) => current.map((message) =>
        message.id === assistantId ? { ...message, content } : message,
      ));
    } finally {
      setLoading(false);
    }
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

        <Box className={styles.composer} component="form" onSubmit={sendMessage} p="md">
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
