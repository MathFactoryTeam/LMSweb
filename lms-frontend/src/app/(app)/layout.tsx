"use client";

import { AppShell } from "@/components/AppShell";
import { SessionProvider } from "@/lib/session";

/** 로그인해야 보이는 화면들. 세션 확인은 SessionProvider 가 /api/dashboard 한 번으로 한다 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
