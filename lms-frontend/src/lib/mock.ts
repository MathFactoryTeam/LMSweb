// 목업 모드 (NEXT_PUBLIC_USE_MOCK=true): 백엔드 없이 화면을 확인하기 위한 가짜 API.
// 실제 API 와 같은 경로, 같은 응답 형태를 흉내 낸다. 데이터는 메모리에만 있어 새로고침하면 처음으로 돌아간다.
// 로그인: 학생 student1, 선생님 teacher1 (비밀번호는 아무거나)

import { ApiError } from "./api";
import type {
  AnswerView,
  Classroom,
  Dashboard,
  FileView,
  HomeworkDetail,
  HomeworkSummary,
  Member,
  MyStatus,
  Profile,
  NotificationType,
  NotificationView,
  QuestionDetail,
  QuestionSummary,
  SignupRequestView,
  StudentDetail,
  StudentNote,
  StudentRow,
  SubmissionRow,
  SubmissionView,
  TargetType,
  UploadTarget,
} from "./types";

const SESSION_KEY = "lms-mock-member";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function iso(offsetMs: number): string {
  const d = new Date(Date.now() + offsetMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

/** 풀이 사진 대신 쓰는 공책 그림 */
function notebookPhoto(seed: number): string {
  const lines = Array.from({ length: 9 }, (_, i) => {
    const y = 70 + i * 34;
    const w = 180 + ((seed * 37 + i * 53) % 140);
    return `<path d="M40 ${y} q 30 -10 60 0 t 60 0 t 60 0" transform="scale(${w / 220} 1)" fill="none" stroke="#2b3f8f" stroke-width="3" stroke-linecap="round" opacity="0.75"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="420" viewBox="0 0 360 420"><rect width="360" height="420" fill="#fdfdf8"/>${Array.from({ length: 12 }, (_, i) => `<line x1="0" x2="360" y1="${50 + i * 34}" y2="${50 + i * 34}" stroke="#cfdcef"/>`).join("")}<line x1="30" x2="30" y1="0" y2="420" stroke="#f2b8b8"/>${lines}<text x="40" y="35" font-family="sans-serif" font-size="18" fill="#2b3f8f">${seed}번 풀이</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---------- 가짜 데이터 ----------

interface MockSubmission {
  submissionId: number;
  homeworkId: number;
  studentId: number;
  status: MyStatus | "UPLOADING";
  submittedAt: string | null;
  late: boolean;
  files: FileView[];
  pending: { fileId: number; contentType: string }[];
  feedback: { teacherName: string; content: string; score: number | null; updatedAt: string } | null;
}

interface MockClassroom extends Classroom {
  deleted: boolean;
}

interface MockHomework extends HomeworkDetail {
  classroomName: string;
}

interface MockQuestion extends Omit<QuestionDetail, "answers"> {
  answers: AnswerView[];
}

interface MockNotification extends NotificationView {
  recipientId: number;
}

const teacher: Member = { id: 10, loginId: "teacher1", name: "박지훈", role: "TEACHER" };
const studentNames = ["김민지", "이서준", "최하은", "정도윤", "강지우", "윤서연", "조현우", "한예린"];
const students: Member[] = studentNames.map((name, i) => ({
  id: 20 + i,
  loginId: i === 0 ? "student1" : `student${i + 1}`,
  name,
  role: "STUDENT",
}));
const members: Member[] = [teacher, ...students];

/** 실제 백엔드처럼 로그인 응답(Member)에는 번호를 넣지 않고 따로 둔다 */
const phones = new Map<number, string>(students.map((s, i) => [s.id, `0101234${String(5670 + i).padStart(4, "0")}`]));

/** 선생님 메모: `${teacherId}:${studentId}` → 메모 */
const studentNotes = new Map<string, StudentNote>([
  ["10:21", { parentPhone: "01098765432", memo: "어머니께 연락. 화요일은 학교 보충수업으로 20분 늦게 와요.", updatedAt: iso(-3 * DAY) }],
]);

const MOBILE = /^01[016789]\d{7,8}$/;
const ANY_PHONE = /^0\d{8,10}$/;
function phone(value: unknown, pattern: RegExp, required: boolean): string | null {
  const digits = String(value ?? "").replace(/[\s-]/g, "");
  if (!digits && !required) return null;
  if (!pattern.test(digits)) fail(400, "INVALID_PHONE", "전화번호 형식이 올바르지 않습니다. 예: 010-1234-5678");
  return digits;
}

const classrooms: MockClassroom[] = [
  { id: 1, name: "중2 A반", teacherId: 10, teacherName: teacher.name, deleted: false },
  { id: 2, name: "중3 심화반", teacherId: 10, teacherName: teacher.name, deleted: false },
];

const enrollments: { classroomId: number; studentId: number }[] = [
  ...students.map((s) => ({ classroomId: 1, studentId: s.id })),
  { classroomId: 2, studentId: 20 },
  { classroomId: 2, studentId: 23 },
  { classroomId: 2, studentId: 25 },
];

const homeworks: MockHomework[] = [
  {
    id: 101, classroomId: 1, classroomName: "중2 A반", title: "이차방정식 연습 문제",
    description: "교재 32~35쪽 1번부터 12번까지 풀고, 풀이 과정이 보이게 찍어서 올리세요.\n근의 공식을 쓴 문제는 판별식도 같이 적어 주세요.",
    submissionType: "PHOTO", maxPhotos: 3, publishAt: iso(-DAY), dueAt: iso(40 * MINUTE), allowLate: false,
  },
  {
    id: 102, classroomId: 2, classroomName: "중3 심화반", title: "함수의 그래프 서술형",
    description: "학습지 앞뒷면을 모두 찍어 주세요.", submissionType: "PHOTO", maxPhotos: 4,
    publishAt: iso(-2 * DAY), dueAt: iso(5 * HOUR), allowLate: true,
  },
  {
    id: 103, classroomId: 1, classroomName: "중2 A반", title: "일차부등식 오답 노트",
    description: "지난 시험에서 틀린 문제를 다시 풀어 오답 노트에 정리하세요.", submissionType: "PHOTO", maxPhotos: 5,
    publishAt: iso(-3 * HOUR), dueAt: iso(2 * DAY + 3 * HOUR), allowLate: true,
  },
  {
    id: 104, classroomId: 1, classroomName: "중2 A반", title: "연립방정식 단원 평가",
    description: "단원 평가지 1~20번.", submissionType: "PHOTO", maxPhotos: 3,
    publishAt: iso(-5 * DAY), dueAt: iso(-DAY), allowLate: false,
  },
  {
    id: 105, classroomId: 2, classroomName: "중3 심화반", title: "확률 기본 문제",
    description: "다음 수업 전까지 풀어 오세요.", submissionType: "PHOTO", maxPhotos: 3,
    publishAt: iso(DAY), dueAt: iso(4 * DAY), allowLate: false,
  },
];

let nextId = 1000;
const submissions: MockSubmission[] = [
  {
    submissionId: 501, homeworkId: 102, studentId: 20, status: "SUBMITTED", submittedAt: iso(-2 * HOUR), late: false,
    files: [1, 2].map((n) => ({ fileId: 600 + n, viewUrl: notebookPhoto(n), contentType: "image/jpeg", sizeBytes: 1_400_000 + n * 90_000 })),
    pending: [], feedback: null,
  },
  {
    submissionId: 502, homeworkId: 104, studentId: 20, status: "REVIEWED", submittedAt: iso(-DAY - 3 * HOUR), late: false,
    files: [3].map((n) => ({ fileId: 600 + n, viewUrl: notebookPhoto(n), contentType: "image/jpeg", sizeBytes: 1_800_000 })),
    pending: [],
    feedback: {
      teacherName: teacher.name,
      content: "가감법으로 푼 7번 풀이가 깔끔해요. 15번은 식을 세울 때 단위를 맞추지 않아서 답이 달라졌어요. 다음 수업 전에 한 번 더 풀어 보세요.",
      score: 85, updatedAt: iso(-5 * HOUR),
    },
  },
  ...[21, 22, 24].map((studentId, i) => ({
    submissionId: 510 + i, homeworkId: 101, studentId, status: "SUBMITTED" as const,
    submittedAt: iso(-(i + 1) * 25 * MINUTE), late: false,
    files: [{ fileId: 620 + i, viewUrl: notebookPhoto(4 + i), contentType: "image/jpeg", sizeBytes: 1_200_000 }],
    pending: [], feedback: null,
  })),
  {
    submissionId: 520, homeworkId: 104, studentId: 23, status: "REVIEWED", submittedAt: iso(-2 * DAY), late: false,
    files: [{ fileId: 630, viewUrl: notebookPhoto(8), contentType: "image/png", sizeBytes: 900_000 }],
    pending: [], feedback: { teacherName: teacher.name, content: "전부 맞았어요.", score: 100, updatedAt: iso(-20 * HOUR) },
  },
];

const questions: MockQuestion[] = [
  {
    id: 301, classroomId: 1, homeworkId: 101, studentId: 20, studentName: "김민지",
    title: "7번 판별식이 음수면 어떻게 쓰나요?", content: "판별식이 -8이 나왔는데 답을 '해 없음'이라고 쓰면 되나요?",
    status: "ANSWERED", createdAt: iso(-6 * HOUR),
    answers: [{ id: 401, teacherName: teacher.name, content: "네, 실수 범위에서는 '실근이 없다'라고 쓰면 돼요. 판별식 계산 과정도 같이 적어 주세요.", createdAt: iso(-5 * HOUR) }],
  },
  {
    id: 302, classroomId: 1, homeworkId: 103, studentId: 22, studentName: "최하은",
    title: "오답 노트는 몇 문제까지 쓰나요?", content: "틀린 문제가 14개인데 전부 써야 하나요?",
    status: "OPEN", createdAt: iso(-30 * MINUTE), answers: [],
  },
];

const notifications: MockNotification[] = [
  note(20, "FEEDBACK_CREATED", "SUBMISSION", 502, "'연립방정식 단원 평가' 숙제의 피드백이 도착했습니다.", -5 * HOUR, false),
  note(20, "ANSWER_CREATED", "QUESTION", 301, "질문 '7번 판별식이 음수면 어떻게 쓰나요?'에 답변이 달렸습니다.", -5 * HOUR, true),
  note(10, "SUBMISSION_RECEIVED", "SUBMISSION", 510, "이서준 학생이 '이차방정식 연습 문제' 숙제를 제출했습니다.", -25 * MINUTE, false),
  note(10, "SUBMISSION_RECEIVED", "SUBMISSION", 511, "최하은 학생이 '이차방정식 연습 문제' 숙제를 제출했습니다.", -50 * MINUTE, false),
  note(10, "QUESTION_CREATED", "QUESTION", 302, "최하은 학생이 질문을 올렸습니다: 오답 노트는 몇 문제까지 쓰나요?", -30 * MINUTE, false),
  note(10, "SIGNUP_REQUESTED", "SIGNUP_REQUEST", 801, "송지아 학생이 '중2 A반' 반 가입을 요청했습니다.", -2 * HOUR, false),
];

const signupRequests: (SignupRequestView & { password: string })[] = [
  { id: 801, loginId: "jia2011", name: "송지아", phone: "01055501234", classroomId: 1, classroomName: "중2 A반", status: "PENDING", requestedAt: iso(-2 * HOUR), password: "" },
  { id: 802, loginId: "minho.k", name: "김민호", phone: "01077708888", classroomId: 2, classroomName: "중3 심화반", status: "PENDING", requestedAt: iso(-40 * MINUTE), password: "" },
];

function note(recipientId: number, type: NotificationType, targetType: TargetType, targetId: number,
              message: string, offset: number, read: boolean): MockNotification {
  return { id: nextId++, recipientId, type, targetType, targetId, message, read, createdAt: iso(offset) };
}

// ---------- 세션 ----------

function currentMember(): Member {
  const id = typeof window === "undefined" ? null : window.localStorage.getItem(SESSION_KEY);
  const member = members.find((m) => String(m.id) === id);
  if (!member) throw new ApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
  return member;
}

function notFound(): never {
  throw new ApiError(404, "NOT_FOUND", "대상을 찾을 수 없습니다.");
}

function fail(status: number, code: string, message: string): never {
  throw new ApiError(status, code, message);
}

const liveClassrooms = () => classrooms.filter((c) => !c.deleted);
const isEnrolled = (classroomId: number, studentId: number) =>
  enrollments.some((e) => e.classroomId === classroomId && e.studentId === studentId);

function visibleClassrooms(me: Member): Classroom[] {
  const list = me.role === "STUDENT" ? liveClassrooms().filter((c) => isEnrolled(c.id, me.id)) : liveClassrooms();
  return list.map(({ deleted: _deleted, ...c }) => c);
}

function readableHomework(id: number, me: Member): MockHomework {
  const hw = homeworks.find((h) => h.id === id);
  const classroom = hw && classrooms.find((c) => c.id === hw.classroomId && !c.deleted);
  if (!hw || !classroom) notFound();
  if (me.role === "STUDENT" && (!isEnrolled(hw.classroomId, me.id) || new Date(hw.publishAt).getTime() > Date.now())) notFound();
  return hw;
}

function summary(hw: MockHomework): HomeworkSummary {
  const { description: _d, ...rest } = hw;
  return rest;
}

function detail(hw: MockHomework): HomeworkDetail {
  const { classroomName: _c, ...rest } = hw;
  return rest;
}

function displayStatus(s: MockSubmission | undefined): MyStatus {
  if (!s || s.status === "UPLOADING") return "NOT_SUBMITTED";
  return s.status;
}

function view(s: MockSubmission, rejected: number[] = []): SubmissionView {
  const student = members.find((m) => m.id === s.studentId)!;
  return {
    submissionId: s.submissionId, homeworkId: s.homeworkId, studentId: s.studentId, studentName: student.name,
    status: displayStatus(s), submittedAt: s.submittedAt, late: s.late, files: s.files,
    feedback: s.feedback, rejectedFileIds: rejected,
  };
}

function notify(recipientId: number, type: NotificationType, targetType: TargetType, targetId: number, message: string) {
  notifications.unshift(note(recipientId, type, targetType, targetId, message, 0, false));
}

// ---------- 라우터 ----------

type Handler = (match: RegExpMatchArray, body: any) => unknown;
const routes: [string, RegExp, Handler][] = [];
const route = (method: string, pattern: string, handler: Handler) =>
  routes.push([method, new RegExp(`^${pattern.replace(/:id/g, "(\\d+)")}$`), handler]);

route("POST", "/auth/login", (_m, body) => {
  const member = members.find((m) => m.loginId === body?.loginId);
  if (!member) {
    if (signupRequests.some((r) => r.loginId === body?.loginId && r.status === "PENDING")) {
      fail(403, "SIGNUP_PENDING", "가입 승인을 기다리고 있습니다. 선생님이 승인하면 로그인할 수 있습니다.");
    }
    fail(401, "LOGIN_FAILED", "아이디 또는 비밀번호가 올바르지 않습니다.");
  }
  window.localStorage.setItem(SESSION_KEY, String(member.id));
  return member;
});
route("POST", "/auth/logout", () => {
  window.localStorage.removeItem(SESSION_KEY);
});
route("GET", "/auth/me", () => currentMember());
route("GET", "/public/classrooms", () => liveClassrooms().map((c) => ({ id: c.id, name: c.name, teacherName: c.teacherName })));
route("POST", "/auth/signup", (_m, body) => {
  if (members.some((m) => m.loginId === body.loginId) || signupRequests.some((r) => r.loginId === body.loginId && r.status === "PENDING")) {
    fail(409, "DUPLICATE_LOGIN_ID", "이미 사용 중인 아이디입니다.");
  }
  const classroom = liveClassrooms().find((c) => c.id === Number(body.classroomId)) ?? notFound();
  const request = { id: nextId++, loginId: body.loginId, name: body.name, phone: phone(body.phone, MOBILE, true), classroomId: classroom.id,
    classroomName: classroom.name, status: "PENDING" as const, requestedAt: iso(0), password: body.password };
  signupRequests.push(request);
  notify(classroom.teacherId, "SIGNUP_REQUESTED", "SIGNUP_REQUEST", request.id, `${request.name} 학생이 '${classroom.name}' 반 가입을 요청했습니다.`);
  return { requestId: request.id, status: "PENDING" };
});

route("GET", "/dashboard", (): Dashboard => {
  const me = currentMember();
  const unread = notifications.filter((n) => n.recipientId === me.id && !n.read).length;
  if (me.role === "STUDENT") {
    const now = Date.now();
    const upcoming = homeworks
      .filter((h) => isEnrolled(h.classroomId, me.id) && !classrooms.find((c) => c.id === h.classroomId)?.deleted)
      .filter((h) => new Date(h.publishAt).getTime() <= now && new Date(h.dueAt).getTime() >= now)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map((h) => ({ homework: summary(h), myStatus: displayStatus(submissions.find((s) => s.homeworkId === h.id && s.studentId === me.id)) }));
    return { me, unreadNotificationCount: unread, upcomingHomeworks: upcoming, classrooms: null, pendingSignupCount: null };
  }
  return {
    me, unreadNotificationCount: unread, upcomingHomeworks: null, classrooms: visibleClassrooms(me),
    pendingSignupCount: signupRequests.filter((r) => r.status === "PENDING").length,
  };
});

route("GET", "/classrooms", () => visibleClassrooms(currentMember()));
route("POST", "/classrooms", (_m, body) => {
  const me = currentMember();
  const classroom = { id: nextId++, name: body.name, teacherId: me.id, teacherName: me.name, deleted: false };
  classrooms.push(classroom);
  return { id: classroom.id, name: classroom.name, teacherId: me.id, teacherName: me.name };
});
route("DELETE", "/classrooms/:id", (m) => {
  const me = currentMember();
  const classroom = liveClassrooms().find((c) => c.id === Number(m[1]));
  if (!classroom || me.role === "STUDENT") notFound();
  classroom.deleted = true;
  signupRequests.filter((r) => r.classroomId === classroom.id && r.status === "PENDING").forEach((r) => (r.status = "REJECTED"));
});
route("GET", "/classrooms/:id/students", (m): StudentRow[] =>
  enrollments
    .filter((e) => e.classroomId === Number(m[1]))
    .map((e) => members.find((s) => s.id === e.studentId)!)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map((s) => ({ id: s.id, loginId: s.loginId, name: s.name, phone: phones.get(s.id) ?? null })));

// 내 정보 (선생님 메모는 절대 넣지 않는다)
route("GET", "/me/profile", (): Profile => {
  const me = currentMember();
  return { loginId: me.loginId, name: me.name, role: me.role, phone: phones.get(me.id) ?? null };
});
route("PATCH", "/me/profile", (_m, body): Profile => {
  const me = currentMember();
  phones.set(me.id, phone(body?.phone, MOBILE, true)!);
  return { loginId: me.loginId, name: me.name, role: me.role, phone: phones.get(me.id) ?? null };
});
route("PATCH", "/auth/password", (_m, body) => {
  if (!body?.currentPassword) fail(400, "INVALID_PASSWORD", "현재 비밀번호가 올바르지 않습니다.");
});

// 선생님 전용 학생 화면 (실제 서버: 학생이면 403, 내 반 학생이 아니면 404)
function myClassroomNames(studentId: number): string[] {
  const me = currentMember();
  if (me.role !== "TEACHER") fail(403, "FORBIDDEN", "권한이 없습니다.");
  const names = liveClassrooms()
    .filter((c) => c.teacherId === me.id && isEnrolled(c.id, studentId))
    .map((c) => c.name);
  if (names.length === 0) notFound();
  return names;
}
route("GET", "/students/:id", (m): StudentDetail => {
  const id = Number(m[1]);
  const classroomNames = myClassroomNames(id);
  const s = members.find((x) => x.id === id) ?? notFound();
  const note = studentNotes.get(`${currentMember().id}:${id}`) ?? { parentPhone: null, memo: null, updatedAt: null };
  return { id, loginId: s.loginId, name: s.name, phone: phones.get(id) ?? null, classroomNames, guardianConsentAt: null, note };
});
route("PUT", "/students/:id/note", (m, body): StudentNote => {
  const id = Number(m[1]);
  myClassroomNames(id);
  const memo = typeof body?.memo === "string" && body.memo.trim() ? body.memo.trim().slice(0, 2000) : null;
  const note = { parentPhone: phone(body?.parentPhone, ANY_PHONE, false), memo, updatedAt: iso(0) };
  studentNotes.set(`${currentMember().id}:${id}`, note);
  return note;
});
route("POST", "/classrooms/:id/students", (m, body) => {
  const result = { enrolledCount: 0, alreadyEnrolled: [] as string[], notFound: [] as string[] };
  for (const loginId of body.loginIds as string[]) {
    const s = students.find((x) => x.loginId === loginId);
    if (!s) result.notFound.push(loginId);
    else if (isEnrolled(Number(m[1]), s.id)) result.alreadyEnrolled.push(loginId);
    else {
      enrollments.push({ classroomId: Number(m[1]), studentId: s.id });
      result.enrolledCount++;
    }
  }
  return result;
});

route("GET", "/classrooms/:id/homeworks", (m) => {
  const me = currentMember();
  const id = Number(m[1]);
  if (!liveClassrooms().some((c) => c.id === id)) notFound();
  if (me.role === "STUDENT" && !isEnrolled(id, me.id)) notFound();
  return homeworks
    .filter((h) => h.classroomId === id)
    .filter((h) => me.role !== "STUDENT" || new Date(h.publishAt).getTime() <= Date.now())
    .sort((a, b) => b.dueAt.localeCompare(a.dueAt))
    .map(summary);
});
route("POST", "/classrooms/:id/homeworks", (m, body) => {
  const classroom = liveClassrooms().find((c) => c.id === Number(m[1])) ?? notFound();
  if (body.publishAt >= body.dueAt) fail(400, "INVALID_SCHEDULE", "공개 시각은 마감 시각보다 앞서야 합니다.");
  const hw: MockHomework = {
    id: nextId++, classroomId: classroom.id, classroomName: classroom.name, title: body.title, description: body.description ?? null,
    submissionType: "PHOTO", maxPhotos: Number(body.maxPhotos), publishAt: body.publishAt, dueAt: body.dueAt, allowLate: Boolean(body.allowLate),
  };
  homeworks.push(hw);
  return detail(hw);
});
route("GET", "/homeworks/:id", (m) => detail(readableHomework(Number(m[1]), currentMember())));

route("POST", "/homeworks/:id/submission/upload-urls", (m, body) => {
  const me = currentMember();
  const hw = readableHomework(Number(m[1]), me);
  if (new Date(hw.dueAt).getTime() < Date.now() && !hw.allowLate) fail(409, "SUBMISSION_CLOSED", "마감된 숙제입니다.");
  let s = submissions.find((x) => x.homeworkId === hw.id && x.studentId === me.id);
  if (!s) {
    s = { submissionId: nextId++, homeworkId: hw.id, studentId: me.id, status: "UPLOADING", submittedAt: null, late: false, files: [], pending: [], feedback: null };
    submissions.push(s);
  }
  if (s.status === "REVIEWED") fail(409, "SUBMISSION_REVIEWED", "피드백이 끝난 제출은 수정할 수 없습니다.");
  if (s.files.length + body.files.length > hw.maxPhotos) fail(400, "TOO_MANY_PHOTOS", "제출할 수 있는 사진 장수를 넘었습니다.");
  for (const f of body.files) {
    if (f.sizeBytes > 10 * 1024 * 1024) fail(400, "FILE_TOO_LARGE", "사진 한 장의 크기는 10MB 이하여야 합니다.");
  }
  s.pending = body.files.map((f: { contentType: string }) => ({ fileId: nextId++, contentType: f.contentType }));
  const uploads: UploadTarget[] = s.pending.map((p) => ({
    fileId: p.fileId, uploadUrl: `mock-upload://${p.fileId}`, method: "PUT", headers: { "Content-Type": p.contentType }, expiresAt: iso(5 * MINUTE),
  }));
  return { submissionId: s.submissionId, uploads };
});
route("POST", "/homeworks/:id/submission/complete", (m) => {
  const me = currentMember();
  const hw = readableHomework(Number(m[1]), me);
  const s = submissions.find((x) => x.homeworkId === hw.id && x.studentId === me.id) ?? fail(400, "NO_FILES", "제출할 사진이 없습니다.");
  for (const p of s.pending) {
    const url = uploadedFiles.get(p.fileId);
    if (!url) fail(409, "FILE_NOT_UPLOADED", "업로드가 끝나지 않은 사진이 있습니다.");
    s.files.push({ fileId: p.fileId, viewUrl: url.url, contentType: p.contentType, sizeBytes: url.size });
  }
  s.pending = [];
  if (s.files.length === 0) fail(400, "NO_FILES", "제출할 사진이 없습니다.");
  s.status = "SUBMITTED";
  s.submittedAt = iso(0);
  s.late = new Date(hw.dueAt).getTime() < Date.now();
  notify(10, "SUBMISSION_RECEIVED", "SUBMISSION", s.submissionId, `${me.name} 학생이 '${hw.title}' 숙제를 제출했습니다.`);
  return view(s);
});
route("GET", "/homeworks/:id/submission", (m) => {
  const me = currentMember();
  const hw = readableHomework(Number(m[1]), me);
  const s = submissions.find((x) => x.homeworkId === hw.id && x.studentId === me.id);
  return s ? view(s) : undefined;
});
route("DELETE", "/homeworks/:id/submission/files/:id", (m) => {
  const me = currentMember();
  const s = submissions.find((x) => x.homeworkId === Number(m[1]) && x.studentId === me.id) ?? notFound();
  s.files = s.files.filter((f) => f.fileId !== Number(m[2]));
  if (s.files.length === 0 && s.status === "SUBMITTED") s.status = "UPLOADING";
});
route("GET", "/homeworks/:id/submissions", (m): SubmissionRow[] => {
  const hw = homeworks.find((h) => h.id === Number(m[1])) ?? notFound();
  return enrollments
    .filter((e) => e.classroomId === hw.classroomId)
    .map((e) => {
      const student = members.find((x) => x.id === e.studentId)!;
      const s = submissions.find((x) => x.homeworkId === hw.id && x.studentId === student.id);
      return {
        studentId: student.id, studentName: student.name, submissionId: s?.submissionId ?? null, status: displayStatus(s),
        submittedAt: s?.submittedAt ?? null, late: s?.late ?? false, photoCount: s?.files.length ?? 0, score: s?.feedback?.score ?? null,
      };
    });
});
route("GET", "/submissions/:id", (m) => view(submissions.find((s) => s.submissionId === Number(m[1])) ?? notFound()));
route("PUT", "/submissions/:id/feedback", (m, body) => {
  const s = submissions.find((x) => x.submissionId === Number(m[1])) ?? notFound();
  const existed = s.feedback != null;
  s.feedback = { teacherName: teacher.name, content: body.content, score: body.score ?? null, updatedAt: iso(0) };
  s.status = "REVIEWED";
  const hw = homeworks.find((h) => h.id === s.homeworkId)!;
  notify(s.studentId, "FEEDBACK_CREATED", "SUBMISSION", s.submissionId, `'${hw.title}' 숙제의 피드백이 ${existed ? "수정되었습니다" : "도착했습니다"}.`);
  return s.feedback;
});

route("GET", "/classrooms/:id/questions", (m) => {
  const me = currentMember();
  const list: QuestionSummary[] = questions
    .filter((q) => q.classroomId === Number(m[1]) && (me.role !== "STUDENT" || q.studentId === me.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ content: _c, answers: _a, classroomId: _cl, ...q }) => q);
  return { content: list, page: 0, size: 20, totalElements: list.length, totalPages: 1 };
});
route("POST", "/classrooms/:id/questions", (m, body) => {
  const me = currentMember();
  const q: MockQuestion = {
    id: nextId++, classroomId: Number(m[1]), homeworkId: body.homeworkId ?? null, studentId: me.id, studentName: me.name,
    title: body.title, content: body.content, status: "OPEN", createdAt: iso(0), answers: [],
  };
  questions.push(q);
  notify(10, "QUESTION_CREATED", "QUESTION", q.id, `${me.name} 학생이 질문을 올렸습니다: ${q.title}`);
  return q;
});
route("GET", "/questions/:id", (m) => {
  const me = currentMember();
  const q = questions.find((x) => x.id === Number(m[1]));
  if (!q || (me.role === "STUDENT" && q.studentId !== me.id)) notFound();
  return q;
});
route("POST", "/questions/:id/answers", (m, body) => {
  const q = questions.find((x) => x.id === Number(m[1])) ?? notFound();
  const answer = { id: nextId++, teacherName: teacher.name, content: body.content, createdAt: iso(0) };
  q.answers.push(answer);
  q.status = "ANSWERED";
  notify(q.studentId, "ANSWER_CREATED", "QUESTION", q.id, `질문 '${q.title}'에 답변이 달렸습니다.`);
  return answer;
});

route("GET", "/notifications", () => {
  const me = currentMember();
  const list = notifications.filter((n) => n.recipientId === me.id).map(({ recipientId: _r, ...n }) => n);
  return { content: list, page: 0, size: 20, totalElements: list.length, totalPages: 1 };
});
route("GET", "/notifications/unread-count", () => {
  const me = currentMember();
  return { count: notifications.filter((n) => n.recipientId === me.id && !n.read).length };
});
route("PATCH", "/notifications/:id/read", (m) => {
  const n = notifications.find((x) => x.id === Number(m[1]));
  if (n) n.read = true;
});
route("PATCH", "/notifications/read-all", () => {
  const me = currentMember();
  let updated = 0;
  notifications.filter((n) => n.recipientId === me.id && !n.read).forEach((n) => {
    n.read = true;
    updated++;
  });
  return { updated };
});

route("GET", "/signup-requests", () =>
  signupRequests.filter((r) => r.status === "PENDING").map(({ password: _p, ...r }) => r));
route("POST", "/signup-requests/:id/approve", (m) => {
  const r = signupRequests.find((x) => x.id === Number(m[1])) ?? notFound();
  if (r.status !== "PENDING") fail(409, "SIGNUP_ALREADY_DECIDED", "이미 처리된 가입 요청입니다.");
  r.status = "APPROVED";
  const student: Member = { id: nextId++, loginId: r.loginId, name: r.name, role: "STUDENT" };
  members.push(student);
  if (r.phone) phones.set(student.id, r.phone);
  students.push(student);
  enrollments.push({ classroomId: r.classroomId, studentId: student.id });
  const { password: _p, ...rest } = r;
  return rest;
});
route("POST", "/signup-requests/:id/reject", (m) => {
  const r = signupRequests.find((x) => x.id === Number(m[1])) ?? notFound();
  if (r.status !== "PENDING") fail(409, "SIGNUP_ALREADY_DECIDED", "이미 처리된 가입 요청입니다.");
  r.status = "REJECTED";
  const { password: _p, ...rest } = r;
  return rest;
});

let chatUsed = 4;
route("GET", "/chat/usage", () => ({ used: chatUsed, limit: 30 }));

// ---------- 진입점 ----------

const uploadedFiles = new Map<number, { url: string; size: number }>();

export async function mockApi<T>(method: string, path: string, body: unknown): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 180));
  const [pathname] = path.split("?");
  for (const [m, pattern, handler] of routes) {
    if (m !== method) continue;
    const match = pathname.match(pattern);
    if (match) {
      if (!pathname.startsWith("/auth/login") && !pathname.startsWith("/public") && !pathname.startsWith("/auth/signup")) {
        currentMember();
      }
      return structuredClone(handler(match, body)) as T;
    }
  }
  return notFound();
}

export async function mockUpload(target: UploadTarget, file: File): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 600));
  uploadedFiles.set(target.fileId, { url: URL.createObjectURL(file), size: file.size });
}

export async function mockChat(message: string, onDelta: (text: string) => void, signal?: AbortSignal): Promise<void> {
  if (chatUsed >= 30) fail(429, "CHAT_LIMIT_EXCEEDED", "오늘 챗봇 사용 횟수를 모두 썼습니다.");
  chatUsed++;
  const answer = `좋은 질문이에요. "${message.slice(0, 30)}"를 풀려면 먼저 문제에서 주어진 조건을 식으로 옮겨 보세요.\n\n1. 모르는 값을 x로 두고\n2. 조건 두 개로 식 두 개를 세운 다음\n3. 한 문자를 없애는 방향으로 정리해 보세요.\n\n어느 단계에서 막혔는지 알려 주면 거기서부터 같이 볼게요.`;
  for (const chunk of answer.match(/.{1,6}/gs) ?? []) {
    if (signal?.aborted) return;
    await new Promise((resolve) => setTimeout(resolve, 35));
    onDelta(chunk);
  }
}
