import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Element = {
  attributes: Record<string, string>;
  contentWindow?: object;
  style: Record<string, string>;
  addEventListener: (type: string, listener: () => void) => void;
  click: () => void;
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
};

function loadEmbed() {
  const elements: Element[] = [];
  const listeners: Record<string, ((event: { data: unknown; origin: string; source: object }) => void)[]> = {};
  const script: Element = {
    attributes: { src: "https://chat.example/embed.js" },
    style: {},
    addEventListener: () => {},
    click: () => {},
    getAttribute(name) { return this.attributes[name] ?? null; },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
  const document = {
    currentScript: script,
    body: { appendChild(element: Element) { elements.push(element); } },
    createElement(tag: string) {
      let clickListener = () => {};
      const element: Element = {
        attributes: {},
        contentWindow: tag === "iframe" ? {} : undefined,
        style: { width: tag === "iframe" ? "60px" : "", height: tag === "iframe" ? "60px" : "" },
        addEventListener(type, listener) { if (type === "click") clickListener = listener; },
        click() { clickListener(); },
        getAttribute(name) { return this.attributes[name] ?? null; },
        setAttribute(name, value) { this.attributes[name] = value; },
      };
      return element;
    },
  };
  const window = {
    location: { origin: "https://host.example" },
    addEventListener(type: string, listener: (event: { data: unknown; origin: string; source: object }) => void) {
      (listeners[type] ??= []).push(listener);
    },
  };

  runInNewContext(readFileSync("public/embed.js", "utf8"), { document, window, URL });
  return { elements, listeners };
}

describe("embed.js", () => {
  it("adds a bubble that opens and closes the widget iframe", () => {
    const { elements } = loadEmbed();
    const [bubble, iframe] = elements;

    expect(bubble.getAttribute("aria-label")).toBe("Open chat");
    expect(iframe.getAttribute("src")).toBeNull();
    expect(iframe.style.width).toBe("60px");
    expect(iframe.style.height).toBe("60px");

    bubble.click();
    expect(iframe.style.width).toBe("380px");
    expect(iframe.getAttribute("src")).toBe("https://chat.example/widget?parentOrigin=https%3A%2F%2Fhost.example");
    expect(iframe.style.height).toBe("600px");

    bubble.click();
    expect(iframe.style.width).toBe("60px");
    expect(iframe.style.height).toBe("60px");
  });

  it("accepts layout messages only from its widget iframe", () => {
    const { elements, listeners } = loadEmbed();
    const [, iframe] = elements;
    const message = listeners.message[0];

    message({ data: { type: "rag-chatbot:resize", open: true }, origin: "https://evil.example", source: iframe.contentWindow! });
    expect(iframe.style.width).toBe("60px");

    message({ data: { type: "rag-chatbot:resize", open: true }, origin: "https://chat.example", source: {} });
    expect(iframe.style.width).toBe("60px");

    message({ data: { type: "rag-chatbot:resize", open: true }, origin: "https://chat.example", source: iframe.contentWindow! });
    expect(iframe.style.width).toBe("380px");
    expect(iframe.style.height).toBe("600px");
  });
});
