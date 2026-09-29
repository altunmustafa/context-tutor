import type { RefObject } from "react";

import { limits } from "../../api/limits";

interface SourceEditorProps {
  content: string;
  contentLength: number;
  contentIsValid: boolean;
  disabled: boolean;
  contentFieldRef: RefObject<HTMLTextAreaElement | null>;
  onSourceChange: (content: string) => void;
}

export function SourceEditor({
  content,
  contentLength,
  contentIsValid,
  disabled,
  contentFieldRef,
  onSourceChange,
}: SourceEditorProps) {
  return (
    <>
      <label htmlFor="content">Source text</label>
      <textarea
        id="content"
        ref={contentFieldRef}
        value={content}
        disabled={disabled}
        aria-describedby="content-help"
        aria-invalid={contentLength > 0 && !contentIsValid}
        placeholder="Paste technical notes or documentation…"
        onChange={(event) => onSourceChange(event.target.value)}
      />
      <p id="content-help" className="metadata">
        {contentLength.toLocaleString()} characters · {limits.minContent.toLocaleString()}–
        {limits.maxContent.toLocaleString()} required. Unicode characters are counted individually;
        text is never truncated.
      </p>
    </>
  );
}
