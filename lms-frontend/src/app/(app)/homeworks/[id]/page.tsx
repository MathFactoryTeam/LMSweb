"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoUploader } from "@/components/PhotoUploader";
import { DueLabel, Empty, ErrorNote, Loading, PageTitle, Sheet, StatusBadge, TextLink } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dueInfo, formatDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { HomeworkDetail, SubmissionRow, SubmissionView } from "@/lib/types";
import { useApi } from "@/lib/useApi";

export default function HomeworkPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useSession();
  const homework = useApi<HomeworkDetail>(`/homeworks/${id}`);

  if (homework.error) return <ErrorNote message={homework.error.message} />;
  if (!homework.data) return <Loading />;
  const hw = homework.data;

  return (
    <>
      <p className="mb-2">
        <TextLink href={`/classrooms/${hw.classroomId}`}>반으로 돌아가기</TextLink>
      </p>
      <PageTitle
        title={hw.title}
        sub={
          <span className="num">
            {formatDateTime(hw.dueAt)} 마감{hw.allowLate ? ", 지각 제출 가능" : ""}
          </span>
        }
        action={<DueLabel dueAt={hw.dueAt} />}
      />
      {hw.description && (
        <Sheet className="mb-5">
          <p className="px-5 py-4 text-[15px] whitespace-pre-line">{hw.description}</p>
        </Sheet>
      )}
      {me.role === "STUDENT" ? <StudentSubmission homework={hw} /> : <TeacherSubmissions homework={hw} />}
    </>
  );
}

function StudentSubmission({ homework }: { homework: HomeworkDetail }) {
  const { refresh } = useSession();
  // 제출이 없으면 서버가 204를 돌려주므로 data 가 undefined 로 남는다
  const mine = useApi<SubmissionView | undefined>(`/homeworks/${homework.id}/submission`);
  const [error, setError] = useState<string | null>(null);

  if (mine.loading && !mine.data) return <Loading />;
  const view = mine.data;
  const files = view?.files ?? [];
  const reviewed = view?.status === "REVIEWED";
  const open = dueInfo(homework.dueAt).urgency !== "overdue" || homework.allowLate;
  const canEdit = open && !reviewed;

  async function deleteFile(fileId: number) {
    setError(null);
    try {
      await api(`/homeworks/${homework.id}/submission/files/${fileId}`, { method: "DELETE" });
      await mine.reload();
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "사진을 지우지 못했어요.");
    }
  }

  return (
    <div className="space-y-5">
      {view?.feedback && (
        <Sheet title="선생님 피드백" action={view.feedback.score != null && <span className="num text-[20px] font-bold text-check">{view.feedback.score}점</span>}>
          <div className="px-5 py-4">
            <p className="text-[15px] whitespace-pre-line">{view.feedback.content}</p>
            <p className="mt-2 text-[12px] text-ink-faint">
              {view.feedback.teacherName} 선생님, {formatDateTime(view.feedback.updatedAt)}
            </p>
          </div>
        </Sheet>
      )}

      <Sheet
        title="내 제출"
        action={view && view.status !== "NOT_SUBMITTED" ? <StatusBadge status={view.status} late={view.late} /> : <StatusBadge status="NOT_SUBMITTED" />}
      >
        <div className="space-y-5 px-5 py-4">
          {files.length > 0 ? (
            <>
              <p className="num text-[13px] text-ink-soft">{formatDateTime(view?.submittedAt)}에 냈어요.</p>
              <PhotoGrid files={files} onDelete={canEdit ? deleteFile : undefined} />
            </>
          ) : (
            !canEdit && <p className="text-[14px] text-ink-soft">마감이 지나 더 이상 낼 수 없어요.</p>
          )}
          <ErrorNote message={error ?? mine.error?.message} />
          {canEdit && (
            <PhotoUploader
              homeworkId={homework.id}
              remaining={homework.maxPhotos - files.length}
              onSubmitted={(next) => {
                mine.setData(next);
                refresh();
              }}
            />
          )}
          {reviewed && <p className="text-[13px] text-ink-soft">피드백을 받은 숙제는 사진을 바꿀 수 없어요.</p>}
        </div>
      </Sheet>

      <p className="text-[14px] text-ink-soft">
        풀다가 막혔나요? <TextLink href={`/classrooms/${homework.classroomId}?ask=${homework.id}`}>선생님께 질문하기</TextLink>
      </p>
    </div>
  );
}

function TeacherSubmissions({ homework }: { homework: HomeworkDetail }) {
  const rows = useApi<SubmissionRow[]>(`/homeworks/${homework.id}/submissions`);
  if (rows.error) return <ErrorNote message={rows.error.message} />;
  if (!rows.data) return <Loading />;

  const submitted = rows.data.filter((r) => r.status !== "NOT_SUBMITTED").length;
  const reviewed = rows.data.filter((r) => r.status === "REVIEWED").length;

  return (
    <Sheet
      title="제출 현황"
      action={
        <span className="num text-[13px] text-ink-soft">
          {rows.data.length}명 중 {submitted}명 제출, {reviewed}명 피드백 완료
        </span>
      }
    >
      {rows.data.length === 0 ? (
        <Empty>이 반에 등록된 학생이 없어요.</Empty>
      ) : (
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-line text-[12px] text-ink-faint">
            <tr>
              <th className="px-5 py-2.5 font-medium">학생</th>
              <th className="px-3 py-2.5 font-medium">상태</th>
              <th className="hidden px-3 py-2.5 font-medium sm:table-cell">제출 시각</th>
              <th className="px-3 py-2.5 text-right font-medium">사진</th>
              <th className="px-5 py-2.5 text-right font-medium">점수</th>
            </tr>
          </thead>
          <tbody>
            {rows.data.map((r) => (
              <tr key={r.studentId} className="border-b border-line last:border-b-0">
                <td className="px-5 py-3 font-medium">
                  {r.submissionId ? (
                    <Link href={`/submissions/${r.submissionId}`} className="text-pen hover:underline">
                      {r.studentName}
                    </Link>
                  ) : (
                    r.studentName
                  )}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={r.status} late={r.late} />
                </td>
                <td className="num hidden px-3 py-3 text-ink-soft sm:table-cell">{formatDateTime(r.submittedAt)}</td>
                <td className="num px-3 py-3 text-right">{r.photoCount}</td>
                <td className="num px-5 py-3 text-right">{r.score ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Sheet>
  );
}
