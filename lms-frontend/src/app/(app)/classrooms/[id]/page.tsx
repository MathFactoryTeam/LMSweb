"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button, DueLabel, Empty, ErrorNote, Field, Input, Loading, PageTitle, Select, Sheet, TextLink, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatPhone, formatRelative, toLocalInput } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { Classroom, EnrollResult, HomeworkSummary, Page, QuestionSummary, StudentRow } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function ClassroomPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ClassroomContent />
    </Suspense>
  );
}

function ClassroomContent() {
  const { id } = useParams<{ id: string }>();
  const { me } = useSession();
  const isTeacher = me.role !== "STUDENT";
  // 반 하나만 조회하는 API가 없으므로 내 반 목록에서 찾는다
  const classrooms = useApi<Classroom[]>("/classrooms");
  const homeworks = useApi<HomeworkSummary[]>(`/classrooms/${id}/homeworks`);
  const classroom = classrooms.data?.find((c) => String(c.id) === id);

  if (homeworks.error) return <ErrorNote message={homeworks.error.message} />;

  return (
    <>
      <p className="mb-2">
        <TextLink href="/classrooms">{isTeacher ? "반 관리로" : "내 반으로"}</TextLink>
      </p>
      <PageTitle title={classroom?.name ?? "반"} sub={classroom && `${classroom.teacherName} 선생님`} />

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {isTeacher && <NewHomework classroomId={id} onCreated={homeworks.reload} />}
          <HomeworkList homeworks={homeworks.data} loading={homeworks.loading} />
        </div>
        <div className="space-y-5">
          <Questions classroomId={id} homeworks={homeworks.data ?? []} />
          {isTeacher && <Students classroomId={id} />}
        </div>
      </div>
    </>
  );
}

function HomeworkList({ homeworks, loading }: { homeworks: HomeworkSummary[] | undefined; loading: boolean }) {
  const now = Date.now();
  return (
    <Sheet title="숙제">
      {loading && !homeworks ? (
        <Loading />
      ) : !homeworks || homeworks.length === 0 ? (
        <Empty>아직 낸 숙제가 없어요.</Empty>
      ) : (
        <ul>
          {homeworks.map((h) => {
            const notYet = new Date(h.publishAt).getTime() > now;
            return (
              <li key={h.id} className="border-b border-line last:border-b-0">
                <Link href={`/homeworks/${h.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-paper">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{h.title}</p>
                    <p className="num text-[13px] text-ink-soft">
                      {notYet ? `${formatDateTime(h.publishAt)} 공개 예정` : `${formatDateTime(h.dueAt)} 마감`}
                    </p>
                  </div>
                  {notYet ? (
                    <span className="rounded-full border border-dashed border-line px-2 py-0.5 text-[12px] text-ink-soft">공개 전</span>
                  ) : (
                    <DueLabel dueAt={h.dueAt} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

function NewHomework({ classroomId, onCreated }: { classroomId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState(() => ({
    title: "",
    description: "",
    maxPhotos: "3",
    publishAt: toLocalInput(now),
    dueAt: toLocalInput(new Date(now.getTime() + 2 * 24 * 3600 * 1000)),
    allowLate: false,
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/classrooms/${classroomId}/homeworks`, {
        method: "POST",
        body: { ...form, maxPhotos: Number(form.maxPhotos) },
      });
      setOpen(false);
      setForm({ ...form, title: "", description: "" });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "숙제를 등록하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        숙제 내기
      </Button>
    );
  }

  return (
    <Sheet title="숙제 내기">
      <form onSubmit={submit} className="space-y-4 px-5 py-4">
        <Field label="제목">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} required />
        </Field>
        <Field label="설명" hint="풀 범위와 사진 찍는 방법을 적어 주세요.">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={20000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="학생에게 보이는 시각" hint="이 시각부터 학생 화면에 나타나요.">
            <Input type="datetime-local" value={form.publishAt} onChange={(e) => setForm({ ...form, publishAt: e.target.value })} required />
          </Field>
          <Field label="마감">
            <Input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} required />
          </Field>
          <Field label="사진 최대 장수">
            <Select value={form.maxPhotos} onChange={(e) => setForm({ ...form, maxPhotos: e.target.value })}>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}장
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2.5 text-[14px]">
            <input type="checkbox" checked={form.allowLate} onChange={(e) => setForm({ ...form, allowLate: e.target.checked })} className="size-4 accent-pen" />
            마감 뒤에도 받기 (지각으로 표시)
          </label>
        </div>
        <ErrorNote message={error} />
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "등록하는 중" : "숙제 등록"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            취소
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function Questions({ classroomId, homeworks }: { classroomId: string; homeworks: HomeworkSummary[] }) {
  const { me, refresh } = useSession();
  const search = useSearchParams();
  const askFor = search.get("ask");
  const list = useApi<Page<QuestionSummary>>(`/classrooms/${classroomId}/questions`);
  const [open, setOpen] = useState(askFor !== null);
  const [form, setForm] = useState({ title: "", content: "", homeworkId: askFor ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/classrooms/${classroomId}/questions`, {
        method: "POST",
        body: { title: form.title, content: form.content, homeworkId: form.homeworkId ? Number(form.homeworkId) : null },
      });
      setForm({ title: "", content: "", homeworkId: "" });
      setOpen(false);
      await list.reload();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "질문을 올리지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  const isStudent = me.role === "STUDENT";
  return (
    <Sheet
      title={isStudent ? "내 질문" : "학생 질문"}
      action={isStudent && !open && <Button variant="ghost" onClick={() => setOpen(true)}>질문하기</Button>}
    >
      {open && (
        <form onSubmit={submit} className="space-y-3 border-b border-line px-5 py-4">
          <Select value={form.homeworkId} onChange={(e) => setForm({ ...form, homeworkId: e.target.value })} aria-label="관련 숙제">
            <option value="">숙제와 관계없는 질문</option>
            {homeworks.map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </Select>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="제목 (예: 7번 판별식 질문)" maxLength={200} required aria-label="질문 제목" />
          <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="어디까지 풀었고 어디서 막혔는지 적어 주세요." maxLength={5000} required aria-label="질문 내용" />
          <ErrorNote message={error} />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>질문 올리기</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>취소</Button>
          </div>
        </form>
      )}
      {list.loading && !list.data ? (
        <Loading />
      ) : !list.data || list.data.content.length === 0 ? (
        <Empty>{isStudent ? "아직 올린 질문이 없어요." : "아직 들어온 질문이 없어요."}</Empty>
      ) : (
        <ul>
          {list.data.content.map((q) => (
            <li key={q.id} className="border-b border-line last:border-b-0">
              <Link href={`/questions/${q.id}`} className="block px-5 py-3 hover:bg-paper">
                <p className="text-[14px] font-medium leading-snug">{q.title}</p>
                <p className="mt-0.5 text-[12px] text-ink-faint">
                  {!isStudent && `${q.studentName}, `}
                  {formatRelative(q.createdAt)}
                  {q.status === "OPEN" ? (
                    <span className="ml-2 font-medium text-pen">답변 대기</span>
                  ) : (
                    <span className="ml-2 font-medium text-check">답변 완료</span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function Students({ classroomId }: { classroomId: string }) {
  const list = useApi<StudentRow[]>(`/classrooms/${classroomId}/students`);
  const [loginIds, setLoginIds] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enroll(e: FormEvent) {
    e.preventDefault();
    const ids = loginIds.split(/[\s,]+/).filter(Boolean);
    if (ids.length === 0) return;
    setError(null);
    try {
      const r = await api<EnrollResult>(`/classrooms/${classroomId}/students`, { method: "POST", body: { loginIds: ids } });
      const parts = [`${r.enrolledCount}명 등록`];
      if (r.alreadyEnrolled.length) parts.push(`이미 등록: ${r.alreadyEnrolled.join(", ")}`);
      if (r.notFound.length) parts.push(`없는 아이디: ${r.notFound.join(", ")}`);
      setResult(parts.join(". "));
      setLoginIds("");
      list.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "학생을 등록하지 못했어요.");
    }
  }

  return (
    <Sheet title="학생" action={list.data && <span className="num text-[13px] text-ink-soft">{list.data.length}명</span>}>
      {list.data && list.data.length > 0 && (
        <ul className="max-h-[420px] overflow-y-auto border-b border-line">
          {list.data.map((s) => (
            <li key={s.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/students/${s.id}?classroom=${classroomId}`}
                className="flex items-center gap-3 px-5 py-2.5 hover:bg-paper focus-visible:bg-paper"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{s.name}</span>
                  <span className="num block truncate text-[12px] text-ink-faint">
                    {s.phone ? formatPhone(s.phone) : "번호 없음"}
                  </span>
                </span>
                <span className="text-[12px] text-pen">메모</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={enroll} className="space-y-2 px-5 py-4">
        <Input value={loginIds} onChange={(e) => setLoginIds(e.target.value)} placeholder="다른 반 학생 아이디 (쉼표로 여러 명)" aria-label="추가할 학생 아이디" />
        <p className="text-[12px] text-ink-faint">새 학생은 가입 요청을 승인하면 자동으로 등록돼요.</p>
        <ErrorNote message={error} />
        {result && <p className="text-[13px] text-ink-soft">{result}</p>}
        <Button type="submit" variant="secondary" disabled={!loginIds.trim()}>
          이 반에 추가
        </Button>
      </form>
    </Sheet>
  );
}
