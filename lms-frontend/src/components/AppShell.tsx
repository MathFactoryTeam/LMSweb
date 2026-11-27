"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { api, USE_MOCK } from "@/lib/api";
import { useSession } from "@/lib/session";
import { cx } from "./ui";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const icons = {
  home: icon("M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"),
  classes: icon("M4 5h16v14H4zM4 9h16M9 9v10"),
  bell: icon("M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"),
  chat: icon("M4 5h16v11H9l-5 4z"),
  approve: icon("M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M16 11l2 2 4-4"),
};

export function AppShell({ children }: { children: ReactNode }) {
  const { me, dashboard } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const unread = dashboard.unreadNotificationCount;

  const items: NavItem[] =
    me.role === "STUDENT"
      ? [
          { href: "/", label: "홈", icon: icons.home },
          { href: "/classrooms", label: "내 반", icon: icons.classes },
          { href: "/notifications", label: "알림", icon: icons.bell, badge: unread },
          { href: "/chat", label: "AI 질문", icon: icons.chat },
        ]
      : [
          { href: "/", label: "홈", icon: icons.home },
          { href: "/classrooms", label: "반 관리", icon: icons.classes },
          { href: "/signup-requests", label: "가입 승인", icon: icons.approve, badge: dashboard.pendingSignupCount ?? 0 },
          { href: "/notifications", label: "알림", icon: icons.bell, badge: unread },
        ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href) || (href === "/classrooms" && pathname.startsWith("/students"));

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      {/* 데스크톱: 왼쪽 메뉴 */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface md:flex">
        <Link href="/" className="px-6 pt-6 pb-5">
          <span className="text-[20px] font-bold tracking-tight text-ink">여정의 아카이브</span>
          {USE_MOCK && <span className="ml-2 rounded bg-marker-soft px-1.5 py-0.5 text-[11px] text-ink-soft">목업</span>}
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px]",
                isActive(item.href) ? "bg-pen-tint font-semibold text-pen-dark" : "text-ink-soft hover:bg-paper hover:text-ink",
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {!!item.badge && (
                <span className="num min-w-5 rounded-full bg-redpen px-1.5 text-center text-[12px] font-semibold text-white">{item.badge}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line px-6 py-4">
          <p className="text-[14px] font-medium text-ink">{me.name}</p>
          <p className="text-[12px] text-ink-faint">
            {me.role === "STUDENT" ? "학생" : me.role === "TEACHER" ? "선생님" : "관리자"} ({me.loginId})
          </p>
          <div className="mt-2 flex gap-4 text-[13px] text-ink-soft">
            <Link href="/me" aria-current={pathname === "/me" ? "page" : undefined} className={cx("underline-offset-4 hover:underline", pathname === "/me" && "font-semibold text-pen-dark")}>
              내 정보
            </Link>
            <button onClick={logout} className="underline-offset-4 hover:underline">
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* 모바일: 위쪽 제목줄 */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="text-[18px] font-bold tracking-tight">여정의 아카이브</Link>
        <div className="flex items-center gap-3 text-[13px] text-ink-soft">
          <Link href="/me" className="underline-offset-4 hover:underline">{me.name}</Link>
          <button onClick={logout} className="underline underline-offset-4">로그아웃</button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-16">{children}</main>

      {/* 모바일: 아래쪽 탭 */}
      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cx("relative flex flex-col items-center gap-0.5 py-2 text-[11px]", isActive(item.href) ? "font-semibold text-pen" : "text-ink-soft")}
          >
            {item.icon}
            {item.label}
            {!!item.badge && (
              <span className="num absolute top-1 left-1/2 ml-2 min-w-4 rounded-full bg-redpen px-1 text-center text-[10px] font-semibold text-white">{item.badge}</span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
