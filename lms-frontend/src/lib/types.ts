// 백엔드(Spring) 응답 형태와 1:1로 맞춘 타입. 날짜는 "2026-11-27T18:00:00" 형식의 한국 시간 문자열이다.

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export interface Member {
  id: number;
  loginId: string;
  name: string;
  role: Role;
}

export interface Classroom {
  id: number;
  name: string;
  teacherId: number;
  teacherName: string;
}

export interface PublicClassroom {
  id: number;
  name: string;
  teacherName: string;
}

export type SubmissionType = "PHOTO" | "OMR";

export interface HomeworkSummary {
  id: number;
  classroomId: number;
  classroomName: string;
  title: string;
  submissionType: SubmissionType;
  maxPhotos: number;
  publishAt: string;
  dueAt: string;
  allowLate: boolean;
}

export interface HomeworkDetail {
  id: number;
  classroomId: number;
  title: string;
  description: string | null;
  submissionType: SubmissionType;
  maxPhotos: number;
  publishAt: string;
  dueAt: string;
  allowLate: boolean;
}

/** 화면 표시용 제출 상태 */
export type MyStatus = "NOT_SUBMITTED" | "SUBMITTED" | "REVIEWED" | "GRADING" | "GRADED";

export interface UpcomingHomework {
  homework: HomeworkSummary;
  myStatus: MyStatus;
}

export interface Dashboard {
  me: Member;
  unreadNotificationCount: number;
  upcomingHomeworks: UpcomingHomework[] | null;
  classrooms: Classroom[] | null;
  pendingSignupCount: number | null;
}

export interface UploadTarget {
  fileId: number;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
  expiresAt: string;
}

export interface UploadUrlsResponse {
  submissionId: number;
  uploads: UploadTarget[];
}

export interface FileView {
  fileId: number;
  viewUrl: string;
  contentType: string;
  sizeBytes: number | null;
}

export interface FeedbackView {
  teacherName: string;
  content: string;
  score: number | null;
  updatedAt: string;
}

export interface SubmissionView {
  submissionId: number;
  homeworkId: number;
  studentId: number;
  studentName: string;
  status: MyStatus;
  submittedAt: string | null;
  late: boolean;
  files: FileView[];
  feedback: FeedbackView | null;
  rejectedFileIds: number[];
}

export interface SubmissionRow {
  studentId: number;
  studentName: string;
  submissionId: number | null;
  status: MyStatus;
  submittedAt: string | null;
  late: boolean;
  photoCount: number;
  score: number | null;
}

export type QuestionStatus = "OPEN" | "ANSWERED";

export interface QuestionSummary {
  id: number;
  title: string;
  status: QuestionStatus;
  studentId: number;
  studentName: string;
  homeworkId: number | null;
  createdAt: string;
}

export interface AnswerView {
  id: number;
  teacherName: string;
  content: string;
  createdAt: string;
}

export interface QuestionDetail {
  id: number;
  classroomId: number;
  homeworkId: number | null;
  studentId: number;
  studentName: string;
  title: string;
  content: string;
  status: QuestionStatus;
  createdAt: string;
  answers: AnswerView[];
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type NotificationType =
  | "SUBMISSION_RECEIVED"
  | "QUESTION_CREATED"
  | "FEEDBACK_CREATED"
  | "ANSWER_CREATED"
  | "SIGNUP_REQUESTED";

export type TargetType = "SUBMISSION" | "QUESTION" | "SIGNUP_REQUEST";

export interface NotificationView {
  id: number;
  type: NotificationType;
  targetType: TargetType | null;
  targetId: number | null;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface SignupRequestView {
  id: number;
  loginId: string;
  name: string;
  phone: string | null;
  classroomId: number;
  classroomName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
}

export interface EnrollResult {
  enrolledCount: number;
  alreadyEnrolled: string[];
  notFound: string[];
}

export interface ChatUsage {
  used: number;
  limit: number;
}

/** 내 정보. 선생님 메모는 들어 있지 않다 */
export interface Profile {
  loginId: string;
  name: string;
  role: Role;
  phone: string | null;
}

/** 선생님이 보는 반 학생 한 줄 */
export interface StudentRow {
  id: number;
  loginId: string;
  name: string;
  phone: string | null;
}

/** 선생님 전용 메모. 학생은 볼 수 없다 */
export interface StudentNote {
  parentPhone: string | null;
  memo: string | null;
  updatedAt: string | null;
}

export interface StudentDetail {
  id: number;
  loginId: string;
  name: string;
  phone: string | null;
  classroomNames: string[];
  guardianConsentAt: string | null;
  note: StudentNote;
}
