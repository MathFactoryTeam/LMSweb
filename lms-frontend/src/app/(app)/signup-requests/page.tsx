"use client";

import { useState } from "react";
import { Button, Empty, ErrorNote, Loading, PageTitle, Sheet } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatPhone, formatRelative } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { SignupRequestView } from "@/lib/types";
import { useApi } from "@/lib/useApi";

/** 선생님: 담당 반으로 들어온 학생 가입 요청을 승인하거나 거절한다 */
export default function SignupRequestsPage() {
  const { refresh } = useSession();
  const list = useApi<SignupRequestView[]>("/signup-requests");
  const [consent, setConsent] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(request: SignupRequestView, action: "approve" | "reject") {
    setBusy(request.id);
    setError(null);
    try {
      await api(`/signup-requests/${request.id}/${action}`, {
        method: "POST",
        body: action === "approve" ? { guardianConsentConfirmed: Boolean(consent[request.id]) } : undefined,
      });
      setMessage(action === "approve" ? `${request.name} 학생을 ${request.classroomName}에 등록했어요.` : `${request.name} 학생의 요청을 거절했어요.`);
      list.setData(list.data?.filter((r) => r.id !== request.id));
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "처리하지 못했어요.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageTitle title="가입 승인" sub="승인하면 학생 계정이 만들어지고, 신청한 반에 바로 등록돼요." />
      {message && <p className="mb-4 rounded-md bg-check-tint px-4 py-2.5 text-[14px] text-check">{message}</p>}
      <ErrorNote message={error ?? list.error?.message} />
      <Sheet className="mt-1">
        {list.loading && !list.data ? (
          <Loading />
        ) : !list.data || list.data.length === 0 ? (
          <Empty>기다리는 가입 요청이 없어요.</Empty>
        ) : (
          <ul>
            {list.data.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-semibold">
                    {r.name} <span className="text-[13px] font-normal text-ink-soft">({r.loginId})</span>
                  </p>
                  <p className="text-[13px] text-ink-soft">
                    {r.classroomName}, {formatRelative(r.requestedAt)} 요청
                  </p>
                  {r.phone && <p className="num text-[13px] text-ink-soft">{formatPhone(r.phone)}</p>}
                  <label className="mt-2 flex items-center gap-2 text-[13px] text-ink-soft">
                    <input
                      type="checkbox"
                      className="size-4 accent-pen"
                      checked={Boolean(consent[r.id])}
                      onChange={(e) => setConsent({ ...consent, [r.id]: e.target.checked })}
                    />
                    보호자 동의를 확인했어요 (만 14세 미만 필수)
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => decide(r, "approve")} disabled={busy === r.id}>
                    승인
                  </Button>
                  <Button variant="secondary" onClick={() => decide(r, "reject")} disabled={busy === r.id}>
                    거절
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
