import type { UploadTarget } from "./types";

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/** 백엔드 오류 응답 { code, message } 를 그대로 담는다 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

const MAX_RETRIES = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 모든 API 호출은 여기를 거친다.
 * - 토큰은 HttpOnly 쿠키라 자바스크립트가 만지지 않고, credentials: "include" 로 브라우저가 붙이게 한다.
 * - 마감 시간에 429(요청 제한)나 503(서버 혼잡)을 받으면 Retry-After 만큼 기다렸다 다시 부른다.
 *   이때 0~0.8초를 무작위로 더 기다려서, 500명이 같은 순간에 다시 몰리지 않게 한다.
 *   다시 보내도 안전한 GET 만 재시도한다.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  if (USE_MOCK) {
    const { mockApi } = await import("./mock");
    return mockApi<T>(method, path, options.body);
  }

  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      credentials: "include",
      headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });

    const busy = response.status === 429 || response.status === 503;
    if (busy && method === "GET" && attempt < MAX_RETRIES) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      await sleep(Math.min(Math.max(retryAfter, 1), 5) * 1000 + Math.random() * 800);
      continue;
    }

    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    const data = text ? safeJson(text) : undefined;
    if (!response.ok) {
      const error = (data ?? {}) as { code?: string; message?: string };
      throw new ApiError(response.status, error.code ?? "UNKNOWN", error.message ?? "요청을 처리하지 못했습니다.");
    }
    return data as T;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** 업로드 URL로 사진을 S3에 직접 올린다. 서명에 포함된 헤더(Content-Type)를 그대로 붙여야 한다 */
export async function uploadPhoto(target: UploadTarget, file: File): Promise<void> {
  if (USE_MOCK) {
    const { mockUpload } = await import("./mock");
    return mockUpload(target, file);
  }
  const response = await fetch(target.uploadUrl, {
    method: target.method,
    headers: target.headers,
    body: file,
  });
  if (!response.ok) {
    throw new ApiError(response.status, "UPLOAD_FAILED", "사진을 올리지 못했습니다. 다시 시도해 주세요.");
  }
}

/**
 * 챗봇: 응답이 SSE 로 오므로 fetch 스트림을 읽는다 (EventSource 는 POST 를 못 쓴다).
 * 서버는 delta(글자 조각), done(끝), error(실패) 이벤트를 보낸다.
 */
export async function streamChat(message: string, onDelta: (text: string) => void, signal?: AbortSignal) {
  if (USE_MOCK) {
    const { mockChat } = await import("./mock");
    return mockChat(message, onDelta, signal);
  }
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ message }),
    signal,
  });
  if (!response.ok || !response.body) {
    const data = safeJson(await response.text()) as { code?: string; message?: string } | undefined;
    throw new ApiError(response.status, data?.code ?? "UNKNOWN", data?.message ?? "챗봇에 연결하지 못했습니다.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const event = parseSseBlock(block);
      if (event.name === "delta") onDelta(event.data);
      if (event.name === "error") throw new ApiError(500, "CHAT_FAILED", event.data);
      if (event.name === "done") return;
      boundary = buffer.indexOf("\n\n");
    }
  }
}

function parseSseBlock(block: string) {
  let name = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) name = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5));
  }
  return { name, data: data.join("\n") };
}

/** 사진 형식: iPhone 에서 HEIC 파일은 type 이 빈 문자열인 경우가 있어 확장자로 보충한다 */
export function photoContentType(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}
