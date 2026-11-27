"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ErrorNote, PageTitle, Sheet, Textarea, cx } from "@/components/ui";
import { ApiError, streamChat } from "@/lib/api";
import type { ChatUsage } from "@/lib/types";
import { useApi } from "@/lib/useApi";

interface Turn {
  role: "me" | "ai";
  text: string;
}

const MAX_INPUT = 2000;

/** 학생 AI 질문. 서버가 하루 사용 횟수를 세고, 답은 글자 단위로 흘러 들어온다 */
export default function ChatPage() {
  const usage = useApi<ChatUsage>("/chat/usage");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  const left = usage.data ? usage.data.limit - usage.data.used : null;

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || streaming) return;
    setInput("");
    setError(null);
    setStreaming(true);
    setTurns((t) => [...t, { role: "me", text: message }, { role: "ai", text: "" }]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat(
        message,
        (delta) =>
          setTurns((t) => {
            const next = [...t];
            next[next.length - 1] = { role: "ai", text: next[next.length - 1].text + delta };
            return next;
          }),
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof ApiError ? err.message : "답을 받지 못했어요. 잠시 후 다시 시도해 주세요.");
        setTurns((t) => (t[t.length - 1]?.text === "" ? t.slice(0, -1) : t));
      }
    } finally {
      setStreaming(false);
      usage.reload();
    }
  }

  return (
    <>
      <PageTitle
        title="AI에게 질문하기"
        sub="답을 바로 알려 주지 않고, 풀이 방향을 단계별로 같이 잡아 줘요."
        action={left !== null && <span className="num text-[13px] text-ink-soft">오늘 {left}번 더 물어볼 수 있어요</span>}
      />
      <Sheet className="flex min-h-[50dvh] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {turns.length === 0 && (
            <div className="text-[14px] text-ink-soft">
              <p>이렇게 물어보면 좋아요.</p>
              <ul className="mt-2 space-y-1.5">
                {["x² - 5x + 6 = 0 을 인수분해하는 방법을 모르겠어요", "연립방정식에서 가감법과 대입법은 언제 써요?", "판별식이 음수면 그래프는 어떻게 생겼어요?"].map((q) => (
                  <li key={q}>
                    <button onClick={() => setInput(q)} className="rounded-md border border-line px-3 py-1.5 text-left hover:border-pen hover:text-pen">
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className={cx("flex", t.role === "me" ? "justify-end" : "justify-start")}>
              <p
                className={cx(
                  "max-w-[85%] rounded-lg px-4 py-2.5 text-[15px] whitespace-pre-wrap",
                  t.role === "me" ? "bg-pen text-white" : "border border-line bg-paper text-ink",
                )}
              >
                {t.text || (streaming && i === turns.length - 1 ? "생각하는 중" : "")}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="space-y-2 border-t border-line px-5 py-4">
          <ErrorNote message={error} />
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="문제와 어디서 막혔는지 적어 주세요. (Enter 보내기, Shift+Enter 줄바꿈)"
            className="min-h-20"
            aria-label="질문 내용"
          />
          <div className="flex items-center justify-between">
            <span className="num text-[12px] text-ink-faint">
              {input.length}/{MAX_INPUT}
            </span>
            <Button type="submit" disabled={streaming || !input.trim() || left === 0}>
              {streaming ? "답하는 중" : "보내기"}
            </Button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
