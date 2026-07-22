"use server";

import { cookies } from "next/headers";
import { auth, tasks } from "@trigger.dev/sdk";
import type { crawlAndEmbedTask } from "@/trigger/crawl-and-embed";

const COOKIE_NAME = "admin-session";
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type LoginState = { error?: string };

function requiredEnv(name: "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
}

async function passwordsMatch(candidate: string) {
  const [candidateDigest, passwordDigest] = await Promise.all([
    digest(candidate),
    digest(requiredEnv("ADMIN_PASSWORD")),
  ]);
  let difference = 0;
  for (let index = 0; index < candidateDigest.length; index++) {
    difference |= candidateDigest[index] ^ passwordDigest[index];
  }
  return difference === 0;
}

async function sessionKey() {
  const key = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(requiredEnv("ADMIN_SESSION_SECRET")),
  );
  return crypto.subtle.importKey("raw", key, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  return Buffer.from(
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
  ).toString("base64url");
}

async function createSessionToken(expiresAt: number) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await sessionKey(),
    encoder.encode(String(expiresAt)),
  );
  return `${base64Url(iv)}.${base64Url(ciphertext)}`;
}

export async function isAdminAuthenticated() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;

  const [iv, ciphertext, extra] = token.split(".");
  if (extra || !iv || !ciphertext) return false;

  try {
    const expiresAt = decoder.decode(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: Buffer.from(iv, "base64url") },
        await sessionKey(),
        Buffer.from(ciphertext, "base64url"),
      ),
    );
    return Number(expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const candidate = formData.get("password");
  if (typeof candidate !== "string" || !(await passwordsMatch(candidate))) {
    return { error: "Incorrect password" };
  }

  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  (await cookies()).set(COOKIE_NAME, await createSessionToken(expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: SESSION_SECONDS,
  });
  return {};
}

export async function logout() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function triggerCrawl() {
  if (!(await isAdminAuthenticated())) throw new Error("Unauthorized");

  const handle = await tasks.trigger<typeof crawlAndEmbedTask>(
    "crawl-and-embed",
    undefined,
  );
  const publicToken = await auth.createPublicToken({
    scopes: { read: { runs: [handle.id] } },
  });

  return { runId: handle.id, publicToken };
}
