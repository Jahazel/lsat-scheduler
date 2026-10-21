"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FOCUS, MOTION, cx } from "./classes";

export type DropZoneProps = {
  label: string;
  accept?: string;
  error?: string;
  className?: string;
} & ({ multiple?: false; onFile: (file: File) => void } | { multiple: true; onFiles: (files: File[]) => void });

function UploadGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
      <path d="M12 16V4m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" fill="none" className="stroke-current" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DropZone(props: DropZoneProps) {
  const { label, accept, error, className } = props;
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
    handOver(event.dataTransfer.files);
  };
  const handOver = (list: FileList | null) => {
    const files = [...(list ?? [])];
    if (props.multiple) {
      if (files.length > 0) props.onFiles(files);
    } else if (files[0]) {
      props.onFile(files[0]);
    }
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
              <span className="text-body font-semibold text-accent">{props.multiple ? "Drop to add them" : "Drop to add it"}</span>
              <span className="text-small text-smoke">{label}</span>
            </>
          ) : (
            <>
              <span className="text-body font-semibold text-ink">{label}</span>
              <span className="text-small text-smoke">
                {props.multiple ? "Drop them here together or " : "Drop it here or "}
                <span className="font-medium text-accent underline underline-offset-3">{props.multiple ? "choose files" : "choose a file"}</span>
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
        multiple={props.multiple}
        className="hidden"
        onChange={(event) => {
          handOver(event.target.files);
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
