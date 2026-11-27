"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Button, ErrorNote, Field, Input, Loading, PageTitle, Sheet, TextLink, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatPhone, isPhone } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { StudentDetail, StudentNote } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const MEMO_MAX = 2000;

export default function StudentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StudentView />
    </Suspense>
  );
}

/**
 * 선생님 전용 학생 화면. 학생 기본 정보와 선생님 메모(보호자 번호, 기타 사항).
 * 서버가 학생 계정의 요청을 403으로 막으므로, 학생이 주소를 알고 들어와도 메모는 내려오지 않는다.
 */
function StudentView() {
  const { id } = useParams<{ id: string }>();
  const classroomId = useSearchParams().get("classroom");
  const router = useRouter();
  const { me } = useSession();
  const isTeacher = me.role === "TEACHER";
  const detail = useApi<StudentDetail>(isTeacher ? `/students/${id}` : null);

  const [parentPhone, setParentPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isTeacher) router.replace("/");
  }, [isTeacher, router]);

  useEffect(() => {
    const note = detail.data?.note;
    if (note) {
      setParentPhone(formatPhone(note.parentPhone));
      setMemo(note.memo ?? "");
      setSavedAt(note.updatedAt);
    }
  }, [detail.data]);

  if (!isTeacher) return <Loading />;
  if (detail.error) return <ErrorNote message={detail.error.status === 404 ? "내 반 학생이 아니거나 없는 학생이에요." : detail.error.message} />;
  if (!detail.data) return <Loading />;
  const s = detail.data;

  const badPhone = parentPhone.trim().length > 0 && !isPhone(parentPhone);
  const original = s.note;
  const dirty = parentPhone !== formatPhone(original.parentPhone) || memo !== (original.memo ?? "");

  async function save(e: FormEvent) {
    e.preventDefault();
    if (badPhone) return;
    setBusy(true);
    setError(null);
    try {
      const note = await api<StudentNote>(`/students/${id}/note`, { method: "PUT", body: { parentPhone, memo } });
      detail.setData({ ...s, note });
      setSavedAt(note.updatedAt);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "메모를 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mb-2">
        <TextLink href={classroomId ? `/classrooms/${classroomId}` : "/classrooms"}>{classroomId ? "반으로" : "반 관리로"}</TextLink>
      </p>
      <PageTitle title={`${s.name} 학생`} sub={<span className="num">{s.loginId}</span>} />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Sheet title="학생 정보" className="self-start">
          <dl className="divide-y divide-line text-[14px]">
            <Row label="휴대폰">
              {s.phone ? (
                <a href={`tel:${s.phone}`} className="num text-pen underline-offset-4 hover:underline">
                  {formatPhone(s.phone)}
                </a>
              ) : (
                <span className="text-ink-faint">아직 없음</span>
              )}
            </Row>
            <Row label="반">{s.classroomNames.join(", ")}</Row>
            <Row label="보호자 동의">{s.guardianConsentAt ? formatDateTime(s.guardianConsentAt) + " 확인" : <span className="text-ink-faint">기록 없음</span>}</Row>
          </dl>
          <p className="border-t border-line px-5 py-3 text-[12px] text-ink-faint">휴대폰 번호는 학생이 내 정보에서 직접 바꿔요.</p>
        </Sheet>

        <Sheet
          title="선생님 메모"
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-redpen-tint px-2.5 py-0.5 text-[12px] font-medium text-redpen">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="1.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              학생에게 보이지 않아요
            </span>
          }
        >
          <form onSubmit={save} className="space-y-4 px-5 py-4">
            <Field label="부모님 전화번호" hint="휴대폰이나 집 전화 모두 돼요." error={badPhone ? "02-123-4567, 010-1234-5678 형식으로 적어 주세요." : null}>
              <div className="max-w-60">
                <Input type="tel" inputMode="numeric" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} maxLength={13} placeholder="010-1234-5678" className="num" />
              </div>
            </Field>
            <Field label="기타 사항" hint="상담 내용, 연락 시 참고할 점, 수업에서 챙길 것 등을 적어 두세요.">
              <Textarea value={memo} onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX))} className="min-h-48" />
            </Field>
            <div className="flex items-center justify-between gap-3">
              <span className="num text-[12px] text-ink-faint">
                {memo.length}/{MEMO_MAX}
              </span>
              <span className="text-[12px] text-ink-soft">
                {dirty ? "저장하지 않은 내용이 있어요" : savedAt ? `${formatDateTime(savedAt)} 저장됨` : ""}
              </span>
            </div>
            <ErrorNote message={error} />
            <Button type="submit" disabled={busy || badPhone || !dirty} className="w-full sm:w-auto">
              {busy ? "저장하는 중" : "메모 저장"}
            </Button>
          </form>
        </Sheet>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 px-5 py-3">
      <dt className="w-20 shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
