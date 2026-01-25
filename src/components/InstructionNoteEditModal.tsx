import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  title?: string;
  initialValue?: string;
  placeholder?: string;
  onClose: () => void;
  onConfirm: (nextValue: string) => void;
  onOrderDetail?: () => void;
};

export const InstructionNoteEditModal: React.FC<Props> = ({
  open,
  title = "指示備考 変更（デモ）",
  initialValue,
  placeholder = "例) ※都筑移動、コベルコ希望",
  onClose,
  onConfirm,
  onOrderDetail
}) => {
  const initial = useMemo(() => (initialValue ?? "").trim(), [initialValue]);
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (!open) return;
    setValue(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const canConfirm = Boolean(value.trim());

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: "min(680px, 92vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
            機械名列に含まれる「指示備考」（例: 先頭が「※」の行）を編集するデモモーダルです。
          </p>
          <div className="filter-group" style={{ width: "100%" }}>
            <label>指示備考</label>
            <textarea
              className="filter-input"
              style={{ height: 120, resize: "vertical", whiteSpace: "pre-wrap" }}
              value={value}
              placeholder={placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button
            className="button primary"
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm(value.trim())}
          >
            変更
          </button>
          {onOrderDetail && (
            <button className="button" type="button" onClick={onOrderDetail}>
              受注詳細
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

