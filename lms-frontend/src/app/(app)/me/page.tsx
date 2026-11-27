"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, ErrorNote, Field, Input, Loading, PageTitle, Sheet } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatPhone, isMobile } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { useApi } from "@/lib/useApi";

/**
 * 내 정보: 휴대폰 번호와 비밀번호를 바꾼다.
 * 이름과 반은 선생님이 승인한 값이라 여기서 바꾸지 않는다.
 */
export default function MePage() {
  const profile = useApi<Profile>("/me/profile");

  if (profile.error) return <ErrorNote message={profile.error.message} />;
  if (!profile.data) return <Loading />;

  return (
    <>
      <PageTitle title="내 정보" />
      <div className="grid max-w-3xl gap-5">
        <Sheet title="기본 정보">
          <dl className="divide-y divide-line text-[14px]">
            <div className="flex gap-3 px-5 py-3">
              <dt className="w-20 shrink-0 text-ink-soft">이름</dt>
              <dd>{profile.data.name}</dd>
            </div>
            <div className="flex gap-3 px-5 py-3">
              <dt className="w-20 shrink-0 text-ink-soft">아이디</dt>
              <dd className="num">{profile.data.loginId}</dd>
            </div>
          </dl>
          {profile.data.role === "STUDENT" && (
            <p className="border-t border-line px-5 py-3 text-[12px] text-ink-faint">이름이나 반을 바꾸려면 선생님께 말해 주세요.</p>
          )}
        </Sheet>
        <PhoneForm profile={profile.data} onSaved={profile.setData} />
        <PasswordForm />
      </div>
    </>
  );
}

function PhoneForm({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const [phone, setPhone] = useState(formatPhone(profile.phone));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPhone(formatPhone(profile.phone)), [profile.phone]);

  const bad = phone.trim().length > 0 && !isMobile(phone);
  const unchanged = formatPhone(phone) === formatPhone(profile.phone);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (bad) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await api<Profile>("/me/profile", { method: "PATCH", body: { phone } });
      onSaved(saved);
      setMessage("휴대폰 번호를 바꿨어요.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "번호를 바꾸지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="휴대폰 번호">
      <form onSubmit={save} className="space-y-3 px-5 py-4">
        <Field label="휴대폰 번호" error={bad ? "010-1234-5678 형식으로 적어 주세요." : null}>
          <div className="max-w-60">
            <Input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={13} required autoComplete="tel" placeholder="010-1234-5678" className="num" />
          </div>
        </Field>
        <ErrorNote message={error} />
        {message && <p className="text-[13px] text-check">{message}</p>}
        <Button type="submit" disabled={busy || bad || unchanged || !phone.trim()}>
          {busy ? "바꾸는 중" : "번호 바꾸기"}
        </Button>
      </form>
    </Sheet>
  );
}

function PasswordForm() {
  const [form, setForm] = useState({ current: "", next: "", check: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mismatch = form.check.length > 0 && form.next !== form.check;
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api("/auth/password", { method: "PATCH", body: { currentPassword: form.current, newPassword: form.next } });
      setForm({ current: "", next: "", check: "" });
      setMessage("비밀번호를 바꿨어요. 다음 로그인부터 새 비밀번호를 쓰세요.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "비밀번호를 바꾸지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="비밀번호 바꾸기">
      <form onSubmit={save} className="grid gap-3 px-5 py-4 sm:max-w-sm">
        <Field label="지금 비밀번호">
          <Input type="password" value={form.current} onChange={set("current")} required autoComplete="current-password" />
        </Field>
        <Field label="새 비밀번호" hint="8자 이상">
          <Input type="password" value={form.next} onChange={set("next")} minLength={8} maxLength={64} required autoComplete="new-password" />
        </Field>
        <Field label="새 비밀번호 확인" error={mismatch ? "새 비밀번호가 서로 다릅니다." : null}>
          <Input type="password" value={form.check} onChange={set("check")} required autoComplete="new-password" />
        </Field>
        <ErrorNote message={error} />
        {message && <p className="text-[13px] text-check">{message}</p>}
        <div>
          <Button type="submit" disabled={busy || mismatch}>
            {busy ? "바꾸는 중" : "비밀번호 바꾸기"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
