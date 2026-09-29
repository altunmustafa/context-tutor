import { useEffect, useRef } from "react";

export function Confirmation({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    cancelButton.current?.focus();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirmation-title">{title}</h2>
      <p id="confirmation-message">{message}</p>
      <div className="actions">
        <button ref={cancelButton} onClick={onCancel}>
          Cancel
        </button>
        <button className="primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
