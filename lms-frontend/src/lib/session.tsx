"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "./api";
import type { Dashboard, Member } from "./types";

interface SessionValue {
  me: Member;
  dashboard: Dashboard;
  /** 알림을 읽거나 숙제를 제출한 뒤 메인 화면 숫자를 다시 받아 온다 */
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/** 1분마다, 화면이 보일 때만 다시 받아 온다. 서버 캐시와 맞물려 DB까지 가는 일은 거의 없다 */
const REFRESH_MS = 60_000;

/**
 * 로그인 확인과 메인 화면 데이터를 /api/dashboard 한 번으로 해결한다.
 * 화면마다 내 정보, 알림 수를 따로 부르지 않으므로 새로고침 1번이 요청 1건으로 끝난다.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDashboard(await api<Dashboard>("/dashboard"));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace("/login");
        return;
      }
      setError(e instanceof ApiError ? e.message : "서버에 연결하지 못했습니다.");
    }
  }, [router]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  if (!dashboard) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-ink-soft">
        {error ? (
          <div className="rounded-lg border border-line bg-surface px-6 py-5 text-center">
            <p className="font-medium text-ink">{error}</p>
            <button onClick={load} className="mt-3 text-pen underline underline-offset-4">
              다시 불러오기
            </button>
          </div>
        ) : (
          "불러오는 중"
        )}
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ me: dashboard.me, dashboard, refresh: load }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider 안에서만 쓸 수 있습니다.");
  return value;
}
