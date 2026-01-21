import React, { useEffect, useMemo, useState } from "react";

type Mode = "text" | "number" | "select";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  mode: Mode;
  options?: readonly string[]; // mode === "select"
  initialValue?: string;
  placeholder?: string;
  onClose: () => void;
  onConfirm: (nextValue: string) => void;
};

export const SimpleValueEditModal: React.FC<Props> = ({
  open,
  title,
  description,
  mode,
  options,
  initialValue,
  placeholder,
  onClose,
  onConfirm
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
      <div className="modal" style={{ width: "min(520px, 92vw)" }}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="modal-body">
          {description && (
            <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
              {description}
            </p>
          )}

          {mode === "select" && (
            <div className="filter-bar" style={{ marginTop: 0 }}>
              <div className="filter-group" style={{ minWidth: 280 }}>
                <label>選択</label>
                <select className="filter-input" value={value} onChange={(e) => setValue(e.target.value)}>
                  {(options ?? []).map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {mode !== "select" && (
            <div className="filter-bar" style={{ marginTop: 0 }}>
              <div className="filter-group" style={{ minWidth: 280 }}>
                <label>入力</label>
                <input
                  className="filter-input"
                  inputMode={mode === "number" ? "numeric" : undefined}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            </div>
          )}
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
        </div>
      </div>
    </div>
  );
};

