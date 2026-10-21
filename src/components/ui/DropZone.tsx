"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FOCUS, MOTION, cx } from "./classes";

export type DropZoneProps = {
  label: string;
  accept?: string;
  error?: string;
  onFile: (file: File) => void;
  className?: string;
};

function UploadGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
      <path d="M12 16V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" fill="none" className="stroke-current" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DropZone({ label, accept, error, onFile, className }: DropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [dragging, setDragging] = useState(false);

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    setDragging(true);
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className={cx("flex flex-col gap-3", className)}>
      <button
        type="button"
        data-state={dragging ? "drag-over" : error ? "error" : "idle"}
        aria-describedby={error ? errorId : undefined}
        onClick={() => input.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          "flex h-[104px] w-full items-center gap-4 rounded-md border-[1.5px] border-dashed px-6 text-left",
          dragging
            ? "border-accent bg-accent/faint"
            : error
              ? "border-danger-ink bg-vellum"
              : "border-ink/muted bg-vellum hover:border-ink",
          MOTION,
          FOCUS,
        )}
      >
        <span
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-pill border bg-paper",
            dragging ? "border-accent text-accent" : "border-vellum-line text-ink",
          )}
        >
          <UploadGlyph />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {dragging ? (
            <>
              <span className="text-body font-semibold text-accent">Drop to add it</span>
              <span className="text-small text-smoke">{label}</span>
            </>
          ) : (
            <>
              <span className="text-body font-semibold text-ink">{label}</span>
              <span className="text-small text-smoke">
                Drop it here or <span className="font-medium text-accent underline underline-offset-3">choose a file</span>
              </span>
            </>
          )}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        aria-label={`${label} file`}
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      {error && (
        <p id={errorId} role="alert" className="text-small text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
