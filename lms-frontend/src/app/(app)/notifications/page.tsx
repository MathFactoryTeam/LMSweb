"use client";

import { useRouter } from "next/navigation";
import { Button, Empty, ErrorNote, Loading, PageTitle, Sheet, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { NotificationView, Page } from "@/lib/types";
import { useApi } from "@/lib/useApi";

/** 알림을 누르면 읽음 처리하고, 알림이 가리키는 화면으로 이동한다 */
export default function NotificationsPage() {
  const router = useRouter();
  const { me, refresh } = useSession();
  const list = useApi<Page<NotificationView>>("/notifications?size=30");

  function targetPath(n: NotificationView): string | null {
    if (n.targetType === "QUESTION") return `/questions/${n.targetId}`;
    if (n.targetType === "SIGNUP_REQUEST") return "/signup-requests";
    // 학생이 피드백 알림을 누르면 제출 화면이 숙제 화면으로 넘겨 준다
    if (n.targetType === "SUBMISSION") return `/submissions/${n.targetId}`;
    return null;
  }

  async function open(n: NotificationView) {
    if (!n.read) {
      await api(`/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => undefined);
      refresh();
    }
    const path = targetPath(n);
    if (path) router.push(path);
    else list.setData(list.data && { ...list.data, content: list.data.content.map((x) => (x.id === n.id ? { ...x, read: true } : x)) });
  }

  async function readAll() {
    await api("/notifications/read-all", { method: "PATCH" });
    await list.reload();
    refresh();
  }

  const hasUnread = list.data?.content.some((n) => !n.read);

  return (
    <>
      <PageTitle
        title="알림"
        sub={me.role === "STUDENT" ? "피드백과 답변 소식이 여기에 모여요." : "제출, 질문, 가입 요청이 들어오면 메일로도 보내 드려요."}
        action={hasUnread && <Button variant="secondary" onClick={readAll}>모두 읽음</Button>}
      />
      <ErrorNote message={list.error?.message} />
      <Sheet>
        {list.loading && !list.data ? (
          <Loading />
        ) : !list.data || list.data.content.length === 0 ? (
          <Empty>새 알림이 없어요.</Empty>
        ) : (
          <ul>
            {list.data.content.map((n) => (
              <li key={n.id} className="border-b border-line last:border-b-0">
                <button onClick={() => open(n)} className={cx("flex w-full gap-3 px-5 py-3.5 text-left hover:bg-paper", !n.read && "bg-pen-tint/40")}>
                  <span className={cx("mt-2 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-pen")} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className={cx("block text-[14px] leading-snug", !n.read && "font-medium")}>{n.message}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-faint">
                      {formatRelative(n.createdAt)}
                      {!n.read && <span className="sr-only">, 안 읽음</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
