// 백엔드 날짜는 시간대가 없는 한국 시간 문자열이다. 브라우저도 한국 시간이라고 보고 그대로 해석한다.

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function parseLocal(value: string): Date {
  return new Date(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = parseLocal(value);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]}) ${hh}:${mm}`;
}

export function formatRelative(value: string): string {
  const diff = Date.now() - parseLocal(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatDateTime(value);
}

export type Urgency = "overdue" | "urgent" | "soon" | "later";

/** 마감까지 남은 시간과 급한 정도. 3시간 안이면 형광펜으로 칠한다 */
export function dueInfo(dueAt: string, now = Date.now()): { label: string; urgency: Urgency } {
  const diff = parseLocal(dueAt).getTime() - now;
  if (diff <= 0) return { label: "마감 지남", urgency: "overdue" };
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return { label: `${minutes}분 남음`, urgency: "urgent" };
  const hours = Math.floor(minutes / 60);
  if (hours < 3) return { label: `${hours}시간 ${minutes % 60}분 남음`, urgency: "urgent" };
  if (hours < 24) return { label: `${hours}시간 남음`, urgency: "soon" };
  return { label: `${Math.floor(hours / 24)}일 남음`, urgency: "later" };
}

/** <input type="datetime-local"> 값 (YYYY-MM-DDTHH:mm) */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** 숫자만 남긴 전화번호. 서버와 같은 규칙으로 미리 검사한다 */
export function phoneDigits(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export const isMobile = (value: string) => /^01[016789]\d{7,8}$/.test(phoneDigits(value));
export const isPhone = (value: string) => /^0\d{8,10}$/.test(phoneDigits(value));

/** 01012345678 → 010-1234-5678, 021234567 → 02-123-4567 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const d = phoneDigits(value);
  if (d.startsWith("02")) {
    return d.length === 9 ? `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}` : `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  return d;
}
