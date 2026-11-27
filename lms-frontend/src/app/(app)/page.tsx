"use client";

import Link from "next/link";
import { buttonClass, DueLabel, Empty, Loading, PageTitle, Sheet, StatusBadge, TextLink } from "@/components/ui";
import { dueInfo, formatDateTime, formatRelative } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { NotificationView, Page, UpcomingHomework } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function HomePage() {
  const { me } = useSession();
  return me.role === "STUDENT" ? <StudentHome /> : <TeacherHome />;
}

/**
 * 학생 홈. 마감 직전 새로고침이 가장 많이 몰리는 화면이라 /api/dashboard 응답(세션에 이미 있음)만으로 그린다.
 * 이 화면을 여는 데 추가 API 호출이 없다.
 */
function StudentHome() {
  const { me, dashboard } = useSession();
  const upcoming = dashboard.upcomingHomeworks ?? [];
  const todo = upcoming.filter((u) => u.myStatus === "NOT_SUBMITTED");
  const urgent = todo.filter((u) => dueInfo(u.homework.dueAt).urgency === "urgent").length;

  return (
    <>
      <PageTitle
        title={`${me.name}님, 안녕하세요`}
        sub={
          todo.length === 0 ? (
            "지금 내야 할 숙제는 모두 냈어요."
          ) : (
            <>
              아직 안 낸 숙제가 {todo.length}개 있어요.
              {urgent > 0 && <> 그중 <span className="marker font-semibold text-ink">{urgent}개는 3시간 안에 마감</span>이에요.</>}
            </>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Sheet title="마감 전 숙제">
          {upcoming.length === 0 ? (
            <Empty>지금 열려 있는 숙제가 없어요. 지난 숙제는 내 반에서 볼 수 있어요.</Empty>
          ) : (
            <ul>
              {upcoming.map((u) => (
                <UpcomingRow key={u.homework.id} item={u} />
              ))}
            </ul>
          )}
        </Sheet>

        <div className="space-y-5">
          <Sheet>
            <Link href="/notifications" className="flex items-center justify-between px-5 py-4 hover:bg-paper">
              <span className="text-[15px] font-medium">안 읽은 알림</span>
              <span className="num text-[20px] font-bold text-ink">{dashboard.unreadNotificationCount}</span>
            </Link>
          </Sheet>
          <Sheet>
            <div className="px-5 py-4">
              <p className="text-[15px] font-medium">막히는 문제가 있나요?</p>
              <p className="mt-1 text-[13px] text-ink-soft">AI가 답을 바로 주지 않고 풀이 방향을 같이 잡아 줘요.</p>
              <Link href="/chat" className={buttonClass("secondary", "mt-3")}>
                AI에게 질문하기
              </Link>
            </div>
          </Sheet>
        </div>
      </div>
    </>
  );
}

function UpcomingRow({ item }: { item: UpcomingHomework }) {
  const { homework, myStatus } = item;
  const done = myStatus !== "NOT_SUBMITTED";
  return (
    <li className="border-b border-line last:border-b-0">
      <Link href={`/homeworks/${homework.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-paper">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-ink-faint">{homework.classroomName}</p>
          <p className="truncate text-[16px] font-semibold">{homework.title}</p>
          <p className="num mt-0.5 text-[13px] text-ink-soft">{formatDateTime(homework.dueAt)} 마감</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <DueLabel dueAt={homework.dueAt} done={done} />
          <StatusBadge status={myStatus} />
        </div>
      </Link>
    </li>
  );
}

function TeacherHome() {
  const { me, dashboard } = useSession();
  const classrooms = dashboard.classrooms ?? [];
  const pending = dashboard.pendingSignupCount ?? 0;
  const recent = useApi<Page<NotificationView>>("/notifications?size=6");

  return (
    <>
      <PageTitle title={`${me.name} 선생님`} sub="오늘 들어온 제출과 질문을 확인하세요." />

      {pending > 0 && (
        <Link
          href="/signup-requests"
          className="mb-5 flex items-center justify-between rounded-lg border border-marker bg-marker-soft px-5 py-4 hover:border-ink-faint"
        >
          <span className="text-[15px]">
            가입 승인을 기다리는 학생이 <strong className="num">{pending}명</strong> 있어요.
          </span>
          <span className="text-[14px] font-medium text-pen">확인하기</span>
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Sheet title="내 반" action={<TextLink href="/classrooms">반 관리</TextLink>}>
          {classrooms.length === 0 ? (
            <Empty action={<TextLink href="/classrooms">반 만들기</TextLink>}>아직 만든 반이 없어요.</Empty>
          ) : (
            <ul>
              {classrooms.map((c) => (
                <li key={c.id} className="border-b border-line last:border-b-0">
                  <Link href={`/classrooms/${c.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-paper">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[13px] text-ink-soft">숙제와 질문 보기</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Sheet>

        <Sheet title="최근 알림" action={<TextLink href="/notifications">전체 보기</TextLink>}>
          {recent.loading ? (
            <Loading />
          ) : !recent.data || recent.data.content.length === 0 ? (
            <Empty>새 알림이 없어요.</Empty>
          ) : (
            <ul>
              {recent.data.content.map((n) => (
                <li key={n.id} className="flex gap-3 border-b border-line px-5 py-3 last:border-b-0">
                  <span className={n.read ? "mt-2 size-1.5 shrink-0 rounded-full bg-transparent" : "mt-2 size-1.5 shrink-0 rounded-full bg-pen"} />
                  <div className="min-w-0">
                    <p className="text-[14px] leading-snug">{n.message}</p>
                    <p className="mt-0.5 text-[12px] text-ink-faint">{formatRelative(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      </div>
    </>
  );
}
