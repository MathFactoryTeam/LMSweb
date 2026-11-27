"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, Empty, ErrorNote, Input, Loading, PageTitle, Sheet } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Classroom } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function ClassroomsPage() {
  const { me, refresh } = useSession();
  const isTeacher = me.role !== "STUDENT";
  const list = useApi<Classroom[]>("/classrooms");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api("/classrooms", { method: "POST", body: { name: name.trim() } });
      setName("");
      await list.reload();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "반을 만들지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    setError(null);
    try {
      await api(`/classrooms/${id}`, { method: "DELETE" });
      setConfirming(null);
      await list.reload();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "반을 삭제하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title={isTeacher ? "반 관리" : "내 반"} sub={isTeacher ? "반을 만들면 학생이 가입할 때 고를 수 있어요." : "반을 누르면 지난 숙제와 질문을 볼 수 있어요."} />

      {isTeacher && (
        <Sheet className="mb-5">
          <form onSubmit={create} className="flex flex-col gap-3 px-5 py-4 sm:flex-row">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="새 반 이름 (예: 중2 A반)" maxLength={100} aria-label="새 반 이름" />
            <Button type="submit" disabled={busy || !name.trim()} className="shrink-0">
              반 만들기
            </Button>
          </form>
        </Sheet>
      )}

      <ErrorNote message={error ?? list.error?.message} />

      <Sheet className="mt-1">
        {list.loading && !list.data ? (
          <Loading />
        ) : !list.data || list.data.length === 0 ? (
          <Empty>{isTeacher ? "아직 만든 반이 없어요. 위에서 첫 반을 만들어 보세요." : "등록된 반이 없어요. 선생님께 문의하세요."}</Empty>
        ) : (
          <ul>
            {list.data.map((c) => (
              <li key={c.id} className="border-b border-line last:border-b-0">
                <div className="flex items-center gap-3 px-5 py-4">
                  <Link href={`/classrooms/${c.id}`} className="min-w-0 flex-1 hover:text-pen">
                    <p className="truncate text-[16px] font-semibold">{c.name}</p>
                    <p className="text-[13px] text-ink-soft">{c.teacherName} 선생님</p>
                  </Link>
                  {isTeacher && confirming !== c.id && (
                    <Button variant="ghost" onClick={() => setConfirming(c.id)} className="text-redpen hover:bg-redpen-tint">
                      삭제
                    </Button>
                  )}
                </div>
                {confirming === c.id && (
                  <div className="flex flex-col gap-3 border-t border-dashed border-line bg-redpen-tint/50 px-5 py-3 sm:flex-row sm:items-center">
                    <p className="flex-1 text-[13px] text-ink">
                      {c.name}을 삭제하면 학생과 선생님 모두 이 반에 들어올 수 없어요. 숙제와 제출 기록은 지우지 않고 남겨 둬요.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="danger" onClick={() => remove(c.id)} disabled={busy}>
                        반 삭제
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirming(null)}>
                        취소
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
