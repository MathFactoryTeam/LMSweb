"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/AuthFrame";
import { Button, ErrorNote, Field, Input, TextLink } from "@/components/ui";
import { api, ApiError, USE_MOCK } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/auth/login", { method: "POST", body: { loginId, password } });
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setPending(false);
    }
  }

  return (
    <AuthFrame
      title="로그인"
      sub="학원에서 쓰는 아이디로 로그인하세요."
      footer={
        <>
          처음이라면 <TextLink href="/signup">가입 요청하기</TextLink>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="아이디">
          <Input value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" required autoFocus />
        </Field>
        <Field label="비밀번호">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <ErrorNote message={error} />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "로그인하는 중" : "로그인"}
        </Button>
        {USE_MOCK && (
          <p className="rounded-md bg-marker-soft px-3 py-2 text-[12px] text-ink-soft">
            목업 모드: 학생은 student1, 선생님은 teacher1 (비밀번호는 아무거나)
          </p>
        )}
      </form>
    </AuthFrame>
  );
}
