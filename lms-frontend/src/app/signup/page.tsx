"use client";

import { useState, type FormEvent } from "react";
import { AuthFrame } from "@/components/AuthFrame";
import { Button, ErrorNote, Field, Input, Select, TextLink } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { formatPhone, isMobile } from "@/lib/format";
import type { PublicClassroom } from "@/lib/types";
import { useApi } from "@/lib/useApi";

/** 학생 회원가입: 아이디, 비밀번호, 반, 이름, 휴대폰 번호. 반 담당 선생님이 승인해야 로그인할 수 있다 */
export default function SignupPage() {
  const classrooms = useApi<PublicClassroom[]>("/public/classrooms");
  const [form, setForm] = useState({ loginId: "", password: "", passwordCheck: "", classroomId: "", name: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const mismatch = form.passwordCheck.length > 0 && form.password !== form.passwordCheck;
  const badPhone = form.phone.length > 0 && !isMobile(form.phone);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mismatch || badPhone) return;
    setPending(true);
    setError(null);
    try {
      await api("/auth/signup", {
        method: "POST",
        body: { loginId: form.loginId, password: form.password, classroomId: Number(form.classroomId), name: form.name, phone: form.phone },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "서버에 연결하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    const classroom = classrooms.data?.find((c) => String(c.id) === form.classroomId);
    return (
      <AuthFrame title="가입 요청을 보냈습니다" sub="선생님이 승인하면 로그인할 수 있어요." footer={<TextLink href="/login">로그인 화면으로</TextLink>}>
        <dl className="space-y-2 rounded-md bg-paper px-4 py-3 text-[14px]">
          <div className="flex justify-between"><dt className="text-ink-soft">아이디</dt><dd className="font-medium">{form.loginId}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">휴대폰</dt><dd className="num font-medium">{formatPhone(form.phone)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">반</dt><dd className="font-medium">{classroom?.name}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-soft">담당</dt><dd className="font-medium">{classroom?.teacherName} 선생님</dd></div>
        </dl>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="가입 요청" sub="반 담당 선생님이 확인한 뒤 계정이 만들어집니다." footer={<>이미 계정이 있다면 <TextLink href="/login">로그인</TextLink></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="이름">
          <Input value={form.name} onChange={set("name")} maxLength={50} required autoComplete="name" />
        </Field>
        <Field label="휴대폰 번호" hint="선생님이 연락할 때 써요. 가입한 뒤 내 정보에서 바꿀 수 있어요." error={badPhone ? "010-1234-5678 형식으로 적어 주세요." : null}>
          <Input type="tel" inputMode="numeric" value={form.phone} onChange={set("phone")} maxLength={13} required autoComplete="tel" placeholder="010-1234-5678" className="num" />
        </Field>
        <Field label="반" hint="다니는 반을 고르세요. 반이 없다면 선생님께 물어보세요.">
          <Select value={form.classroomId} onChange={set("classroomId")} required>
            <option value="" disabled>
              {classrooms.loading ? "반 목록을 불러오는 중" : "반 선택"}
            </option>
            {classrooms.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.teacherName} 선생님)
              </option>
            ))}
          </Select>
        </Field>
        <Field label="아이디" hint="영문, 숫자, . _ - 로 4~50자">
          <Input value={form.loginId} onChange={set("loginId")} pattern="[a-zA-Z0-9_.\-]{4,50}" required autoComplete="username" />
        </Field>
        <Field label="비밀번호" hint="8자 이상">
          <Input type="password" value={form.password} onChange={set("password")} minLength={8} maxLength={64} required autoComplete="new-password" />
        </Field>
        <Field label="비밀번호 확인" error={mismatch ? "비밀번호가 서로 다릅니다." : null}>
          <Input type="password" value={form.passwordCheck} onChange={set("passwordCheck")} required autoComplete="new-password" />
        </Field>
        <ErrorNote message={error ?? classrooms.error?.message} />
        <Button type="submit" disabled={pending || mismatch || badPhone} className="w-full">
          {pending ? "보내는 중" : "가입 요청 보내기"}
        </Button>
      </form>
    </AuthFrame>
  );
}
