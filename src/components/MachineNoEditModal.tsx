import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  title?: string;
  machineNoOptions: readonly string[];
  initialValue?: string;
  onClose: () => void;
  onConfirm: (nextValue: string) => void;
};

export const MachineNoEditModal: React.FC<Props> = ({
  open,
  title = "機械番号 変更（デモ）",
  machineNoOptions,
  initialValue,
  onClose,
  onConfirm
}) => {
  const initial = useMemo(() => {
    const v = (initialValue ?? "").trim();
    if (v) return v;
    return machineNoOptions[0] ?? "";
  }, [initialValue, machineNoOptions]);

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
          <p style={{ marginTop: 0, marginBottom: 10, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
            No.セルのダブルクリックで開くデモモーダルです。候補から選択するか、直接入力できます。
          </p>

          <div className="filter-bar multi" style={{ marginTop: 0 }}>
            <div className="filter-group" style={{ minWidth: 280 }}>
              <label>候補から選択</label>
              <select className="filter-input" value={value} onChange={(e) => setValue(e.target.value)}>
                {machineNoOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group" style={{ minWidth: 220 }}>
              <label>直接入力</label>
              <input
                className="filter-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="例) M-1001"
              />
            </div>
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
        </div>
      </div>
    </div>
  );
};

