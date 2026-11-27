"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, photoContentType, uploadPhoto } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { SubmissionView, UploadUrlsResponse } from "@/lib/types";
import { Button, cx, ErrorNote } from "./ui";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];
/** 이보다 큰 사진은 올리기 전에 줄인다. 휴대폰 원본(3~8MB)을 그대로 올리면 마감 직전 업로드가 느려진다 */
const SHRINK_OVER_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 2200;

interface Picked {
  key: string;
  file: File;
  preview: string;
  state: "ready" | "uploading" | "done" | "failed";
}

/**
 * 사진 제출 순서
 * 1) 업로드 URL 요청 → 2) 브라우저가 S3로 직접 PUT → 3) 제출 완료 요청
 * 사진 파일은 Spring 서버를 거치지 않는다.
 */
export function PhotoUploader({
  homeworkId,
  remaining,
  onSubmitted,
}: {
  homeworkId: number;
  remaining: number;
  onSubmitted: (view: SubmissionView) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 미리보기 주소는 화면을 떠날 때 한 번에 정리한다 (뺀 사진은 remove 에서 바로 정리)
  const pickedRef = useRef(picked);
  pickedRef.current = picked;
  useEffect(() => () => pickedRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  function choose(files: FileList | null) {
    if (!files) return;
    setError(null);
    const next: Picked[] = [];
    for (const file of Array.from(files)) {
      const type = photoContentType(file);
      if (!ALLOWED.includes(type)) {
        setError("jpeg, png, webp, heic 사진만 올릴 수 있어요.");
        continue;
      }
      if (file.size > MAX_BYTES * 2) {
        setError("사진 한 장이 너무 커요. 20MB 이하로 골라 주세요.");
        continue;
      }
      next.push({ key: `${file.name}-${file.lastModified}-${Math.random()}`, file, preview: URL.createObjectURL(file), state: "ready" });
    }
    const merged = [...picked, ...next];
    if (merged.length > remaining) {
      setError(`사진은 ${remaining}장까지 더 올릴 수 있어요.`);
      merged.slice(remaining).forEach((p) => URL.revokeObjectURL(p.preview));
    }
    setPicked(merged.slice(0, remaining));
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(key: string) {
    const target = picked.find((p) => p.key === key);
    if (target) URL.revokeObjectURL(target.preview);
    setPicked((list) => list.filter((p) => p.key !== key));
  }

  async function submit() {
    if (picked.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const files = await Promise.all(picked.map((p) => shrink(p.file)));
      for (const f of files) {
        if (f.size > MAX_BYTES) throw new ApiError(400, "FILE_TOO_LARGE", "사진 한 장의 크기는 10MB 이하여야 해요.");
      }
      const { uploads } = await api<UploadUrlsResponse>(`/homeworks/${homeworkId}/submission/upload-urls`, {
        method: "POST",
        body: { files: files.map((f) => ({ contentType: photoContentType(f), sizeBytes: f.size })) },
      });
      setPicked((list) => list.map((p) => ({ ...p, state: "uploading" })));
      await Promise.all(
        uploads.map(async (target, i) => {
          try {
            await uploadPhoto(target, files[i]);
            setPicked((list) => list.map((p, j) => (j === i ? { ...p, state: "done" } : p)));
          } catch (e) {
            setPicked((list) => list.map((p, j) => (j === i ? { ...p, state: "failed" } : p)));
            throw e;
          }
        }),
      );
      const view = await api<SubmissionView>(`/homeworks/${homeworkId}/submission/complete`, { method: "POST" });
      picked.forEach((p) => URL.revokeObjectURL(p.preview));
      setPicked([]);
      if (view.rejectedFileIds.length > 0) {
        setError(`${view.rejectedFileIds.length}장은 크기나 형식이 맞지 않아 빠졌어요. 나머지는 제출됐어요.`);
      }
      onSubmitted(view);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "사진을 올리지 못했어요. 다시 시도해 주세요.");
      setPicked((list) => list.map((p) => ({ ...p, state: p.state === "done" ? "done" : "ready" })));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic"
        multiple
        className="sr-only"
        id={`photo-input-${homeworkId}`}
        onChange={(e) => choose(e.target.files)}
        disabled={busy || remaining === 0}
      />
      <label
        htmlFor={`photo-input-${homeworkId}`}
        className={cx(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-paper px-4 py-8 text-center hover:border-pen",
          (busy || remaining === 0) && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="text-[15px] font-semibold text-ink">풀이 사진 찍기 또는 고르기</span>
        <span className="mt-1 text-[13px] text-ink-soft">
          {remaining > 0 ? `${remaining}장까지 더 올릴 수 있어요. 글씨가 잘 보이게 찍어 주세요.` : "올릴 수 있는 사진 장수를 다 채웠어요."}
        </span>
      </label>

      {picked.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {picked.map((p) => (
            <li key={p.key} className="relative overflow-hidden rounded-md border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="고른 사진" className="aspect-[3/4] w-full object-cover" />
              <div className="flex items-center justify-between px-2 py-1 text-[11px] text-ink-soft">
                <span>{p.state === "uploading" ? "올리는 중" : p.state === "done" ? "올림" : p.state === "failed" ? "실패" : formatBytes(p.file.size)}</span>
                {!busy && (
                  <button onClick={() => remove(p.key)} className="text-redpen" aria-label="이 사진 빼기">
                    빼기
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ErrorNote message={error} />
      <Button onClick={submit} disabled={busy || picked.length === 0} className="w-full sm:w-auto">
        {busy ? "제출하는 중" : picked.length > 0 ? `사진 ${picked.length}장 제출하기` : "사진 제출하기"}
      </Button>
    </div>
  );
}

/** 큰 jpeg, png, webp 는 긴 변 2200px JPEG 로 줄인다. HEIC 는 브라우저가 못 그리는 경우가 많아 그대로 둔다 */
async function shrink(file: File): Promise<File> {
  const type = photoContentType(file);
  if (file.size <= SHRINK_OVER_BYTES || type === "image/heic") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}
