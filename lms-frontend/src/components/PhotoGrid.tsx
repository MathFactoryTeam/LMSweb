"use client";

import { useState } from "react";
import type { FileView } from "@/lib/types";

/** 제출된 사진 묶음. 누르면 크게 본다. 조회 URL은 5분만 유효하므로 오래 열어 둔 화면은 새로고침해야 한다 */
export function PhotoGrid({ files, onDelete }: { files: FileView[]; onDelete?: (fileId: number) => void }) {
  const [open, setOpen] = useState<FileView | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {files.map((f, i) => (
          <li key={f.fileId} className="overflow-hidden rounded-md border border-line bg-surface">
            <button onClick={() => setOpen(f)} className="block w-full" aria-label={`${i + 1}번째 사진 크게 보기`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.viewUrl} alt={`제출한 사진 ${i + 1}`} className="aspect-[3/4] w-full object-cover" loading="lazy" />
            </button>
            <div className="flex items-center justify-between px-2.5 py-1.5 text-[12px] text-ink-soft">
              <span className="num">{i + 1}장</span>
              {onDelete && (
                <button onClick={() => onDelete(f.fileId)} className="text-redpen hover:underline">
                  삭제
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="사진 크게 보기"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open.viewUrl} alt="제출한 사진" className="max-h-full max-w-full rounded-md bg-surface" />
          <button className="absolute top-4 right-4 rounded-md bg-surface px-3 py-1.5 text-[14px]" onClick={() => setOpen(null)}>
            닫기
          </button>
        </div>
      )}
    </>
  );
}
