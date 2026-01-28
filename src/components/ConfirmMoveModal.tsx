import React, { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;
  onOk: () => void;
  onCancel: () => void;
};

export const ConfirmMoveModal: React.FC<Props> = ({
  open,
  title = "移動確認",
  message,
  okLabel = "OK",
  cancelLabel = "キャンセル",
  onOk,
  onCancel
}) => {
  const okRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // OKボタンへ自動フォーカス（Enterで確定できる）
    okRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal" style={{ width: "min(520px, 92vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onCancel}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, marginBottom: 0, color: "#0f172a", fontWeight: 800 }}>{message}</p>
          <p style={{ marginTop: 8, marginBottom: 0, color: "#64748b", fontSize: 12 }}>
            EnterでOK、Escでキャンセルできます。
          </p>
        </div>
        <div className="modal-footer">
          <button className="button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button ref={okRef} className="button primary" type="button" onClick={onOk}>
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

