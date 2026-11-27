import type { ReactNode } from "react";

/** 로그인, 회원가입 화면의 틀: 모눈 바탕 가운데 종이 한 장 */
export function AuthFrame({ title, sub, children, footer }: { title: string; sub: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <p className="mb-6 text-center text-[22px] font-bold tracking-tight">여정의 아카이브</p>
        <div className="rounded-lg border border-line bg-surface px-6 py-7 sm:px-8">
          <h1 className="text-[20px] font-bold">{title}</h1>
          <p className="mt-1 mb-6 text-[14px] text-ink-soft">{sub}</p>
          {children}
        </div>
        <div className="mt-5 text-center text-[14px] text-ink-soft">{footer}</div>
      </div>
    </div>
  );
}
