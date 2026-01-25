import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  title?: string;
  initialValue?: string;
  onClose: () => void;
  onConfirm: (nextValue: string) => void;
  onOrderDetail?: () => void;
};

export const FactoryNoteEditModal: React.FC<Props> = ({
  open,
  title = "工場備考編集（デモ）",
  initialValue,
  onClose,
  onConfirm,
  onOrderDetail
}) => {
  const initial = useMemo(() => initialValue ?? "", [initialValue]);
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
      <div className="modal" style={{ width: "min(720px, 94vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
            備考セルのダブルクリックで開くデモモーダルです。
          </p>
          <textarea
            className="order-demo-textarea"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="工場備考を入力"
            style={{ width: "100%", minHeight: 180 }}
          />
        </div>
        <div className="modal-footer">
          <button className="button" type="button" onClick={onClose}>
            キャンセル
          </button>
          <button className="button primary" type="button" onClick={() => onConfirm(value)}>
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

