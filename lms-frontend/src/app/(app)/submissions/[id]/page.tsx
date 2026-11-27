"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { PhotoGrid } from "@/components/PhotoGrid";
import { Button, ErrorNote, Field, Input, Loading, PageTitle, Sheet, StatusBadge, TextLink, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { FeedbackView, SubmissionView } from "@/lib/types";
import { useApi } from "@/lib/useApi";

/** 선생님: 학생 사진을 보고 피드백과 점수를 남긴다. 다시 저장하면 수정된다 */
export default function SubmissionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { me } = useSession();
  const submission = useApi<SubmissionView>(`/submissions/${id}`);
  const [content, setContent] = useState("");
  const [score, setScore] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 학생은 자기 숙제 화면에서 제출과 피드백을 본다
  useEffect(() => {
    if (me.role === "STUDENT" && submission.data) router.replace(`/homeworks/${submission.data.homeworkId}`);
  }, [me.role, submission.data, router]);

  useEffect(() => {
    const feedback = submission.data?.feedback;
    if (feedback) {
      setContent(feedback.content);
      setScore(feedback.score != null ? String(feedback.score) : "");
    }
  }, [submission.data]);

  if (submission.error) return <ErrorNote message={submission.error.message} />;
  if (!submission.data || me.role === "STUDENT") return <Loading />;
  const s = submission.data;

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const feedback = await api<FeedbackView>(`/submissions/${id}/feedback`, {
        method: "PUT",
        body: { content, score: score === "" ? null : Number(score) },
      });
      submission.setData({ ...s, status: "REVIEWED", feedback });
      setSaved(`${formatDateTime(feedback.updatedAt)}에 저장했어요. 학생에게 알림이 갔어요.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "피드백을 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mb-2">
        <TextLink href={`/homeworks/${s.homeworkId}`}>제출 현황으로</TextLink>
      </p>
      <PageTitle
        title={`${s.studentName} 학생 제출`}
        sub={<span className="num">{formatDateTime(s.submittedAt)} 제출</span>}
        action={<StatusBadge status={s.status} late={s.late} />}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Sheet title={`풀이 사진 ${s.files.length}장`}>
          <div className="px-5 py-4">
            <PhotoGrid files={s.files} />
          </div>
        </Sheet>
        <Sheet title={s.feedback ? "피드백 수정" : "피드백 남기기"} className="self-start">
          <form onSubmit={save} className="space-y-4 px-5 py-4">
            <Field label="피드백">
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={5000} required className="min-h-44" placeholder="잘한 점과 다시 볼 문제를 적어 주세요." />
            </Field>
            <Field label="점수" hint="비워 두면 점수 없이 저장돼요.">
              <div className="w-32">
                <Input type="number" min={0} max={1000} step={0.5} value={score} onChange={(e) => setScore(e.target.value)} className="num" />
              </div>
            </Field>
            <ErrorNote message={error} />
            {saved && <p className="text-[13px] text-check">{saved}</p>}
            <Button type="submit" disabled={busy || !content.trim()} className="w-full">
              {busy ? "저장하는 중" : s.feedback ? "피드백 수정" : "피드백 저장"}
            </Button>
          </form>
        </Sheet>
      </div>
    </>
  );
}
