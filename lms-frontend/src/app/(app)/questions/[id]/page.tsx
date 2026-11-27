"use client";

import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ErrorNote, Loading, PageTitle, Sheet, TextLink, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { AnswerView, QuestionDetail } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function QuestionPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useSession();
  const question = useApi<QuestionDetail>(`/questions/${id}`);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (question.error) return <ErrorNote message={question.error.message} />;
  if (!question.data) return <Loading />;
  const q = question.data;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<AnswerView>(`/questions/${id}/answers`, { method: "POST", body: { content: answer } });
      question.setData({ ...q, status: "ANSWERED", answers: [...q.answers, created] });
      setAnswer("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "답변을 올리지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mb-2">
        <TextLink href={`/classrooms/${q.classroomId}`}>반으로 돌아가기</TextLink>
      </p>
      <PageTitle title={q.title} sub={`${q.studentName}, ${formatDateTime(q.createdAt)}`} />
      {q.homeworkId && (
        <p className="-mt-3 mb-5 text-[14px]">
          <TextLink href={`/homeworks/${q.homeworkId}`}>관련 숙제 보기</TextLink>
        </p>
      )}

      <div className="max-w-2xl space-y-4">
        <Sheet>
          <p className="px-5 py-4 text-[15px] whitespace-pre-line">{q.content}</p>
        </Sheet>

        {q.answers.map((a) => (
          <Sheet key={a.id} className="ml-6 border-l-4 border-l-pen">
            <div className="px-5 py-4">
              <p className="text-[15px] whitespace-pre-line">{a.content}</p>
              <p className="mt-2 text-[12px] text-ink-faint">
                {a.teacherName} 선생님, {formatDateTime(a.createdAt)}
              </p>
            </div>
          </Sheet>
        ))}

        {q.answers.length === 0 && me.role === "STUDENT" && (
          <p className="ml-6 text-[14px] text-ink-soft">선생님이 답변하면 알림으로 알려 드려요.</p>
        )}

        {me.role !== "STUDENT" && (
          <Sheet title="답변 달기" className="ml-6">
            <form onSubmit={submit} className="space-y-3 px-5 py-4">
              <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={5000} required aria-label="답변 내용" />
              <ErrorNote message={error} />
              <Button type="submit" disabled={busy || !answer.trim()}>
                {busy ? "올리는 중" : "답변 올리기"}
              </Button>
            </form>
          </Sheet>
        )}
      </div>
    </>
  );
}
