"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { dueInfo } from "@/lib/format";
import type { MyStatus } from "@/lib/types";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-pen text-white hover:bg-pen-dark disabled:bg-ink-faint",
  secondary: "border border-line bg-surface text-ink hover:border-ink-faint",
  danger: "border border-redpen/40 bg-surface text-redpen hover:bg-redpen-tint",
  ghost: "text-pen hover:bg-pen-tint",
};

/** 링크를 버튼처럼 보이게 할 때 (a 안에 button 을 넣지 않기 위해) */
export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return cx(
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-4 text-[14px] font-medium transition-colors disabled:cursor-not-allowed",
    buttonStyles[variant],
    className,
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button {...props} className={buttonClass(variant, className)} />
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[12px] text-ink-faint">{hint}</span>}
      {error && <span className="mt-1 block text-[12px] text-redpen">{error}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-pen focus:outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputClass, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputClass, "min-h-28 resize-y", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputClass, "appearance-none", props.className)} />;
}

/** 흰 종이 한 장. 모눈 바탕 위에 올려 내용 묶음을 나눈다 */
export function Sheet({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-lg border border-line bg-surface", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-ink-soft">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center text-[14px] text-ink-soft">
      <p>{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return <p className="rounded-md bg-redpen-tint px-3 py-2 text-[13px] text-redpen">{message}</p>;
}

export function Loading() {
  return <p className="px-5 py-8 text-center text-[14px] text-ink-faint">불러오는 중</p>;
}

const statusText: Record<MyStatus, string> = {
  NOT_SUBMITTED: "미제출",
  SUBMITTED: "제출함",
  REVIEWED: "피드백 완료",
  GRADING: "채점 중",
  GRADED: "채점 완료",
};

const statusStyle: Record<MyStatus, string> = {
  NOT_SUBMITTED: "border-line text-ink-soft",
  SUBMITTED: "border-pen/30 bg-pen-tint text-pen-dark",
  REVIEWED: "border-check/30 bg-check-tint text-check",
  GRADING: "border-pen/30 bg-pen-tint text-pen-dark",
  GRADED: "border-check/30 bg-check-tint text-check",
};

export function StatusBadge({ status, late }: { status: MyStatus; late?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cx("rounded-full border px-2 py-0.5 text-[12px] font-medium whitespace-nowrap", statusStyle[status])}>
        {statusText[status]}
      </span>
      {late && <span className="rounded-full bg-redpen-tint px-2 py-0.5 text-[12px] font-medium text-redpen">지각</span>}
    </span>
  );
}

/** 남은 시간. 3시간 안이면 형광펜, 지나면 빨간 펜 */
export function DueLabel({ dueAt, done }: { dueAt: string; done?: boolean }) {
  const { label, urgency } = dueInfo(dueAt);
  if (done) return <span className="num text-[13px] text-ink-faint">{label}</span>;
  if (urgency === "overdue") return <span className="num text-[13px] font-medium text-redpen">{label}</span>;
  if (urgency === "urgent") return <span className="num marker text-[14px] font-semibold text-ink">{label}</span>;
  return <span className="num text-[13px] text-ink-soft">{label}</span>;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[14px] font-medium text-pen hover:underline hover:underline-offset-4">
      {children}
    </Link>
  );
}

export { cx };
